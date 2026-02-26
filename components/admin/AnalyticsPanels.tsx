"use client";

import { motion } from "framer-motion";
import { Monitor, Smartphone, Globe, Layout, Chrome, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";

// Icons map for browsers
const BrowserIcons: any = {
    Chrome: Chrome,
    // Add others if available in Lucide or use generic
};

interface PanelProps {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    className?: string;
}

function Panel({ title, icon: Icon, children, className }: PanelProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn("bg-[#111] border border-white/5 rounded-2xl p-6 shadow-2xl flex flex-col h-full", className)}
        >
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/5 text-white/60">
                        <Icon className="size-4" />
                    </div>
                    <h3 className="text-sm font-bold text-white/90">{title}</h3>
                </div>
                <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Last 2000</div>
            </div>
            <div className="flex-1">
                {children}
            </div>
        </motion.div>
    );
}

interface AnalyticsPanelsProps {
    devices: { name: string; count: number }[];
    browsers: { name: string; count: number }[];
    sources: { name: string; count: number }[];
    total: number;
}

export function AnalyticsPanels({ devices, browsers, sources, total }: AnalyticsPanelsProps) {
    // Determine Desktop vs Mobile % (Mock logic if empty)
    const desktopCount = devices.find(d => d.name === 'Desktop')?.count || 0;
    const mobileCount = devices.find(d => d.name === 'Mobile')?.count || 0;
    const totalDevices = desktopCount + mobileCount || 1;
    const desktopPct = Math.round((desktopCount / totalDevices) * 100);
    const mobilePct = 100 - desktopPct;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Devices Panel - Gauge Style */}
            <Panel title="Devices" icon={Monitor}>
                <div className="flex flex-col items-center justify-center h-full relative py-4">
                    {/* CSS Gauge Arc */}
                    <div className="relative size-40">
                        {/* Background Arc */}
                        <svg className="size-full rotate-[135deg]" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="40" fill="none" stroke="#333" strokeWidth="8" strokeDasharray="188" strokeLinecap="round" />
                            {/* Foreground Arc (Blue for Desktop/Main) */}
                            <circle
                                cx="50" cy="50" r="40" fill="none" stroke="#3b82f6" strokeWidth="8"
                                strokeDasharray={`${(desktopPct / 100) * 188} 200`}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-black text-white">{desktopCount + mobileCount}</span>
                            <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Visits</span>
                        </div>
                    </div>

                    <div className="w-full mt-6 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <Monitor className="size-3 text-blue-500" />
                                <span className="text-white/60 font-medium">Desktop</span>
                            </div>
                            <span className="font-bold text-white">{desktopPct}%</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <Smartphone className="size-3 text-gray-500" />
                                <span className="text-white/60 font-medium">Mobile</span>
                            </div>
                            <span className="font-bold text-white">{mobilePct}%</span>
                        </div>
                    </div>
                </div>
            </Panel>

            {/* Sources Panel */}
            <Panel title="Sources" icon={Globe}>
                <div className="space-y-4">
                    {sources.map((source, i) => {
                        const pct = Math.round((source.count / total) * 100) || 0;
                        const isVercel = source.name.includes('Vercel');
                        const isLocal = source.name.includes('Localhost');

                        return (
                            <div key={source.name} className="group">
                                <div className="flex items-center justify-between text-xs mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("size-2 rounded-full",
                                            source.name === 'Google' ? 'bg-blue-500' :
                                                source.name === 'Direct' ? 'bg-gray-500' :
                                                    source.name === 'Instagram' ? 'bg-pink-500' :
                                                        source.name === 'Facebook' ? 'bg-blue-600' :
                                                            (isVercel || isLocal) ? 'bg-white' : 'bg-emerald-500'
                                        )} />
                                        <span className="font-medium text-white/80">{source.name}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-white/40">{source.count}</span>
                                        <span className="font-bold text-white min-w-[3ch] text-right">{pct}%</span>
                                    </div>
                                </div>
                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div style={{ width: `${pct}%` }} className={cn("h-full rounded-full transition-all duration-1000",
                                        source.name === 'Google' ? 'bg-blue-500' :
                                            source.name === 'Direct' ? 'bg-gray-500' :
                                                source.name === 'Instagram' ? 'bg-pink-500' :
                                                    source.name === 'Facebook' ? 'bg-blue-600' :
                                                        (isVercel || isLocal) ? 'bg-white' : 'bg-emerald-500'
                                    )} />
                                </div>
                            </div>
                        );
                    })}
                    {sources.length === 0 && <div className="text-center text-white/20 text-xs py-10">No source data available</div>}
                </div>
            </Panel>

            {/* Browsers Panel */}
            <Panel title="Browsers" icon={Layout}>
                <div className="space-y-4">
                    {browsers.map((browser, i) => {
                        const pct = Math.round((browser.count / total) * 100) || 0;
                        return (
                            <div key={browser.name} className="group flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-transparent hover:border-white/5">
                                <div className="flex items-center gap-3">
                                    <Globe className={cn("size-4",
                                        browser.name === 'Chrome' ? 'text-yellow-500' :
                                            browser.name === 'Safari' ? 'text-sky-500' :
                                                browser.name === 'Firefox' ? 'text-orange-500' : 'text-white/40'
                                    )} />
                                    <span className="text-xs font-bold text-white/80">{browser.name}</span>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-bold text-white">{browser.count}</div>
                                    <div className="text-[9px] font-bold text-white/30">{pct}%</div>
                                </div>
                            </div>
                        );
                    })}
                    {browsers.length === 0 && <div className="text-center text-white/20 text-xs py-10">No browser data available</div>}
                </div>
            </Panel>
        </div>
    );
}
