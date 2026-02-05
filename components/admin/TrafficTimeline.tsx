"use client";

import { cn } from "@/lib/utils";

interface TrafficTimelineProps {
    data: number[]; // Array of 60 counts
    range: '60m' | '6h' | '12h' | '24h';
}

export function TrafficTimeline({ data, range }: TrafficTimelineProps) {
    const maxCount = Math.max(...data, 1);

    const rangeLabels = {
        '60m': 'Activity (Last 60m)',
        '6h': 'Activity (Last 6h)',
        '12h': 'Activity (Last 12h)',
        '24h': 'Activity (Last 24h)'
    };

    const rangeMs = {
        '60m': 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '12h': 12 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000
    };

    return (
        <div className="bg-[#111111] dark:bg-admin-dark-surface rounded-2xl p-6 border border-white/5 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{rangeLabels[range]}</h3>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="size-1.5 rounded-full bg-sky-500" />
                        <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Requests</span>
                    </div>
                </div>
            </div>

            <div className="h-24 flex items-end gap-[1px] sm:gap-[2px]">
                {data.map((count, i) => {
                    const height = (count / maxCount) * 100;
                    return (
                        <div
                            key={i}
                            className="group relative flex-1 h-full flex items-end"
                        >
                            <div
                                style={{ height: `${Math.max(height, 4)}%` }}
                                className={cn(
                                    "w-full rounded-t-[1px] transition-all duration-500",
                                    count > 0
                                        ? "bg-sky-500 group-hover:bg-sky-400 group-hover:shadow-[0_0_12px_rgba(14,165,233,0.4)]"
                                        : "bg-white/5 group-hover:bg-white/10"
                                )}
                            />
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#171717] border border-white/10 rounded text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-xl">
                                {count} hits
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 flex justify-between border-t border-white/5 pt-3 relative">
                {[0, 0.25, 0.5, 0.75, 1].map((portion) => {
                    const time = new Date(Date.now() - rangeMs[range] * (1 - portion));
                    const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    return (
                        <div
                            key={portion}
                            className={cn(
                                "flex flex-col items-center",
                                portion === 0 ? "items-start" : portion === 1 ? "items-end" : ""
                            )}
                            style={portion > 0 && portion < 1 ? { position: 'absolute', left: `${portion * 100}%`, transform: 'translateX(-50%)' } : {}}
                        >
                            <div className="w-px h-1 bg-white/10 mb-1" />
                            <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">
                                {timeStr}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
