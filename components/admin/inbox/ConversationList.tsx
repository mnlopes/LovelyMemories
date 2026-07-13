"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Bot, BotOff, Inbox, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InboxConversation, QueueItem } from "@/app/actions/ai-inbox";

type Filter = "all" | "human" | "bot";

function initials(name: string | null): string {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function timeAgo(iso: string | null): string {
    if (!iso) return "";
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "agora";
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
}

export function ConversationList(props: {
    conversations: InboxConversation[];
    queue: QueueItem[];
    selectedId: string | null;
    onSelect: (reservationId: string) => void;
    loading: boolean;
}) {
    const t = useTranslations("AiInbox");
    const [filter, setFilter] = useState<Filter>("all");

    const filtered = useMemo(() => {
        if (props.loading) return [];
        switch (filter) {
            case "human": return props.conversations.filter((c) => !c.botEnabled || c.pendingDrafts > 0);
            case "bot": return props.conversations.filter((c) => c.botEnabled);
            default: return props.conversations;
        }
    }, [props.conversations, props.loading, filter]);

    // Fila humana sempre no topo, depois o resto por atividade
    const ordered = useMemo(() => {
        const queued = filtered.filter((c) => c.pendingDrafts > 0);
        const rest = filtered.filter((c) => c.pendingDrafts === 0);
        return [...queued, ...rest];
    }, [filtered]);

    return (
        <div className="flex h-full min-h-0 flex-col">
            {/* Filtros */}
            <div className="flex items-center gap-1 p-3 pb-2">
                {([["all", t("conversations")], ["human", t("needsHuman")], ["bot", t("botOn")]] as [Filter, string][]).map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={cn(
                            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                            filter === key
                                ? "bg-[#171717] text-white dark:bg-white dark:text-black"
                                : "text-[#a3a3a3] hover:bg-[#f5f5f5] dark:hover:bg-white/10",
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
                {props.loading && (
                    <div className="space-y-2 p-1" aria-hidden>
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex animate-pulse items-center gap-3 rounded-xl p-3">
                                <div className="h-9 w-9 rounded-full bg-[#f0f0f0] dark:bg-white/10" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 w-2/5 rounded bg-[#f0f0f0] dark:bg-white/10" />
                                    <div className="h-3 w-4/5 rounded bg-[#f5f5f5] dark:bg-white/5" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!props.loading && ordered.length === 0 && (
                    <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
                        <Inbox className="h-7 w-7 text-[#d4d4d4]" />
                        <p className="text-sm text-[#a3a3a3]">{t("noConversations")}</p>
                    </div>
                )}

                <ul className="space-y-0.5">
                    {ordered.map((c) => {
                        const selected = props.selectedId === c.reservationId;
                        const queued = c.pendingDrafts > 0;
                        return (
                            <li key={c.reservationId}>
                                <button
                                    onClick={() => props.onSelect(c.reservationId)}
                                    className={cn(
                                        "group flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors",
                                        selected
                                            ? "bg-[#f5f5f5] dark:bg-white/10"
                                            : "hover:bg-[#fafafa] dark:hover:bg-white/5",
                                        queued && !selected && "bg-amber-50/70 hover:bg-amber-50 dark:bg-amber-500/10 dark:hover:bg-amber-500/15",
                                    )}
                                >
                                    <div className={cn(
                                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                                        queued
                                            ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
                                            : "bg-[#ebebeb] text-[#525252] dark:bg-white/10 dark:text-white/80",
                                    )}>
                                        {initials(c.guestName)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline justify-between gap-2">
                                            <span className="truncate text-sm font-semibold text-[#171717] dark:text-admin-dark-text-primary">
                                                {c.guestName ?? "—"}
                                            </span>
                                            <span className="shrink-0 text-[11px] tabular-nums text-[#a3a3a3]">
                                                {timeAgo(c.lastMessageAt)}
                                            </span>
                                        </div>
                                        <p className="truncate text-xs text-[#737373] dark:text-white/50">
                                            {c.propertyName ?? ""}
                                        </p>
                                        <p className="mt-0.5 truncate text-xs text-[#a3a3a3]">
                                            {c.lastMessagePreview ?? ""}
                                        </p>
                                        <div className="mt-1.5 flex items-center gap-1.5">
                                            {queued ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                                                    <TriangleAlert className="h-3 w-3" />
                                                    {t("pendingCount", { count: c.pendingDrafts })}
                                                </span>
                                            ) : c.botEnabled ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                                    <Bot className="h-3 w-3" />
                                                    {t("botOn")}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-[#f0f0f0] px-2 py-0.5 text-[10px] font-semibold text-[#525252] dark:bg-white/10 dark:text-white/60">
                                                    <BotOff className="h-3 w-3" />
                                                    {t("humanActive")}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}
