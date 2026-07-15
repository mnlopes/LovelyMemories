"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { ArrowLeft } from "lucide-react";
import { getMemoryForProperty, type MemoryProperty, type MemoryPropertyItem } from "@/app/actions/ai-inbox";
import { LinkSection } from "./LinkSection";
import { EssentialsForm } from "./EssentialsForm";
import { FactsBoard } from "./FactsBoard";

export function PropertyMemoryManager(props: {
    properties: MemoryPropertyItem[];
    initialSelected: number | null;
}) {
    const t = useTranslations("AiMemory");
    const [selected, setSelected] = useState<number | null>(props.initialSelected);
    const [data, setData] = useState<MemoryProperty | null>(null);
    const [loading, setLoading] = useState(false);

    const reload = useCallback(() => {
        if (selected == null) { setData(null); return; }
        setLoading(true);
        getMemoryForProperty(selected)
            .then(setData)
            .finally(() => setLoading(false));
    }, [selected]);

    useEffect(() => { reload(); }, [reload]);

    return (
        <div className="container max-w-4xl py-6">
            <Link href="/admin/cohost?tab=inbox" className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#737373] hover:text-[#171717] dark:text-white/50 dark:hover:text-white">
                <ArrowLeft className="h-4 w-4" /> {t("backToInbox")}
            </Link>
            <h1 className="mb-1 text-xl font-semibold text-[#171717] dark:text-admin-dark-text-primary">{t("title")}</h1>
            <p className="mb-5 text-sm text-[#737373] dark:text-white/50">{t("subtitle")}</p>

            <div className="mb-6 flex flex-wrap gap-2">
                {props.properties.map((p) => (
                    <button
                        key={p.beds24PropertyId}
                        onClick={() => setSelected(p.beds24PropertyId)}
                        className={
                            "rounded-full border px-3 py-1.5 text-sm transition-colors " +
                            (selected === p.beds24PropertyId
                                ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                                : "border-[#e5e5e5] text-[#525252] hover:bg-[#fafafa] dark:border-admin-dark-border dark:text-white/70 dark:hover:bg-white/5")
                        }
                    >
                        {p.name}{!p.linked && <span className="ml-1.5 text-[10px] text-amber-500">●</span>}
                    </button>
                ))}
            </div>

            {loading && <p className="text-sm text-[#a3a3a3]">{t("loading")}</p>}
            {!loading && data && (
                !data.internalPropertyId ? (
                    <LinkSection beds24PropertyId={data.beds24PropertyId} onLinked={reload} />
                ) : (
                    <div className="space-y-6">
                        <EssentialsForm internalPropertyId={data.internalPropertyId} knowledge={data.knowledge} onSaved={reload} />
                        <FactsBoard externalPropertyId={String(data.beds24PropertyId)} facts={data.facts} knowledge={data.knowledge} onChanged={reload} />
                    </div>
                )
            )}
        </div>
    );
}
