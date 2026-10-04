"use client";

import { useTranslations } from "next-intl";

import { format } from "date-fns";
import { AlertCircle, Trash2, Loader2 } from "lucide-react";
import { BlockedDate } from "@/app/actions/blocked-dates";

interface BlockedDatesListProps {
    blockedDates: BlockedDate[];
    isLoading: boolean;
    onDelete: (id: string) => void;
}

export function BlockedDatesList({ blockedDates, isLoading, onDelete }: BlockedDatesListProps) {
    const t = useTranslations('PropertyEditor');

    // "Active" = still running or upcoming, soonest first (past blocks are history, not actionable).
    const todayISO = format(new Date(), 'yyyy-MM-dd');
    const activeBlocks = blockedDates
        .filter((b) => b.end_date.slice(0, 10) > todayISO)
        .sort((a, b) => a.start_date.localeCompare(b.start_date) || a.end_date.localeCompare(b.end_date));

    if (isLoading && activeBlocks.length === 0) {
        return (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-white/5 rounded-xl border border-dashed dark:border-white/10 text-sm flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('pricing.loadingBlocks')}
            </div>
        );
    }

    if (activeBlocks.length === 0) {
        return (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-white/5 rounded-xl border border-dashed dark:border-white/10 text-sm">
                {t('pricing.noBlocksFound')}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {activeBlocks.map((block) => (
                <div key={block.id} className="flex items-center justify-between p-4 bg-white dark:bg-admin-dark-surface border border-gray-100 dark:border-white/10 rounded-xl shadow-sm hover:border-gray-200 dark:hover:border-white/20 transition-colors">
                    <div className="space-y-1">
                        <p className="text-sm font-bold text-navy-900 dark:text-white">
                            {format(new Date(block.start_date), 'dd MMM yyyy')} - {format(new Date(block.end_date), 'dd MMM yyyy')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                            <AlertCircle className="h-3 w-3" />
                            {block.reason}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => onDelete(block.id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                        title={t('pricing.removeBlockAction')}
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}
