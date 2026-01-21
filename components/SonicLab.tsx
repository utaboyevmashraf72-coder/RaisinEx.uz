import React, { useState, useRef, useEffect } from 'react';
import { Volume2, Play, Square, Mic, Radio, Cpu } from 'lucide-react';
import { geminiService } from '../services/geminiService';

interface SonicLabProps {
    fx: any;
}

// Helper: PCM to WAV (Duplicated here to keep component self-contained if needed, or imported if utils existed)
const pcmToWav = (base64: string): string => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  const channels = 1; const sampleRate = 24000; const bitsPerSample = 16;
  const writeString = (offset: number, string: string) => { for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i)); };
  writeString(0, 'RIFF'); view.setUint32(4, 36 + len, true); writeString(8, 'WAVE');
  writeString(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, channels, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * (bitsPerSample / 8), true);
  view.setUint16(32, channels * (bitsPerSample / 8), true); view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data'); view.setUint32(40, len, true);
  return URL.createObjectURL(new Blob([view, bytes], { type: 'audio/wav' }));
};

export const SonicLab: React.FC<SonicLabProps> = ({ fx }) => {
    const [text, setText] = useState('');
    const [voice, setVoice] = useState('Fenrir');
    const [isProcessing, setIsProcessing] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    const voices = ['Fenrir', 'Kore', 'Puck', 'Charon', 'Zephyr'];

    const handleGenerate = async () => {
        if (!text) return;
        setIsProcessing(true);
        setAudioUrl(null);
        fx.click();
        try {
            const audioBase64 = await geminiService.generateSpeech(text, voice);
            if (audioBase64) {
                const wavUrl = pcmToWav(audioBase64);
                setAudioUrl(wavUrl);
                fx.success();
            } else {
                fx.error();
            }
        } catch(e) {
            fx.error();
        } finally {
            setIsProcessing(false);
        }
    };

    const togglePlayback = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            // Context needs to be resumed on user interaction
            if (audioContextRef.current?.state === 'suspended') {
                audioContextRef.current.resume();
            }
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
        fx.click();
    };

    const setupAudioContext = () => {
        if (!audioRef.current || audioContextRef.current) return;
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        
        const source = ctx.createMediaElementSource(audioRef.current);
        source.connect(analyser);
        analyser.connect(ctx.destination);
        
        audioContextRef.current = ctx;
        analyserRef.current = analyser;
    };

    useEffect(() => {
        if (audioUrl && isPlaying) {
            const render = () => {
                if (!analyserRef.current || !canvasRef.current) return;
                const bufferLength = analyserRef.current.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                analyserRef.current.getByteFrequencyData(dataArray);
                
                const ctx = canvasRef.current.getContext('2d');
                if (!ctx) return;
                
                const w = canvasRef.current.width;
                const h = canvasRef.current.height;
                ctx.clearRect(0, 0, w, h);
                
                // Draw Frequency Bars
                const barWidth = (w / bufferLength) * 2.5;
                let x = 0;
                
                for (let i = 0; i < bufferLength; i++) {
                    const barHeight = (dataArray[i] / 255) * h;
                    
                    // Top mirror (opacity)
                    ctx.fillStyle = `rgba(0, 243, 255, ${barHeight/h * 0.5})`;
                    ctx.fillRect(x, h/2 - barHeight/2, barWidth, barHeight);
                    
                    x += barWidth + 1;
                }
                
                animationRef.current = requestAnimationFrame(render);
            };
            render();
        } else {
            cancelAnimationFrame(animationRef.current);
        }
    }, [isPlaying, audioUrl]);

    return (
        <div className="h-full flex flex-col lg:flex-row p-8 gap-8 bg-[#050505]">
            <div className="w-full lg:w-96 flex flex-col gap-6">
                <div className="bg-panel border border-white/10 p-6 flex-1 flex flex-col rounded-xl">
                    <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4 text-neon-cyan">
                        <Volume2 />
                        <h3 className="font-orbitron font-bold text-white tracking-widest">SONIC SYNTHESIS</h3>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-mono text-white/50 mb-2 block">> VOICE_MODEL</label>
                            <div className="grid grid-cols-3 gap-2">
                                {voices.map(v => (
                                    <button
                                        key={v}
                                        onClick={() => { setVoice(v); fx.click(); }}
                                        className={`px-3 py-2 text-xs font-mono border rounded transition-all ${voice === v ? 'bg-neon-cyan text-black border-neon-cyan font-bold' : 'border-white/20 text-white/50 hover:border-white/50'}`}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1">
                             <label className="text-[10px] font-mono text-white/50 mb-2 block">> SPEECH_SEQUENCE</label>
                             <textarea 
                                value={text} 
                                onChange={e => setText(e.target.value)} 
                                className="w-full h-40 bg-black border border-white/10 p-4 font-mono text-sm text-neon-cyan focus:border-neon-cyan focus:outline-none resize-none rounded-lg" 
                                placeholder="ENTER TEXT SEQUENCE..." 
                            />
                        </div>
                    </div>

                    <button 
                        onClick={handleGenerate} 
                        disabled={isProcessing || !text} 
                        className="mt-6 w-full py-4 bg-white/5 border border-white/20 hover:bg-neon-cyan/10 hover:border-neon-cyan hover:text-neon-cyan transition-all font-orbitron font-bold tracking-widest disabled:opacity-50 rounded-lg"
                    >
                        {isProcessing ? 'SYNTHESIZING...' : 'INITIATE SYNTHESIS'}
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-black border border-white/10 relative overflow-hidden flex flex-col rounded-xl">
                 <div className="flex-1 flex items-center justify-center relative">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-700 via-gray-900 to-black"></div>
                    
                    {/* Visualizer Canvas */}
                    <canvas ref={canvasRef} width={800} height={400} className="w-full h-2/3 opacity-80 z-10" />
                    
                    {/* Center Placeholder */}
                    {!audioUrl && !isProcessing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20 z-0">
                            <Radio size={64} className="mb-4 opacity-50"/>
                            <p className="font-orbitron text-xs tracking-widest">AUDIO BUFFER EMPTY</p>
                        </div>
                    )}
                </div>

                {audioUrl && (
                    <div className="h-24 bg-panel border-t border-white/10 flex items-center justify-between px-8 z-20">
                        <audio 
                            ref={audioRef} 
                            src={audioUrl} 
                            onEnded={() => setIsPlaying(false)} 
                            onPlay={setupAudioContext} 
                        />
                        <div className="flex items-center gap-4">
                            <div className="text-[10px] font-mono text-white/40">
                                FORMAT: PCM_WAV_16BIT<br/>
                                RATE: 24KHZ
                            </div>
                        </div>
                        <button 
                            onClick={togglePlayback} 
                            className="w-14 h-14 rounded-full border border-neon-cyan flex items-center justify-center text-neon-cyan hover:bg-neon-cyan hover:text-black transition-all shadow-[0_0_20px_rgba(0,243,255,0.2)]"
                        >
                            {isPlaying ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};