"use client";

import { useState } from "react";
import { AlertTriangle, MapPin, Upload } from "lucide-react";
import { Section, Switch, input, label, secondaryBtn, type TabProps } from "./ui";

const ENERGY = ['A+', 'A', 'B', 'B-', 'C', 'D', 'E', 'F', 'Exempt'];

export function SaleTab({ form, set }: TabProps) {
    const n = Number(form.price.replace(/[^\d]/g, ''));
    const perM2 = n ? `€${Math.round(n / 68).toLocaleString('en-US')} · calculated` : '—';
    return (
        <>
            <Section title="Price">
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className={label}>Asking price
                        <span className="flex min-h-[46px] items-center gap-2 rounded-xl border border-[#dcdcdc] bg-white px-3.5">
                            <span className="text-[15px] font-bold text-[#6b6b6b]">€</span>
                            <input type="text" value={form.price} disabled={form.priceOnRequest} onChange={(e) => set('price', e.target.value)} className="w-full min-w-0 border-0 bg-transparent text-[15px] font-bold outline-none disabled:text-[#9a9a9a]" />
                        </span>
                    </label>
                    <div className={label}>Price per m²
                        <span className="flex min-h-[46px] items-center rounded-xl bg-[#f4f4f4] px-3.5 text-[15px] font-semibold text-[#4a4a4a]">{form.priceOnRequest ? '—' : perM2}</span>
                    </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:gap-7">
                    <label className="flex items-center gap-2.5 text-sm"><input type="checkbox" checked={form.priceOnRequest} onChange={(e) => set('priceOnRequest', e.target.checked)} className="size-[18px] accent-[#111111]" />Price on request</label>
                    <label className="flex items-center gap-2.5 text-sm"><input type="checkbox" defaultChecked className="size-[18px] accent-[#111111]" />Negotiable</label>
                </div>
            </Section>
            <Section title="Sale status">
                <label className={`${label} max-w-[320px]`}>Status<select className={input}><option>Available</option><option>Reserved</option><option>Under offer</option><option>Sold</option></select></label>
                <p className="text-xs text-[#6b6b6b]">Sold homes stay on the site, greyed out and without a price, at the end of the list until you unpublish them.</p>
            </Section>
        </>
    );
}

export function LocationTab({ form, set }: TabProps) {
    return (
        <>
            <Section title="Public location" hint="Shown on the page">
                <div className="grid gap-4 md:grid-cols-3">
                    <label className={label}>City
                        <select value={form.city} onChange={(e) => set('city', e.target.value)} className={input}><option value="">Choose…</option><option>Porto</option><option>Vila Nova de Gaia</option><option>Algarve</option></select>
                    </label>
                    <label className={label}>Neighbourhood<input type="text" defaultValue="Paranhos" className={input} /></label>
                    <label className={label}>Street (no number)<input type="text" defaultValue="Rua de Costa Cabral" className={input} /></label>
                </div>
            </Section>
            <Section title="Exact address" hint="Team only — never shown on the site">
                <label className={label}>Exact address<input type="text" defaultValue="Rua de Costa Cabral 1234, 4200-000 Porto" className={input} /></label>
                <div role="img" aria-label="Map with the point of the home" className="relative h-[200px] overflow-hidden rounded-2xl border border-[#dde3e8] bg-[#e8edf1]">
                    <div aria-hidden="true" className="absolute -left-[10%] top-[40%] h-3 w-[120%] -rotate-[8deg] bg-white" />
                    <div aria-hidden="true" className="absolute -top-[10%] left-[34%] h-[120%] w-2.5 rotate-[14deg] bg-white" />
                    <div aria-hidden="true" className="absolute left-1/2 top-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#111111]"><MapPin className="size-5 text-white" /></div>
                    <p className="absolute bottom-3 left-3 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#374151]">Drag the pin · the site shows only an approximate area</p>
                </div>
            </Section>
            <Section title="Nearby places">
                <ul className="grid gap-3 sm:grid-cols-3">
                    {[['Trindade metro', '10 min walk'], ['Bolhão market', '15 min walk'], ['Porto airport', '20 min by car']].map(([k, v]) => (
                        <li key={k} className="flex flex-col gap-1.5 rounded-2xl border border-[#eeeeee] bg-[#fafafa] p-3">
                            <input aria-label="Place" type="text" defaultValue={k} className={input} />
                            <input aria-label="Distance" type="text" defaultValue={v} className={input} />
                        </li>
                    ))}
                </ul>
                <button type="button" className={`${secondaryBtn} self-start`}>Add a place</button>
            </Section>
        </>
    );
}

export function DocumentsTab({ form, set }: TabProps) {
    return (
        <>
            <Section title="Energy class" hint="Mandatory to publish">
                <div role="radiogroup" aria-label="Energy class" className="flex flex-wrap gap-2">
                    {ENERGY.map((e) => (
                        <button
                            key={e}
                            type="button"
                            role="radio"
                            aria-checked={form.energy === e}
                            onClick={() => set('energy', e)}
                            className={`min-h-11 min-w-12 rounded-[10px] px-3 text-sm font-bold ${form.energy === e ? 'border-2 border-[#111111] bg-[#111111] text-white' : 'border border-[#dcdcdc] bg-white'}`}
                        >{e}</button>
                    ))}
                </div>
                <p className="text-xs text-[#6b6b6b]">The site shows the class and “Energy certificate available on request”. The certificate itself is never published.</p>
            </Section>
            <Section title="Energy certificate" hint="Team only">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <label className={`${label} flex-1`}>Certificate number<input type="text" placeholder="SCE…" className={input} /></label>
                    <button type="button" className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-dashed border-[#b8b8b8] bg-[#fafafa] px-4 text-[13px] font-bold"><Upload className="size-4" aria-hidden="true" />Upload certificate PDF</button>
                </div>
                <p className="text-xs text-[#6b6b6b]">Stored in a private folder; only the team can open it.</p>
            </Section>
            <Section title="Floor plan" hint="Public">
                <button type="button" className="flex min-h-[46px] items-center justify-center gap-2 self-start rounded-xl border border-dashed border-[#b8b8b8] bg-[#fafafa] px-4 text-[13px] font-bold"><Upload className="size-4" aria-hidden="true" />Upload floor plan PDF</button>
                <p className="text-xs font-semibold text-[#1d6b40]">floor-plan-paranhos.pdf · uploaded</p>
            </Section>
        </>
    );
}

export function PerformanceTab() {
    const [show, setShow] = useState(true);
    return (
        <Section title="Rental performance">
            <div className="flex items-start justify-between gap-5">
                <div className="flex flex-col gap-1.5">
                    <h3 className="text-[15px] font-bold">Show on the listing</h3>
                    <p className="text-[13px] leading-relaxed text-[#4a4a4a]">Adds the “Investment snapshot” to the page. Figures come from this home&apos;s bookings and are recalculated automatically.</p>
                </div>
                <Switch checked={show} onChange={setShow} name="Show on the listing" />
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {[['Revenue, 12 months', '€26,900'], ['Gross yield', '8.7%'], ['Occupancy', '78%']].map(([k, v]) => (
                    <div key={k} className="flex flex-col gap-1 rounded-2xl border border-[#eeeeee] bg-[#fafafa] p-3.5"><span className="text-[11px] font-semibold text-[#6b6b6b]">{k}</span><span className="text-xl font-bold">{v}</span></div>
                ))}
            </div>
            <p className="text-[13px] text-[#4a4a4a]">Data until <strong className="text-[#111111]">12 Oct 2026</strong> · 12 months of history</p>
            <p className="flex items-start gap-2 rounded-xl bg-[#fbf3e2] px-3.5 py-3 text-xs leading-relaxed text-[#6e5218]"><AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />If this date is more than 60 days old, import the latest Airbnb earnings CSV before showing these figures.</p>
            <label className={`${label} max-w-[360px]`}>Short-term rental licence (AL) nº<input type="text" defaultValue="123456/AL" className={input} /></label>
        </Section>
    );
}
