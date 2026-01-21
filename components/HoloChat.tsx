import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, BrainCircuit, Paperclip, X, Globe, Copy, Check, ArrowUp, Cpu, Zap, Volume2 } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { TextStreamer } from './TextStreamer';

// --- Sub-components ---

const ArtifactRenderer: React.FC<{ code: string }> = ({ code }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
    
    if (code.trim().startsWith('<svg')) {
       return (
         <div className="my-4 border border-white/10 bg-black/50 p-4 rounded flex items-center justify-center overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={handleCopy} className="text-white/30 hover:text-white p-1 bg-black/80 rounded"><Copy size={12}/></button>
            </div>
            <div dangerouslySetInnerHTML={{ __html: code }} className="w-full max-w-sm" />
         </div>
       );
    }
    return (
       <div className="my-3 bg-[#0d0d0d] border border-white/10 rounded-lg overflow-hidden relative group font-mono text-xs">
           <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/5">
                <span className="text-[10px] text-white/30 uppercase">Script.ts</span>
                <button onClick={handleCopy} className="text-white/30 hover:text-neon-green transition-colors">
                    {copied ? <Check size={12}/> : <Copy size={12}/>}
                </button>
           </div>
           <div className="p-3 overflow-x-auto custom-scroll">
               <pre className="text-blue-300">{code}</pre>
           </div>
       </div>
    );
};

const ChatBubble: React.FC<{ msg: any, isLast: boolean }> = ({ msg, isLast }) => {
    const parts = msg.parts.map((part: any, i: number) => {
        if(part.inlineData) {
            return (
                <div key={i} className="mb-3">
                    <img src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} className="max-w-[200px] border border-white/20 rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.5)]" />
                </div>
            );
        }
        if (part.text) {
           const regex = /```(?:xml|svg|html|jsx|tsx|javascript|typescript|json)?\n([\s\S]*?)```/g;
           const segments = []; let lastIndex = 0; let match;
           while ((match = regex.exec(part.text)) !== null) {
               if (match.index > lastIndex) {
                   const txt = part.text.substring(lastIndex, match.index);
                   segments.push(
                       <span key={`text-${lastIndex}`} className="leading-7">
                         {isLast && msg.role === 'model' ? <TextStreamer text={txt} /> : txt}
                       </span>
                   );
               }
               segments.push(<ArtifactRenderer key={`code-${match.index}`} code={match[1]} />);
               lastIndex = regex.lastIndex;
           }
           if (lastIndex < part.text.length) {
               const txt = part.text.substring(lastIndex);
               segments.push(
                   <span key={`text-end`} className="leading-7">
                     {isLast && msg.role === 'model' ? <TextStreamer text={txt} /> : txt}
                   </span>
               );
           }
           return <div key={i} className="whitespace-pre-wrap">{segments}</div>;
        }
        return null;
    });

    return (
        <motion.div 
            initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-8`}
        >
            <div className={`max-w-[85%] lg:max-w-[75%] p-6 border relative backdrop-blur-md shadow-2xl ${msg.role === 'user' ? 'border-neon-cyan/30 bg-gradient-to-br from-neon-cyan/10 to-transparent rounded-2xl rounded-tr-sm' : 'border-white/10 bg-[#0a0a0a]/90 rounded-2xl rounded-tl-sm'}`}>
                <div className={`absolute -top-3 ${msg.role === 'user' ? '-right-1' : '-left-1'} text-[9px] font-orbitron tracking-widest bg-black px-2 border border-white/10 text-white/40 uppercase flex items-center gap-2`}>
                   {msg.role === 'user' ? <><span className="w-1.5 h-1.5 rounded-full bg-neon-cyan"></span> COMMAND</> : <><Cpu size={10}/> CORTEX</>}
                </div>
                <div className="font-mono text-sm text-white/90">{parts}</div>
                
                {msg.groundings && (
                    <div className="mt-4 pt-3 border-t border-white/5 grid grid-cols-1 gap-2">
                        <div className="text-[10px] text-white/30 font-orbitron">SOURCES DETECTED:</div>
                        <div className="flex flex-wrap gap-2">
                            {msg.groundings.map((g: any, i: number) => (
                                <a key={i} href={g.web?.uri || g.maps?.uri} target="_blank" className="flex items-center gap-1.5 text-[10px] border border-white/10 bg-white/5 text-blue-300 px-3 py-1.5 rounded hover:bg-blue-500/20 hover:border-blue-500/50 transition-all">
                                    <Globe size={10} /> {g.web?.title || g.maps?.title || 'External Source'}
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

// Helper for PCM to WAV
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

// --- Main Component ---

interface HoloChatProps {
    history: any[];
    setHistory: React.Dispatch<React.SetStateAction<any[]>>;
    fx: any;
}

export const HoloChat: React.FC<HoloChatProps> = ({ history, setHistory, fx }) => {
    const [input, setInput] = useState('');
    const [images, setImages] = useState<{data: string, mimeType: string}[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [mode, setMode] = useState<'fast' | 'reasoning' | 'search'>('fast');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if(scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [history, isProcessing]);

    const handleSend = async () => {
        if((!input.trim() && images.length === 0) || isProcessing) return;
        fx.click();
        
        const userParts: any[] = [{ text: input }];
        images.forEach(img => userParts.push({ inlineData: img }));
        const userMsg = { role: 'user', parts: userParts };
        
        setHistory(prev => [...prev, userMsg]);
        setInput('');
        const imgsToSend = [...images];
        setImages([]);
        setIsProcessing(true);

        try {
            const historyForApi = history.map(h => ({ role: h.role, parts: h.parts }));
            const result = await geminiService.chat(historyForApi, userMsg.parts[0].text, imgsToSend, mode);
            
            let groundings: any[] = [];
            if (mode === 'search' && result.candidates?.[0]?.groundingMetadata?.groundingChunks) {
                groundings = result.candidates[0].groundingMetadata.groundingChunks;
            }
            setHistory(prev => [...prev, { role: 'model', parts: [{ text: result.text }], groundings }]);
            fx.success();
        } catch (e) {
            fx.error();
            setHistory(prev => [...prev, { role: 'model', parts: [{ text: "CRITICAL FAILURE: NEURAL CONNECTION SEVERED." }] }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            fx.click();
            const reader = new FileReader();
            reader.onload = (ev) => {
               const base64Data = (ev.target?.result as string).split(',')[1];
               setImages(prev => [...prev, { mimeType: file.type, data: base64Data }]);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleTTS = async () => {
        if (!input.trim() || isSpeaking) return;
        fx.click();
        setIsSpeaking(true);
        try {
            const audioBase64 = await geminiService.generateSpeech(input);
            if (audioBase64) {
                const wavUrl = pcmToWav(audioBase64);
                const audio = new Audio(wavUrl);
                audio.onended = () => setIsSpeaking(false);
                audio.play();
            } else {
                setIsSpeaking(false);
            }
        } catch (e) {
            console.error(e);
            setIsSpeaking(false);
            fx.error();
        }
    };

    return (
        <div className="h-full flex flex-col max-w-6xl mx-auto relative bg-[#050505]">
            {/* Header / Mode Select */}
            <div className="absolute top-0 left-0 right-0 z-20 flex justify-center p-4 pointer-events-none">
                <div className="bg-black/80 backdrop-blur border border-white/10 p-1 rounded-lg flex gap-1 pointer-events-auto shadow-xl">
                    {[
                        { id: 'fast', label: 'FLASH', icon: Zap },
                        { id: 'reasoning', label: 'DEEP THINK', icon: BrainCircuit },
                        { id: 'search', label: 'NET SEARCH', icon: Globe }
                    ].map((m: any) => (
                        <button 
                            key={m.id}
                            onClick={() => { setMode(m.id); fx.click(); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded text-[10px] font-orbitron transition-all ${mode === m.id ? 'bg-neon-cyan text-black shadow-[0_0_15px_rgba(0,243,255,0.4)]' : 'text-white/40 hover:text-white'}`}
                        >
                            <m.icon size={12} /> {m.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-12 custom-scroll pb-32">
                {history.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-white/20 select-none">
                        <div className="relative">
                            <Terminal size={64} className="opacity-50 text-neon-cyan"/>
                            <div className="absolute -bottom-2 -right-2"><BrainCircuit size={24} className="text-neon-purple animate-pulse"/></div>
                        </div>
                        <h2 className="mt-8 font-orbitron text-2xl tracking-[0.2em] text-white/10">NEURAL INTERFACE</h2>
                        <p className="mt-2 font-mono text-xs text-neon-cyan/50">WAITING FOR INPUT STREAM...</p>
                    </div>
                )}
                <AnimatePresence>
                    {history.map((msg, idx) => (
                        <ChatBubble key={idx} msg={msg} isLast={idx === history.length - 1} />
                    ))}
                </AnimatePresence>
                
                {isProcessing && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex items-center gap-3 text-neon-cyan font-mono text-xs ml-4"
                    >
                        <div className="flex gap-1">
                            <motion.div animate={{ height: [10, 20, 10] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 bg-neon-cyan/50 rounded-full"/>
                            <motion.div animate={{ height: [10, 20, 10] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 bg-neon-cyan/50 rounded-full"/>
                            <motion.div animate={{ height: [10, 20, 10] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 bg-neon-cyan/50 rounded-full"/>
                        </div>
                        PROCESSING VECTOR SPACE...
                    </motion.div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-6 pt-0 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent z-30">
                <div className="max-w-4xl mx-auto">
                    {images.length > 0 && (
                        <div className="flex gap-3 mb-3 pl-2">
                            {images.map((img, i) => (
                                <div key={i} className="relative group">
                                    <div className="absolute inset-0 bg-neon-cyan/20 blur-lg rounded-lg opacity-50"></div>
                                    <img src={`data:${img.mimeType};base64,${img.data}`} className="w-16 h-16 object-cover rounded-lg border border-neon-cyan/50 relative z-10" />
                                    <button onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 z-20 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg scale-75 hover:scale-100"><X size={12} /></button>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-cyan to-neon-purple rounded-xl opacity-20 group-focus-within:opacity-100 transition-opacity duration-500 blur"></div>
                        <div className="relative bg-black border border-white/10 rounded-xl flex items-end p-2 gap-2 shadow-2xl">
                            <label className="p-3 text-white/40 hover:text-neon-cyan cursor-pointer transition-colors rounded-lg hover:bg-white/5 self-end">
                                <Paperclip size={20} />
                                <input type="file" multiple accept="image/*" onChange={handleFile} className="hidden" />
                            </label>
                            
                            <textarea 
                                value={input} 
                                onChange={(e) => setInput(e.target.value)} 
                                onKeyDown={(e) => {
                                    if(e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                className="flex-1 bg-transparent border-none p-3 max-h-32 min-h-[50px] font-mono text-sm text-white focus:ring-0 focus:outline-none placeholder-white/20 custom-scroll resize-none" 
                                placeholder="ENTER COMMAND..." 
                                rows={1}
                            />

                             <button 
                                onClick={handleTTS}
                                disabled={!input.trim() || isSpeaking}
                                className="p-3 text-white/40 hover:text-neon-cyan transition-colors rounded-lg hover:bg-white/5 self-end"
                                title="TEXT_TO_SPEECH"
                            >
                                <Volume2 size={20} className={isSpeaking ? "animate-pulse text-neon-green" : ""} />
                            </button>
                            
                            <button 
                                onClick={handleSend}
                                disabled={(!input && images.length === 0) || isProcessing}
                                className="p-3 bg-neon-cyan text-black rounded-lg hover:bg-white hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed self-end shadow-[0_0_15px_rgba(0,243,255,0.3)]"
                            >
                                <ArrowUp size={20} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                    <div className="text-center mt-2 text-[10px] font-mono text-white/20">
                        GEMINI 3.0 PRO • MULTIMODAL • {mode.toUpperCase()} MODE
                    </div>
                </div>
            </div>
        </div>
    );
};