"use client";

import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getImportDisplayStatus } from "@/lib/airbnb-import/status";

// Status pill shared by the desktop table row and the mobile card.
export default function ImportStatusBadge({ item, compact = false }: { item: { status: string; imported_at: string }; compact?: boolean }) {
    const status = getImportDisplayStatus(item);
    const icon = compact ? "size-3" : "size-3.5";

    return (
        <span
            title={status === "failed" ? "This import did not save any data. Upload the CSV again." : undefined}
            className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border",
                !compact && "shadow-sm",
                status === "completed" && "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20",
                status === "processing" && "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-500/20",
                status === "failed" && "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-100 dark:border-red-500/20"
            )}
        >
            {status === "completed" && <CheckCircle2 className={icon} />}
            {status === "processing" && <Clock className={cn(icon, "animate-spin")} />}
            {status === "failed" && <AlertTriangle className={icon} />}
            {status === "failed" ? "Failed · re-import" : status}
        </span>
    );
}
