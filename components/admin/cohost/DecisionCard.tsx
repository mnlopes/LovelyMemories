// components/admin/cohost/DecisionCard.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, X, Pencil, MessageSquareText, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type Card = {
    rowId: string; reservationId: string; guestName: string | null;
    propertyName: string | null; incomingMessage: string; draft: string | null;
    decision: string | null; createdAt: string; checkIn: string | null; checkOut: string | null;
};

export function DecisionCard({ card, onApprove, onDismiss, onOpen }: {
    card: Card;
    onApprove: (rowId: string, reservationId: string, text: string) => Promise<void>;
    onDismiss: (rowId: string) => Promise<void>;
    onOpen: (reservationId: string) => void;
}) {
    const t = useTranslations("AdminCohost.feed");
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState(card.draft ?? "");
    const [busy, setBusy] = useState<"approve" | "dismiss" | null>(null);
    const urgent = card.decision === "hard_rule";

    return (
        <div className="rounded-2xl border border-[#f5f5f5] bg-white p-4 shadow-sm dark:border-admin-dark-border dark:bg-admin-dark-surface">
            <div className="flex items-center justify-between gap-2 text-xs text-[#a3a3a3]">
                <span className="truncate font-semibold">
                    {card.guestName ?? "Guest"} · {card.propertyName ?? "—"}
                </span>
                {urgent && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                        <AlertTriangle className="size-3" /> {t("needsYou")}
                    </span>
                )}
            </div>
            <p className="mt-2 rounded-xl bg-[#fafafa] p-3 text-sm text-[#171717] dark:bg-white/5 dark:text-admin-dark-text-primary">
                {card.incomingMessage}
            </p>
            {editing ? (
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={4}
                    className="mt-2 w-full rounded-xl border border-[#e5e5e5] p-3 text-sm outline-none focus:ring-1 focus:ring-[#171717] dark:border-white/10 dark:bg-transparent dark:text-white dark:focus:ring-white"
                />
            ) : (
                <p className="mt-2 whitespace-pre-wrap rounded-xl border border-dashed border-[#e5e5e5] p-3 text-sm text-[#404040] dark:border-white/10 dark:text-white/80">
                    {text || t("noDraft")}
                </p>
            )}
            <div className="mt-3 flex items-center gap-2">
                <button
                    disabled={!text.trim() || busy !== null}
                    onClick={async () => { setBusy("approve"); try { await onApprove(card.rowId, card.reservationId, text); } finally { setBusy(null); } }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#171717] px-3 py-2.5 text-sm font-bold text-white transition-opacity disabled:opacity-50 dark:bg-white dark:text-black"
                >
                    <Check className="size-4" /> {busy === "approve" ? t("sending") : t("approveSend")}
                </button>
                <button
                    onClick={() => setEditing((v) => !v)}
                    className={cn("rounded-xl border px-3 py-2.5 text-sm font-semibold", editing ? "border-[#171717] dark:border-white" : "border-[#e5e5e5] text-[#737373] dark:border-white/10 dark:text-white/60")}
                    aria-pressed={editing}
                >
                    <Pencil className="size-4" />
                </button>
                <button
                    disabled={busy !== null}
                    onClick={async () => { setBusy("dismiss"); try { await onDismiss(card.rowId); } finally { setBusy(null); } }}
                    className="rounded-xl border border-[#e5e5e5] px-3 py-2.5 text-sm text-[#737373] dark:border-white/10 dark:text-white/60"
                    aria-label={t("ignore")}
                >
                    <X className="size-4" />
                </button>
                <button
                    onClick={() => onOpen(card.reservationId)}
                    className="rounded-xl border border-[#e5e5e5] px-3 py-2.5 text-sm text-[#737373] dark:border-white/10 dark:text-white/60"
                    aria-label={t("openConversation")}
                >
                    <MessageSquareText className="size-4" />
                </button>
            </div>
        </div>
    );
}
