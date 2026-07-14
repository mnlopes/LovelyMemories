"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, CircleAlert } from "lucide-react";
import { upsertPropertyExtras } from "@/app/actions/ai-inbox";
import type { PropertyKnowledge } from "@/lib/ai-messaging";

const BASE_FIELDS: (keyof PropertyKnowledge)[] = ["checkIn", "checkOut", "address", "houseRules", "amenities", "parking"];
const SECRET_FIELDS = [
    "wifiName", "wifiPassword", "doorCode", "buildingAccess", "apartmentAccess",
    "emergencyContact", "govFormUrl", "guidebookUrl", "tips", "toneNotes",
] as const;
type SecretField = (typeof SECRET_FIELDS)[number];

export function EssentialsForm(props: {
    internalPropertyId: string;
    knowledge: PropertyKnowledge | null;
    onSaved: () => void;
}) {
    const t = useTranslations("AiMemory");
    const k = props.knowledge;
    const [form, setForm] = useState<Record<SecretField, string>>(() => {
        const init = {} as Record<SecretField, string>;
        for (const f of SECRET_FIELDS) init[f] = (k?.[f] as string) ?? "";
        return init;
    });
    const [saving, startSaving] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const dot = (filled: boolean) => filled
        ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        : <CircleAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" />;

    return (
        <section className="rounded-xl border border-[#f0f0f0] p-4 dark:border-admin-dark-border">
            <h2 className="mb-3 text-sm font-semibold text-[#171717] dark:text-admin-dark-text-primary">{t("essentialsTitle")}</h2>

            {/* Base — read-only */}
            <div className="mb-4">
                <p className="mb-2 text-[11px] uppercase tracking-wide text-[#a3a3a3]">{t("essentialsBase")}</p>
                <ul className="space-y-1.5">
                    {BASE_FIELDS.map((f) => {
                        const v = (k?.[f] as string) ?? "";
                        return (
                            <li key={String(f)} className="flex items-center gap-2 text-xs">
                                {dot(!!v.trim())}
                                <span className="w-28 shrink-0 text-[#737373] dark:text-white/50">{t(`field.${String(f)}`)}</span>
                                <span className="truncate text-[#525252] dark:text-white/70">{v || t("emptyFromSite")}</span>
                            </li>
                        );
                    })}
                </ul>
                <p className="mt-1.5 text-[10px] text-[#a3a3a3]">{t("essentialsBaseNote")}</p>
            </div>

            {/* Segredos — editáveis */}
            <div>
                <p className="mb-2 text-[11px] uppercase tracking-wide text-[#a3a3a3]">{t("essentialsSecrets")}</p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                    {SECRET_FIELDS.map((f) => (
                        <label key={f} className="block text-xs">
                            <span className="mb-1 flex items-center gap-1.5 text-[#737373] dark:text-white/50">
                                {dot(!!form[f].trim())} {t(`field.${f}`)}
                            </span>
                            <input
                                value={form[f]}
                                onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
                                className="w-full rounded-lg border border-[#e5e5e5] bg-white px-2.5 py-1.5 text-sm dark:border-admin-dark-border dark:bg-transparent"
                            />
                        </label>
                    ))}
                </div>
                <div className="mt-3 flex items-center gap-3">
                    <button
                        disabled={saving}
                        onClick={() => startSaving(async () => {
                            setError(null);
                            const r = await upsertPropertyExtras({
                                propertyId: props.internalPropertyId,
                                wifiName: form.wifiName || null,
                                wifiPassword: form.wifiPassword || null,
                                doorCode: form.doorCode || null,
                                buildingAccess: form.buildingAccess || null,
                                apartmentAccess: form.apartmentAccess || null,
                                emergencyContact: form.emergencyContact || null,
                                govFormUrl: form.govFormUrl || null,
                                guidebookUrl: form.guidebookUrl || null,
                                tips: form.tips || null,
                                toneNotes: form.toneNotes || null,
                            });
                            if (r.ok) props.onSaved(); else setError(r.error ?? "error");
                        })}
                        className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                        {t("save")}
                    </button>
                    {error && <span className="text-xs text-red-500">{error}</span>}
                </div>
            </div>
        </section>
    );
}
