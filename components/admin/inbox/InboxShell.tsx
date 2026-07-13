"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, MessagesSquare, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getInboxData, getThread, type InboxData, type ThreadData } from "@/app/actions/ai-inbox";
import { ConversationList } from "./ConversationList";

/**
 * Shell do inbox: 3 painéis (lista · thread · contexto) com auto-refresh 30s.
 * Mobile: navegação em stack (lista → thread com voltar).
 * ThreadView/ContextPanel/BotSettings entram na task seguinte — este shell
 * já gere seleção, dados e layout.
 */
export function InboxShell() {
    const t = useTranslations("AiInbox");
    const [data, setData] = useState<InboxData | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [thread, setThread] = useState<ThreadData | null>(null);
    const [threadLoading, setThreadLoading] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const selectedRef = useRef<string | null>(null);

    const refresh = useCallback(async () => {
        try {
            const d = await getInboxData();
            setData(d);
            if (selectedRef.current) {
                const th = await getThread(selectedRef.current);
                setThread(th);
            }
        } catch {
            /* transitório — o próximo tick volta a tentar */
        }
    }, []);

    useEffect(() => {
        void refresh();
        const id = setInterval(() => void refresh(), 30_000);
        return () => clearInterval(id);
    }, [refresh]);

    const onSelect = useCallback(async (reservationId: string) => {
        setSelectedId(reservationId);
        selectedRef.current = reservationId;
        setThreadLoading(true);
        try {
            setThread(await getThread(reservationId));
        } finally {
            setThreadLoading(false);
        }
    }, []);

    const selectedConversation = data?.conversations.find((c) => c.reservationId === selectedId) ?? null;
    const queueForSelected = data?.queue.filter((q) => q.reservationId === selectedId) ?? [];

    return (
        <div className="flex h-[calc(100vh-180px)] min-h-[480px] flex-col overflow-hidden rounded-2xl border border-[#f5f5f5] bg-white shadow-sm dark:border-admin-dark-border dark:bg-admin-dark-surface">
            {/* Header do inbox */}
            <div className="flex items-center justify-between border-b border-[#f5f5f5] px-4 py-3 dark:border-admin-dark-border">
                <div className="flex items-center gap-2">
                    <MessagesSquare className="h-4 w-4 text-[#737373] dark:text-white/60" />
                    <span className="text-sm font-semibold text-[#171717] dark:text-admin-dark-text-primary">{t("title")}</span>
                    {data && !data.globalBotEnabled && (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300">
                            {t("botOff")}
                        </span>
                    )}
                    {data && data.queue.length > 0 && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                            {t("queue")} · {data.queue.length}
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setShowSettings((v) => !v)}
                    className={cn(
                        "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                        showSettings
                            ? "bg-[#171717] text-white dark:bg-white dark:text-black"
                            : "text-[#737373] hover:bg-[#f5f5f5] dark:text-white/60 dark:hover:bg-white/10",
                    )}
                    aria-pressed={showSettings}
                >
                    <Settings2 className="h-3.5 w-3.5" />
                    {t("settings")}
                </button>
            </div>

            {/* Corpo: 3 painéis (desktop) / stack (mobile) */}
            <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_320px]">
                {/* Painel 1 — lista */}
                <aside className={cn(
                    "min-h-0 border-r border-[#f5f5f5] dark:border-admin-dark-border",
                    selectedId ? "hidden md:block" : "block",
                )}>
                    <ConversationList
                        conversations={data?.conversations ?? []}
                        queue={data?.queue ?? []}
                        selectedId={selectedId}
                        onSelect={onSelect}
                        loading={data === null}
                    />
                </aside>

                {/* Painel 2 — thread (placeholder até à task do ThreadView) */}
                <section className={cn("min-h-0 flex-col", selectedId ? "flex" : "hidden md:flex")}>
                    {selectedId && (
                        <div className="flex items-center gap-2 border-b border-[#f5f5f5] px-3 py-2 md:hidden dark:border-admin-dark-border">
                            <button
                                onClick={() => { setSelectedId(null); selectedRef.current = null; }}
                                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[#737373] hover:bg-[#f5f5f5] dark:text-white/60 dark:hover:bg-white/10"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                {t("conversations")}
                            </button>
                            <span className="truncate text-sm font-semibold dark:text-admin-dark-text-primary">
                                {selectedConversation?.guestName ?? ""}
                            </span>
                        </div>
                    )}
                    <div className="flex min-h-0 flex-1 items-center justify-center p-6">
                        {!selectedId ? (
                            <div className="text-center">
                                <MessagesSquare className="mx-auto h-8 w-8 text-[#e5e5e5] dark:text-white/15" />
                                <p className="mt-2 text-sm text-[#a3a3a3]">{t("selectConversation")}</p>
                            </div>
                        ) : threadLoading ? (
                            <div className="w-full max-w-md space-y-3" aria-hidden>
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className={cn("h-12 animate-pulse rounded-2xl bg-[#f5f5f5] dark:bg-white/5", i % 2 ? "ml-16" : "mr-16")} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-[#a3a3a3]">
                                {thread?.entries.length
                                    ? `${thread.entries.length} ${t("conversations").toLowerCase()} · ${queueForSelected.length} ${t("queue").toLowerCase()}`
                                    : t("noMessages")}
                            </p>
                        )}
                    </div>
                </section>

                {/* Painel 3 — contexto (entra na task seguinte) */}
                <aside className="hidden min-h-0 border-l border-[#f5f5f5] xl:block dark:border-admin-dark-border" />
            </div>
        </div>
    );
}
