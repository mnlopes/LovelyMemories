"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight, CheckCircle2, Eye, Upload } from "lucide-react";
import { Link } from "@/i18n/routing";
import { AdminShell } from "../../_components/AdminShell";
import { FEATURED, eur } from "../../_components/data";

const LISTING_TYPES = [
    { id: 'rental', label: 'Short-term rental', sub: 'Bookable stays, as today' },
    { id: 'sale', label: 'For sale', sub: 'Shown in the new “For Sale” tab' },
    { id: 'both', label: 'Rental + for sale', sub: 'Keeps taking bookings while on the market' },
];
const ENERGY = ['A+', 'A', 'B', 'B-', 'C', 'D', 'E', 'F'];
const TABS = ['Media', 'Basic info', 'Sale details', 'Location', 'Documents', 'Leads · 3'];

const card = "flex flex-col gap-4 rounded-[18px] border border-[#e8e8e8] bg-white p-5 md:p-6";
const label = "flex flex-col gap-1.5 text-xs font-semibold text-[#4a4a4a]";
const input = "min-h-[46px] w-full rounded-xl border border-[#dcdcdc] bg-white px-3 text-sm text-[#111111]";

export default function NewSaleListing() {
    const [type, setType] = useState('sale');
    const [energy, setEnergy] = useState('C');
    const [showPerformance, setShowPerformance] = useState(true);
    const h = FEATURED;

    return (
        <AdminShell variant="a" active="Properties">
            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="flex flex-col gap-1.5">
                        <nav aria-label="Breadcrumb" className="flex gap-2 text-[13px] text-[#6b6b6b]"><span>Properties</span><span aria-hidden="true">/</span><span className="font-semibold text-[#111111]">New sale listing</span></nav>
                        <h1 className="text-2xl font-bold tracking-tight md:text-[30px]">{h.title}</h1>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 sm:flex">
                        <Link href="/mockups-propertysell/a/garden-house-paranhos" className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#e0e0e0] bg-white px-4 text-[13px] font-bold"><Eye className="size-4" aria-hidden="true" />Preview</Link>
                        <button type="button" className="min-h-11 rounded-xl border border-[#e0e0e0] bg-white px-4 text-[13px] font-bold">Save draft</button>
                        <button type="button" className="col-span-2 min-h-11 rounded-xl bg-[#111111] px-5 text-[13px] font-bold text-white">Publish listing</button>
                    </div>
                </div>

                <section className={card}>
                    <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-[#6b6b6b]">Listing type</h2>
                    <div className="grid gap-2.5 md:grid-cols-3">
                        {LISTING_TYPES.map((t) => {
                            const active = type === t.id;
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => setType(t.id)}
                                    className={`flex flex-col gap-1 rounded-2xl px-4 py-3.5 text-left ${active ? 'border-2 border-[#111111] bg-[#faf7f0]' : 'border border-[#e0e0e0] bg-white'}`}
                                >
                                    <span className="flex items-center justify-between text-sm font-bold">{t.label}{active && <CheckCircle2 className="size-[18px]" aria-hidden="true" />}</span>
                                    <span className="text-xs leading-normal text-[#4a4a4a]">{t.sub}</span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <div role="tablist" aria-label="Listing sections" className="-mx-4 flex gap-7 overflow-x-auto border-b border-[#e8e8e8] px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
                    {TABS.map((t) => (
                        <button key={t} type="button" role="tab" aria-selected={t === 'Sale details'} className={`shrink-0 pb-3 text-[13px] font-bold ${t === 'Sale details' ? '-mb-px border-b-2 border-[#111111] text-[#111111]' : 'text-[#6b6b6b]'}`}>{t}</button>
                    ))}
                </div>

                <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
                    <div className="flex min-w-0 flex-1 flex-col gap-5">
                        <section className={card}>
                            <h2 className="text-[17px] font-bold">Price</h2>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className={label}>Asking price
                                    <span className="flex min-h-[46px] items-center gap-2 rounded-xl border border-[#dcdcdc] bg-white px-3.5">
                                        <span className="text-[15px] font-bold text-[#6b6b6b]">€</span>
                                        <input type="text" defaultValue="310,000" className="w-full border-0 bg-transparent text-[15px] font-bold outline-none" />
                                    </span>
                                </label>
                                <div className={label}>Price per m²
                                    <span className="flex min-h-[46px] items-center rounded-xl bg-[#f4f4f4] px-3.5 text-[15px] font-semibold text-[#4a4a4a]">€4,559 · calculated</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row sm:gap-7">
                                <label className="flex items-center gap-2.5 text-sm"><input type="checkbox" className="size-[18px] accent-[#111111]" />Show “Price on request” instead</label>
                                <label className="flex items-center gap-2.5 text-sm"><input type="checkbox" defaultChecked className="size-[18px] accent-[#111111]" />Price negotiable</label>
                            </div>
                        </section>

                        <section className={card}>
                            <h2 className="text-[17px] font-bold">Property</h2>
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                <label className={label}>Type<select className={input}><option>House</option><option>Apartment</option><option>Building</option><option>Land</option></select></label>
                                <label className={label}>Typology<select className={input}><option>T1</option><option>T0</option><option>T2</option><option>T3</option><option>T4+</option></select></label>
                                <label className={label}>Bathrooms<input type="number" defaultValue={1} className={input} /></label>
                                <label className={label}>Condition<select className={input}><option>Renovated</option><option>New</option><option>Good</option><option>To renovate</option></select></label>
                                <label className={label}>Gross area (m²)<input type="number" defaultValue={68} className={input} /></label>
                                <label className={label}>Useful area (m²)<input type="number" defaultValue={58} className={input} /></label>
                                <label className={label}>Plot (m²)<input type="number" defaultValue={140} className={input} /></label>
                                <label className={label}>Renovated in<input type="number" defaultValue={2021} className={input} /></label>
                            </div>
                            <p className="text-xs text-[#6b6b6b]">Bedrooms, amenities and photos are reused from the existing property — no need to fill them twice.</p>
                        </section>

                        <section className={card}>
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <h2 className="text-[17px] font-bold">Energy certificate</h2>
                                <span className="text-xs font-semibold text-[#8a6d36]">Mandatory in sale adverts</span>
                            </div>
                            <div role="radiogroup" aria-label="Energy class" className="flex flex-wrap gap-2">
                                {ENERGY.map((e) => (
                                    <button
                                        key={e}
                                        type="button"
                                        role="radio"
                                        aria-checked={energy === e}
                                        onClick={() => setEnergy(e)}
                                        className={`min-h-11 min-w-12 rounded-[10px] text-sm font-bold ${energy === e ? 'border-2 border-[#111111] bg-[#111111] text-white' : 'border border-[#dcdcdc] bg-white'}`}
                                    >
                                        {e}
                                    </button>
                                ))}
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                <label className={`${label} flex-1`}>Certificate number<input type="text" placeholder="SCE…" className={input} /></label>
                                <button type="button" className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-dashed border-[#b8b8b8] bg-[#fafafa] px-4 text-[13px] font-bold"><Upload className="size-4" aria-hidden="true" />Upload PDF</button>
                            </div>
                        </section>

                        <section className={card}>
                            <div className="flex items-start justify-between gap-5">
                                <div className="flex flex-col gap-1.5">
                                    <h2 className="text-[17px] font-bold">Show rental performance</h2>
                                    <p className="text-[13px] leading-relaxed text-[#4a4a4a]">Adds the “Investment snapshot” to the listing. Revenue, occupancy and rating are filled in automatically from this property&apos;s bookings — last 12 months.</p>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={showPerformance}
                                    aria-label="Show rental performance"
                                    onClick={() => setShowPerformance(!showPerformance)}
                                    className={`relative h-[30px] w-[52px] shrink-0 rounded-full transition-colors ${showPerformance ? 'bg-[#111111]' : 'bg-[#d4d4d4]'}`}
                                >
                                    <span aria-hidden="true" className={`absolute top-1 size-[22px] rounded-full bg-white transition-all ${showPerformance ? 'right-1' : 'right-[26px]'}`} />
                                </button>
                            </div>
                            {showPerformance && (
                                <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                                    {[['Revenue', '€26,900'], ['Gross yield', '8.7%'], ['Occupancy', '78%'], ['Guest rating', '4.92']].map(([k, v]) => (
                                        <div key={k} className="flex flex-col gap-1 rounded-2xl border border-[#eeeeee] bg-[#fafafa] p-3.5"><span className="text-[11px] font-semibold text-[#6b6b6b]">{k}</span><span className="text-xl font-bold">{v}</span></div>
                                    ))}
                                </div>
                            )}
                            <label className={`${label} max-w-[360px]`}>Short-term rental licence (AL) nº<input type="text" placeholder="e.g. 123456/AL" className={input} /></label>
                        </section>

                        <section className={card}>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <h2 className="text-[17px] font-bold">Sale description</h2>
                                <div role="tablist" aria-label="Language" className="flex gap-1 rounded-[10px] bg-[#f4f4f4] p-[3px]">
                                    {['EN', 'PT', 'HE'].map((l) => (
                                        <button key={l} type="button" role="tab" aria-selected={l === 'EN'} className={`min-h-8 rounded-lg px-3 text-xs font-bold ${l === 'EN' ? 'bg-white shadow-sm' : 'text-[#4a4a4a]'}`}>{l}</button>
                                    ))}
                                </div>
                            </div>
                            <textarea aria-label="Sale description in English" rows={4} defaultValue="A quiet single-storey house tucked behind Rua de Costa Cabral, with its own lawn and a sunny terrace for outdoor dining. Fully renovated in 2021…" className="rounded-xl border border-[#dcdcdc] p-3.5 text-sm leading-relaxed" />
                        </section>
                    </div>

                    <div className="flex w-full flex-col gap-5 xl:w-[320px] xl:shrink-0">
                        <section className={card}>
                            <h2 className="text-[15px] font-bold">Status</h2>
                            <label className={label}>Sale status<select className={input}><option>Available</option><option>Reserved</option><option>Under offer</option><option>Sold</option></select></label>
                            <fieldset className="flex flex-col gap-2.5">
                                <legend className="mb-2 text-xs font-semibold text-[#4a4a4a]">Visibility</legend>
                                <label className="flex items-center gap-2.5 text-sm"><input type="radio" name="vis" className="size-[18px] accent-[#111111]" />Published</label>
                                <label className="flex items-center gap-2.5 text-sm"><input type="radio" name="vis" defaultChecked className="size-[18px] accent-[#111111]" />Draft — only staff can see it</label>
                            </fieldset>
                            <label className="flex items-center gap-2.5 text-sm"><input type="checkbox" defaultChecked className="size-[18px] accent-[#111111]" />Feature on the homepage</label>
                            <p className="border-t border-[#eeeeee] pt-3.5 text-xs text-[#6b6b6b]">Reference <strong className="text-[#111111]">LM-V-0042</strong> · generated automatically</p>
                        </section>

                        <section className={card}>
                            <h2 className="text-[15px] font-bold">Card preview</h2>
                            <div className="overflow-hidden rounded-2xl border border-[#eeeeee]">
                                <div className="relative aspect-[4/3]">
                                    <Image src={h.img} alt="" fill sizes="320px" className="object-cover" />
                                    <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                                    <span className="absolute bottom-3 inset-x-0 text-center text-base font-bold text-white">{h.title}</span>
                                </div>
                                <div className="flex items-center justify-between gap-2 px-3.5 py-3">
                                    <span className="text-lg font-bold text-[#192537]">{eur(h.price)}</span>
                                    <span className="text-[11px] text-[#4a4a4a]">T1 · 68 m² · Energy {energy}</span>
                                </div>
                            </div>
                        </section>

                        <Link href="/mockups-propertysell/a/admin/leads" className="flex items-center justify-between gap-3 rounded-[18px] bg-[#111111] px-5 py-5 text-white">
                            <span className="flex flex-col gap-1"><span className="text-[15px] font-bold">3 new leads</span><span className="text-xs text-white/75">for this listing this week</span></span>
                            <ArrowRight className="size-5 text-[#c5a059]" aria-hidden="true" />
                        </Link>
                    </div>
                </div>
            </div>
        </AdminShell>
    );
}
