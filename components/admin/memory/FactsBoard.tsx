"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import {
    createFact, updateFact, setFactStatus, deleteFact, reviewFact,
    FACT_TOPICS,
    type PropertyFactRow,
} from "@/app/actions/ai-inbox";

export function FactsBoard(props: {
    externalPropertyId: string;
    facts: PropertyFactRow[];
    onChanged: () => void;
}) {
    const t = useTranslations("AiMemory");
    const [, startAction] = useTransition();
    const [newTopic, setNewTopic] = useState("general");
    const [newFact, setNewFact] = useState("");
    const [editId, setEditId] = useState<string | null>(null);
    const [editText, setEditText] = useState("");
    const [error, setError] = useState<string | null>(null);

    const run = (fn: () => Promise<unknown>) => startAction(async () => {
        const result = await fn();
        if (result && typeof result === "object" && "ok" in result && (result as { ok: boolean }).ok === false) {
            setError((result as { error?: string }).error ?? "error");
            return;
        }
        setError(null);
        props.onChanged();
    });
    const pending = props.facts.filter((f) => f.status === "pending");
    const active = props.facts.filter((f) => f.status === "active");
    const byTopic = (topic: string) => active.filter((f) => f.topic === topic);

    return (
        <section className="rounded-xl border border-[#f0f0f0] p-4 dark:border-admin-dark-border">
            <h2 className="mb-3 text-sm font-semibold text-[#171717] dark:text-admin-dark-text-primary">{t("factsTitle")}</h2>

            {/* Pending (learning loop) */}
            {pending.length > 0 && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-500/30 dark:bg-amber-500/5">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300">{t("factsPending")}</p>
                    <ul className="space-y-2">
                        {pending.map((f) => (
                            <li key={f.id} className="flex items-start gap-2 text-xs">
                                <span className="flex-1 text-[#525252] dark:text-white/70">
                                    <span className="mr-1.5 rounded bg-white/60 px-1 text-[10px] text-[#737373] dark:bg-white/10">{t(`topic.${f.topic}`)}</span>
                                    {f.fact}
                                </span>
                                <button onClick={() => run(() => reviewFact(f.id, "approve"))} className="rounded p-1 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-500/20" title={t("approve")}><Check className="h-4 w-4" /></button>
                                <button onClick={() => run(() => reviewFact(f.id, "reject"))} className="rounded p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20" title={t("reject")}><X className="h-4 w-4" /></button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Adicionar */}
            <div className="mb-4 flex flex-wrap items-end gap-2">
                <select value={newTopic} onChange={(e) => setNewTopic(e.target.value)} className="rounded-lg border border-[#e5e5e5] bg-white px-2.5 py-1.5 text-sm dark:border-admin-dark-border dark:bg-transparent">
                    {FACT_TOPICS.map((tp) => <option key={tp} value={tp}>{t(`topic.${tp}`)}</option>)}
                </select>
                <input value={newFact} onChange={(e) => setNewFact(e.target.value)} placeholder={t("factsAddPlaceholder")} className="min-w-[200px] flex-1 rounded-lg border border-[#e5e5e5] bg-white px-2.5 py-1.5 text-sm dark:border-admin-dark-border dark:bg-transparent" />
                <button disabled={!newFact.trim()} onClick={() => { run(() => createFact({ externalPropertyId: props.externalPropertyId, topic: newTopic, fact: newFact })); setNewFact(""); }} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                    <Plus className="h-4 w-4" /> {t("add")}
                </button>
            </div>
            {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

            {/* Ativos por tópico */}
            {FACT_TOPICS.map((tp) => {
                const items = byTopic(tp);
                if (!items.length) return null;
                return (
                    <div key={tp} className="mb-3">
                        <p className="mb-1 text-[11px] uppercase tracking-wide text-[#a3a3a3]">{t(`topic.${tp}`)}</p>
                        <ul className="space-y-1.5">
                            {items.map((f) => (
                                <li key={f.id} className="flex items-start gap-2 text-xs">
                                    {editId === f.id ? (
                                        <>
                                            <input value={editText} onChange={(e) => setEditText(e.target.value)} className="flex-1 rounded border border-[#e5e5e5] bg-white px-2 py-1 dark:border-admin-dark-border dark:bg-transparent" />
                                            <button disabled={!editText.trim()} onClick={() => { run(() => updateFact({ id: f.id, fact: editText })); setEditId(null); }} className="rounded p-1 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50" title={t("save")}><Check className="h-4 w-4" /></button>
                                            <button onClick={() => setEditId(null)} className="rounded p-1 text-[#737373] hover:bg-[#f0f0f0]" title={t("cancel")}><X className="h-4 w-4" /></button>
                                        </>
                                    ) : (
                                        <>
                                            <span className="flex-1 text-[#525252] dark:text-white/70">{f.fact}{f.source === "learned" && <span className="ml-1.5 text-[10px] text-[#a3a3a3]">({t("learned")})</span>}</span>
                                            <button onClick={() => { setEditId(f.id); setEditText(f.fact); }} className="rounded p-1 text-[#737373] hover:bg-[#f0f0f0] dark:hover:bg-white/10" title={t("edit")}><Pencil className="h-3.5 w-3.5" /></button>
                                            <button onClick={() => run(() => setFactStatus(f.id, "rejected"))} className="rounded p-1 text-[#737373] hover:bg-[#f0f0f0] dark:hover:bg-white/10" title={t("deactivate")}><X className="h-3.5 w-3.5" /></button>
                                            <button onClick={() => { if (window.confirm(t("confirmDelete"))) run(() => deleteFact(f.id)); }} className="rounded p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20" title={t("delete")}><Trash2 className="h-3.5 w-3.5" /></button>
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                );
            })}
            {active.length === 0 && pending.length === 0 && <p className="text-xs text-[#a3a3a3]">{t("factsEmpty")}</p>}
        </section>
    );
}
