"use client";

import { useState } from "react";
import { Copy, Link2, Plus, X } from "lucide-react";
import { Section, LangTabs, input, label, textarea, secondaryBtn, type TabProps } from "./ui";

const FEATURES = ['Private garden and terrace', 'Air conditioning', 'Fibre internet', 'Double glazing'];
const SUGGESTED = ['Washing machine', 'Dishwasher', 'Free parking'];

export function InfoTab({ form, set }: TabProps) {
    const [lang, setLang] = useState<'EN' | 'PT'>('EN');
    const [textLang, setTextLang] = useState<'EN' | 'PT'>('EN');
    const [copied, setCopied] = useState(false);

    return (
        <>
            <Section title="Linked managed home (optional)">
                <p className="text-[13px] leading-relaxed text-[#4a4a4a]">Link this listing to a home we already manage to copy its details and show its rental performance. Leave empty for a home we do not manage.</p>
                <label className={label}>Search managed homes
                    <span className="flex min-h-[46px] items-center gap-2 rounded-xl border border-[#dcdcdc] bg-white px-3">
                        <Link2 className="size-4 shrink-0 text-[#6b6b6b]" aria-hidden="true" />
                        <input type="text" defaultValue="Garden House Paranhos" className="w-full min-w-0 border-0 bg-transparent text-sm outline-none" />
                    </span>
                </label>
                <div className="flex flex-col gap-3 rounded-2xl border border-[#eeeeee] bg-[#fafafa] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-col gap-0.5 text-[13px]">
                        <strong className="text-sm">Garden House Paranhos</strong>
                        <span className="text-[#4a4a4a]">Linked · Porto · 1 bedroom · 68 m²</span>
                    </div>
                    <button type="button" onClick={() => setCopied(true)} className={`${secondaryBtn} shrink-0`}><Copy className="size-4" aria-hidden="true" />Copy data from this home</button>
                </div>
                <p className="text-xs text-[#6b6b6b]">
                    {copied
                        ? 'Copied photos, bedrooms, bathrooms, area, description, city and location. Amenities are offered below as suggestions. If the listing already has data, we ask before replacing it.'
                        : 'Copies photos, bedrooms, bathrooms, area, description, city, location and address. Later changes to the holiday rental do not change this listing.'}
                </p>
            </Section>

            <Section title="Listing">
                <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-[#4a4a4a]">Language</span>
                    <LangTabs lang={textLang} onChange={setTextLang} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    {textLang === 'EN' ? (
                        <>
                            <label className={label}>Title (EN)<input type="text" value={form.title} onChange={(e) => set('title', e.target.value)} className={input} /></label>
                            <label className={label}>Subtitle (EN)<input type="text" defaultValue="T1 house with a private garden, 10 minutes from Trindade" className={input} /></label>
                        </>
                    ) : (
                        <>
                            <label className={label}>Title (PT)<input type="text" value={form.titlePt} onChange={(e) => set('titlePt', e.target.value)} placeholder="Título em português" className={input} /></label>
                            <label className={label}>Subtitle (PT)<input type="text" placeholder="Subtítulo em português" className={input} /></label>
                        </>
                    )}
                    <label className={`${label} md:col-span-2`}>Page address (slug)
                        <span className="flex min-h-[46px] items-center rounded-xl border border-[#dcdcdc] bg-white px-3 text-sm"><span className="shrink-0 text-[#6b6b6b]">/for-sale/</span><input type="text" defaultValue="garden-house-paranhos" className="w-full min-w-0 border-0 bg-transparent outline-none" /></span>
                        <span className="text-[11px] font-normal text-[#6b6b6b]">Generated from the title, you can edit it.</span>
                    </label>
                </div>
            </Section>

            <Section title="Property">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <label className={label}>Type
                        <select value={form.type} onChange={(e) => set('type', e.target.value)} className={input}><option value="">Choose…</option><option>Apartment</option><option>House</option><option>Building</option><option>Land</option></select>
                    </label>
                    <label className={label}>Typology<select defaultValue="T1" className={input}><option>T0</option><option>T1</option><option>T2</option><option>T3</option><option>T4</option><option>T5+</option></select></label>
                    <label className={label}>Bedrooms<input type="number" defaultValue={1} className={input} /></label>
                    <label className={label}>Bathrooms<input type="number" defaultValue={1} className={input} /></label>
                    <label className={label}>Condition<select defaultValue="Renovated" className={input}><option>New</option><option>Renovated</option><option>Good</option><option>To renovate</option></select></label>
                    <label className={label}>Gross area (m²)<input type="number" defaultValue={68} className={input} /></label>
                    <label className={label}>Useful area (m²)<input type="number" defaultValue={58} className={input} /></label>
                    <label className={label}>Plot (m²)<input type="number" defaultValue={140} className={input} /></label>
                    <label className={label}>Renovated in<input type="number" defaultValue={2021} className={input} /></label>
                    <label className="flex items-center gap-2.5 self-end pb-3 text-sm"><input type="checkbox" defaultChecked className="size-[18px] accent-[#111111]" />Sold furnished</label>
                </div>
            </Section>

            <Section title="Description and features">
                <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-[#4a4a4a]">Language</span>
                    <LangTabs lang={lang} onChange={setLang} />
                </div>
                <textarea
                    key={lang}
                    aria-label={`Description in ${lang === 'EN' ? 'English' : 'Portuguese'}`}
                    rows={5}
                    defaultValue={lang === 'EN' ? 'A quiet single-storey house tucked behind Rua de Costa Cabral, with its own lawn and a sunny terrace for outdoor dining. Fully renovated in 2021…' : ''}
                    placeholder={lang === 'PT' ? 'Descrição em português' : ''}
                    className={textarea}
                />
                <div className="flex flex-col gap-2.5">
                    <h3 className="text-xs font-semibold text-[#4a4a4a]">Features ({lang})</h3>
                    <ul className="flex flex-wrap gap-2">
                        {FEATURES.map((f) => (
                            <li key={f} className="flex items-center gap-1.5 rounded-full bg-[#f4efe4] py-1.5 pl-3 pr-2 text-[13px] font-semibold">{f}<button type="button" aria-label={`Remove ${f}`} className="flex size-5 items-center justify-center rounded-full"><X className="size-3.5" aria-hidden="true" /></button></li>
                        ))}
                    </ul>
                    <div className="flex flex-col gap-2">
                        <span className="text-[11px] font-semibold text-[#6b6b6b]">Suggested from the linked home&apos;s amenities</span>
                        <div className="flex flex-wrap gap-2">
                            {SUGGESTED.map((f) => (
                                <button key={f} type="button" className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-dashed border-[#b8b8b8] px-3 text-[13px] font-semibold"><Plus className="size-3.5" aria-hidden="true" />{f}</button>
                            ))}
                        </div>
                    </div>
                </div>
            </Section>
        </>
    );
}
