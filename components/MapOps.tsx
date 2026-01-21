import React, { useState, useEffect } from 'react';
import { Crosshair, Target, Shield, Radio, Map as MapIcon, Globe, MapPin, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';

interface MapOpsProps {
    fx: any;
}

export const MapOps: React.FC<MapOpsProps> = ({ fx }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [radarRotation, setRadarRotation] = useState(0);
    
    // Pinning State
    const [pinnedTargets, setPinnedTargets] = useState<any[]>([]);
    const [activeTargetIndex, setActiveTargetIndex] = useState<number>(-1);

    const handleSearch = async () => {
        if(!query) return;
        fx.click();
        setIsProcessing(true);
        try {
            const res = await geminiService.askMaps(query, { lat: 37.7749, lng: -122.4194 });
            setResults(res.candidates?.[0]?.groundingMetadata?.groundingChunks || []);
            fx.success();
        } catch(e) {
            fx.error();
        } finally {
            setIsProcessing(false);
        }
    };

    const togglePin = (target: any) => {
        fx.click();
        const existsIndex = pinnedTargets.findIndex(t => t.maps?.uri === target.maps?.uri);
        
        if (existsIndex >= 0) {
            setActiveTargetIndex(existsIndex);
        } else {
            const newPins = [...pinnedTargets, target];
            setPinnedTargets(newPins);
            setActiveTargetIndex(newPins.length - 1);
        }
    };

    const removePin = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        fx.click();
        const newPins = pinnedTargets.filter((_, i) => i !== index);
        setPinnedTargets(newPins);
        if (activeTargetIndex >= index && activeTargetIndex > 0) {
             setActiveTargetIndex(activeTargetIndex - 1);
        } else if (newPins.length === 0) {
            setActiveTargetIndex(-1);
        } else if (activeTargetIndex >= newPins.length) {
            setActiveTargetIndex(newPins.length - 1);
        }
    };

    const cycleTarget = (direction: 'prev' | 'next') => {
        if (pinnedTargets.length === 0) return;
        fx.click();
        let newIndex = direction === 'next' ? activeTargetIndex + 1 : activeTargetIndex - 1;
        if (newIndex >= pinnedTargets.length) newIndex = 0;
        if (newIndex < 0) newIndex = pinnedTargets.length - 1;
        setActiveTargetIndex(newIndex);
    };

    // Helper to generate deterministic position on radar based on string hash
    const getPosition = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
        const angle = (Math.abs(hash) % 360) * (Math.PI / 180);
        const radius = 25 + (Math.abs(hash) % 45); // 25% to 70% from center
        // Convert polar to percentage offsets (center is 50,50)
        // radius is percentage of container half-width (approx)
        return {
            x: 50 + Math.cos(angle) * radius, 
            y: 50 + Math.sin(angle) * radius 
        };
    };

    useEffect(() => {
        const interval = setInterval(() => setRadarRotation(r => (r + 1) % 360), 16);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="h-full flex flex-col lg:flex-row bg-[#050505] overflow-hidden">
            {/* Sidebar / HUD */}
            <div className="w-full lg:w-96 bg-black/60 backdrop-blur border-r border-white/10 p-6 flex flex-col z-20 relative h-full shadow-[20px_0_50px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-3 text-neon-cyan mb-8 border-b border-white/10 pb-4">
                    <Crosshair className="animate-pulse" />
                    <h2 className="font-orbitron font-bold tracking-widest text-lg">TACTICAL MAP</h2>
                </div>

                <div className="mb-8">
                    <label className="text-[10px] font-mono text-white/50 mb-2 block">> TARGET_DESIGNATION</label>
                    <div className="flex gap-2">
                        <input 
                            value={query} 
                            onChange={e => setQuery(e.target.value)} 
                            onKeyDown={e => e.key === 'Enter' && handleSearch()} 
                            className="flex-1 bg-black border border-white/20 p-3 text-sm font-mono text-neon-cyan focus:border-neon-cyan focus:outline-none focus:shadow-[0_0_20px_rgba(0,243,255,0.2)] rounded" 
                            placeholder="COORDINATES / ENTITY..." 
                        />
                        <button 
                            onClick={handleSearch} 
                            disabled={isProcessing} 
                            className="px-4 bg-neon-cyan/10 border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black transition-all rounded"
                        >
                            <Radio size={18} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scroll space-y-4 pr-2">
                    {/* Active/Pinned List Header */}
                    {pinnedTargets.length > 0 && (
                        <div className="mb-4 pb-4 border-b border-white/10">
                            <h3 className="text-[10px] font-orbitron text-neon-green mb-2 flex items-center gap-2"><MapPin size={10}/> TRACKING ({pinnedTargets.length})</h3>
                            <div className="space-y-2">
                                {pinnedTargets.map((pin, idx) => (
                                    <div 
                                        key={`pin-${idx}`} 
                                        onClick={() => { fx.click(); setActiveTargetIndex(idx); }}
                                        className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-all ${activeTargetIndex === idx ? 'bg-neon-green/20 border-neon-green text-neon-green' : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'}`}
                                    >
                                        <span className="text-xs font-mono truncate max-w-[180px]">{pin.maps?.title}</span>
                                        <button onClick={(e) => removePin(e, idx)} className="hover:text-red-400 p-1"><X size={12}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Search Results */}
                    {results.length > 0 ? (
                        results.map((m, i) => {
                            const isPinned = pinnedTargets.some(p => p.maps?.uri === m.maps?.uri);
                            return (
                                <div 
                                    key={i} 
                                    onClick={() => togglePin(m)}
                                    className={`border p-4 relative group transition-all rounded cursor-pointer ${isPinned ? 'border-neon-green/50 bg-neon-green/5' : 'border-white/10 bg-white/5 hover:border-neon-cyan/50 hover:bg-neon-cyan/5'}`}
                                >
                                    <div className="absolute top-2 right-2">
                                        <Target size={14} className={isPinned ? "text-neon-green" : "text-white/20 group-hover:text-neon-cyan"} />
                                    </div>
                                    <h3 className="font-bold text-white text-sm pr-6 truncate">{m.maps?.title || "UNKNOWN SIGNAL"}</h3>
                                    <p className="text-[10px] text-white/50 font-mono mt-1 mb-3 truncate">{m.maps?.uri}</p>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-orbitron text-white/30">{isPinned ? 'LOCKED' : 'CLICK TO TRACK'}</span>
                                        <a 
                                            href={m.maps?.uri} 
                                            target="_blank" 
                                            onClick={e => e.stopPropagation()}
                                            onMouseEnter={fx.hover} 
                                            className="block text-center px-3 py-1 border border-white/20 text-[9px] font-orbitron hover:bg-white/10 hover:border-white/50 text-white/70 rounded transition-colors"
                                        >
                                            EXT. LINK
                                        </a>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center mt-12 opacity-30">
                            <Shield size={48} className="mx-auto mb-4" />
                            <p className="font-orbitron text-xs">NO ACTIVE TARGETS</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Radar View */}
            <div className="flex-1 relative z-0 flex items-center justify-center bg-black overflow-hidden">
                {/* Rotating Radar Layer */}
                <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                    <svg viewBox="0 0 500 500" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] animate-[spin_60s_linear_infinite]" style={{ opacity: 0.3 }}>
                        <circle cx="250" cy="250" r="240" stroke="#00f3ff" fill="none" strokeWidth="1" strokeDasharray="10 10" />
                        <circle cx="250" cy="250" r="150" stroke="#00f3ff" fill="none" strokeWidth="1" />
                        <path d="M250 10 L250 490 M10 250 L490 250" stroke="#00f3ff" strokeWidth="1" strokeOpacity="0.5"/>
                        <circle cx="250" cy="250" r="200" stroke="#00ff9d" fill="none" strokeWidth="0.5" strokeDasharray="5 5" />
                    </svg>
                    <div 
                        className="absolute top-1/2 left-1/2 w-[120%] h-[120%] rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(0,243,255,0.1)_360deg)]" 
                        style={{ transform: `translate(-50%, -50%) rotate(${radarRotation}deg)` }}
                    ></div>
                </div>
                
                {/* Pinned Markers Layer */}
                 <div className="absolute inset-0 z-10 pointer-events-none">
                     <AnimatePresence>
                     {pinnedTargets.map((target, i) => {
                         const pos = getPosition(target.maps?.title || 'unknown');
                         const isActive = i === activeTargetIndex;
                         return (
                            <motion.div
                                key={`${target.maps?.uri}-${i}`}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-auto cursor-pointer"
                                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                                onClick={() => { fx.click(); setActiveTargetIndex(i); }}
                            >
                                <div className={`relative flex items-center justify-center transition-all duration-300 ${isActive ? 'w-12 h-12' : 'w-4 h-4 hover:w-6 hover:h-6'}`}>
                                     {isActive && (
                                         <>
                                            <div className="absolute inset-0 border border-neon-cyan rounded-full animate-ping opacity-50"></div>
                                            <div className="absolute inset-0 border border-neon-cyan rounded-full opacity-80 shadow-[0_0_15px_#00f3ff]"></div>
                                         </>
                                     )}
                                     <div className={`rounded-full shadow-[0_0_10px_currentColor] transition-colors z-20 ${isActive ? 'bg-white w-2 h-2' : 'bg-neon-green w-2 h-2'}`}></div>
                                </div>
                                {isActive && (
                                    <motion.div 
                                        initial={{ y: 10, opacity: 0 }} 
                                        animate={{ y: 0, opacity: 1 }}
                                        className="mt-2 bg-black/90 border border-neon-cyan/50 px-3 py-2 text-[10px] font-mono text-neon-cyan whitespace-nowrap backdrop-blur-md rounded shadow-xl relative z-30"
                                    >
                                        <div className="font-bold">{target.maps?.title}</div>
                                        <div className="text-white/50 text-[8px]">LAT: {pos.y.toFixed(4)} LON: {pos.x.toFixed(4)}</div>
                                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black border-l border-t border-neon-cyan/50 transform rotate-45"></div>
                                    </motion.div>
                                )}
                            </motion.div>
                         )
                     })}
                     </AnimatePresence>
                 </div>

                 {/* Cycle Controls */}
                 {pinnedTargets.length > 0 && (
                     <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4 z-30 pointer-events-auto">
                         <button onClick={() => cycleTarget('prev')} className="p-3 border border-white/20 bg-black/80 text-white hover:text-neon-cyan hover:border-neon-cyan rounded-lg transition-all shadow-lg backdrop-blur"><ChevronLeft size={20}/></button>
                         <div className="px-6 py-3 bg-black/80 border border-neon-cyan/30 text-neon-cyan font-mono text-xs rounded-lg backdrop-blur shadow-[0_0_20px_rgba(0,0,0,0.5)] flex flex-col items-center min-w-[140px]">
                             <span className="text-[8px] text-white/40 tracking-widest mb-1">TARGET LOCK</span>
                             <span className="font-bold">{activeTargetIndex + 1} / {pinnedTargets.length}</span>
                         </div>
                         <button onClick={() => cycleTarget('next')} className="p-3 border border-white/20 bg-black/80 text-white hover:text-neon-cyan hover:border-neon-cyan rounded-lg transition-all shadow-lg backdrop-blur"><ChevronRight size={20}/></button>
                     </div>
                 )}

                {/* Info Overlays */}
                <div className="absolute inset-0 p-8 flex flex-col justify-between pointer-events-none z-20">
                    <div className="flex justify-between items-start">
                        <div className="text-[10px] font-mono text-white/30 bg-black/50 p-2 rounded">
                            GRID: GLOBAL_MERCATOR<br/>
                            SAT: KH-11 [ONLINE]<br/>
                            ELEVATION: 200KM
                        </div>
                        <div className="text-neon-cyan text-xs font-orbitron border border-neon-cyan px-2 py-1 animate-pulse bg-black/50 rounded">
                            LIVE FEED
                        </div>
                    </div>
                    
                    <div className="self-center">
                        {isProcessing && (
                            <div className="text-center bg-black/60 p-4 rounded-xl backdrop-blur">
                                <div className="w-16 h-16 border-4 border-t-neon-cyan border-r-transparent border-b-neon-cyan border-l-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="font-orbitron text-neon-cyan text-sm tracking-widest">SCANNING SECTOR...</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="text-right text-[10px] font-mono text-white/30 bg-black/50 p-2 rounded self-end">
                        lat: 37.7749 N <br/>
                        lng: 122.4194 W
                    </div>
                </div>
            </div>
        </div>
    );
};