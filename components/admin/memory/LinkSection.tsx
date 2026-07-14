"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link2 } from "lucide-react";
import {
    getPropertyLinkSuggestions, savePropertyLinks,
    type LocalPropertyOption,
} from "@/app/actions/ai-inbox";

export function LinkSection(props: { beds24PropertyId: number; onLinked: () => void }) {
    const t = useTranslations("AiMemory");
    const [options, setOptions] = useState<LocalPropertyOption[]>([]);
    const [choice, setChoice] = useState<string>("");
    const [saving, startSaving] = useTransition();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        void getPropertyLinkSuggestions().then((d) => {
            if (!alive) return;
            setOptions(d.properties);
            const sug = d.suggestions.find((s) => s.beds24PropertyId === props.beds24PropertyId);
            setChoice(sug?.suggestedPropertyId ?? "");
        });
        return () => { alive = false; };
    }, [props.beds24PropertyId]);

    return (
        <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-500/30 dark:bg-amber-500/5">
            <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-[#171717] dark:text-admin-dark-text-primary">
                <Link2 className="h-4 w-4 text-amber-500" /> {t("linkTitle")}
            </h2>
            <p className="mb-3 text-xs text-[#737373] dark:text-white/50">{t("linkHelp")}</p>
            <div className="flex flex-wrap items-center gap-2">
                <select
                    value={choice}
                    onChange={(e) => setChoice(e.target.value)}
                    className="rounded-lg border border-[#e5e5e5] bg-white px-3 py-1.5 text-sm dark:border-admin-dark-border dark:bg-transparent"
                >
                    <option value="">{t("linkPlaceholder")}</option>
                    {options.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
                </select>
                <button
                    disabled={!choice || saving}
                    onClick={() => startSaving(async () => {
                        setError(null);
                        const r = await savePropertyLinks([{ beds24PropertyId: props.beds24PropertyId, propertyId: choice }]);
                        if (r.ok) props.onLinked(); else setError(r.error ?? "error");
                    })}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                >
                    {t("linkButton")}
                </button>
            </div>
            {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        </section>
    );
}
