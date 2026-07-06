"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Home, Calendar, CheckCircle2, Clock, ChevronDown, Loader2 } from "lucide-react";
import UndoImportButton from "./UndoImportButton";
import { getBatchReservations } from "@/app/actions/airbnb-import";
import { cn } from "@/lib/utils";

// Mobile-only card for one import batch. Mirrors HistoryTableRow but stacks the
// expandable reservation detail as mini-cards instead of a wide 7-column table.
export default function HistoryCard({ item, locale }: { item: any; locale: string }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [reservations, setReservations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const getMonthName = (m: number) => format(new Date(2026, m - 1, 1), "MMMM");
    const getPropertyTitle = (title: any) =>
        !title ? "Unknown Property" : typeof title === "string" ? title : title.en || title[locale] || Object.values(title)[0] || "Unknown Property";
    const fmt = (n: number, cur?: string) => new Intl.NumberFormat("en-IE", { style: "currency", currency: cur || "EUR" }).format(n);

    const toggleExpand = async () => {
        const next = !isExpanded;
        setIsExpanded(next);
        if (next && reservations.length === 0) {
            setIsLoading(true);
            try {
                const res = await getBatchReservations(item.id);
                if (res.success) setReservations(res.data || []);
            } catch (err) {
                console.error("Failed to fetch batch reservations:", err);
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <div className="bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border shadow-sm overflow-hidden">
            <button onClick={toggleExpand} className="w-full text-left p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <Home className="size-3.5 text-admin-accent/70 shrink-0" />
                            <span className="text-sm font-semibold truncate text-[#171717] dark:text-admin-dark-text-primary">
                                {item.properties ? getPropertyTitle(item.properties.title) : "Multiple Properties"}
                            </span>
                        </div>
                        <p className="text-[10px] text-[#a3a3a3] font-medium uppercase tracking-tighter mt-1">
                            {format(new Date(item.imported_at), "dd MMM yyyy HH:mm")} • {item.profiles?.full_name || "Admin"}
                        </p>
                    </div>
                    <ChevronDown className={cn("size-4 text-[#a3a3a3] transition-transform shrink-0", isExpanded && "rotate-180")} />
                </div>
                <div className="flex items-center gap-2 flex-wrap mt-3">
                    {item.target_month && item.target_year ? (
                        <span className="flex items-center gap-1.5 bg-admin-accent/5 dark:bg-admin-accent/10 text-admin-accent px-2.5 py-1 rounded-lg border border-admin-accent/10 text-xs font-bold">
                            <Calendar className="size-3" />
                            <span className="capitalize">{getMonthName(item.target_month)} {item.target_year}</span>
                        </span>
                    ) : (
                        <span className="text-[#a3a3a3] text-xs italic">Not specified</span>
                    )}
                    <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border",
                        item.status === "completed"
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20"
                            : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-500/20"
                    )}>
                        {item.status === "completed" ? <CheckCircle2 className="size-3" /> : <Clock className="size-3 animate-spin" />}
                        {item.status}
                    </span>
                    <span className="text-xs font-bold text-[#171717] dark:text-admin-dark-text-primary ml-auto">{item.total_records} rec.</span>
                </div>
            </button>

            {isExpanded && (
                <div className="border-t border-[#f5f5f5] dark:border-admin-dark-border p-3 bg-[#fafafa]/50 dark:bg-black/10">
                    {isLoading ? (
                        <div className="flex items-center gap-2 text-[#a3a3a3] py-6 justify-center">
                            <Loader2 className="size-4 animate-spin text-admin-accent" />
                            <span className="text-sm font-medium">Loading details...</span>
                        </div>
                    ) : reservations.length > 0 ? (
                        <div className="space-y-2">
                            {reservations.map((res) => (
                                <div key={res.id} className="bg-white dark:bg-admin-dark-surface rounded-lg border border-[#f5f5f5] dark:border-admin-dark-border p-3 text-xs">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-mono font-bold text-[#171717] dark:text-admin-dark-text-primary">{res.external_confirmation_code}</span>
                                        <span className="font-bold text-emerald-600">{fmt(res.net_amount, res.currency)}</span>
                                    </div>
                                    <p className="font-semibold mt-0.5 text-[#171717] dark:text-admin-dark-text-primary">{res.guest_name}</p>
                                    <p className="text-[#a3a3a3] mt-0.5">{format(new Date(res.check_in), "dd/MM/yy")} → {format(new Date(res.check_out), "dd/MM/yy")}</p>
                                </div>
                            ))}
                            <div className="flex items-center justify-between px-1 pt-1">
                                <span className="text-[#a3a3a3] uppercase tracking-widest text-[9px] font-bold">Total Net</span>
                                <span className="text-emerald-700 dark:text-emerald-400 text-sm font-bold">
                                    {fmt(reservations.reduce((sum, r) => sum + (r.net_amount || 0), 0), reservations[0]?.currency)}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-center text-[#a3a3a3] italic text-xs py-6">No reservations found in this batch.</p>
                    )}
                    <div className="mt-3 flex justify-end">
                        <UndoImportButton batchId={item.id} />
                    </div>
                </div>
            )}
        </div>
    );
}
