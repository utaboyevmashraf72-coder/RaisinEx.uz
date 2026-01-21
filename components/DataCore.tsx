import React, { useState } from 'react';
import { Activity, BarChart2, FileText, Play, Database } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { CyberChart } from './CyberChart';

interface DataCoreProps {
    fx: any;
}

const SAMPLE_DATA = `Month,Revenue,Users,Churn
Jan,12000,500,2%
Feb,15000,650,1.8%
Mar,18500,800,1.5%
Apr,22000,1050,1.2%
May,28000,1400,1.1%
Jun,35000,1900,0.9%`;

export const DataCore: React.FC<DataCoreProps> = ({ fx }) => {
    const [dataInput, setDataInput] = useState('');
    const [query, setQuery] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleAnalysis = async () => {
        if (!dataInput || !query) return;
        fx.click();
        setIsProcessing(true);
        try {
            const res = await geminiService.analyzeData(dataInput, query);
            setResult(res);
            fx.success();
        } catch (e) {
            fx.error();
        } finally {
            setIsProcessing(false);
        }
    };

    const loadSample = () => {
        fx.click();
        setDataInput(SAMPLE_DATA);
        setQuery('Project revenue growth for Q3 based on current trajectory');
    };

    return (
        <div className="h-full flex flex-col lg:flex-row p-8 gap-8 bg-[#050505]">
            {/* Input Console */}
            <div className="w-full lg:w-1/3 flex flex-col gap-6">
                <div className="bg-panel border border-white/10 p-6 flex-1 flex flex-col rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4 text-neon-green">
                        <Activity className="animate-pulse" />
                        <h3 className="font-orbitron font-bold text-white tracking-widest">NEURAL ANALYTICS</h3>
                    </div>

                    <div className="flex-1 flex flex-col gap-4">
                        <div className="relative">
                            <label className="text-[10px] font-mono text-white/50 mb-2 flex justify-between">
                                <span>> DATA_STREAM_INPUT</span>
                                <button onClick={loadSample} className="text-neon-green hover:underline flex items-center gap-1">
                                    <Database size={10} /> LOAD_SAMPLE
                                </button>
                            </label>
                            <textarea 
                                value={dataInput} 
                                onChange={e => setDataInput(e.target.value)} 
                                className="w-full h-48 bg-black border border-white/10 p-4 font-mono text-[10px] text-neon-green/80 focus:border-neon-green focus:outline-none resize-none rounded-lg custom-scroll" 
                                placeholder="PASTE CSV / JSON DATA STREAM..." 
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-mono text-white/50 mb-2 block">> ANALYTICAL_QUERY</label>
                            <input 
                                value={query} 
                                onChange={e => setQuery(e.target.value)} 
                                className="w-full bg-black border border-white/10 p-4 font-mono text-sm text-white focus:border-neon-green focus:outline-none rounded-lg" 
                                placeholder="e.g. 'Predict Q4 growth trends'" 
                            />
                        </div>
                    </div>

                    <button 
                        onClick={handleAnalysis} 
                        disabled={isProcessing || !dataInput} 
                        className="mt-8 w-full py-4 bg-neon-green/10 border border-neon-green text-neon-green hover:bg-neon-green hover:text-black transition-all font-orbitron font-bold tracking-widest disabled:opacity-50 rounded-lg flex items-center justify-center gap-2 group"
                    >
                        {isProcessing ? (
                            <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/> PROCESSING NODE...</>
                        ) : (
                            <><Play size={16} className="group-hover:translate-x-1 transition-transform"/> EXECUTE ANALYSIS</>
                        )}
                    </button>
                </div>
            </div>

            {/* Visualization Core */}
            <div className="flex-1 bg-black border border-white/10 rounded-xl relative overflow-hidden flex flex-col p-8">
                {/* Background Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

                {result ? (
                    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10">
                        <div className="mb-8 flex items-start justify-between border-b border-white/10 pb-6">
                            <div>
                                <h2 className="text-3xl font-orbitron text-white mb-2">{result.chartConfig?.title || 'ANALYSIS COMPLETE'}</h2>
                                <div className="flex items-center gap-2 text-neon-green font-mono text-xs">
                                    <FileText size={12} />
                                    <span>CONFIDENCE SCORE: 98.4%</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] text-white/40 font-mono mb-1">PROJECTION MODEL</div>
                                <div className="text-xl font-bold text-white font-orbitron">GEMINI-3-PRO</div>
                            </div>
                        </div>

                        <div className="flex-1 border border-white/5 bg-white/5 rounded-lg relative overflow-hidden flex items-center justify-center backdrop-blur-sm mb-6">
                            <CyberChart config={result.chartConfig} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white/5 p-4 rounded border-l-2 border-neon-green">
                                <h4 className="text-[10px] font-orbitron text-white/50 mb-2">EXECUTIVE SUMMARY</h4>
                                <p className="font-mono text-xs text-white/80 leading-relaxed">{result.summary}</p>
                            </div>
                            {result.details && (
                                <div className="bg-white/5 p-4 rounded border-l-2 border-white/20">
                                    <h4 className="text-[10px] font-orbitron text-white/50 mb-2">KEY INSIGHTS</h4>
                                    <div className="font-mono text-[10px] text-white/60 leading-relaxed whitespace-pre-wrap">
                                        {result.details}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-white/20 relative z-10">
                        <BarChart2 size={80} className="mb-6 opacity-20" strokeWidth={1} />
                        <h3 className="font-orbitron tracking-[0.2em] text-lg text-white/40 mb-2">AWAITING DATA STREAM</h3>
                        <p className="font-mono text-xs text-white/30">Connect input vector to initiate visualization</p>
                    </div>
                )}
            </div>
        </div>
    );
};