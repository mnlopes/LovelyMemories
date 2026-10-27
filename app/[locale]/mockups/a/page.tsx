"use client";

import { useState } from "react";
import Image from "next/image";
import { Bath, BedDouble, Home, MapPin, Maximize, Search, TrendingUp, Zap } from "lucide-react";
import { Link } from "@/i18n/routing";
import { SiteFooter, SiteHeader } from "../_components/SiteChrome";
import { HOMES, IMG, eur, perM2, type SaleType } from "../_components/data";

const TABS: { id: 'all' | SaleType; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'apartment', label: 'Apartments' },
    { id: 'house', label: 'Houses' },
    { id: 'building', label: 'Buildings' },
];

const fieldLabel = "text-[10px] font-bold uppercase tracking-[0.2em] text-[#6b7280]";
const fieldSelect = "w-full border-0 bg-transparent p-0 text-[15px] font-semibold text-[#192537] focus:outline-none";

export default function ForSalePage() {
    const [tab, setTab] = useState<'all' | SaleType>('all');
    const homes = HOMES.filter((h) => tab === 'all' || h.type === tab);

    return (
        <>
            <SiteHeader variant="a" />

            <section className="relative flex min-h-[520px] items-end overflow-hidden bg-[#0a1128] lg:min-h-[480px]">
                <Image src={IMG.hero} alt="Porto riverside at sunset" fill priority sizes="100vw" className="object-cover object-[center_40%]" />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#0a1128]/95 via-[#0a1128]/55 to-[#0a1128]/15" />
                <div className="relative mx-auto flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-10 pt-24 lg:px-6 lg:pb-12">
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#b09e80]">Lovely Memories · Real estate</p>
                    <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-white md:text-[56px]">Homes for Sale</h1>
                    <p className="max-w-[640px] text-base leading-relaxed text-white/85 md:text-lg">
                        Curated homes in Porto and Gaia — many already proven as successful holiday rentals. Ready to move in, or ready to earn.
                    </p>
                    <form className="mt-3 grid grid-cols-2 gap-1 rounded-[20px] bg-white p-2 shadow-[0_20px_50px_rgba(0,0,0,0.25)] lg:flex lg:items-stretch">
                        <label className="col-span-2 flex flex-col gap-1 rounded-xl px-4 py-2.5 lg:flex-1 lg:px-5">
                            <span className={fieldLabel}>Location</span>
                            <select className={fieldSelect}><option>All locations</option><option>Porto</option><option>Vila Nova de Gaia</option></select>
                        </label>
                        <label className="flex flex-col gap-1 rounded-xl px-4 py-2.5 lg:flex-1 lg:border-l lg:border-[#eceef1] lg:px-5">
                            <span className={fieldLabel}>Type</span>
                            <select className={fieldSelect}><option>Any type</option><option>Apartment</option><option>House</option><option>Building</option></select>
                        </label>
                        <label className="flex flex-col gap-1 rounded-xl px-4 py-2.5 lg:flex-1 lg:border-l lg:border-[#eceef1] lg:px-5">
                            <span className={fieldLabel}>Bedrooms</span>
                            <select className={fieldSelect}><option>Any</option><option>1+</option><option>2+</option><option>3+</option></select>
                        </label>
                        <label className="col-span-2 flex flex-col gap-1 rounded-xl px-4 py-2.5 lg:flex-1 lg:border-l lg:border-[#eceef1] lg:px-5">
                            <span className={fieldLabel}>Max. price</span>
                            <select className={fieldSelect}><option>No limit</option><option>€250,000</option><option>€500,000</option><option>€1,000,000</option></select>
                        </label>
                        <button type="button" className="col-span-2 flex min-h-14 items-center justify-center gap-2.5 rounded-[14px] bg-[#192537] px-8 text-xs font-bold uppercase tracking-[0.18em] text-white">
                            <Search className="size-4" aria-hidden="true" />
                            Search
                        </button>
                    </form>
                </div>
            </section>

            <section className="px-4 pb-16 pt-10 lg:px-6 lg:pb-20 lg:pt-14">
                <div className="mx-auto flex max-w-[1280px] flex-col gap-8 lg:gap-10">
                    <div className="flex flex-col gap-4 border-b border-[#e9ebee] md:flex-row md:items-end md:justify-between">
                        <div className="-mx-4 flex gap-8 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:gap-10 md:px-0">
                            {TABS.map((t) => {
                                const count = t.id === 'all' ? HOMES.length : HOMES.filter((h) => h.type === t.id).length;
                                const active = tab === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        type="button"
                                        aria-pressed={active}
                                        onClick={() => setTab(t.id)}
                                        className="relative flex shrink-0 items-center gap-2.5 pb-4"
                                    >
                                        <span className={`text-[11px] font-bold uppercase tracking-[0.3em] ${active ? 'text-[#192537]' : 'text-[#6b7280] hover:text-[#7a6a4d]'}`}>{t.label}</span>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? 'bg-[#192537] text-white' : 'bg-[#eef0f3] text-[#4b5563]'}`}>{count}</span>
                                        {active && <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-0.5 bg-[#192537]" />}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex items-center justify-between gap-4 pb-3">
                            <p className="whitespace-nowrap text-[13px] text-[#4b5563]">
                                Showing <strong className="text-[#192537]">{homes.length}</strong> {homes.length === 1 ? 'home' : 'homes'}
                            </p>
                            <label className="flex items-center gap-2 whitespace-nowrap text-[13px] text-[#4b5563]">
                                <span className="sr-only sm:not-sr-only">Sort by</span>
                                <select className="rounded-full border border-[#dfe2e6] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#192537]">
                                    <option>Newest</option><option>Price: low to high</option><option>Price: high to low</option>
                                </select>
                            </label>
                        </div>
                    </div>

                    <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                        {homes.map((h) => {
                            const sold = h.status === 'sold';
                            return (
                                <article key={h.id} className="flex flex-col overflow-hidden rounded-2xl border border-[#eef0f2] bg-white shadow-[0_10px_40px_-15px_rgba(0,0,0,0.12)] transition-transform duration-500 hover:-translate-y-1">
                                    <div className="relative aspect-[4/3] overflow-hidden bg-[#e5e7eb]">
                                        <Image src={h.img} alt={h.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 420px" className={`object-cover ${sold ? 'grayscale brightness-90' : ''}`} />
                                        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                                        <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-2">
                                            <div className="flex gap-1.5">
                                                {h.status === 'new' && <span className="rounded-full bg-[#b09e80] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#192537]">New</span>}
                                                {h.status === 'reserved' && <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#192537]">Reserved</span>}
                                                {sold && <span className="rounded-full bg-[#192537] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white">Sold</span>}
                                            </div>
                                            {h.earned && !sold && (
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/35 bg-[#192537]/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur">
                                                    <TrendingUp className="size-3.5" aria-hidden="true" />
                                                    Income-generating
                                                </span>
                                            )}
                                        </div>
                                        <div className="absolute inset-x-0 bottom-0 px-6 py-5 text-center">
                                            <h2 className="text-[22px] font-bold leading-tight text-white">{h.title}</h2>
                                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/90">{h.subtitle}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-1 flex-col gap-4 px-6 pb-6 pt-4">
                                        <div className="flex items-center justify-between gap-3 border-b border-[#f1f2f4] pb-3.5">
                                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em]">
                                                <MapPin className="size-3.5 text-[#b09e80]" aria-hidden="true" />
                                                {h.city}
                                            </span>
                                            <span className="truncate text-xs text-[#6b7280]">{h.street}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex flex-col">
                                                <span className={`text-[26px] font-bold tracking-tight ${sold ? 'text-[#6b7280]' : ''}`}>{sold ? 'Sold' : eur(h.price)}</span>
                                                <span className="text-xs text-[#6b7280]">{sold ? 'Similar homes on request' : perM2(h)}</span>
                                            </div>
                                            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[#e6f4ea] px-2.5 py-1 text-[11px] font-bold text-[#1d6b40]">
                                                <Zap className="size-3" aria-hidden="true" />
                                                Energy {h.energy}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px] text-[#374151]">
                                            <span className="flex items-center gap-2"><Home className="size-4 text-[#b09e80]" aria-hidden="true" /><strong className="text-[#192537]">{h.typology}</strong></span>
                                            <span className="flex items-center gap-2"><Maximize className="size-4 text-[#b09e80]" aria-hidden="true" /><strong className="text-[#192537]">{h.area} m²</strong></span>
                                            <span className="flex items-center gap-2"><BedDouble className="size-4 text-[#b09e80]" aria-hidden="true" />{h.beds}</span>
                                            <span className="flex items-center gap-2"><Bath className="size-4 text-[#b09e80]" aria-hidden="true" />{h.baths}</span>
                                        </div>
                                        <Link href="/mockups/a/garden-house-paranhos" className="mt-auto flex min-h-12 items-center justify-center rounded-full bg-[#192537] text-xs font-bold uppercase tracking-[0.18em] text-white hover:bg-[#b09e80] hover:text-[#192537]">
                                            View property
                                        </Link>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="px-4 pb-20 lg:px-6">
                <div className="mx-auto flex max-w-[1280px] flex-col gap-8 rounded-3xl bg-[#192537] p-8 md:p-12 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex max-w-[640px] flex-col gap-3">
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#b09e80]">For owners</p>
                        <h2 className="text-[28px] font-bold leading-tight text-white md:text-[34px]">Thinking of selling your home?</h2>
                        <p className="text-base leading-relaxed text-white/80">
                            We value it, photograph it and present it to the right buyers. If it is already a rental with Lovely Memories, its track record helps sell it.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Link href="/contact" className="flex min-h-[50px] items-center justify-center rounded-full bg-[#b09e80] px-7 text-xs font-extrabold uppercase tracking-[0.18em] text-[#192537]">Request a valuation</Link>
                        <Link href="/join" className="flex min-h-[50px] items-center justify-center rounded-full border border-white/40 px-7 text-xs font-bold uppercase tracking-[0.18em] text-white">How it works</Link>
                    </div>
                </div>
            </section>

            <SiteFooter />
        </>
    );
}
