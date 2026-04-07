"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

interface OccupancyDonutProps {
    occupied: number;
    available: number;
    maintenance: number;
    delay?: number;
}

export function OccupancyDonut({ occupied, available, maintenance, delay = 0.4 }: OccupancyDonutProps) {
    const t = useTranslations('OccupancyDonut');
    const total = occupied + available + maintenance;
    const occupiedPct = total > 0 ? (occupied / total) * 100 : 0;
    const availablePct = total > 0 ? (available / total) * 100 : 0;
    const maintenancePct = total > 0 ? (maintenance / total) * 100 : 0;

    // Radius and Circumference
    const radius = 40;
    const circumference = 2 * Math.PI * radius;

    // Stroke Dash Arrays
    const occupiedStroke = (occupiedPct / 100) * circumference;
    const availableStroke = (availablePct / 100) * circumference;
    const maintenanceStroke = (maintenancePct / 100) * circumference;

    // Rotation offsets
    const occupiedOffset = 0;
    const availableOffset = occupiedStroke; // Starts after occupied
    const maintenanceOffset = occupiedStroke + availableStroke; // Starts after available

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay, ease: "easeOut" }}
            className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-full"
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#0A1128]">{t('title')}</h3>
                <div className="p-2 bg-gray-50 rounded-full">
                    {/* Placeholder icon or standard ellipsis */}
                    <div className="flex gap-0.5">
                        <div className="w-1 h-1 bg-gray-400 rounded-full" />
                        <div className="w-1 h-1 bg-gray-400 rounded-full" />
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-center relative py-4">
                {/* Donut Chart - Using key to force clean re-animation on data change */}
                <svg 
                    key={`${occupied}-${available}-${maintenance}`}
                    width="180" height="180" viewBox="0 0 100 100" className="rotate-[-90deg]"
                >
                    <circle cx="50" cy="50" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="10" />

                    {/* Segments */}
                    {/* Available (Navy) - Putting it first as background/base */}
                    <motion.circle
                        cx="50" cy="50" r={radius}
                        fill="none"
                        stroke="#0A1128"
                        strokeWidth="10"
                        strokeDasharray={`${circumference} ${circumference}`}
                        strokeDashoffset={0}
                        initial={{ strokeDasharray: `0 ${circumference}` }}
                        animate={{ strokeDasharray: `${circumference} ${circumference}` }}
                        transition={{ duration: 1, delay: delay + 0.1, ease: "easeOut" }}
                    />

                    {/* Occupied (Gold) */}
                    <motion.circle
                        cx="50" cy="50" r={radius}
                        fill="none"
                        stroke="#C5A059"
                        strokeWidth="10"
                        strokeDasharray={`${occupiedStroke} ${circumference}`}
                        strokeDashoffset={0}
                        initial={{ strokeDasharray: `0 ${circumference}` }}
                        animate={{ strokeDasharray: `${occupiedStroke} ${circumference}` }}
                        transition={{ duration: 1, delay: delay + 0.3, ease: "easeOut" }}
                    />

                    {/* Maintenance (Red) */}
                    {maintenance > 0 && (
                        <motion.circle
                            cx="50" cy="50" r={radius}
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="10"
                            strokeDasharray={`${maintenanceStroke} ${circumference}`}
                            strokeDashoffset={-occupiedStroke}
                            initial={{ strokeDasharray: `0 ${circumference}` }}
                            animate={{ strokeDasharray: `${maintenanceStroke} ${circumference}` }}
                            transition={{ duration: 1, delay: delay + 0.5, ease: "easeOut" }}
                        />
                    )}
                </svg>

                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-playfair font-bold text-[#0A1128]">{total}</span>
                    <span className="text-[9px] uppercase tracking-widest text-[#0A1128]/50 font-bold">{t('properties')}</span>
                </div>
            </div>

            {/* Legend */}
            <div className="space-y-3 mt-2">
                <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#C5A059]" />
                        <span className="text-gray-500 font-medium">{t('occupied')}</span>
                    </div>
                    <span className="font-bold text-[#0A1128]">{occupied}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#0A1128]" />
                        <span className="text-gray-500 font-medium">{t('available')}</span>
                    </div>
                    <span className="font-bold text-[#0A1128]">{available}</span>
                </div>
                {maintenance > 0 && (
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                            <span className="text-gray-500 font-medium">{t('maintenance')}</span>
                        </div>
                        <span className="font-bold text-[#0A1128]">{maintenance}</span>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
