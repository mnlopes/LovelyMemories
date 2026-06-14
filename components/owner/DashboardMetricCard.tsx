"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, Minus, Wallet, Building2, Users, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const IconMap = {
    wallet: Wallet,
    building: Building2,
    users: Users,
    trending: TrendingUp
};

export type MetricIconName = keyof typeof IconMap;

interface DashboardMetricCardProps {
    title: string;
    value: string | number;
    iconName: MetricIconName;
    trend?: {
        value: number; // percentage, e.g. 15.4
        label?: string; // e.g. "vs last month"
    };
    delay?: number;
}

export function DashboardMetricCard({ title, value, iconName, trend, delay = 0 }: DashboardMetricCardProps) {
    const Icon = IconMap[iconName];
    const isPositive = trend && trend.value > 0;
    const isNeutral = trend && trend.value === 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: "easeOut" }}
            className="bg-white rounded-[20px] p-4 lg:p-6 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] border border-gray-100 relative overflow-hidden group hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] transition-all duration-300"
        >
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] group-hover:scale-110 transition-all duration-500">
                <Icon className="w-24 h-24 rotate-12" />
            </div>

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-[#FDFBF7] text-[#0A1128]/80 group-hover:bg-[#0A1128] group-hover:text-[#C5A059] transition-colors duration-300 shadow-sm">
                        <Icon className="w-5 h-5" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-[11px] lg:text-sm font-bold text-[#0A1128]/60 uppercase tracking-wider">{title}</h3>
                </div>

                <div className="flex items-end justify-between gap-2">
                    <div className="flex flex-col">
                        <span className="text-2xl lg:text-3xl font-playfair font-bold text-[#0A1128] tracking-tight">{value}</span>
                        {trend && (
                            <div className="flex items-center gap-2 mt-2">
                                <span className={cn(
                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide",
                                    isPositive ? "bg-green-50 text-green-700" :
                                        isNeutral ? "bg-gray-50 text-gray-600" : "bg-red-50 text-red-700"
                                )}>
                                    {isPositive ? <ArrowUpRight className="w-3 h-3" /> :
                                        isNeutral ? <Minus className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                    {Math.abs(trend.value)}%
                                </span>
                                {trend.label && (
                                    <span className="text-[10px] text-gray-400 font-medium">{trend.label}</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
