import React, { useState, useEffect, useRef } from 'react';
import { geminiService } from '../services/geminiService';
import { Video, Loader2, Maximize2, Terminal, Image as ImageIcon, Type, Clapperboard, Film, Clock, Sparkles, Upload, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const VeoGen: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [logs, setLogs] = useState<string[]>(['> VEO-3.1 KINETIC ENGINE READY']);
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [image, setImage] = useState<{data: string, mime: string} | null>(null);
  const [cinematicMode, setCinematicMode] = useState(false);

  // Timeline animation state
  const [renderProgress, setRenderProgress] = useState(0);
  
  const videoContainerRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => setLogs(prev => [...prev.slice(-5), `> ${msg}`]);

  useEffect(() => {
      let interval: any;
      if (isGenerating) {
          interval = setInterval(() => {
              setRenderProgress(p => p < 90 ? p + (Math.random() * 2) : p);
          }, 500);
      } else {
          setRenderProgress(0);
      }
      return () => clearInterval(interval);
  }, [isGenerating]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              const base64 = (ev.target?.result as string).split(',')[1];
              setImage({ data: base64, mime: file.type });
              addLog(`IMAGE BUFFER LOADED: ${file.name.toUpperCase()}`);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleGenerate = async () => {
    if (!prompt && !image) return;

    if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
            try { await window.aistudio.openSelectKey(); } catch (e) { addLog('ERR: API KEY MISSING'); return; }
        }
    }

    setIsGenerating(true);
    addLog('INITIALIZING PHYSICS SIMULATION...');
    setVideoUrl(null);

    let finalPrompt = prompt;
    if (cinematicMode) finalPrompt += ", cinematic lighting, 8k resolution, highly detailed, photorealistic, anamorphic lens flare, color graded";

    try {
      const imgPayload = mode === 'image' && image ? { data: image.data, mimeType: image.mime } : undefined;
      const uri = await geminiService.generateVideo(finalPrompt, aspectRatio, imgPayload);
      
      if (uri) {
        setVideoUrl(`${uri}&key=${process.env.API_KEY}`);
        addLog('RENDER COMPLETE. BUFFERING STREAM...');
        setRenderProgress(100);
      } else {
        addLog('ERR: GENERATION FAILED');
      }
    } catch (error: any) {
        if (error.message && error.message.includes("Requested entity was not found")) {
            addLog('ERR: KEY INVALID. RESELECTING...');
            if (window.aistudio) await window.aistudio.openSelectKey();
        } else {
            addLog(`ERR: ${error.message.toUpperCase()}`);
        }
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
        videoContainerRef.current?.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
    } else {
        document.exitFullscreen();
    }
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-[#050505] text-white font-mono relative overflow-hidden">
      
      {/* --- Left Control Panel --- */}
      <div className="w-full md:w-96 bg-black/60 backdrop-blur border-r border-white/10 flex flex-col z-20">
         <div className="p-6 border-b border-white/10">
             <div className="flex items-center gap-3 text-neon-cyan mb-1">
                <Clapperboard size={20} />
                <h2 className="font-orbitron font-bold tracking-widest text-lg">VEO STUDIO</h2>
             </div>
             <p className="text-[10px] text-white/40">KINETIC VIDEO GENERATION v3.1</p>
         </div>

         <div className="flex-1 overflow-y-auto custom-scroll p-6 space-y-8">
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 p-1 bg-white/5 rounded-lg border border-white/10">
                <button 
                    onClick={() => setMode('text')} 
                    className={`flex items-center justify-center gap-2 py-2 text-xs rounded transition-all ${mode === 'text' ? 'bg-neon-cyan text-black font-bold shadow-[0_0_10px_rgba(0,243,255,0.3)]' : 'text-white/50 hover:text-white'}`}
                >
                    <Type size={14}/> TEXT
                </button>
                <button 
                    onClick={() => setMode('image')} 
                    className={`flex items-center justify-center gap-2 py-2 text-xs rounded transition-all ${mode === 'image' ? 'bg-neon-cyan text-black font-bold shadow-[0_0_10px_rgba(0,243,255,0.3)]' : 'text-white/50 hover:text-white'}`}
                >
                    <ImageIcon size={14}/> IMAGE
                </button>
            </div>

            {/* Config: Aspect Ratio */}
            <div className="space-y-2">
                <label className="text-[10px] text-white/40 flex items-center gap-2"><Film size={10}/> ASPECT RATIO</label>
                <div className="grid grid-cols-2 gap-3">
                    {['16:9', '9:16'].map((r) => (
                        <button 
                            key={r}
                            onClick={() => setAspectRatio(r as any)}
                            className={`py-2 text-xs border rounded transition-all font-orbitron ${aspectRatio === r ? 'border-neon-cyan text-neon-cyan bg-neon-cyan/10' : 'border-white/10 text-white/40 hover:border-white/30'}`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            {/* Input Area */}
            <div className="space-y-4">
                {mode === 'image' && (
                    <div className="relative group">
                         {image ? (
                             <div className="relative w-full h-32 bg-black border border-neon-cyan/50 rounded-lg overflow-hidden flex items-center justify-center">
                                 <img src={`data:${image.mime};base64,${image.data}`} className="h-full w-full object-cover opacity-60" />
                                 <button onClick={() => setImage(null)} className="absolute top-2 right-2 bg-red-500/80 p-1 rounded hover:bg-red-500 text-white transition-colors"><X size={12}/></button>
                                 <div className="absolute bottom-2 left-2 text-[10px] bg-black/50 px-2 py-1 rounded border border-white/10">REF_FRAME_01</div>
                             </div>
                         ) : (
                             <label className="w-full h-32 border border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-neon-cyan/50 hover:bg-white/5 transition-all group">
                                 <Upload size={24} className="text-white/30 group-hover:text-neon-cyan mb-2" />
                                 <span className="text-xs text-white/40">DROP FRAME REFERENCE</span>
                                 <input type="file" className="hidden" accept="image/*" onChange={handleFile} />
                             </label>
                         )}
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-[10px] text-white/40 flex justify-between">
                        <span>> SCENE_DESCRIPTION</span>
                        {cinematicMode && <span className="text-neon-purple flex items-center gap-1"><Sparkles size={8}/> ENHANCED</span>}
                    </label>
                    <textarea 
                        value={prompt} 
                        onChange={e => setPrompt(e.target.value)}
                        className="w-full h-32 bg-black border border-white/10 rounded p-3 text-sm focus:border-neon-cyan focus:outline-none resize-none text-white font-rajdhani placeholder-white/20"
                        placeholder={mode === 'image' ? "Describe camera movement (e.g., 'Zoom in on the character')..." : "Describe the scene..."}
                    />
                    <button 
                        onClick={() => setCinematicMode(!cinematicMode)}
                        className={`w-full py-2 text-[10px] border rounded flex items-center justify-center gap-2 transition-all ${cinematicMode ? 'border-neon-purple text-neon-purple bg-neon-purple/10' : 'border-white/10 text-white/30 hover:border-white/30'}`}
                    >
                        <Sparkles size={10} /> CINEMATIC MODIFIER {cinematicMode ? '[ON]' : '[OFF]'}
                    </button>
                </div>
            </div>

            <button 
                onClick={handleGenerate}
                disabled={isGenerating || (!prompt && !image)}
                className="w-full py-4 bg-neon-cyan text-black font-bold font-orbitron hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,243,255,0.3)] rounded relative overflow-hidden group"
            >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <span className="relative z-10 flex items-center justify-center gap-2">
                    {isGenerating ? <Loader2 className="animate-spin" size={16}/> : <Video size={16}/>} 
                    {isGenerating ? 'RENDERING...' : 'INITIATE RENDER'}
                </span>
            </button>
         </div>

         {/* Logs */}
         <div className="h-40 bg-[#020202] border-t border-white/10 p-3 font-mono text-[10px] overflow-hidden flex flex-col">
             <div className="flex items-center gap-2 text-white/30 mb-2 border-b border-white/5 pb-1"><Terminal size={10}/> SYSTEM LOG</div>
             <div className="flex-1 overflow-y-auto custom-scroll space-y-1">
                 {logs.map((log, i) => (
                     <div key={i} className={`${log.includes('ERR') ? 'text-red-500' : 'text-neon-green/70'}`}>
                         {log}
                     </div>
                 ))}
                 {isGenerating && <div className="text-neon-green animate-pulse">> _</div>}
             </div>
         </div>
      </div>

      {/* --- Right Viewport --- */}
      <div className="flex-1 flex flex-col bg-[#0a0a0a] relative">
          {/* Main Monitor */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
              <div className="absolute inset-0 bg-black/80"></div>
              
              {/* Grid Overlay */}
              <div className="absolute inset-0 pointer-events-none opacity-20" style={{backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '100px 100px'}}></div>
              
              <div ref={videoContainerRef} className="relative z-10 w-[90%] h-[90%] border border-white/10 rounded-lg overflow-hidden bg-black shadow-2xl flex items-center justify-center group">
                  {videoUrl ? (
                      <video src={videoUrl} autoPlay loop controls className="w-full h-full object-contain" />
                  ) : (
                      <div className="flex flex-col items-center text-white/20">
                           {isGenerating ? (
                               <div className="relative">
                                   <div className="w-32 h-32 border-4 border-white/5 rounded-full animate-[spin_10s_linear_infinite]"></div>
                                   <div className="absolute inset-0 w-32 h-32 border-t-4 border-neon-cyan rounded-full animate-spin"></div>
                                   <div className="absolute inset-4 w-24 h-24 border-r-4 border-neon-purple rounded-full animate-spin-slow"></div>
                                   <div className="absolute inset-0 flex items-center justify-center font-orbitron text-xs text-white animate-pulse">
                                       {Math.round(renderProgress)}%
                                   </div>
                               </div>
                           ) : (
                               <>
                                   <Film size={64} className="mb-4 opacity-30" />
                                   <p className="font-orbitron tracking-widest text-xs">NO SIGNAL INPUT</p>
                               </>
                           )}
                      </div>
                  )}
                  
                  {/* Monitor UI Elements */}
                  <div className="absolute top-4 left-4 flex gap-4 text-[10px] font-mono text-white/50">
                      <span className={isGenerating ? 'text-red-500 animate-pulse' : ''}>● REC</span>
                      <span>TC: 00:00:00:00</span>
                  </div>
                  <div className="absolute top-4 right-4 flex items-center gap-4 text-[10px] font-mono text-white/50">
                      <span>RES: 720p_HQ</span>
                      <button onClick={toggleFullScreen} className="hover:text-neon-cyan transition-colors" title="FULLSCREEN_MODE">
                          <Maximize2 size={14} />
                      </button>
                  </div>
                  
                  {/* Safe Area Markers */}
                  <div className="absolute top-10 left-10 w-4 h-4 border-t border-l border-white/30"></div>
                  <div className="absolute top-10 right-10 w-4 h-4 border-t border-r border-white/30"></div>
                  <div className="absolute bottom-10 left-10 w-4 h-4 border-b border-l border-white/30"></div>
                  <div className="absolute bottom-10 right-10 w-4 h-4 border-b border-r border-white/30"></div>
              </div>
          </div>

          {/* Timeline Visualizer (Aesthetic) */}
          <div className="h-24 bg-[#050505] border-t border-white/10 p-2 flex flex-col relative overflow-hidden">
               <div className="flex justify-between text-[8px] font-mono text-white/30 mb-1 px-1">
                   <span>00:00</span>
                   <span>00:05</span>
                   <span>00:10</span>
                   <span>00:15</span>
               </div>
               <div className="flex-1 bg-white/5 rounded border border-white/5 relative overflow-hidden flex items-center">
                   {/* Track Lines */}
                   <div className="w-full h-[1px] bg-white/10 absolute top-1/3"></div>
                   <div className="w-full h-[1px] bg-white/10 absolute top-2/3"></div>
                   
                   {/* Dummy Keyframes */}
                   {[10, 30, 50, 70, 90].map(k => (
                       <div key={k} className="absolute w-1 h-1 bg-neon-cyan/50 rounded-full" style={{left: `${k}%`, top: '33%'}}></div>
                   ))}

                   {/* Playhead */}
                   {isGenerating && (
                       <motion.div 
                          className="absolute top-0 bottom-0 w-[2px] bg-neon-red shadow-[0_0_10px_red] z-10"
                          animate={{ left: ["0%", "100%"] }}
                          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                       />
                   )}
                   
                   {/* Waveform graphic */}
                   <div className="absolute inset-0 flex items-end justify-between px-1 opacity-20">
                       {Array.from({length: 100}).map((_, i) => (
                           <div key={i} className="w-[1px] bg-neon-cyan" style={{height: `${Math.random() * 80}%`}}></div>
                       ))}
                   </div>
               </div>
          </div>
      </div>
    </div>
  );
};