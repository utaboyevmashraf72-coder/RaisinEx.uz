import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageIcon, Wand2, Download, RefreshCw, Layers, Sparkles, Upload, ScanLine, Eye, X, ImagePlus } from 'lucide-react';
import { geminiService } from '../services/geminiService';

interface ImagenLabProps {
    fx: any;
}

export const ImagenLab: React.FC<ImagenLabProps> = ({ fx }) => {
    const [mode, setMode] = useState<'generate' | 'edit'>('generate');
    const [prompt, setPrompt] = useState('');
    const [style, setStyle] = useState('Photorealistic');
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [sourceImage, setSourceImage] = useState<{data: string, mime: string} | null>(null);
    const [history, setHistory] = useState<string[]>([]);
    const [isComparing, setIsComparing] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const styles = [
        { id: 'Photorealistic', label: 'REALISM', color: 'from-blue-500 to-cyan-500' },
        { id: 'Cyberpunk', label: 'CYBERPUNK', color: 'from-pink-500 to-purple-500' },
        { id: 'Anime', label: 'ANIME', color: 'from-orange-500 to-red-500' },
        { id: '3D Render', label: '3D RENDER', color: 'from-green-500 to-emerald-500' },
        { id: 'Oil Painting', label: 'OIL PAINT', color: 'from-yellow-500 to-amber-500' },
    ];

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            fx.click();
            const reader = new FileReader();
            reader.onload = (ev) => {
                const base64 = (ev.target?.result as string).split(',')[1];
                setSourceImage({ data: base64, mime: file.type });
                setResult(null); // Clear previous result on new upload
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerate = async () => {
        if (!prompt) return;
        if (mode === 'edit' && !sourceImage) return;

        setIsGenerating(true);
        fx.click();
        
        try {
            let response;
            if (mode === 'generate') {
                response = await geminiService.generateImage(prompt, '1K', { style });
            } else {
                // Edit Mode
                response = await geminiService.editImage(sourceImage!.data, prompt, sourceImage!.mime);
            }

            const imgPart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
            
            if (imgPart?.inlineData) {
                const url = `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
                setResult(url);
                setHistory(prev => [url, ...prev].slice(0, 5)); // Keep last 5
                fx.success();
            } else {
                console.warn("No image in response", response);
                fx.error();
            }
        } catch (e) {
            console.error(e);
            fx.error();
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="h-full flex flex-col md:flex-row bg-[#050505] text-white font-mono">
            {/* Control Panel */}
            <div className="w-full md:w-96 p-6 border-r border-white/10 flex flex-col gap-6 overflow-y-auto custom-scroll bg-black/50 backdrop-blur-sm z-20 shadow-[20px_0_50px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-3 text-neon-purple mb-2">
                    <Sparkles className="animate-pulse" size={24} />
                    <h2 className="font-orbitron font-bold text-xl tracking-widest text-white">IMAGEN LAB</h2>
                </div>

                {/* Mode Switcher */}
                <div className="grid grid-cols-2 p-1 bg-white/5 rounded-lg border border-white/10">
                    <button 
                        onClick={() => { setMode('generate'); fx.click(); }} 
                        className={`flex items-center justify-center gap-2 py-2 text-xs rounded transition-all font-orbitron tracking-wider ${mode === 'generate' ? 'bg-neon-purple text-black font-bold shadow-[0_0_15px_rgba(188,19,254,0.4)]' : 'text-white/50 hover:text-white'}`}
                    >
                        <Wand2 size={12}/> SYNTHESIS
                    </button>
                    <button 
                        onClick={() => { setMode('edit'); fx.click(); }} 
                        className={`flex items-center justify-center gap-2 py-2 text-xs rounded transition-all font-orbitron tracking-wider ${mode === 'edit' ? 'bg-neon-purple text-black font-bold shadow-[0_0_15px_rgba(188,19,254,0.4)]' : 'text-white/50 hover:text-white'}`}
                    >
                        <Layers size={12}/> MODIFY
                    </button>
                </div>

                {/* Edit Mode: Source Image Upload */}
                <AnimatePresence mode="wait">
                    {mode === 'edit' && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <label className="text-[10px] font-mono text-white/50 mb-2 block">> SOURCE_MATRIX</label>
                            {sourceImage ? (
                                <div className="relative h-40 w-full rounded-lg overflow-hidden border border-neon-purple/50 group">
                                    <img src={`data:${sourceImage.mime};base64,${sourceImage.data}`} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-white/10 rounded hover:bg-white/20"><RefreshCw size={16}/></button>
                                        <button onClick={() => { setSourceImage(null); setResult(null); }} className="p-2 bg-red-500/20 text-red-500 rounded hover:bg-red-500 hover:text-white"><X size={16}/></button>
                                    </div>
                                </div>
                            ) : (
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="h-40 w-full border border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-neon-purple hover:bg-white/5 transition-all gap-2 group"
                                >
                                    <Upload className="text-white/20 group-hover:text-neon-purple transition-colors" size={24} />
                                    <span className="text-xs text-white/40 font-mono">UPLOAD SOURCE IMAGE</span>
                                </div>
                            )}
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Prompt Input */}
                <div className="space-y-2">
                    <label className="text-[10px] font-mono text-white/50 flex justify-between">
                        <span>{mode === 'generate' ? '> VISUAL_DESCRIPTION' : '> MODIFICATION_INSTRUCTIONS'}</span>
                        <span className="text-neon-purple">{prompt.length} chars</span>
                    </label>
                    <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full h-32 bg-black/50 border border-white/10 rounded-lg p-4 font-mono text-sm text-white focus:border-neon-purple focus:outline-none focus:ring-1 focus:ring-neon-purple/50 resize-none transition-all placeholder-white/20"
                        placeholder={mode === 'generate' ? "Describe the visual output matrix..." : "Describe changes (e.g. 'Add a neon sign', 'Make it rainy')..."}
                    />
                </div>

                {/* Style Grid (Only in Generate Mode) */}
                <AnimatePresence>
                    {mode === 'generate' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                            <label className="text-[10px] font-mono text-white/50">> RENDER_ENGINE</label>
                            <div className="grid grid-cols-2 gap-2">
                                {styles.map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => { setStyle(s.id); fx.click(); }}
                                        className={`relative h-10 rounded overflow-hidden border transition-all group ${style === s.id ? 'border-neon-purple/80 shadow-[0_0_10px_rgba(188,19,254,0.3)]' : 'border-white/10 hover:border-white/30'}`}
                                    >
                                        <div className={`absolute inset-0 bg-gradient-to-br ${s.color} opacity-20 group-hover:opacity-40 transition-opacity`}></div>
                                        <span className={`relative z-10 text-[9px] font-orbitron font-bold tracking-wider ${style === s.id ? 'text-white' : 'text-white/60'}`}>{s.label}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Generate Button */}
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt || (mode === 'edit' && !sourceImage)}
                    className="w-full py-4 mt-auto bg-neon-purple text-black font-orbitron font-bold tracking-widest rounded shadow-[0_0_20px_rgba(188,19,254,0.4)] hover:shadow-[0_0_40px_rgba(188,19,254,0.6)] hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 group relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-[shimmer_1s_infinite]"></div>
                    {isGenerating ? (
                        <>
                            <RefreshCw className="animate-spin" size={16} /> PROCESSING...
                        </>
                    ) : (
                        <>
                            {mode === 'generate' ? <Wand2 size={16} className="group-hover:rotate-12 transition-transform"/> : <ScanLine size={16} />} 
                            {mode === 'generate' ? 'INITIATE SYNTHESIS' : 'EXECUTE MODIFY'}
                        </>
                    )}
                </button>
            </div>

            {/* Viewport */}
            <div className="flex-1 bg-[#020202] relative flex items-center justify-center overflow-hidden p-8">
                {/* Background Grid */}
                <div className="absolute inset-0 opacity-10 pointer-events-none" 
                     style={{ backgroundImage: 'linear-gradient(rgba(188, 19, 254, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(188, 19, 254, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/80 pointer-events-none"></div>

                <div className="relative z-10 max-w-full max-h-full flex flex-col items-center">
                    {result ? (
                        <div className="relative group">
                            <div className="relative rounded-lg overflow-hidden shadow-2xl border border-white/10 group-hover:border-neon-purple/50 transition-colors">
                                <motion.img 
                                    key={isComparing ? 'source' : 'result'}
                                    initial={{ opacity: 0.5 }}
                                    animate={{ opacity: 1 }}
                                    src={isComparing && sourceImage ? `data:${sourceImage.mime};base64,${sourceImage.data}` : result} 
                                    className="max-w-full max-h-[75vh] object-contain block"
                                />
                                {/* Scanning Effect overlay */}
                                <div className="absolute inset-0 bg-gradient-to-b from-neon-purple/0 via-neon-purple/10 to-neon-purple/0 opacity-0 group-hover:opacity-100 pointer-events-none h-full w-full animate-[scanline_3s_linear_infinite]"></div>
                            </div>

                            {/* Action Bar */}
                            <div className="mt-4 flex items-center justify-center gap-4">
                                <a href={result} download={`raisinex-gen-${Date.now()}.png`} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded hover:bg-white hover:text-black transition-all text-xs font-mono group/btn">
                                    <Download size={14} className="group-hover/btn:translate-y-0.5 transition-transform" /> SAVE_TO_DISK
                                </a>
                                {mode === 'edit' && sourceImage && (
                                    <button 
                                        onMouseDown={() => setIsComparing(true)}
                                        onMouseUp={() => setIsComparing(false)}
                                        onMouseLeave={() => setIsComparing(false)}
                                        className="flex items-center gap-2 px-4 py-2 bg-neon-purple/10 border border-neon-purple text-neon-purple rounded hover:bg-neon-purple hover:text-black transition-all text-xs font-mono select-none"
                                    >
                                        <Eye size={14} /> HOLD_TO_COMPARE
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-white/20">
                            {isGenerating ? (
                                <div className="relative w-72 h-72 border border-white/10 rounded flex items-center justify-center overflow-hidden bg-black/50">
                                    <div className="absolute inset-0 bg-neon-purple/5 animate-pulse"></div>
                                    <div className="absolute w-full h-1 bg-neon-purple top-0 shadow-[0_0_20px_#bc13fe] animate-[scanline_1.5s_linear_infinite]"></div>
                                    
                                    {/* Wireframe Globe or Loader */}
                                    <div className="w-32 h-32 border-2 border-white/10 rounded-full animate-[spin_4s_linear_infinite] flex items-center justify-center">
                                        <div className="w-24 h-24 border border-neon-purple/50 rounded-full animate-[spin_3s_linear_reverse_infinite]"></div>
                                    </div>
                                    
                                    <p className="absolute bottom-10 font-orbitron text-xs animate-pulse text-neon-purple tracking-widest">RESOLVING PIXELS...</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center group">
                                    <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6 group-hover:bg-neon-purple/10 transition-colors duration-500">
                                        {mode === 'generate' ? <ImagePlus size={40} className="opacity-50 group-hover:text-neon-purple group-hover:scale-110 transition-all"/> : <Layers size={40} className="opacity-50 group-hover:text-neon-purple group-hover:scale-110 transition-all"/>}
                                    </div>
                                    <h3 className="font-orbitron text-lg tracking-[0.2em] text-white/60 group-hover:text-white transition-colors">
                                        {mode === 'generate' ? 'NEURAL SYNTHESIS READY' : 'MODIFICATION MATRIX READY'}
                                    </h3>
                                    <p className="font-mono text-xs text-white/30 mt-2">
                                        {mode === 'generate' ? 'Enter parameters to initiate creation' : 'Upload source to initiate transformation'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* History Strip */}
                {history.length > 0 && (
                    <div className="absolute bottom-6 right-6 flex flex-col gap-2 items-end">
                         <label className="text-[9px] font-mono text-white/30 tracking-widest">OUTPUT_BUFFER</label>
                         <div className="flex gap-2">
                             {history.map((img, i) => (
                                 <button key={i} onClick={() => { setResult(img); fx.click(); }} className={`w-12 h-12 border rounded overflow-hidden transition-all hover:scale-110 ${result === img ? 'border-neon-purple shadow-[0_0_10px_rgba(188,19,254,0.5)]' : 'border-white/20 hover:border-white'}`}>
                                     <img src={img} className="w-full h-full object-cover" />
                                 </button>
                             ))}
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
};