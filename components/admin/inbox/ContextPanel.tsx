"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CalendarDays, Check, CircleAlert, Users, Brain } from "lucide-react";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import {
    getKnowledgeForProperty, getPanelExtras, setConversationBot,
    type InboxConversation, type ThreadData,
} from "@/app/actions/ai-inbox";
import { computeCoverage, CHECKLIST_FIELDS } from "@/lib/ai-knowledge";
import type { PropertyKnowledge } from "@/lib/ai-messaging";

export function ContextPanel(props: {
    conversation: InboxConversation;
    booking: ThreadData["booking"];
    onChanged: () => void;
}) {
    const t = useTranslations("AiInbox");
    const [isPending, startTransition] = useTransition();
    const [knowledge, setKnowledge] = useState<PropertyKnowledge | null | undefined>(undefined);
    const [facts, setFacts] = useState<{ topic: string; status: string }[]>([]);

    useEffect(() => {
        let alive = true;
        setKnowledge(undefined);
        if (props.conversation.externalPropertyId) {
            void getKnowledgeForProperty(props.conversation.externalPropertyId)
                .then((k) => { if (alive) setKnowledge(k); })
                .catch(() => { if (alive) setKnowledge(null); });
            void getPanelExtras(props.conversation.externalPropertyId)
                .then((x) => { if (alive) setFacts(x.facts); })
                .catch(() => { if (alive) setFacts([]); });
        } else {
            setKnowledge(null);
            setFacts([]);
        }
        return () => { alive = false; };
    }, [props.conversation.externalPropertyId]);

    const b = props.booking;
    const c = props.conversation;

    return (
        <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
            {/* Reserva */}
            <section>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#a3a3a3]">{t("reservation")}</h3>
                <div className="space-y-1.5 rounded-xl border border-[#f5f5f5] p-3 text-sm dark:border-admin-dark-border">
                    <p className="font-semibold text-[#171717] dark:text-admin-dark-text-primary">{c.guestName ?? "—"}</p>
                    <p className="text-xs text-[#737373] dark:text-white/50">{c.propertyName ?? ""}</p>
                    <div className="flex items-center gap-1.5 text-xs text-[#525252] dark:text-white/70">
                        <CalendarDays className="h-3.5 w-3.5 text-[#a3a3a3]" />
                        <span className="tabular-nums">{b?.arrival ?? c.checkIn ?? "—"} → {b?.departure ?? c.checkOut ?? "—"}</span>
                    </div>
                    {b?.numAdult != null && (
                        <div className="flex items-center gap-1.5 text-xs text-[#525252] dark:text-white/70">
                            <Users className="h-3.5 w-3.5 text-[#a3a3a3]" />
                            <span>{b.numAdult} {t("guests").toLowerCase()}</span>
                        </div>
                    )}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                        {b?.status && (
                            <span className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                b.status === "confirmed"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                                    : "bg-[#f0f0f0] text-[#525252] dark:bg-white/10 dark:text-white/60",
                            )}>{b.status}</span>
                        )}
                        {b?.channel && (
                            <span className="rounded-full bg-[#f0f0f0] px-2 py-0.5 text-[10px] font-semibold text-[#525252] dark:bg-white/10 dark:text-white/60">{b.channel}</span>
                        )}
                        {b?.price != null && (
                            <span className="rounded-full bg-[#f0f0f0] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[#525252] dark:bg-white/10 dark:text-white/60">€{b.price}</span>
                        )}
                    </div>
                </div>
            </section>

            {/* Bot da conversa */}
            <section>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#a3a3a3]">Bot</h3>
                <div className="rounded-xl border border-[#f5f5f5] p-3 dark:border-admin-dark-border">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-[#171717] dark:text-admin-dark-text-primary">
                            {c.botEnabled ? t("botOn") : t("botOff")}
                        </span>
                        <button
                            role="switch"
                            aria-checked={c.botEnabled}
                            disabled={isPending}
                            onClick={() => startTransition(async () => {
                                await setConversationBot(c.reservationId, !c.botEnabled);
                                props.onChanged();
                            })}
                            className={cn(
                                "relative h-6 w-11 rounded-full transition-colors disabled:opacity-50",
                                c.botEnabled ? "bg-emerald-500" : "bg-[#d4d4d4] dark:bg-white/20",
                            )}
                        >
                            <span className={cn(
                                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                                c.botEnabled ? "left-[22px]" : "left-0.5",
                            )} />
                        </button>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-snug text-[#a3a3a3]">
                        {t("autoOffNote")}
                        {c.botOffReason === "human_replied" && ` · ${t("humanActive")}`}
                    </p>
                </div>
            </section>

            {/* Knowledge */}
            <section>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#a3a3a3]">{t("knowledge")}</h3>
                <div className="rounded-xl border border-[#f5f5f5] p-3 dark:border-admin-dark-border">
                    {knowledge === undefined ? (
                        <div className="space-y-2" aria-hidden>
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-3 animate-pulse rounded bg-[#f5f5f5] dark:bg-white/5" />
                            ))}
                        </div>
                    ) : knowledge === null ? (
                        <p className="text-xs text-[#a3a3a3]">{t("notLinked")}</p>
                    ) : (() => {
                        const coverage = computeCoverage(knowledge, facts);
                        return (
                            <ul className="space-y-1">
                                {CHECKLIST_FIELDS.map((f) => {
                                    const filled = coverage[f];
                                    return (
                                        <li key={f} className="flex items-center gap-2 text-xs">
                                            {filled ? (
                                                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                            ) : (
                                                <CircleAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                                            )}
                                            <span className={cn(filled ? "text-[#525252] dark:text-white/70" : "text-[#a3a3a3]")}>
                                                {f}{!filled && ` — ${t("knowledgeMissing")}`}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        );
                    })()}
                    {props.conversation.externalPropertyId && (
                        <Link
                            href={`/admin/activity/memory?property=${props.conversation.externalPropertyId}`}
                            className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-[#e5e5e5] py-1.5 text-xs font-medium text-[#525252] transition-colors hover:bg-[#fafafa] dark:border-admin-dark-border dark:text-white/70 dark:hover:bg-white/5"
                        >
                            <Brain className="h-3.5 w-3.5" /> {t("manageMemory")}
                        </Link>
                    )}
                </div>
            </section>
        </div>
    );
}
