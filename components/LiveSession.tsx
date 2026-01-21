import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, Power, Activity, Signal, Cpu } from 'lucide-react';

export const LiveSession: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState('SYSTEM IDLE');
  
  const audioContextRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);

  // Cleanup
  useEffect(() => {
    return () => disconnect();
  }, []);

  // Visualizer Loop - Sentient Orb
  useEffect(() => {
    if (isConnected && canvasRef.current && analyserRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const analyser = analyserRef.current;
      analyser.fftSize = 256; // Lower FFT size for smoother organic shapes
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        animationFrameRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        if (!ctx) return;
        
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = 80;

        ctx.clearRect(0, 0, width, height);

        // Core Glow
        const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.5, centerX, centerY, radius * 2);
        gradient.addColorStop(0, 'rgba(0, 255, 157, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Draw Organic Waveform
        ctx.beginPath();
        ctx.strokeStyle = '#00ff9d';
        ctx.lineWidth = 2;
        
        // Connect points around the circle
        for (let i = 0; i <= bufferLength; i++) {
            // Mirror the data to close the loop smoothly
            const index = i % bufferLength;
            const value = dataArray[index];
            const angle = (i / bufferLength) * Math.PI * 2;
            
            // Deform radius based on frequency
            // Use low freq for overall size pulsing, high freq for spikes
            const deform = (value / 255) * 50;
            const r = radius + deform;

            const x = centerX + Math.cos(angle) * r;
            const y = centerY + Math.sin(angle) * r;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.closePath();
        ctx.stroke();

        // Inner Echo Ring
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.5)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= bufferLength; i++) {
            const index = i % bufferLength;
            const value = dataArray[index];
            const angle = (i / bufferLength) * Math.PI * 2 - 0.2; // Slight rotation
            const r = (radius * 0.8) + ((value / 255) * 30);
            const x = centerX + Math.cos(angle) * r;
            const y = centerY + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      };
      draw();
    } else if (!isConnected && canvasRef.current) {
       const ctx = canvasRef.current.getContext('2d');
       if(ctx) ctx.clearRect(0,0, canvasRef.current.width, canvasRef.current.height);
       if(animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
  }, [isConnected]);


  const connect = async () => {
    try {
      setStatus('ESTABLISHING NEURAL UPLINK...');
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const analyser = inputCtx.createAnalyser();
      analyser.smoothingTimeConstant = 0.8; // Smoother visualization
      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      
      source.connect(analyser);
      source.connect(processor);
      processor.connect(inputCtx.destination);
      
      analyserRef.current = analyser;
      audioContextRef.current = {
        input: inputCtx,
        output: outputCtx,
        stream: stream,
        processor,
        source
      };

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setStatus('UPLINK SECURE. GEMINI 2.5 ACTIVE.');
            setIsConnected(true);
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
          },
          onmessage: async (msg: LiveServerMessage) => {
            const base64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
               const { output } = audioContextRef.current;
               nextStartTimeRef.current = Math.max(nextStartTimeRef.current, output.currentTime);
               const audioBuffer = await decodeAudioData(decode(base64Audio), output, 24000, 1);
               const source = output.createBufferSource();
               source.buffer = audioBuffer;
               source.connect(output.destination);
               source.start(nextStartTimeRef.current);
               nextStartTimeRef.current += audioBuffer.duration;
            }
          },
          onclose: () => disconnect(),
          onerror: (err) => { console.error(err); setStatus('UPLINK FAILURE'); disconnect(); }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: "You are the RaisinEx Mainframe. Speak concisely, professionally, and robotically."
        }
      });

    } catch (e) {
      console.error(e);
      setStatus('HARDWARE ACCESS DENIED');
    }
  };

  const disconnect = () => {
    if (audioContextRef.current) {
      const { input, output, stream, processor, source } = audioContextRef.current;
      source.disconnect();
      processor.disconnect();
      input.close();
      output.close();
      stream.getTracks().forEach((t: any) => t.stop());
      audioContextRef.current = null;
    }
    if(animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setIsConnected(false);
    setStatus('SYSTEM IDLE');
  };

  function createBlob(data: Float32Array) {
    const l = data.length; const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) int16[i] = data[i] * 32768;
    const binary = new Uint8Array(int16.buffer); let binStr = '';
    for (let i = 0; i < binary.byteLength; i++) binStr += String.fromCharCode(binary[i]);
    return { data: btoa(binStr), mimeType: 'audio/pcm;rate=16000' };
  }
  function decode(base64: string) { return Uint8Array.from(atob(base64), c => c.charCodeAt(0)); }
  async function decodeAudioData(data: Uint8Array, ctx: AudioContext, rate: number, ch: number) {
    const dataInt16 = new Int16Array(data.buffer); const frameCount = dataInt16.length / ch;
    const buffer = ctx.createBuffer(ch, frameCount, rate);
    for (let c = 0; c < ch; c++) {
      const d = buffer.getChannelData(c);
      for (let i = 0; i < frameCount; i++) d[i] = dataInt16[i * ch + c] / 32768.0;
    }
    return buffer;
  }

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-black">
      <div className="absolute top-6 left-6 z-10 font-mono text-xs text-neon-green/60">
        <div>> PROTOCOL: WEBSOCKET_SECURE</div>
        <div>> LATENCY: 12ms</div>
        <div>> ENCRYPTION: AES-256</div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative">
        <div className="absolute top-1/6 text-center z-10">
          <h2 className={`text-xl font-orbitron tracking-[0.2em] ${isConnected ? 'text-neon-green text-glow' : 'text-gray-600'}`}>
            {status}
          </h2>
        </div>

        <div className="relative w-full h-full flex items-center justify-center">
             <canvas 
                ref={canvasRef} 
                width={600} 
                height={600} 
                className={`transition-opacity duration-1000 ${isConnected ? 'opacity-100' : 'opacity-10'}`} 
             />
             
             {/* Center Core Button Overlay */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                <button 
                  onClick={isConnected ? disconnect : connect}
                  className={`w-24 h-24 rounded-full border-2 flex items-center justify-center backdrop-blur-sm transition-all duration-500
                    ${isConnected 
                        ? 'border-neon-green bg-neon-green/10 shadow-[0_0_50px_rgba(0,255,157,0.4)] hover:shadow-[0_0_80px_rgba(0,255,157,0.6)]' 
                        : 'border-white/20 bg-black/50 hover:border-neon-cyan hover:shadow-[0_0_30px_rgba(0,243,255,0.2)]'
                    }`}
                >
                    {isConnected ? (
                        <Mic size={32} className="text-neon-green animate-pulse" />
                    ) : (
                        <Power size={32} className="text-white/50" />
                    )}
                </button>
             </div>
        </div>
      </div>
    </div>
  );
};