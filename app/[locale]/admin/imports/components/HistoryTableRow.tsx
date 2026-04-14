"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Home, Calendar, CheckCircle2, Clock, ChevronDown, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import UndoImportButton from "./UndoImportButton";
import { getBatchReservations } from "@/app/actions/airbnb-import";
import { cn } from "@/lib/utils";

interface HistoryTableRowProps {
    item: any;
    locale: string;
}

export default function HistoryTableRow({ item, locale }: HistoryTableRowProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [reservations, setReservations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const getMonthName = (month: number) => {
        const date = new Date(2026, month - 1, 1);
        return format(date, 'MMMM');
    };

    const getPropertyTitle = (title: any) => {
        if (!title) return 'Unknown Property';
        if (typeof title === 'string') return title;
        return title.en || title[locale] || Object.values(title)[0] || 'Unknown Property';
    };

    const toggleExpand = async () => {
        const nextState = !isExpanded;
        setIsExpanded(nextState);

        if (nextState && reservations.length === 0) {
            setIsLoading(true);
            try {
                const res = await getBatchReservations(item.id);
                if (res.success) {
                    setReservations(res.data || []);
                }
            } catch (err) {
                console.error("Failed to fetch batch reservations:", err);
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <>
            <tr 
                className={cn(
                    "hover:bg-admin-bg/50 dark:hover:bg-white/5 transition-colors cursor-pointer group",
                    isExpanded && "bg-admin-bg/30 dark:bg-white/5"
                )}
                onClick={toggleExpand}
            >
                <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        <ChevronDown className={cn("size-4 text-[#a3a3a3] transition-transform duration-200", isExpanded && "rotate-180")} />
                        <div className="flex flex-col">
                            <span className="text-sm font-bold">{format(new Date(item.imported_at), 'dd MMM yyyy')}</span>
                            <span className="text-[10px] text-[#a3a3a3] font-medium uppercase tracking-tighter">
                                {format(new Date(item.imported_at), 'HH:mm')} • {item.profiles?.full_name || 'Admin'}
                            </span>
                        </div>
                    </div>
                </td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        <Home className="size-3.5 text-admin-accent/70" />
                        <span 
                            className="text-sm font-semibold truncate max-w-[180px]"
                            title={item.properties ? getPropertyTitle(item.properties.title) : 'Multiple Properties'}
                        >
                            {item.properties ? getPropertyTitle(item.properties.title) : 'Multiple Properties'}
                        </span>
                    </div>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-[#171717] dark:text-admin-dark-text-primary">
                    {item.target_month && item.target_year ? (
                        <div className="flex items-center gap-2 bg-admin-accent/5 dark:bg-admin-accent/10 text-admin-accent px-2.5 py-1 rounded-lg border border-admin-accent/10 w-fit">
                            <Calendar className="size-3.5" />
                            <span className="capitalize font-bold text-xs">{getMonthName(item.target_month)} {item.target_year}</span>
                        </div>
                    ) : (
                        <span className="text-[#a3a3a3] text-xs italic">Not specified</span>
                    )}
                </td>
                <td className="px-6 py-4 text-sm text-center text-[#171717] dark:text-admin-dark-text-primary font-bold">
                    {item.total_records}
                </td>
                <td className="px-6 py-4">
                    <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm border",
                        item.status === 'completed' 
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20' 
                            : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-500/20'
                    )}>
                        {item.status === 'completed' ? <CheckCircle2 className="size-3.5" /> : <Clock className="size-3.5 animate-spin" />}
                        {item.status}
                    </span>
                </td>
                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <UndoImportButton batchId={item.id} />
                </td>
            </tr>

            <AnimatePresence initial={false}>
                {isExpanded && (
                    <tr className="bg-[#fafafa]/50 dark:bg-black/10">
                        <td colSpan={6} className="px-10 py-0">
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="overflow-hidden"
                            >
                                <div className="pb-6 pt-2">
                                    <div className="bg-white dark:bg-admin-dark-surface border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl shadow-sm overflow-hidden min-h-[100px] flex flex-col items-center justify-center">
                                        {isLoading ? (
                                            <div className="flex items-center gap-2 text-[#a3a3a3] p-8">
                                                <Loader2 className="size-4 animate-spin text-admin-accent" />
                                                <span className="text-sm font-medium">Loading details...</span>
                                            </div>
                                        ) : (
                                            <table className="w-full text-left text-[10px]">
                                                <thead className="bg-admin-bg/40 dark:bg-admin-dark-bg/50">
                                                    <tr className="border-b border-[#f5f5f5] dark:border-admin-dark-border">
                                                        <th className="px-4 py-3 font-bold text-[#a3a3a3] uppercase tracking-widest w-[120px]">Code</th>
                                                        <th className="px-4 py-3 font-bold text-[#a3a3a3] uppercase tracking-widest">Guest</th>
                                                        <th className="px-4 py-3 font-bold text-[#a3a3a3] uppercase tracking-widest text-center">Check-in</th>
                                                        <th className="px-4 py-3 font-bold text-[#a3a3a3] uppercase tracking-widest text-center">Check-out</th>
                                                        <th className="px-4 py-3 font-bold text-[#a3a3a3] uppercase tracking-widest text-right">Gross</th>
                                                        <th className="px-4 py-3 font-bold text-[#a3a3a3] uppercase tracking-widest text-right">Fee</th>
                                                        <th className="px-4 py-3 font-bold text-[#a3a3a3] uppercase tracking-widest text-right">Net</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[#f5f5f5] dark:divide-admin-dark-border">
                                                    {reservations.length > 0 ? (
                                                        <>
                                                            {reservations.map((res) => (
                                                                <tr key={res.id} className="hover:bg-admin-bg/30 dark:hover:bg-white/5 transition-colors">
                                                                    <td className="px-4 py-3 font-mono font-bold text-[#171717] dark:text-admin-dark-text-primary">{res.external_confirmation_code}</td>
                                                                    <td className="px-4 py-3 font-semibold text-[#171717] dark:text-admin-dark-text-primary">{res.guest_name}</td>
                                                                    <td className="px-4 py-3 text-center text-[#a3a3a3] font-medium">
                                                                        {format(new Date(res.check_in), 'dd/MM/yyyy')}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center text-[#a3a3a3] font-medium">
                                                                        {format(new Date(res.check_out), 'dd/MM/yyyy')}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right font-medium text-[#171717] dark:text-admin-dark-text-primary">
                                                                        {new Intl.NumberFormat('en-IE', { style: 'currency', currency: res.currency || 'EUR' }).format(res.total_price)}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right font-medium text-red-500/80">
                                                                        {new Intl.NumberFormat('en-IE', { style: 'currency', currency: res.currency || 'EUR' }).format(res.service_fee)}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right font-bold text-emerald-600">
                                                                        {new Intl.NumberFormat('en-IE', { style: 'currency', currency: res.currency || 'EUR' }).format(res.net_amount)}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                            {/* Total Row */}
                                                            <tr className="bg-admin-accent/[0.02] dark:bg-admin-accent/5 font-bold border-t-2 border-admin-accent/10">
                                                                <td colSpan={6} className="px-4 py-3 text-right text-[#a3a3a3] uppercase tracking-widest text-[9px]">Total Net Amount</td>
                                                            <td className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-400 text-sm">
                                                                {new Intl.NumberFormat('en-IE', { style: 'currency', currency: reservations[0]?.currency || 'EUR' }).format(
                                                                    reservations.reduce((sum, res) => sum + (res.net_amount || 0), 0)
                                                                )}
                                                            </td>
                                                            </tr>
                                                        </>
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={7} className="px-4 py-8 text-center text-[#a3a3a3] italic text-xs">No reservations found in this batch.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </td>
                    </tr>
                )}
            </AnimatePresence>
        </>
    );
}
