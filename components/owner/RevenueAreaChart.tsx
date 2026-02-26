"use client";

import { motion } from "framer-motion";
import { useState } from "react";

interface DataPoint {
    label: string;
    value: number;
}

interface RevenueAreaChartProps {
    data: DataPoint[];
    height?: number;
    delay?: number;
}

export function RevenueAreaChart({ data, height = 200, delay = 0.2 }: RevenueAreaChartProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    // Calculations for SVG scaling
    const maxValue = Math.max(...data.map(d => d.value));
    const padding = 20; // Padding inside SVG
    const chartHeight = height - padding * 2;
    const chartWidth = 100; // Using percentage width via ViewBox logic ideally, but simplified here as responsive SVG

    // Normalize data points to 0-100 range for SVG coordinates
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((d.value / maxValue) * 100);
        return { x, y, value: d.value, label: d.label };
    });

    // Create the path string (Area)
    const areaPath = `
        M 0,100 
        ${points.map(p => `L ${p.x},${p.y}`).join(" ")} 
        L 100,100 Z
    `;

    // Create the line string (Stroke)
    const linePath = `
        M 0,${points[0].y} 
        ${points.map(p => `L ${p.x},${p.y}`).join(" ")}
    `;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay, ease: "easeOut" }}
            className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 h-full flex flex-col"
        >
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-[#0A1128]">Revenue Overview</h3>
                    <p className="text-xs text-gray-400 mt-1">Last 6 Months Performance</p>
                </div>
                <div className="px-3 py-1 bg-[#FDFBF7] rounded-full text-xs font-bold text-[#C5A059] border border-[#C5A059]/10">
                    Monthly
                </div>
            </div>

            <div className="flex-1 w-full relative" style={{ minHeight: height }}>
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                    {/* Definitions for Gradient */}
                    <defs>
                        <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#C5A059" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#C5A059" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Left Axis Lines (Grid) */}
                    {[0, 25, 50, 75, 100].map((tick) => (
                        <line
                            key={tick}
                            x1="0"
                            y1={tick}
                            x2="100"
                            y2={tick}
                            stroke="#f3f4f6"
                            strokeWidth="0.5"
                            strokeDasharray="2"
                        />
                    ))}

                    {/* Area Fill */}
                    <motion.path
                        d={areaPath}
                        fill="url(#goldGradient)"
                        initial={{ opacity: 0, d: `M 0,100 ${points.map(p => `L ${p.x},100`).join(" ")} L 100,100 Z` }}
                        animate={{ opacity: 1, d: areaPath }}
                        transition={{ duration: 1, delay: delay + 0.2, ease: "easeOut" }}
                    />

                    {/* Stroke Line */}
                    <motion.path
                        d={linePath}
                        fill="none"
                        stroke="#C5A059"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 1.5, delay: delay + 0.2, ease: "easeInOut" }}
                    />

                    {/* Data Points (Interactive Hover) */}
                    {points.map((point, i) => (
                        <g key={i}>
                            <circle
                                cx={point.x}
                                cy={point.y}
                                r="0" // Invisible trigger area
                                stroke="transparent"
                                strokeWidth="10" // Larger hit area
                                fill="transparent"
                                className="cursor-pointer"
                                onMouseEnter={() => setHoveredIndex(i)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            />
                            {/* Visible Dot on Hover or active */}
                            <motion.circle
                                cx={point.x}
                                cy={point.y}
                                r={hoveredIndex === i ? 2 : 0}
                                fill="#fff"
                                stroke="#0A1128"
                                strokeWidth="1"
                                animate={{ r: hoveredIndex === i ? 2.5 : 0, opacity: hoveredIndex === i ? 1 : 0 }}
                            />
                        </g>
                    ))}
                </svg>

                {/* Tooltip Overhead */}
                {hoveredIndex !== null && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bg-[#0A1128] text-white text-xs px-3 py-1.5 rounded-lg shadow-xl pointer-events-none z-10 flex flex-col items-center"
                        style={{
                            left: `${points[hoveredIndex].x}%`,
                            top: `${points[hoveredIndex].y - 15}%`,
                            transform: 'translateX(-50%)'
                        }}
                    >
                        <span className="font-bold">€{points[hoveredIndex].value.toLocaleString()}</span>
                        <span className="text-[10px] opacity-70">{points[hoveredIndex].label}</span>
                        {/* Little triangle arrow */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0A1128]" />
                    </motion.div>
                )}
            </div>

            {/* X Axis Labels */}
            <div className="flex justify-between mt-2 px-1">
                {data.map((d, i) => (
                    <span key={i} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center w-8">
                        {d.label}
                    </span>
                ))}
            </div>
        </motion.div>
    );
}
