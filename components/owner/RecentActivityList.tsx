"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { ArrowRight, Calendar, UserCheck, Settings, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityItem {
    id: string;
    type: 'booking' | 'check-in' | 'maintenance' | 'blocked';
    title: string;
    subtitle: string;
    date: string; // e.g., "Today, 10:00 AM"
    amount?: string; // e.g. "+ €450"
}

interface RecentActivityListProps {
    activities: ActivityItem[];
    className?: string;
    delay?: number;
}

export function RecentActivityList({ activities, className, delay = 0.6 }: RecentActivityListProps) {
    const getIcon = (type: ActivityItem['type']) => {
        switch (type) {
            case 'booking': return <Calendar className="w-4 h-4 text-green-600" />;
            case 'check-in': return <UserCheck className="w-4 h-4 text-blue-600" />;
            case 'maintenance': return <Settings className="w-4 h-4 text-orange-600" />;
            case 'blocked': return <Home className="w-4 h-4 text-gray-600" />;
            default: return <Calendar className="w-4 h-4" />;
        }
    };

    const getBgColor = (type: ActivityItem['type']) => {
        switch (type) {
            case 'booking': return "bg-green-50";
            case 'check-in': return "bg-blue-50";
            case 'maintenance': return "bg-orange-50";
            case 'blocked': return "bg-gray-50";
            default: return "bg-gray-50";
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay, ease: "easeOut" }}
            className={cn("bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 h-full flex flex-col", className)}
        >
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-[#0A1128]">Recent Activity</h3>
                <Link href="/owner/properties" className="text-sm font-bold text-[#C5A059] hover:text-[#9E8C6D] flex items-center gap-1 transition-colors">
                    View All <ArrowRight className="w-4 h-4" />
                </Link>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {activities.map((item, i) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: delay + (i * 0.1), duration: 0.4 }}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-[#FAFAFA] transition-colors group cursor-default"
                    >
                        <div className="flex items-center gap-4">
                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", getBgColor(item.type))}>
                                {getIcon(item.type)}
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-[#0A1128]">{item.title}</h4>
                                <p className="text-xs text-gray-500 mt-0.5">{item.subtitle}</p>
                            </div>
                        </div>

                        <div className="text-right">
                            {item.amount && (
                                <p className="text-sm font-bold text-[#0A1128] mb-0.5">{item.amount}</p>
                            )}
                            <p className="text-[10px] text-gray-400 font-medium">{item.date}</p>
                        </div>
                    </motion.div>
                ))}

                {activities.length === 0 && (
                    <div className="text-center py-10 text-gray-400 text-sm">
                        No recent activity found.
                    </div>
                )}
            </div>
        </motion.div>
    );
}
