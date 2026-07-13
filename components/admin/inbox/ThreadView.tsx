"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { BookOpenCheck, PencilLine, RefreshCw, Send, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    sendReply, updateDraft, dismissDraft, regenerateDraft,
    type QueueItem, type ThreadData,
} from "@/app/actions/ai-inbox";

function fmtTime(iso: string | null): string {
    if (!iso) return "";
    return new Date(iso).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function fmtLatency(ms: number | null): string | null {
    if (ms === null || ms === undefined) return null;
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export function ThreadView(props: {
    reservationId: string;
    thread: ThreadData;
    queue: QueueItem[];
    onChanged: () => void;
}) {
    const t = useTranslations("AiInbox");
    const [isPending, startTransition] = useTransition();
    const [reply, setReply] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState("");
    const [error, setError] = useState<string | null>(null);

    const act = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
        setError(null);
        startTransition(async () => {
            const res = await fn();
            if (!res.ok) setError(res.error ?? "Falhou");
            props.onChanged();
        });
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {/* Mensagens */}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                {props.thread.entries.length === 0 && props.queue.length === 0 && (
                    <p className="pt-10 text-center text-sm text-[#a3a3a3]">{t("noMessages")}</p>
                )}

                {props.thread.entries.map((m) => {
                    const guest = m.role === "guest";
                    const latency = fmtLatency(m.latencyMs);
                    return (
                        <div key={m.id} className={cn("flex", guest ? "justify-start" : "justify-end")}>
                            <div className={cn("max-w-[78%]", guest ? "mr-10" : "ml-10")}>
                                {m.sentByBot ? (
                                    /* Assinatura do inbox: auto-resposta com citação do knowledge */
                                    <div className="rounded-2xl rounded-br-md border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 dark:border-emerald-500/25 dark:bg-emerald-500/10">
                                        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                                            <Sparkles className="h-3 w-3" />
                                            {t("autoSent")}
                                        </div>
                                        <p className="whitespace-pre-wrap text-sm text-[#171717] dark:text-white/90">{m.body}</p>
                                        {m.knowledgeCitation && (
                                            <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">
                                                <BookOpenCheck className="h-3 w-3" />
                                                {t("basedOn")} knowledge › {m.knowledgeCitation}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className={cn(
                                        "rounded-2xl px-3.5 py-2.5",
                                        guest
                                            ? "rounded-bl-md bg-[#f5f5f5] dark:bg-white/10"
                                            : "rounded-br-md bg-[#171717] text-white dark:bg-white dark:text-black",
                                    )}>
                                        <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                                    </div>
                                )}
                                <div className={cn("mt-1 flex items-center gap-1.5 text-[10px] text-[#a3a3a3]", guest ? "" : "justify-end")}>
                                    <span>{fmtTime(m.at)}</span>
                                    {guest && latency && m.seenVia === "webhook" && (
                                        <span className="tabular-nums">· {t("viaWebhook")} {latency}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Drafts pendentes desta conversa (cartão tracejado) */}
                {props.queue.map((q) => (
                    <div key={q.id} className="ml-10 flex justify-end">
                        <div className="w-full max-w-[78%] rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/60 p-3.5 dark:border-amber-500/40 dark:bg-amber-500/10">
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                                <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                                    {t("draftPending")}{q.decision === "hard_rule" ? ` · ${t("hardRule")}` : ""}
                                </span>
                                <button
                                    onClick={() => act(() => dismissDraft(q.id))}
                                    disabled={isPending}
                                    className="rounded p-0.5 text-amber-700 hover:bg-amber-100 disabled:opacity-50 dark:text-amber-300 dark:hover:bg-amber-500/20"
                                    title={t("ignore")}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>

                            {editingId === q.id ? (
                                <div className="space-y-2">
                                    <textarea
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        rows={4}
                                        className="w-full rounded-xl border border-amber-200 bg-white p-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-300 dark:border-amber-500/30 dark:bg-black/20 dark:text-white"
                                    />
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => act(async () => { const r = await updateDraft(q.id, editText); if (r.ok) setEditingId(null); return r; })}
                                            disabled={isPending}
                                            className="rounded-lg bg-[#171717] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-black"
                                        >
                                            {t("save")}
                                        </button>
                                        <button onClick={() => setEditingId(null)} className="text-xs text-[#737373] underline">{t("cancel")}</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <p className="whitespace-pre-wrap text-sm text-[#171717] dark:text-white/90">
                                        {q.draft ?? "—"}
                                    </p>
                                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                        <button
                                            onClick={() => act(() => sendReply(props.reservationId, q.draft ?? "", q.id))}
                                            disabled={isPending || !q.draft?.trim()}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                                        >
                                            <Send className="h-3 w-3" />
                                            {isPending ? t("sending") : t("send")}
                                        </button>
                                        <button
                                            onClick={() => { setEditingId(q.id); setEditText(q.draft ?? ""); }}
                                            disabled={isPending}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-500/40 dark:text-amber-300 dark:hover:bg-amber-500/20"
                                        >
                                            <PencilLine className="h-3 w-3" />
                                            {t("edit")}
                                        </button>
                                        <button
                                            onClick={() => act(() => regenerateDraft(q.id))}
                                            disabled={isPending}
                                            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-[#737373] hover:bg-[#f5f5f5] disabled:opacity-50 dark:text-white/60 dark:hover:bg-white/10"
                                        >
                                            <RefreshCw className={cn("h-3 w-3", isPending && "animate-spin")} />
                                            {t("regenerate")}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Erro + resposta manual */}
            <div className="border-t border-[#f5f5f5] p-3 dark:border-admin-dark-border">
                {error && <p className="mb-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
                <div className="flex items-end gap-2">
                    <textarea
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder={t("replyPlaceholder")}
                        rows={2}
                        className="min-h-[44px] flex-1 resize-y rounded-xl border border-[#e5e5e5] bg-transparent p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#171717]/20 dark:border-admin-dark-border dark:text-white dark:focus:ring-white/20"
                    />
                    <button
                        onClick={() => act(async () => { const r = await sendReply(props.reservationId, reply); if (r.ok) setReply(""); return r; })}
                        disabled={isPending || !reply.trim()}
                        className="inline-flex h-[44px] items-center gap-1.5 rounded-xl bg-[#171717] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#333] disabled:opacity-50 dark:bg-white dark:text-black"
                    >
                        <Send className="h-3.5 w-3.5" />
                        {isPending ? t("sending") : t("send")}
                    </button>
                </div>
            </div>
        </div>
    );
}
