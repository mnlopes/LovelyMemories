"use client";

import type { ReactNode } from "react";

export const card = "flex flex-col gap-4 rounded-[18px] border border-[#e8e8e8] bg-white p-5 md:p-6";
export const label = "flex flex-col gap-1.5 text-xs font-semibold text-[#4a4a4a]";
export const input = "min-h-[46px] w-full rounded-xl border border-[#dcdcdc] bg-white px-3 text-sm text-[#111111]";
export const textarea = "w-full rounded-xl border border-[#dcdcdc] bg-white p-3.5 text-sm leading-relaxed text-[#111111]";
export const secondaryBtn = "flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-[#e0e0e0] bg-white px-4 text-[13px] font-bold";

/** The fields the sidebar (checklist and card preview) needs from the tabs. */
export type Form = {
    title: string;
    titlePt: string;
    type: string;
    price: string;
    priceOnRequest: boolean;
    city: string;
    energy: string;
};

export type TabProps = { form: Form; set: <K extends keyof Form>(key: K, value: Form[K]) => void };

export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
    return (
        <section className={card}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-[17px] font-bold">{title}</h2>
                {hint && <span className="text-xs font-semibold text-[#8a6d36]">{hint}</span>}
            </div>
            {children}
        </section>
    );
}

export function Switch({ checked, onChange, name }: { checked: boolean; onChange: (v: boolean) => void; name: string }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={name}
            onClick={() => onChange(!checked)}
            className={`relative h-[30px] w-[52px] shrink-0 rounded-full transition-colors ${checked ? 'bg-[#111111]' : 'bg-[#d4d4d4]'}`}
        >
            <span aria-hidden="true" className={`absolute top-1 size-[22px] rounded-full bg-white transition-all ${checked ? 'right-1' : 'right-[26px]'}`} />
        </button>
    );
}

/** Small EN / PT switch for the bilingual text fields (Hebrew is not used any more). */
export function LangTabs({ lang, onChange }: { lang: 'EN' | 'PT'; onChange: (l: 'EN' | 'PT') => void }) {
    return (
        <div role="tablist" aria-label="Language" className="flex gap-1 rounded-[10px] bg-[#f4f4f4] p-[3px]">
            {(['EN', 'PT'] as const).map((l) => (
                <button key={l} type="button" role="tab" aria-selected={lang === l} onClick={() => onChange(l)} className={`min-h-8 rounded-lg px-3 text-xs font-bold ${lang === l ? 'bg-white shadow-sm' : 'text-[#4a4a4a]'}`}>{l}</button>
            ))}
        </div>
    );
}
