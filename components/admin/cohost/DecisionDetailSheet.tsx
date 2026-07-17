// components/admin/cohost/DecisionDetailSheet.tsx
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { X, Check, MessageSquareText, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

type Card = {
    rowId: string; reservationId: string; guestName: string | null;
    propertyName: string | null; incomingMessage: string; draft: string | null;
    decision: string | null; createdAt: string; checkIn: string | null; checkOut: string | null;
    cardTitle: string; cardSummary: string; cardWhy: string | null;
};

export function DecisionDetailSheet({ card, onClose, onApprove, onDismiss, onOpenConversation }: {
    card: Card | null;
    onClose: () => void;
    onApprove: (rowId: string, reservationId: string, text: string) => Promise<void>;
    onDismiss: (rowId: string) => Promise<void>;
    onOpenConversation: (reservationId: string) => void;
}) {
    const t = useTranslations("AdminCohost.feed");
    const [text, setText] = useState("");
    const [busy, setBusy] = useState<"approve" | "dismiss" | null>(null);
    useEffect(() => { setText(card?.draft ?? ""); setBusy(null); }, [card?.rowId]); // eslint-disable-line react-hooks/exhaustive-deps
    if (!card) return null;

    const fmt = (d: string | null) => (d ? format(new Date(d), "EEE, d MMM") : "—");

    return (
        <AnimatePresence>
            <motion.div key="dd-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose} className="fixed inset-0 z-[100] bg-black/25" />
            {/* mobile: bottom sheet · md+: painel lateral direito */}
            <motion.div
                key={`dd-${card.rowId}`}
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed inset-x-0 bottom-0 z-[101] flex max-h-[88%] flex-col rounded-t-3xl bg-white shadow-2xl dark:bg-admin-dark-surface md:inset-x-auto md:inset-y-0 md:right-0 md:max-h-none md:w-full md:max-w-md md:rounded-none"
            >
                <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-gray-200 md:hidden dark:bg-white/10" />
                <div className="flex items-start justify-between gap-3 border-b border-[#f5f5f5] p-5 dark:border-white/10">
                    <div className="min-w-0">
                        <h2 className="text-lg font-extrabold tracking-tight text-[#171717] dark:text-white">{card.cardTitle}</h2>
                        <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wider text-[#a3a3a3]">
                            {[card.guestName ?? t("guestFallback"), card.propertyName].filter(Boolean).join(" · ")}
                        </p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/5 dark:hover:text-white">
                        <X className="size-4" />
                    </button>
                </div>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
                    <div className="overflow-hidden rounded-2xl border border-[#f5f5f5] dark:border-white/10">
                        {[
                            [t("profileGuest"), card.guestName ?? t("guestFallback")],
                            [t("profileStay"), `${fmt(card.checkIn)} → ${fmt(card.checkOut)}`],
                            [t("profileProperty"), card.propertyName ?? "—"],
                        ].map(([k, v]) => (
                            <div key={k} className="flex justify-between gap-4 border-b border-[#f5f5f5] px-4 py-2.5 text-[13px] last:border-b-0 dark:border-white/10">
                                <span className="shrink-0 font-semibold text-[#a3a3a3]">{k}</span>
                                <span className="min-w-0 text-right font-bold text-[#171717] dark:text-white">{v}</span>
                            </div>
                        ))}
                    </div>
                    {/* Mensagem do hóspede = herói do sheet (fundo creme = "lê isto") */}
                    <div className="rounded-2xl bg-[#f7f1e6] p-4 dark:bg-[#2a2517]">
                        <div className="mb-1.5 flex items-baseline justify-between gap-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3]">{t("guestMessage")}</p>
                            <p className="shrink-0 text-[10px] font-semibold text-[#a3a3a3]">{format(new Date(card.createdAt), "d MMM · HH:mm")}</p>
                        </div>
                        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[#171717] dark:text-white/90">{card.incomingMessage}</p>
                    </div>
                    <div className="rounded-2xl border-2 border-dashed border-[#e5e5e5] p-4 dark:border-white/10">
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#c5a059]">{t("draftLabel")}</p>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            rows={6}
                            className="w-full resize-y bg-transparent text-[13px] leading-relaxed text-[#171717] outline-none dark:text-white"
                            placeholder={t("noDraft")}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2 border-t border-[#f5f5f5] p-4 dark:border-white/10">
                    <button
                        disabled={!text.trim() || busy !== null}
                        onClick={async () => { setBusy("approve"); try { await onApprove(card.rowId, card.reservationId, text); } finally { setBusy(null); } }}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#171717] px-4 py-3.5 text-sm font-extrabold text-white transition-opacity disabled:opacity-50 dark:bg-white dark:text-black"
                    >
                        <Check className="size-4" /> {busy === "approve" ? t("sending") : t("approveSend")}
                    </button>
                    <button
                        disabled={busy !== null}
                        onClick={async () => { setBusy("dismiss"); try { await onDismiss(card.rowId); } finally { setBusy(null); } }}
                        className="rounded-2xl border border-[#e5e5e5] p-3.5 text-[#737373] dark:border-white/10 dark:text-white/60"
                        aria-label={t("ignore")}
                    >
                        <Trash2 className="size-4" />
                    </button>
                    <button
                        onClick={() => onOpenConversation(card.reservationId)}
                        className="rounded-2xl border border-[#e5e5e5] p-3.5 text-[#737373] dark:border-white/10 dark:text-white/60"
                        aria-label={t("openConversation")}
                    >
                        <MessageSquareText className="size-4" />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
