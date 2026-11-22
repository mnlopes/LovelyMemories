"use client";

import type { ReactNode, WheelEvent } from "react";
import { useTranslations } from "next-intl";
import type { z } from "zod";
import type { saleListingInputSchema } from "@/lib/sales/validation";

/** The editor holds exactly the payload `saveSaleListing` expects. */
export type SaleFormState = z.infer<typeof saleListingInputSchema>;

export type SaleTabProps = {
    form: SaleFormState;
    set: <K extends keyof SaleFormState>(key: K, value: SaleFormState[K]) => void;
};

/**
 * Saves `patch` on top of the last saved listing right away, so the database stays in step with
 * Storage after an upload or a delete. Unsaved edits in the form are not sent (they wait for
 * "Save"), so a published listing never shows them early. After a successful save the same patch
 * is applied to the form; a function patch is evaluated again against the form at that moment, so
 * edits made meanwhile are kept. On failure the form is left as it was. Resolves false when the
 * save failed (or the user cannot edit).
 */
export type PersistFn = (
    patch: Partial<SaleFormState> | ((prev: SaleFormState) => Partial<SaleFormState>),
    /** `quiet`: do not lock Save / Publish while it runs (small saves such as alt text; the queue still orders them). */
    options?: { quiet?: boolean },
) => Promise<boolean>;

/** Props of the tabs that upload files (they need the listing to exist first). */
export type SaleFileTabProps = SaleTabProps & {
    listingId: string;
    isSaved: boolean;
    /** False for a view-only role: uploads and deletions are disabled. */
    canEdit: boolean;
    persist: PersistFn;
};

export type Lang = "en" | "pt";

/** Staff write the listing in Portuguese first. */
export const DEFAULT_LANG: Lang = "pt";

export const card =
    "flex flex-col gap-5 rounded-2xl border border-[#f5f5f5] dark:border-white/10 bg-white dark:bg-white/5 p-5 md:p-6 shadow-sm";
export const label = "flex flex-col gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#a3a3a3] dark:text-admin-dark-text-secondary";
export const input =
    "w-full rounded-xl border border-[#f5f5f5] dark:border-admin-dark-border bg-[#fafafa] dark:bg-admin-dark-bg px-4 py-3 text-base md:text-sm font-normal normal-case tracking-normal text-[#171717] dark:text-admin-dark-text-primary outline-none transition-all placeholder:text-[#a3a3a3] focus:border-[#171717] focus:bg-white focus:ring-1 focus:ring-[#171717] dark:focus:border-white dark:focus:bg-admin-dark-surface dark:focus:ring-white disabled:opacity-60";
/** Visible keyboard focus for buttons and links that have no field styling of their own. */
export const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#171717] focus-visible:ring-offset-2 dark:focus-visible:ring-white dark:focus-visible:ring-offset-admin-dark-bg";

/** Props for number inputs: the right phone keyboard, and scrolling the page never changes the value. */
export function numberInputProps(mode: "decimal" | "numeric") {
    return {
        inputMode: mode,
        onWheel: (e: WheelEvent<HTMLInputElement>) => e.currentTarget.blur(),
    } as const;
}

export const secondaryBtn =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-[#eaeaea] dark:border-admin-dark-border bg-white dark:bg-admin-dark-surface px-4 py-2.5 text-xs font-bold text-[#171717] dark:text-admin-dark-text-primary transition-all hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg disabled:cursor-not-allowed disabled:opacity-50";
export const primaryBtn =
    "inline-flex items-center justify-center gap-2 rounded-xl bg-[#171717] dark:bg-white px-4 py-2.5 text-xs font-bold text-white dark:text-black transition-all hover:bg-black dark:hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50";

export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
    return (
        <section className={card}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#f5f5f5] dark:border-admin-dark-border pb-3">
                <h2 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary">{title}</h2>
                {hint && <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">{hint}</span>}
            </div>
            {children}
        </section>
    );
}

export function Checkbox({
    checked,
    onChange,
    disabled,
    children,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
    children: ReactNode;
}) {
    return (
        <label
            className={`flex items-center gap-2.5 text-sm font-medium text-[#171717] dark:text-admin-dark-text-primary ${
                disabled ? "opacity-60" : ""
            }`}
        >
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
                className="size-[18px] accent-[#171717] dark:accent-white"
            />
            {children}
        </label>
    );
}

/** PT / EN switch for the bilingual text fields (Hebrew is not used any more). */
export function LangTabs({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
    const t = useTranslations("AdminSales");
    return (
        <div role="tablist" aria-label={t("info.language")} className="flex gap-1 rounded-xl bg-[#f5f5f5] dark:bg-admin-dark-bg p-[3px]">
            {(["pt", "en"] as const).map((l) => (
                <button
                    key={l}
                    type="button"
                    role="tab"
                    aria-selected={lang === l}
                    onClick={() => onChange(l)}
                    className={`min-h-11 rounded-lg px-4 text-xs font-bold uppercase md:min-h-8 md:px-3 ${focusRing} ${
                        lang === l
                            ? "bg-white dark:bg-admin-dark-surface text-[#171717] dark:text-admin-dark-text-primary shadow-sm"
                            : "text-[#a3a3a3]"
                    }`}
                >
                    {l}
                </button>
            ))}
        </div>
    );
}

/** "" -> null, otherwise the number (or null when it is not one). */
export function numOrNull(raw: string): number | null {
    if (raw.trim() === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
}
