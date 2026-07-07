"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, RefreshCw, Search, Users, Wifi, CalendarClock, UserX, MailWarning, MailQuestion } from "lucide-react";
import { getOwnerActivity, OwnerActivityRow, OwnerActivitySummary } from "@/app/actions/owner-activity";
import { toast } from "sonner";

const initials = (name: string, email: string) => {
    const source = name.trim() || email;
    const parts = source.split(/[\s@._-]+/).filter(Boolean);
    return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
};

const useRelativeTime = (locale: string) =>
    useMemo(() => {
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
        return (iso: string | null) => {
            if (!iso) return null;
            const diffMs = new Date(iso).getTime() - Date.now();
            const abs = Math.abs(diffMs);
            const MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000;
            if (abs < MIN) return rtf.format(Math.round(diffMs / 1000), "second");
            if (abs < HOUR) return rtf.format(Math.round(diffMs / MIN), "minute");
            if (abs < DAY) return rtf.format(Math.round(diffMs / HOUR), "hour");
            if (abs < 30 * DAY) return rtf.format(Math.round(diffMs / DAY), "day");
            return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
        };
    }, [locale]);

export function OwnerActivityPanel() {
    const t = useTranslations("AdminOwnerActivity");
    const locale = useLocale();
    const relTime = useRelativeTime(locale);

    const [rows, setRows] = useState<OwnerActivityRow[]>([]);
    const [summary, setSummary] = useState<OwnerActivitySummary | null>(null);
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [query, setQuery] = useState("");

    const load = useCallback(async (silent = false) => {
        if (silent) setIsRefreshing(true);
        else setIsLoading(true);
        try {
            const data = await getOwnerActivity();
            setRows(data.rows);
            setSummary(data.summary);
            setUpdatedAt(data.generatedAt);
        } catch (err) {
            console.error("Owner activity fetch failed:", err);
            toast.error(t("loadError"));
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [t]);

    useEffect(() => {
        load();
        // Keep the online dots honest without hammering the server.
        const id = setInterval(() => load(true), 60_000);
        return () => clearInterval(id);
    }, [load]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
    }, [rows, query]);

    const stats = [
        { icon: Users, label: t("stats.total"), value: summary?.total ?? 0, accent: "text-[#171717] dark:text-white" },
        { icon: Wifi, label: t("stats.online"), value: summary?.onlineNow ?? 0, accent: "text-emerald-500" },
        { icon: CalendarClock, label: t("stats.active7d"), value: summary?.activeLast7d ?? 0, accent: "text-[#a39076]" },
        { icon: UserX, label: t("stats.never"), value: summary?.neverLoggedIn ?? 0, accent: "text-amber-500" },
    ];

    if (isLoading) {
        return (
            <div className="flex flex-col items-center gap-3 py-32">
                <Loader2 className="size-8 animate-spin text-admin-accent" />
                <span className="text-sm font-bold text-[#a3a3a3] uppercase tracking-widest">{t("loading")}</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((s) => (
                    <div key={s.label} className="bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest">{s.label}</span>
                            <s.icon className={`size-4 ${s.accent}`} />
                        </div>
                        <span className={`text-3xl font-bold tracking-tight ${s.accent}`}>{s.value}</span>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a3a3a3] size-4" />
                    <input
                        type="text"
                        placeholder={t("searchPlaceholder")}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full bg-white dark:bg-admin-dark-surface border border-[#f5f5f5] dark:border-admin-dark-border pl-10 pr-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-[#171717] dark:focus:ring-white outline-none dark:text-admin-dark-text-primary transition-colors"
                    />
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    {updatedAt && (
                        <span className="text-[11px] text-[#a3a3a3] font-medium">
                            {t("updated", { time: relTime(updatedAt) ?? "" })}
                        </span>
                    )}
                    <button
                        onClick={() => load(true)}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-admin-dark-surface border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl text-xs font-bold text-[#171717] dark:text-admin-dark-text-primary hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                        {t("refresh")}
                    </button>
                </div>
            </div>

            {/* Owner list */}
            <div className="bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#f5f5f5] dark:border-admin-dark-border shadow-sm overflow-hidden">
                {/* Header row (desktop) */}
                <div className="hidden md:grid grid-cols-[1fr_120px_170px_170px] gap-4 px-6 py-3 border-b border-[#f5f5f5] dark:border-admin-dark-border bg-[#fafafa] dark:bg-admin-dark-bg">
                    {[t("cols.owner"), t("cols.status"), t("cols.lastSeen"), t("cols.lastSignIn")].map((h) => (
                        <span key={h} className="text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest">{h}</span>
                    ))}
                </div>

                {filtered.length === 0 ? (
                    <div className="py-16 text-center text-sm text-[#a3a3a3] font-medium">{t("empty")}</div>
                ) : (
                    <ul className="divide-y divide-[#f5f5f5] dark:divide-admin-dark-border">
                        {filtered.map((r) => (
                            <li key={r.id} className="grid grid-cols-1 md:grid-cols-[1fr_120px_170px_170px] gap-2 md:gap-4 px-6 py-4 items-center hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg/50 transition-colors">
                                {/* Owner */}
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="relative shrink-0">
                                        <div className="w-10 h-10 rounded-full bg-[#0A1128] dark:bg-white text-white dark:text-black flex items-center justify-center text-xs font-black">
                                            {initials(r.name, r.email)}
                                        </div>
                                        {r.isOnline && (
                                            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white dark:border-admin-dark-surface" />
                                            </span>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-bold text-[#171717] dark:text-admin-dark-text-primary truncate">
                                                {r.name || r.email}
                                            </span>
                                            {r.neverLoggedIn && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider">
                                                    <UserX className="size-3" />
                                                    {t("badges.never")}
                                                </span>
                                            )}
                                            {r.neverLoggedIn && r.hasPendingInvite && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-wider">
                                                    <MailQuestion className="size-3" />
                                                    {t("badges.invitePending")}
                                                </span>
                                            )}
                                            {!r.emailConfirmedAt && !r.neverLoggedIn && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-wider">
                                                    <MailWarning className="size-3" />
                                                    {t("badges.emailUnconfirmed")}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs text-[#a3a3a3] truncate block">{r.email}</span>
                                    </div>
                                </div>

                                {/* Status */}
                                <div>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                        r.isOnline
                                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                            : "bg-[#f5f5f5] dark:bg-admin-dark-bg text-[#a3a3a3]"
                                    }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${r.isOnline ? "bg-emerald-500" : "bg-[#c4c4c4]"}`} />
                                        {r.isOnline ? t("status.online") : t("status.offline")}
                                    </span>
                                </div>

                                {/* Last seen */}
                                <div className="text-sm font-medium text-[#171717] dark:text-admin-dark-text-primary">
                                    {r.lastSeenAt ? relTime(r.lastSeenAt) : <span className="text-[#c4c4c4]">—</span>}
                                </div>

                                {/* Last sign-in */}
                                <div className="text-sm text-[#a3a3a3]">
                                    {r.lastSignInAt
                                        ? new Date(r.lastSignInAt).toLocaleString(locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                                        : <span className="text-[#c4c4c4]">—</span>}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
