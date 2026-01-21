import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion';
import { ActiveView } from './types';
import { LiveSession } from './components/LiveSession';
import { VeoGen } from './components/VeoGen';
import { HoloChat } from './components/HoloChat';
import { ImagenLab } from './components/ImagenLab';
import { DataCore } from './components/DataCore';
import { SonicLab } from './components/SonicLab';
import { MapOps } from './components/MapOps';
import { 
  Mic, Video, Image as ImageIcon, Map as MapIcon, 
  BrainCircuit, Terminal, LayoutGrid, Activity, 
  Volume2, Power, Command
} from 'lucide-react';

// --- Audio FX Engine ---
const useAudioFx = () => {
  const ctxRef = useRef<AudioContext | null>(null);
  const initCtx = () => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  };
  const playTone = (freq: number, type: OscillatorType, duration: number, vol: number = 0.1) => {
    try {
        const ctx = initCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type; osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(vol, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + duration);
    } catch(e) {}
  };
  return {
    hover: () => playTone(800, 'sine', 0.05, 0.02),
    click: () => playTone(1200, 'square', 0.1, 0.05),
    error: () => playTone(150, 'sawtooth', 0.3, 0.1),
    success: () => {
      try {
          const ctx = initCtx(); const now = ctx.currentTime;
          [440, 554, 659].forEach((f, i) => {
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.frequency.value = f; gain.gain.setValueAtTime(0.05, now + i*0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i*0.1 + 0.3);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(now + i*0.1); osc.stop(now + i*0.1 + 0.3);
          });
      } catch(e) {}
    }
  };
};

// --- 3D Tilt Card Component ---
const TiltCard: React.FC<{ item: any, onClick: () => void, fx: any }> = ({ item, onClick, fx }) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(y, [-0.5, 0.5], [10, -10]);
    const rotateY = useTransform(x, [-0.5, 0.5], [-10, 10]);

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => { x.set(0); y.set(0); };

    return (
        <motion.button
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onMouseEnter={fx.hover}
            onClick={onClick}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            className="group relative h-40 w-full bg-[#0a0a0a]/80 border border-white/5 rounded-2xl p-6 text-left overflow-hidden backdrop-blur-md transition-all hover:border-neon-cyan/40 hover:shadow-[0_0_30px_rgba(0,243,255,0.1)]"
        >
             <div style={{ transform: "translateZ(30px)" }} className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex justify-between items-start">
                    <div className="p-3 rounded-lg bg-white/5 text-white/60 group-hover:text-neon-cyan group-hover:bg-neon-cyan/10 transition-colors">
                        <item.i size={24} />
                    </div>
                    <div className="text-[10px] font-mono text-white/20 group-hover:text-neon-cyan/50 opacity-0 group-hover:opacity-100 transition-opacity">
                        ONLINE
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-orbitron font-bold text-white/90 group-hover:text-white tracking-wide">{item.t}</h3>
                    <p className="text-[10px] text-white/40 font-mono mt-1 group-hover:text-white/60">{item.d}</p>
                </div>
             </div>
             {/* Dynamic Glare */}
             <div className="absolute inset-0 z-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" style={{ transform: 'translateZ(0)' }} />
        </motion.button>
    );
}

// --- Boot Sequence Component ---
const BootSequence: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [step, setStep] = useState(0);
    const steps = ["INITIALIZING CORE...", "LOADING NEURAL NETWORKS...", "CONNECTING TO GEMINI CLOUD...", "CALIBRATING HOLOGRAPHIC DISPLAY...", "SYSTEM READY."];
    useEffect(() => {
        if (step < steps.length) { const timer = setTimeout(() => setStep(s => s + 1), 500); return () => clearTimeout(timer); }
        else { const timer = setTimeout(onComplete, 600); return () => clearTimeout(timer); }
    }, [step]);
    return (
        <motion.div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center font-mono text-neon-cyan" exit={{ opacity: 0, filter: "blur(20px)" }} transition={{ duration: 1 }}>
            <div className="w-64 mb-8 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div className="h-full bg-neon-cyan shadow-[0_0_15px_#00f3ff]" initial={{ width: "0%" }} animate={{ width: `${(step / (steps.length - 1)) * 100}%` }} />
            </div>
            <AnimatePresence mode="wait"><motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-xs tracking-[0.2em]">{step < steps.length ? `> ${steps[step]}` : <span className="animate-pulse">ACCESS GRANTED</span>}</motion.div></AnimatePresence>
        </motion.div>
    );
}

// --- Command Palette ---
const CommandPalette: React.FC<{ isOpen: boolean, onClose: () => void, onNavigate: (v: ActiveView) => void }> = ({ isOpen, onClose, onNavigate }) => {
    if (!isOpen) return null;
    const commands = [
        { label: 'DASHBOARD', icon: LayoutGrid, action: () => onNavigate(ActiveView.DASHBOARD) },
        { label: 'HOLO CHAT', icon: Terminal, action: () => onNavigate(ActiveView.HOLO_CHAT) },
        { label: 'LIVE LINK', icon: Mic, action: () => onNavigate(ActiveView.LIVE_AGENT) },
        { label: 'VEO STUDIO', icon: Video, action: () => onNavigate(ActiveView.VEO_STUDIO) },
        { label: 'DATA CORE', icon: Activity, action: () => onNavigate(ActiveView.DATA_ANALYSIS) },
        { label: 'MAP OPS', icon: MapIcon, action: () => onNavigate(ActiveView.MAP_OPS) },
        { label: 'SYSTEM REBOOT', icon: Power, action: () => window.location.reload() },
    ];
    return (
        <div className="fixed inset-0 z-[90] bg-black/90 backdrop-blur-sm flex items-start justify-center pt-[15vh]" onClick={onClose}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 shadow-2xl rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3 p-4 border-b border-white/5"><Command className="text-neon-cyan" size={18} /><input autoFocus placeholder="SEARCH CORTEX..." className="bg-transparent border-none text-white font-mono text-sm focus:ring-0 w-full focus:outline-none placeholder-white/20" /><span className="text-[10px] text-white/20 font-mono border border-white/10 px-1 rounded">ESC</span></div>
                <div className="max-h-[300px] overflow-y-auto py-2"><div className="px-4 py-2 text-[9px] text-white/30 font-orbitron tracking-widest">NAVIGATION</div>{commands.map((cmd, i) => (<button key={i} onClick={() => { cmd.action(); onClose(); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/60 hover:bg-white/5 hover:text-white hover:pl-5 transition-all text-left font-mono group"><cmd.icon size={16} className="text-white/30 group-hover:text-neon-cyan transition-colors" />{cmd.label}</button>))}</div>
            </motion.div>
        </div>
    );
};

// --- Particle Background ---
const ParticleCore: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d'); if (!ctx) return;
    let width = canvas.width = window.innerWidth; let height = canvas.height = window.innerHeight;
    const particles = Array.from({length: 40}, () => ({x: Math.random() * width, y: Math.random() * height, vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2, s: Math.random() * 2}));
    const animate = () => {
      ctx.clearRect(0,0,width,height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; if(p.x < 0 || p.x > width) p.vx *= -1; if(p.y < 0 || p.y > height) p.vy *= -1;
        ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI*2); ctx.fill();
      });
      // Draw Grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      const gridSize = 100;
      // Perspective Grid simulation
      ctx.beginPath();
      for(let x = 0; x <= width; x += gridSize) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
      for(let y = 0; y <= height; y += gridSize) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
      ctx.stroke();

      requestAnimationFrame(animate);
    };
    animate();
    const handleResize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />;
};

// --- Sidebar (Floating Dock) ---
const Sidebar: React.FC<{ active: ActiveView, onNavigate: (v: ActiveView) => void }> = ({ active, onNavigate }) => {
  const fx = useAudioFx();
  const navItems = [
    { id: ActiveView.DASHBOARD, icon: LayoutGrid, label: 'HOME' },
    { id: ActiveView.HOLO_CHAT, icon: Terminal, label: 'CHAT' },
    { id: ActiveView.LIVE_AGENT, icon: Mic, label: 'LIVE' },
    { id: ActiveView.VEO_STUDIO, icon: Video, label: 'VIDEO' },
    { id: ActiveView.IMAGEN_LAB, icon: ImageIcon, label: 'IMAGE' },
    { id: ActiveView.TTS_SYNTH, icon: Volume2, label: 'AUDIO' },
    { id: ActiveView.DATA_ANALYSIS, icon: Activity, label: 'DATA' },
    { id: ActiveView.MAP_OPS, icon: MapIcon, label: 'MAPS' },
  ];
  return (
    <motion.div initial={{ x: -60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5, duration: 0.5 }} className="fixed left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
       <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-2 flex flex-col gap-2 shadow-2xl">
        {navItems.map((item) => (
          <div key={item.id} className="relative group flex items-center">
             <button 
                onMouseEnter={fx.hover} 
                onClick={() => { fx.click(); onNavigate(item.id); }} 
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${active === item.id ? 'bg-neon-cyan text-black shadow-[0_0_15px_rgba(0,243,255,0.4)]' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
             >
                <item.icon size={18} />
             </button>
             {/* Tooltip */}
             <div className="absolute left-full ml-3 px-2 py-1 bg-black/90 border border-white/10 rounded text-[9px] font-orbitron tracking-widest text-white opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap translate-x-2 group-hover:translate-x-0">
                 {item.label}
             </div>
          </div>
        ))}
       </div>
    </motion.div>
  );
};

// --- Main App ---
const App: React.FC = () => {
  const fx = useAudioFx();
  const [booting, setBooting] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView>(ActiveView.DASHBOARD);
  const [showCmd, setShowCmd] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);

  useEffect(() => {
      const handleDown = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowCmd(s => !s); fx.click(); } }
      window.addEventListener('keydown', handleDown); return () => window.removeEventListener('keydown', handleDown);
  }, []);

  return (
    <div className="flex w-full h-screen bg-black text-white selection:bg-neon-cyan selection:text-black font-rajdhani overflow-hidden relative">
      <AnimatePresence>{booting && <BootSequence onComplete={() => setBooting(false)} />}</AnimatePresence>
      <CommandPalette isOpen={showCmd} onClose={() => setShowCmd(false)} onNavigate={setActiveView} />

      {!booting && (
          <>
            <Sidebar active={activeView} onNavigate={setActiveView} />
            <div className="flex-1 flex flex-col relative overflow-hidden bg-[#050505] ml-0 pl-0">
                
                {/* Status Header (Floating) */}
                <div className="absolute top-0 right-0 p-6 z-40 pointer-events-none flex gap-4">
                     <div className="bg-black/40 backdrop-blur border border-white/10 rounded-full px-4 py-1.5 flex items-center gap-2 text-[9px] font-mono text-white/40">
                         <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                         SYSTEM_OPTIMAL
                     </div>
                     {activeView !== ActiveView.DASHBOARD && (
                         <div className="bg-black/40 backdrop-blur border border-white/10 rounded-full px-4 py-1.5 text-[9px] font-orbitron tracking-widest text-white/60 uppercase">
                             {activeView.replace('_', ' ')}
                         </div>
                     )}
                </div>

                <main className="flex-1 overflow-hidden relative">
                    <AnimatePresence mode="wait">
                        <motion.div key={activeView} initial={{ opacity: 0, scale: 0.98, filter: 'blur(5px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 1.02, filter: 'blur(5px)' }} transition={{ duration: 0.4, ease: "circOut" }} className="h-full w-full">
                            {activeView === ActiveView.DASHBOARD && (
                                <div className="h-full flex flex-col items-center justify-center p-12 relative overflow-hidden pl-24">
                                    <ParticleCore />
                                    <div className="z-10 text-center space-y-8 max-w-4xl w-full">
                                        <div className="space-y-2">
                                            <motion.h1 initial={{y:20, opacity:0}} animate={{y:0, opacity:1}} transition={{delay:0.2}} className="text-6xl md:text-8xl font-orbitron font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/10 tracking-tighter drop-shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                                                RAISINEX<span className="text-neon-cyan">.UZ</span>
                                            </motion.h1>
                                            <motion.p initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.4}} className="text-white/40 font-mono text-sm tracking-[0.3em]">HYPER-ADVANCED NEURAL INTERFACE v5.0</motion.p>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                                            {[
                                                { t: 'HOLO CHAT', i: Terminal, d: 'Deep Reasoning', v: ActiveView.HOLO_CHAT },
                                                { t: 'LIVE LINK', i: Mic, d: 'Voice Protocol', v: ActiveView.LIVE_AGENT },
                                                { t: 'VEO STUDIO', i: Video, d: 'Kinetic Gen', v: ActiveView.VEO_STUDIO },
                                                { t: 'IMAGEN LAB', i: ImageIcon, d: 'Visual Synth', v: ActiveView.IMAGEN_LAB },
                                                { t: 'SONIC LAB', i: Volume2, d: 'Audio Gen', v: ActiveView.TTS_SYNTH },
                                                { t: 'DATA CORE', i: Activity, d: 'Analytics', v: ActiveView.DATA_ANALYSIS },
                                                { t: 'MAP OPS', i: MapIcon, d: 'Geospatial', v: ActiveView.MAP_OPS },
                                                { t: 'SYSTEM', i: BrainCircuit, d: 'Diagnostics', v: ActiveView.DASHBOARD }, // Placeholder for self
                                            ].map((item, idx) => (
                                                <TiltCard key={idx} item={item} onClick={() => { fx.click(); if(item.v !== ActiveView.DASHBOARD) setActiveView(item.v); }} fx={fx} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeView === ActiveView.LIVE_AGENT && <div className="h-full pl-20"><LiveSession /></div>}
                            {activeView === ActiveView.VEO_STUDIO && <div className="h-full pl-20"><VeoGen /></div>}
                            {activeView === ActiveView.HOLO_CHAT && <div className="h-full pl-20"><HoloChat history={chatHistory} setHistory={setChatHistory} fx={fx} /></div>}
                            {activeView === ActiveView.IMAGEN_LAB && <div className="h-full pl-20"><ImagenLab fx={fx} /></div>}
                            {activeView === ActiveView.DATA_ANALYSIS && <div className="h-full pl-20"><DataCore fx={fx} /></div>}
                            {activeView === ActiveView.TTS_SYNTH && <div className="h-full pl-20"><SonicLab fx={fx} /></div>}
                            {activeView === ActiveView.MAP_OPS && <div className="h-full pl-20"><MapOps fx={fx} /></div>}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
          </>
      )}
    </div>
  );
};

export default App;