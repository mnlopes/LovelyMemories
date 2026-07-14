"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Power, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    getBrandTone, updateBrandTone, listPropertyBotModes, setPropertyBotMode, setGlobalBot,
    listFactSuggestions, reviewFact, getAiProvider, setAiProvider,
    type PropertyBotRow, type FactSuggestion, type ProviderSetting, type ProviderChoice,
} from "@/app/actions/ai-inbox";

/** Definições do bot: kill-switch global, modo por propriedade, tom da marca. */
export function BotSettings(props: { globalBotEnabled: boolean; onChanged: () => void }) {
    const t = useTranslations("AiInbox");
    const [isPending, startTransition] = useTransition();
    const [rows, setRows] = useState<PropertyBotRow[] | null>(null);
    const [tone, setTone] = useState<string>("");
    const [toneDefault, setToneDefault] = useState(true);
    const [savedFlash, setSavedFlash] = useState(false);
    const [suggestions, setSuggestions] = useState<FactSuggestion[] | null>(null);
    const [factEdits, setFactEdits] = useState<Record<string, string>>({});
    const [provider, setProvider] = useState<ProviderSetting | null>(null);

    useEffect(() => {
        void listPropertyBotModes().then(setRows).catch(() => setRows([]));
        void getBrandTone().then((b) => { setTone(b.tone); setToneDefault(b.usingDefault); }).catch(() => {});
        void listFactSuggestions().then(setSuggestions).catch(() => setSuggestions([]));
        void getAiProvider().then(setProvider).catch(() => {});
    }, []);

    const handleProvider = (choice: ProviderChoice) => startTransition(async () => {
        setProvider((prev) => (prev ? { ...prev, selected: choice } : prev)); // otimista
        const r = await setAiProvider(choice);
        if (r.ok) void getAiProvider().then(setProvider).catch(() => {});
    });

    const handleReview = (id: string, action: "approve" | "reject") => startTransition(async () => {
        const edited = factEdits[id];
        const r = await reviewFact(id, action, action === "approve" ? edited : undefined);
        if (r.ok) setSuggestions((prev) => prev?.filter((s) => s.id !== id) ?? null);
    });

    const flash = () => { setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1600); };

    return (
        <div className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto p-5">
            {/* Kill-switch global */}
            <section className="rounded-xl border border-[#f5f5f5] p-4 dark:border-admin-dark-border">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[#171717] dark:text-admin-dark-text-primary">
                            <Power className="h-4 w-4" />
                            {t("killSwitch")}
                        </h3>
                        <p className="mt-0.5 text-xs text-[#a3a3a3]">{t("killSwitchNote")}</p>
                    </div>
                    <button
                        role="switch"
                        aria-checked={props.globalBotEnabled}
                        disabled={isPending}
                        onClick={() => startTransition(async () => {
                            await setGlobalBot(!props.globalBotEnabled);
                            props.onChanged();
                        })}
                        className={cn(
                            "relative h-7 w-[52px] shrink-0 rounded-full transition-colors disabled:opacity-50",
                            props.globalBotEnabled ? "bg-emerald-500" : "bg-red-400 dark:bg-red-500/60",
                        )}
                    >
                        <span className={cn(
                            "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all",
                            props.globalBotEnabled ? "left-[26px]" : "left-0.5",
                        )} />
                    </button>
                </div>
            </section>

            {/* Provider do modelo (BD como fonte de verdade) */}
            <section className="rounded-xl border border-[#f5f5f5] p-4 dark:border-admin-dark-border">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[#171717] dark:text-admin-dark-text-primary">
                            <Cpu className="h-4 w-4" />
                            {t("provider")}
                        </h3>
                        <p className="mt-0.5 text-xs text-[#a3a3a3]">{t("providerNote")}</p>
                    </div>
                    {provider && (
                        <span className="shrink-0 rounded-full bg-[#f5f5f5] px-2 py-0.5 text-[10px] font-medium text-[#737373] dark:bg-white/10 dark:text-white/60">
                            {t("providerEffective")}: {provider.effective === "openai" ? "OpenAI" : "Gemini"}
                        </span>
                    )}
                </div>
                <div className="mt-3 inline-flex rounded-lg border border-[#e5e5e5] p-0.5 dark:border-admin-dark-border">
                    {(["auto", "openai", "gemini"] as const).map((choice) => {
                        const noKey = (choice === "openai" && provider && !provider.openaiKeyPresent)
                            || (choice === "gemini" && provider && !provider.geminiKeyPresent);
                        const label = choice === "auto" ? t("providerAuto") : choice === "openai" ? "OpenAI" : "Gemini";
                        return (
                            <button
                                key={choice}
                                disabled={isPending || !provider}
                                title={noKey ? t("providerNoKey") : undefined}
                                onClick={() => handleProvider(choice)}
                                className={cn(
                                    "rounded-md px-3 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50",
                                    provider?.selected === choice
                                        ? "bg-[#171717] text-white dark:bg-white dark:text-black"
                                        : "text-[#737373] hover:bg-[#f5f5f5] dark:text-white/50 dark:hover:bg-white/10",
                                )}
                            >
                                {label}{noKey ? " ⚠" : ""}
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* Modo por propriedade */}
            <section>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#a3a3a3]">{t("settings")}</h3>
                <div className="overflow-hidden rounded-xl border border-[#f5f5f5] dark:border-admin-dark-border">
                    {rows === null ? (
                        <div className="space-y-2 p-3" aria-hidden>
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-8 animate-pulse rounded bg-[#f5f5f5] dark:bg-white/5" />
                            ))}
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <tbody>
                                {rows.map((r) => (
                                    <tr key={r.beds24PropertyId} className="border-b border-[#fafafa] last:border-0 dark:border-white/5">
                                        <td className="px-3 py-2.5">
                                            <p className="font-medium text-[#171717] dark:text-admin-dark-text-primary">{r.name}</p>
                                            <p className="text-[10px] text-[#a3a3a3]">
                                                {r.linked ? t("linkedProperty") : t("notLinked")}
                                            </p>
                                        </td>
                                        <td className="px-3 py-2.5 text-right">
                                            <div className="inline-flex rounded-lg border border-[#e5e5e5] p-0.5 dark:border-admin-dark-border">
                                                {(["off", "drafts", "auto"] as const).map((mode) => (
                                                    <button
                                                        key={mode}
                                                        disabled={isPending}
                                                        onClick={() => startTransition(async () => {
                                                            await setPropertyBotMode(r.beds24PropertyId, mode);
                                                            setRows((prev) => prev?.map((p) =>
                                                                p.beds24PropertyId === r.beds24PropertyId ? { ...p, botMode: mode } : p) ?? null);
                                                            props.onChanged();
                                                        })}
                                                        className={cn(
                                                            "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50",
                                                            r.botMode === mode
                                                                ? mode === "auto"
                                                                    ? "bg-emerald-600 text-white"
                                                                    : mode === "drafts"
                                                                        ? "bg-amber-500 text-white"
                                                                        : "bg-[#171717] text-white dark:bg-white dark:text-black"
                                                                : "text-[#737373] hover:bg-[#f5f5f5] dark:text-white/50 dark:hover:bg-white/10",
                                                        )}
                                                    >
                                                        {mode === "off" ? t("botModeOff") : mode === "drafts" ? t("botModeDrafts") : t("botModeAuto")}
                                                    </button>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </section>

            {/* Tom da marca */}
            <section>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#a3a3a3]">{t("tone")}</h3>
                <textarea
                    value={tone}
                    onChange={(e) => { setTone(e.target.value); setToneDefault(false); }}
                    rows={7}
                    className="w-full rounded-xl border border-[#e5e5e5] bg-transparent p-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-[#171717]/20 dark:border-admin-dark-border dark:text-white dark:focus:ring-white/20"
                />
                <div className="mt-2 flex items-center gap-3">
                    <button
                        disabled={isPending}
                        onClick={() => startTransition(async () => {
                            const r = await updateBrandTone(toneDefault ? "" : tone);
                            if (r.ok) flash();
                        })}
                        className="rounded-lg bg-[#171717] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#333] disabled:opacity-50 dark:bg-white dark:text-black"
                    >
                        {t("save")}
                    </button>
                    {savedFlash && <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{t("saved")}</span>}
                    {toneDefault && <span className="text-[11px] text-[#a3a3a3]">default</span>}
                </div>
            </section>

            {/* Sugestões de knowledge (learning loop) */}
            <section>
                <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#a3a3a3]">
                    {t("factSuggestions")}
                    {suggestions && suggestions.length > 0 && (
                        <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                            {suggestions.length}
                        </span>
                    )}
                </h3>
                <p className="mb-2 text-xs text-[#a3a3a3]">{t("factSuggestionsHint")}</p>
                {suggestions === null ? (
                    <div className="h-16 animate-pulse rounded-xl bg-[#f5f5f5] dark:bg-white/5" aria-hidden />
                ) : suggestions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#e5e5e5] p-4 text-center text-xs text-[#a3a3a3] dark:border-admin-dark-border">
                        {t("factEmpty")}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {suggestions.map((s) => (
                            <div key={s.id} className="rounded-xl border border-[#f5f5f5] p-3 dark:border-admin-dark-border">
                                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                                    {s.propertyName && (
                                        <span className="text-xs font-semibold text-[#171717] dark:text-admin-dark-text-primary">{s.propertyName}</span>
                                    )}
                                    <span className="rounded-full bg-[#f5f5f5] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#737373] dark:bg-white/10 dark:text-white/60">
                                        {s.topic}
                                    </span>
                                    {s.learnedFrom && (
                                        <span className="text-[10px] text-[#a3a3a3]">{t("factFrom")} #{s.learnedFrom}</span>
                                    )}
                                </div>
                                <textarea
                                    value={factEdits[s.id] ?? s.fact}
                                    onChange={(e) => setFactEdits((prev) => ({ ...prev, [s.id]: e.target.value }))}
                                    rows={2}
                                    className="w-full rounded-lg border border-[#e5e5e5] bg-transparent p-2 text-xs leading-relaxed outline-none focus:ring-2 focus:ring-[#171717]/20 dark:border-admin-dark-border dark:text-white dark:focus:ring-white/20"
                                />
                                <div className="mt-2 flex gap-2">
                                    <button
                                        disabled={isPending}
                                        onClick={() => handleReview(s.id, "approve")}
                                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                        {t("factApprove")}
                                    </button>
                                    <button
                                        disabled={isPending}
                                        onClick={() => handleReview(s.id, "reject")}
                                        className="rounded-lg border border-[#e5e5e5] px-3 py-1.5 text-[11px] font-semibold text-[#737373] transition-colors hover:bg-[#f5f5f5] disabled:opacity-50 dark:border-admin-dark-border dark:text-white/60 dark:hover:bg-white/10"
                                    >
                                        {t("factReject")}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
