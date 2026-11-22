"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { SALE_CONDITIONS, SALE_TYPES, TYPOLOGIES, type Localized } from "@/lib/sales/types";
import { slugify } from "@/lib/sales/format";
import { LinkPropertyPicker } from "./LinkPropertyPicker";
import {
    Checkbox,
    DEFAULT_LANG,
    LangTabs,
    Section,
    focusRing,
    input,
    label,
    numOrNull,
    numberInputProps,
    secondaryBtn,
    type Lang,
    type SaleTabProps,
} from "./ui";

type InfoProps = SaleTabProps & {
    slugTouched: boolean;
    onSlugEdit: (slug: string) => void;
    onTitleChange: (title: Localized) => void;
    /** Set by the editor when the server rejected the slug; cleared when it is edited. */
    slugError: "slug_taken" | "invalid_slug" | "slugRequired" | null;
};

export function SaleInfoTab({ form, set, slugTouched, onSlugEdit, onTitleChange, slugError }: InfoProps) {
    const t = useTranslations("AdminSales");
    const [lang, setLang] = useState<Lang>(DEFAULT_LANG);

    const setLocalized = (key: "subtitle" | "description", value: string) =>
        set(key, { ...form[key], [lang]: value });

    const setFeature = (index: number, value: string) =>
        set(
            "features",
            form.features.map((f, i) => (i === index ? { ...f, [lang]: value } : f)),
        );

    return (
        <>
            <LinkPropertyPicker form={form} set={set} />
            <Section title={t("info.listing")}>
                <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-[#a3a3a3]">{t("info.language")}</span>
                    <LangTabs lang={lang} onChange={setLang} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <label className={label}>
                        {t("info.title", { lang: lang.toUpperCase() })}
                        <input
                            id="sale-field-title"
                            type="text"
                            value={form.title[lang] ?? ""}
                            onChange={(e) => onTitleChange({ ...form.title, [lang]: e.target.value })}
                            maxLength={5000}
                            className={input}
                        />
                    </label>
                    <label className={label}>
                        {t("info.subtitle", { lang: lang.toUpperCase() })}
                        <input
                            type="text"
                            value={form.subtitle[lang] ?? ""}
                            onChange={(e) => setLocalized("subtitle", e.target.value)}
                            maxLength={5000}
                            className={input}
                        />
                    </label>
                    <label className={`${label} md:col-span-2`}>
                        {t("info.slug")}
                        <span
                            className={`flex items-center rounded-xl border bg-[#fafafa] dark:bg-admin-dark-bg px-4 text-base md:text-sm font-normal normal-case tracking-normal text-[#171717] dark:text-admin-dark-text-primary ${
                                slugError
                                    ? "border-red-500 focus-within:ring-1 focus-within:ring-red-500"
                                    : "border-[#f5f5f5] dark:border-admin-dark-border"
                            }`}
                        >
                            <span className="shrink-0 text-[#a3a3a3]">/for-sale/</span>
                            <input
                                id="sale-field-slug"
                                type="text"
                                spellCheck={false}
                                autoComplete="off"
                                autoCapitalize="none"
                                aria-invalid={slugError ? true : undefined}
                                aria-describedby={slugError ? "sale-slug-error" : undefined}
                                value={form.slug}
                                onChange={(e) => onSlugEdit(e.target.value.toLowerCase())}
                                onBlur={(e) => {
                                    const clean = slugify(e.target.value);
                                    if (clean !== e.target.value) onSlugEdit(clean);
                                }}
                                maxLength={160}
                                className="w-full min-w-0 border-0 bg-transparent py-3 outline-none"
                            />
                        </span>
                        {slugError && (
                            <span
                                id="sale-slug-error"
                                role="alert"
                                className="text-xs font-semibold normal-case tracking-normal text-red-600 dark:text-red-400"
                            >
                                {t(`errors.${slugError}`)}
                            </span>
                        )}
                        <span className="text-[11px] font-normal normal-case tracking-normal text-[#a3a3a3]">
                            {slugTouched ? t("info.slugHintManual") : t("info.slugHintAuto")}
                        </span>
                    </label>
                </div>
            </Section>

            <Section title={t("info.property")}>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <label className={label}>
                        {t("info.type")}
                        <select
                            id="sale-field-type"
                            value={form.type}
                            onChange={(e) => set("type", e.target.value as (typeof SALE_TYPES)[number])}
                            className={input}
                        >
                            {SALE_TYPES.map((v) => (
                                <option key={v} value={v}>
                                    {t(`type.${v}`)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className={label}>
                        {t("info.typology")}
                        <select
                            value={form.typology ?? ""}
                            onChange={(e) => set("typology", e.target.value || null)}
                            className={input}
                        >
                            <option value="">{t("info.none")}</option>
                            {TYPOLOGIES.map((v) => (
                                <option key={v} value={v}>
                                    {v}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className={label}>
                        {t("info.bedrooms")}
                        <input
                            type="number"
                            {...numberInputProps("numeric")}
                            min={0}
                            max={50}
                            step={1}
                            value={form.bedrooms ?? ""}
                            onChange={(e) => set("bedrooms", numOrNull(e.target.value))}
                            className={input}
                        />
                    </label>
                    <label className={label}>
                        {t("info.bathrooms")}
                        <input
                            type="number"
                            {...numberInputProps("numeric")}
                            min={0}
                            max={50}
                            step={1}
                            value={form.bathrooms ?? ""}
                            onChange={(e) => set("bathrooms", numOrNull(e.target.value))}
                            className={input}
                        />
                    </label>
                    <label className={label}>
                        {t("info.condition")}
                        <select
                            value={form.condition ?? ""}
                            onChange={(e) =>
                                set("condition", (e.target.value || null) as (typeof SALE_CONDITIONS)[number] | null)
                            }
                            className={input}
                        >
                            <option value="">{t("info.none")}</option>
                            {SALE_CONDITIONS.map((v) => (
                                <option key={v} value={v}>
                                    {t(`condition.${v}`)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className={label}>
                        {t("info.grossArea")}
                        <input
                            type="number"
                            {...numberInputProps("decimal")}
                            min={0}
                            step="any"
                            value={form.gross_area ?? ""}
                            onChange={(e) => set("gross_area", numOrNull(e.target.value))}
                            className={input}
                        />
                    </label>
                    <label className={label}>
                        {t("info.usefulArea")}
                        <input
                            type="number"
                            {...numberInputProps("decimal")}
                            min={0}
                            step="any"
                            value={form.useful_area ?? ""}
                            onChange={(e) => set("useful_area", numOrNull(e.target.value))}
                            className={input}
                        />
                    </label>
                    <label className={label}>
                        {t("info.plotArea")}
                        <input
                            type="number"
                            {...numberInputProps("decimal")}
                            min={0}
                            step="any"
                            value={form.plot_area ?? ""}
                            onChange={(e) => set("plot_area", numOrNull(e.target.value))}
                            className={input}
                        />
                    </label>
                    <label className={label}>
                        {t("info.yearRenovated")}
                        <input
                            type="number"
                            {...numberInputProps("numeric")}
                            min={1800}
                            max={2100}
                            step={1}
                            value={form.year_renovated ?? ""}
                            onChange={(e) => set("year_renovated", numOrNull(e.target.value))}
                            className={input}
                        />
                    </label>
                    <div className="flex items-end pb-3">
                        <Checkbox checked={form.furnished === true} onChange={(v) => set("furnished", v)}>
                            {t("info.furnished")}
                        </Checkbox>
                    </div>
                </div>
            </Section>

            <Section title={t("info.descriptionSection")}>
                <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-[#a3a3a3]">{t("info.language")}</span>
                    <LangTabs lang={lang} onChange={setLang} />
                </div>
                <label className={label}>
                    {t("info.description", { lang: lang.toUpperCase() })}
                    <textarea
                        rows={6}
                        value={form.description[lang] ?? ""}
                        onChange={(e) => setLocalized("description", e.target.value)}
                        maxLength={5000}
                        className={`${input} leading-relaxed`}
                    />
                </label>
                <div className="flex flex-col gap-3">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#a3a3a3]">
                        {t("info.features", { lang: lang.toUpperCase() })}
                    </h3>
                    {form.features.length > 0 && (
                        <ul className="flex flex-col gap-2.5">
                            {form.features.map((f, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        aria-label={t("info.featureAria", { n: i + 1 })}
                                        value={f[lang] ?? ""}
                                        onChange={(e) => setFeature(i, e.target.value)}
                                        placeholder={t("info.featurePlaceholder")}
                                        maxLength={5000}
                                        className={input}
                                    />
                                    <button
                                        type="button"
                                        aria-label={t("info.removeFeature")}
                                        onClick={() =>
                                            set(
                                                "features",
                                                form.features.filter((_, j) => j !== i),
                                            )
                                        }
                                        className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-[#a3a3a3] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 md:size-10 ${focusRing}`}
                                    >
                                        <X className="size-4" aria-hidden="true" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <button
                        type="button"
                        disabled={form.features.length >= 60}
                        onClick={() => set("features", [...form.features, {}])}
                        className={`${secondaryBtn} self-start`}
                    >
                        <Plus className="size-4" aria-hidden="true" />
                        {t("info.addFeature")}
                    </button>
                </div>
            </Section>
        </>
    );
}
