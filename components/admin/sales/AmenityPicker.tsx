"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { Building2, ChefHat, ChevronDown, Plus, Sofa, Trees, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { AMENITY_GROUPS, amenityGroup, type AmenityGroup } from "@/lib/sales/amenity-groups";
import { localized } from "@/lib/sales/format";
import type { Localized } from "@/lib/sales/types";
import { focusRing, input, secondaryBtn, type SaleTabProps } from "./ui";

const MAX_FEATURES = 60;

export const featureKey = (f: Localized) => (f.en ?? f.pt ?? "").trim().toLowerCase();

const ICONS: Record<Exclude<AmenityGroup, "other">, ReactNode> = {
    outdoor: <Trees className="size-3.5" aria-hidden="true" />,
    comfort: <Sofa className="size-3.5" aria-hidden="true" />,
    kitchen: <ChefHat className="size-3.5" aria-hidden="true" />,
    building: <Building2 className="size-3.5" aria-hidden="true" />,
};

const chip = `inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-left text-[13px] font-medium transition-colors duration-200 ${focusRing}`;
const chipOff =
    "border-[#e5e5e5] bg-transparent text-[#171717] hover:border-[#a3a3a3] dark:border-admin-dark-border dark:text-admin-dark-text-primary dark:hover:border-[#737373]";
const chipOn = "border-transparent bg-[#171717] text-white dark:bg-white dark:text-[#171717]";

/**
 * The amenities of the linked rental home, grouped so the ones a buyer cares about come first.
 * Guest supplies sit folded at the end. Each pick becomes a listing feature (edited further in the features list).
 */
export function AmenityPicker({
    suggestions,
    form,
    set,
}: {
    suggestions: Localized[];
    form: SaleTabProps["form"];
    set: SaleTabProps["set"];
}) {
    const t = useTranslations("AdminSales");
    const locale = useLocale();
    const [showOther, setShowOther] = useState(false);
    const [draft, setDraft] = useState("");
    const [error, setError] = useState("");
    const otherId = useId();
    const errorId = useId();

    const grouped = useMemo(() => {
        const map = new Map<AmenityGroup, Localized[]>(AMENITY_GROUPS.map((g) => [g, []]));
        for (const item of suggestions) map.get(amenityGroup(item))!.push(item);
        return map;
    }, [suggestions]);

    const suggestedKeys = useMemo(() => new Set(suggestions.map(featureKey)), [suggestions]);
    const selected = new Set(form.features.map(featureKey));
    // Features typed by hand (here or in the features list), shown as removable chips.
    const custom = form.features.filter((f) => featureKey(f) && !suggestedKeys.has(featureKey(f)));
    const pickedCount = suggestions.filter((s) => selected.has(featureKey(s))).length + custom.length;
    const other = grouped.get("other") ?? [];
    const otherPicked = other.filter((s) => selected.has(featureKey(s))).length;

    function toggle(item: Localized) {
        const k = featureKey(item);
        if (selected.has(k)) {
            set("features", form.features.filter((f) => featureKey(f) !== k));
        } else if (form.features.length < MAX_FEATURES) {
            set("features", [...form.features, item]);
        }
    }

    function remove(item: Localized) {
        const k = featureKey(item);
        set("features", form.features.filter((f) => featureKey(f) !== k));
    }

    function add() {
        const text = draft.trim();
        if (!text) return setError(t("link.addEmpty"));
        if (selected.has(text.toLowerCase())) return setError(t("link.addDuplicate"));
        if (form.features.length >= MAX_FEATURES) return setError(t("link.addLimit", { max: MAX_FEATURES }));
        // Same text in both languages until it is translated in the features list.
        set("features", [...form.features, { pt: text, en: text }]);
        setDraft("");
        setError("");
    }

    const renderChip = (item: Localized) => {
        const on = selected.has(featureKey(item));
        return (
            <button
                key={featureKey(item)}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(item)}
                className={`${chip} ${on ? chipOn : chipOff}`}
            >
                {localized(item, locale)}
            </button>
        );
    };

    return (
        <div className="flex flex-col gap-4 border-t border-[#f5f5f5] pt-4 dark:border-admin-dark-border">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-bold text-[#171717] dark:text-admin-dark-text-primary">{t("link.amenities")}</h3>
                    <p className="text-xs text-[#a3a3a3]">{t("link.amenitiesHint")}</p>
                </div>
                <span className="whitespace-nowrap rounded-full bg-[#f5f5f5] px-2.5 py-1 text-[11px] font-bold text-[#737373] dark:bg-admin-dark-bg dark:text-admin-dark-text-secondary">
                    {t("link.pickedCount", { count: pickedCount })}
                </span>
            </div>

            {(["outdoor", "comfort", "kitchen", "building"] as const).map((g) => {
                const items = grouped.get(g) ?? [];
                if (items.length === 0) return null;
                return (
                    <div key={g} className="flex flex-col gap-2">
                        <h4 className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#a3a3a3]">
                            {ICONS[g]}
                            {t(`link.groups.${g}`)}
                        </h4>
                        <div className="flex flex-wrap gap-2">{items.map(renderChip)}</div>
                    </div>
                );
            })}

            <div className="flex flex-col gap-2">
                <label
                    htmlFor={`${errorId}-input`}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#a3a3a3]"
                >
                    <Plus className="size-3.5" aria-hidden="true" />
                    {t("link.addLabel")}
                </label>
                <div className="flex gap-2">
                    <input
                        id={`${errorId}-input`}
                        type="text"
                        value={draft}
                        onChange={(e) => {
                            setDraft(e.target.value);
                            if (error) setError("");
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                add();
                            }
                        }}
                        placeholder={t("link.addPlaceholder")}
                        maxLength={120}
                        aria-invalid={!!error}
                        aria-describedby={error ? errorId : undefined}
                        className={input}
                    />
                    <button type="button" onClick={add} className={`${secondaryBtn} shrink-0`}>
                        {t("link.add")}
                    </button>
                </div>
                {error && (
                    <p id={errorId} role="alert" className="text-xs text-red-600 dark:text-red-400">
                        {error}
                    </p>
                )}
                {custom.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {custom.map((f) => (
                            <span key={featureKey(f)} className={`${chip} ${chipOn} pr-1.5`}>
                                {localized(f, locale)}
                                <button
                                    type="button"
                                    onClick={() => remove(f)}
                                    aria-label={t("link.removeCustom", { name: localized(f, locale) })}
                                    className={`flex size-6 items-center justify-center rounded-full hover:bg-white/20 dark:hover:bg-black/10 ${focusRing}`}
                                >
                                    <X className="size-3.5" aria-hidden="true" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {other.length > 0 && (
                <div className="flex flex-col gap-3">
                    <button
                        type="button"
                        aria-expanded={showOther}
                        aria-controls={otherId}
                        onClick={() => setShowOther((v) => !v)}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl border border-[#f5f5f5] bg-[#fafafa] px-4 py-3 text-left text-xs text-[#737373] transition-colors hover:border-[#e5e5e5] dark:border-admin-dark-border dark:bg-admin-dark-bg dark:text-admin-dark-text-secondary ${focusRing}`}
                    >
                        <span>
                            {t("link.otherToggle", { count: other.length })}
                            {otherPicked > 0 && (
                                <span className="ml-2 font-bold text-[#171717] dark:text-admin-dark-text-primary">
                                    {t("link.pickedCount", { count: otherPicked })}
                                </span>
                            )}
                        </span>
                        <ChevronDown
                            className={`size-4 shrink-0 transition-transform duration-200 ${showOther ? "rotate-180" : ""}`}
                            aria-hidden="true"
                        />
                    </button>
                    {showOther && (
                        <div id={otherId} className="flex flex-wrap gap-2">
                            {other.map(renderChip)}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
