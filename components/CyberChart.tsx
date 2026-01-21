import React from 'react';
import { motion } from 'framer-motion';

export const CyberChart: React.FC<{ config: any }> = ({ config }) => {
    if (!config || !config.data || !config.labels) return null;
    
    const maxVal = Math.max(...config.data) || 100;
    const height = 300;
    const width = 600;
    const padding = 40;
    const chartW = width - padding * 2;
    const chartH = height - padding * 2;

    const points = config.data.map((d: number, i: number) => {
        const x = padding + (i / (config.data.length - 1)) * chartW;
        const y = height - padding - (d / maxVal) * chartH;
        return `${x},${y}`;
    }).join(' ');

    return (
       <div className="w-full h-full flex items-center justify-center relative select-none">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-2xl overflow-visible">
              {/* Grid Lines with Animation */}
              {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
                  <motion.line 
                    key={t}
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    x1={padding} 
                    y1={height - padding - (t * chartH)} 
                    x2={width - padding} 
                    y2={height - padding - (t * chartH)} 
                    stroke="#ffffff" 
                    strokeOpacity="0.1" 
                    strokeDasharray="4 4"
                  />
              ))}

              {/* Data Visualization */}
              {config.type === 'line' ? (
                <>
                    <motion.polyline 
                        points={points}
                        fill="none"
                        stroke="#00f3ff"
                        strokeWidth="2"
                        filter="drop-shadow(0 0 4px #00f3ff)"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                    />
                    {config.data.map((d: number, i: number) => {
                        const x = padding + (i / (config.data.length - 1)) * chartW;
                        const y = height - padding - (d / maxVal) * chartH;
                        return (
                            <motion.circle 
                                key={i}
                                cx={x} cy={y} r="3"
                                fill="#000" stroke="#00f3ff" strokeWidth="2"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 1.5 + (i * 0.05) }}
                                whileHover={{ scale: 2, fill: "#00f3ff" }}
                            />
                        );
                    })}
                </>
              ) : (
                config.data.map((d: number, i: number) => {
                    const barW = (chartW / config.data.length) * 0.6;
                    const x = padding + (i * (chartW / config.data.length)) + (chartW / config.data.length - barW)/2;
                    const h = (d / maxVal) * chartH;
                    return (
                        <motion.rect 
                            key={i}
                            x={x}
                            y={height - padding} // Start from bottom
                            width={barW}
                            height={0}
                            animate={{ y: height - padding - h, height: h }}
                            transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                            fill="rgba(0, 243, 255, 0.2)"
                            stroke="#00f3ff"
                            strokeWidth="1"
                            className="cursor-pointer hover:fill-neon-cyan transition-colors"
                        />
                    )
                })
              )}

              {/* Labels */}
              {config.labels.map((l: string, i: number) => {
                  if (i % Math.ceil(config.labels.length / 6) !== 0) return null;
                  const x = padding + (i / (config.labels.length - 1)) * chartW;
                  return (
                      <motion.text 
                        key={i} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 0.5, y: 0 }}
                        transition={{ delay: 1 + (i * 0.1) }}
                        x={x} y={height - 10} 
                        fill="#ffffff" 
                        fontSize="10" 
                        textAnchor="middle" 
                        fontFamily="monospace"
                      >
                          {l}
                      </motion.text>
                  );
              })}
          </svg>
       </div>
    );
};