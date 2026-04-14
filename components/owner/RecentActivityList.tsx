"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Link, useRouter, usePathname } from "@/i18n/routing";
import { Eye, Calendar, UserCheck, Settings, Home, ChevronLeft, ChevronRight, RefreshCw, ExternalLink, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { OwnerSyncDetailModal } from "./OwnerSyncDetailModal";

interface ActivityItem {
    id: string;
    type: 'booking' | 'check-in' | 'maintenance' | 'blocked' | 'import';
    title: string;
    subtitle: string;
    date: string; 
    amount?: string;
    payoutAmount?: string;
    metadata?: any;
}

interface RecentActivityListProps {
    activities: ActivityItem[];
    totalCount: number;
    currentPage: number;
    className?: string;
    delay?: number;
}

export function RecentActivityList({ 
    activities, 
    totalCount, 
    currentPage, 
    className, 
    delay = 0.6 
}: RecentActivityListProps) {
    const t = useTranslations('RecentActivity');
    const tTypes = useTranslations('ActivityTypes');
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const pageSize = 10;
    const totalPages = Math.ceil(totalCount / pageSize);

    const handlePageChange = (page: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', page.toString());
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const getIcon = (type: ActivityItem['type']) => {
        switch (type) {
            case 'booking': return <Calendar className="w-4 h-4 text-green-600" />;
            case 'check-in': return <UserCheck className="w-4 h-4 text-blue-600" />;
            case 'maintenance': return <Settings className="w-4 h-4 text-orange-600" />;
            case 'blocked': return <Home className="w-4 h-4 text-gray-600" />;
            case 'import': return <Globe className="w-4 h-4 text-indigo-400" />;
            default: return <Calendar className="w-4 h-4" />;
        }
    };

    const getBgColor = (type: ActivityItem['type']) => {
        switch (type) {
            case 'booking': return "bg-green-50";
            case 'check-in': return "bg-blue-50";
            case 'maintenance': return "bg-orange-50";
            case 'blocked': return "bg-gray-50";
            case 'import': return "bg-indigo-50/40";
            default: return "bg-gray-50";
        }
    };

    const [selectedSync, setSelectedSync] = useState<any | null>(null);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay, ease: "easeOut" }}
            className={cn("bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 h-full flex flex-col", className)}
        >
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-[#0A1128]">{t('title')}</h3>
                <div className="text-xs font-bold text-gray-400">
                    {totalCount} {t('totalItems', { defaultValue: 'total items' })}
                </div>
            </div>

            <div className="space-y-4 flex-1">
                {activities.length > 0 ? (
                    <>
                        {activities.map((item, i) => (
                            <motion.div
                                onClick={() => {
                                    if (item.type === 'import') {
                                        setSelectedSync(item.metadata);
                                    }
                                }}
                                key={item.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: delay + (i * 0.05), duration: 0.4 }}
                                className={cn(
                                    "flex items-center justify-between p-4 rounded-2xl transition-all border border-transparent group",
                                    item.type === 'import' ? "cursor-pointer hover:bg-gray-50 hover:border-gray-100" : "cursor-default"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={cn("size-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", getBgColor(item.type))}>
                                        {getIcon(item.type)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-bold text-[#0A1128]">
                                                {tTypes.has(item.title) ? tTypes(item.title) : item.title}
                                            </h4>
                                            {item.type === 'import' && (
                                                <div className="flex items-center gap-2">
                                                    <div className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-bold uppercase tracking-widest leading-none">
                                                        {item.metadata?.reservations?.[0]?.check_in ? 
                                                            new Date(item.metadata.reservations[0].check_in).toLocaleDateString(locale, { month: 'short', year: 'numeric' }) 
                                                            : ''}
                                                    </div>
                                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50/50 text-indigo-400 rounded text-[10px] font-bold uppercase tracking-widest leading-none">
                                                        <Eye className="size-3" />
                                                        {t('viewDetails', { defaultValue: 'Ver Detalhes' })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5 font-medium">{item.subtitle}</p>
                                    </div>
                                </div>

                                <div className="text-right">
                                    {item.amount && (
                                        <p className="text-sm font-semibold text-emerald-600/90 mb-0.5">
                                            {item.amount}
                                        </p>
                                    )}
                                    <p className="text-[10px] text-gray-400 font-medium">{item.date}</p>
                                </div>
                            </motion.div>
                        ))}

                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-8 pt-4 border-t border-gray-50">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-xl border border-gray-100 disabled:opacity-30 hover:bg-gray-50 transition-all group"
                                >
                                    <ChevronLeft className="size-4 group-active:scale-95 transition-transform" />
                                </button>
                                
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                    .map((p, i, arr) => {
                                        const showDots = i > 0 && p !== arr[i-1] + 1;
                                        return (
                                            <div key={p} className="flex items-center gap-2">
                                                {showDots && <span className="text-gray-300">...</span>}
                                                <button
                                                    onClick={() => handlePageChange(p)}
                                                    className={cn(
                                                        "size-9 rounded-xl text-sm font-bold transition-all",
                                                        currentPage === p 
                                                            ? "bg-[#0A1128] text-white shadow-lg shadow-blue-900/20" 
                                                            : "text-gray-500 hover:bg-gray-50"
                                                    )}
                                                >
                                                    {p}
                                                </button>
                                            </div>
                                        );
                                    })}

                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-xl border border-gray-100 disabled:opacity-30 hover:bg-gray-50 transition-all group"
                                >
                                    <ChevronRight className="size-4 group-active:scale-95 transition-transform" />
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="py-12 text-center text-gray-400 text-sm font-medium italic">
                        {t('empty', { defaultValue: 'No recent activity found.' })}
                    </div>
                )}
            </div>

            <OwnerSyncDetailModal 
                isOpen={!!selectedSync} 
                batchData={selectedSync}
                onClose={() => setSelectedSync(null)} 
            />
        </motion.div>
    );
}
