"use client";

import { useState } from "react";
import Image from "next/image";
import { CalendarDays, Check, KeyRound, Map as MapIcon, TrendingUp } from "lucide-react";
import { Link } from "@/i18n/routing";
import { SiteFooter, SiteHeader } from "../_components/SiteChrome";
import { HOMES, IMG, eur } from "../_components/data";

type Mode = 'stay' | 'buy';

const fieldLabel = "text-[10px] font-bold uppercase tracking-[0.2em] text-[#6b7280]";
const fieldControl = "w-full border-0 bg-transparent p-0 text-base font-semibold text-[#192537] outline-none placeholder:font-medium placeholder:text-[#6b7280]";
const field = "flex flex-col gap-1.5 px-4 py-3 lg:flex-1 lg:px-5";
const divider = "border-t border-[#eceef1] lg:border-l lg:border-t-0";

export default function StayOrBuyHome() {
    const [mode, setMode] = useState<Mode>('buy');
    const featured = ['paranhos', 'ribeira', 'almada'].map((id) => HOMES.find((h) => h.id === id)!);

    const tab = (m: Mode) =>
        `flex min-h-12 items-center gap-2 rounded-t-2xl px-4 text-[11px] font-extrabold uppercase tracking-[0.16em] sm:px-6 sm:text-xs ${
            mode === m ? 'bg-white text-[#7a6a4d]' : 'bg-[#192537]/75 text-white'
        }`;

    return (
        <>
            <SiteHeader variant="b" mode={mode} onModeChange={setMode} />

            <section className="relative flex min-h-[640px] items-end overflow-hidden bg-[#0a1128] lg:min-h-[720px]">
                <Image src={IMG.hero} alt="Porto riverside at sunset" fill priority sizes="100vw" className="object-cover" />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#0a1128]/90 via-[#0a1128]/40 to-[#0a1128]/25" />
                <div className="relative mx-auto flex w-full max-w-[1392px] flex-col gap-4 px-4 pb-10 pt-28 lg:px-6 lg:pb-14">
                    {mode === 'stay' ? (
                        <>
                            <p className="text-sm font-medium uppercase tracking-[0.08em] text-white md:text-base">Book one of our exquisite, curated homes</p>
                            <h1 className="mb-4 max-w-[760px] text-[34px] font-bold leading-[1.15] text-white md:text-[54px]">
                                And create your own Lovely, long lasting Memories of <span className="text-[#b09e80]">PORTO</span>
                            </h1>
                        </>
                    ) : (
                        <>
                            <p className="text-sm font-medium uppercase tracking-[0.08em] text-white md:text-base">Own one of our curated homes</p>
                            <h1 className="mb-4 max-w-[820px] text-[34px] font-bold leading-[1.15] text-white md:text-[54px]">
                                Make Porto your home — or your next <span className="text-[#b09e80]">investment</span>
                            </h1>
                        </>
                    )}

                    <div className="flex flex-col">
                        <div className="flex gap-1">
                            <button type="button" aria-pressed={mode === 'stay'} onClick={() => setMode('stay')} className={tab('stay')}>
                                <CalendarDays className="size-4" aria-hidden="true" />My trip
                            </button>
                            <button type="button" aria-pressed={mode === 'buy'} onClick={() => setMode('buy')} className={tab('buy')}>
                                <KeyRound className="size-4" aria-hidden="true" />Buy a home
                                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider ${mode === 'buy' ? 'bg-[#192537] text-white' : 'bg-[#b09e80] text-[#192537]'}`}>NEW</span>
                            </button>
                        </div>

                        {mode === 'stay' ? (
                            <form className="flex flex-col rounded-b-[20px] rounded-tr-[20px] bg-white p-2 shadow-[0_20px_50px_rgba(0,0,0,0.25)] lg:flex-row lg:items-stretch">
                                <label className={`${field} lg:flex-[2]`}><span className={fieldLabel}>Your destination</span><input type="text" placeholder="Where are you going?" className={fieldControl} /></label>
                                <div className="grid grid-cols-2 lg:contents">
                                    <label className={`${field} ${divider}`}><span className={fieldLabel}>Arrival</span><input type="text" placeholder="Select date" className={fieldControl} /></label>
                                    <label className={`${field} border-l border-t border-[#eceef1] lg:border-t-0`}><span className={fieldLabel}>Departure</span><input type="text" placeholder="Select date" className={fieldControl} /></label>
                                </div>
                                <label className={`${field} ${divider}`}><span className={fieldLabel}>Travellers</span><select className={fieldControl}><option>1 person</option><option>2 people</option><option>4 people</option></select></label>
                                <button type="button" className="mt-1 min-h-14 rounded-[14px] bg-[#192537] px-9 text-xs font-bold uppercase tracking-[0.18em] text-white lg:mt-0">Search</button>
                            </form>
                        ) : (
                            <form className="flex flex-col rounded-b-[20px] rounded-tr-[20px] bg-white p-2 shadow-[0_20px_50px_rgba(0,0,0,0.25)] lg:flex-row lg:items-stretch">
                                <label className={field}><span className={fieldLabel}>Location</span><select className={fieldControl}><option>Porto &amp; Gaia</option><option>Porto</option><option>Vila Nova de Gaia</option></select></label>
                                <div className="grid grid-cols-2 lg:contents">
                                    <label className={`${field} ${divider}`}><span className={fieldLabel}>Type</span><select className={fieldControl}><option>Any type</option><option>Apartment</option><option>House</option><option>Building</option></select></label>
                                    <label className={`${field} border-l border-t border-[#eceef1] lg:border-t-0`}><span className={fieldLabel}>Budget</span><select className={fieldControl}><option>Up to €750k</option><option>Up to €350k</option><option>Up to €500k</option><option>No limit</option></select></label>
                                </div>
                                <label className={`${field} ${divider}`}><span className={fieldLabel}>Bedrooms</span><select className={fieldControl}><option>Any</option><option>1+</option><option>2+</option><option>3+</option></select></label>
                                <Link href="/mockups-propertysell/b/search" className="mt-1 flex min-h-14 items-center justify-center gap-2.5 rounded-[14px] bg-[#192537] px-8 text-xs font-bold uppercase tracking-[0.18em] text-white lg:mt-0">
                                    <MapIcon className="size-4" aria-hidden="true" />Show 5 homes
                                </Link>
                            </form>
                        )}

                        {mode === 'buy' && (
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                <span className="text-[13px] text-white/85">Popular:</span>
                                {['Already earning as a rental', 'With a garden', 'Near the river'].map((c) => (
                                    <Link key={c} href="/mockups-propertysell/b/search" className="rounded-full border border-white/45 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-white/10">{c}</Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section className="px-4 py-16 lg:px-6 lg:py-20">
                <div className="mx-auto flex max-w-[1280px] flex-col gap-8">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div className="flex flex-col gap-2.5">
                            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#7a6a4d]">Homes for sale</p>
                            <h2 className="text-[30px] font-bold leading-tight tracking-tight md:text-[40px]">New on the market</h2>
                        </div>
                        <Link href="/mockups-propertysell/b/search" className="self-start border-b-2 border-[#b09e80] pb-1 text-xs font-bold uppercase tracking-[0.18em] md:self-auto">See them on the map</Link>
                    </div>
                    <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:gap-8 md:px-0">
                        {featured.map((h) => (
                            <Link key={h.id} href="/mockups-propertysell/b/garden-house-paranhos" className="group flex w-[80%] shrink-0 snap-start flex-col gap-4 md:w-auto">
                                <span className="relative block aspect-[4/5] overflow-hidden rounded-[20px] bg-[#e5e7eb]">
                                    <Image src={h.img} alt={h.title} fill sizes="(max-width: 768px) 80vw, 420px" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                                    {h.earned ? (
                                        <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-[#192537]/75 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur">
                                            <TrendingUp className="size-3.5 text-[#b09e80]" aria-hidden="true" />Earned {eur(h.earned)} last year
                                        </span>
                                    ) : (
                                        <span className="absolute left-4 top-4 rounded-full bg-[#b09e80] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#192537]">Just listed</span>
                                    )}
                                </span>
                                <span className="flex flex-col gap-1">
                                    <span className="flex items-baseline justify-between gap-3"><span className="text-2xl font-bold tracking-tight">{eur(h.price)}</span><span className="text-[13px] text-[#4b5563]">{h.typology.split(' ')[0]} · {h.area} m²</span></span>
                                    <span className="text-[17px] font-semibold">{h.title}</span>
                                    <span className="text-[13px] text-[#6b7280]">{h.street}, {h.city}</span>
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            <section className="px-4 pb-20 lg:px-6 lg:pb-24">
                <div className="mx-auto flex max-w-[1280px] flex-col overflow-hidden rounded-[28px] bg-[#192537] md:flex-row">
                    <div className="relative min-h-[280px] md:min-h-[440px] md:w-[42%]">
                        <Image src={IMG.neon} alt="Bedroom in a Lovely Memories home" fill sizes="(max-width: 768px) 100vw, 540px" className="object-cover" />
                    </div>
                    <div className="flex flex-1 flex-col justify-center gap-4 p-7 md:p-14">
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#b09e80]">Only at Lovely Memories</p>
                        <h2 className="text-[30px] font-bold leading-tight text-white md:text-[40px]">Sleep on it before you buy</h2>
                        <p className="max-w-[560px] text-base leading-relaxed text-white/80 md:text-[17px]">
                            Most of our homes for sale can also be booked as a stay. Spend a night, walk the neighbourhood, hear the street in the evening — then decide.
                        </p>
                        <ul className="mt-1 flex flex-col gap-3">
                            {['Book the home as a guest, like any stay', 'A full tour with our team during your stay', 'Your stay credited back if you buy'].map((t) => (
                                <li key={t} className="flex items-center gap-3 text-[15px] text-white"><Check className="size-[18px] shrink-0 text-[#b09e80]" strokeWidth={3} aria-hidden="true" />{t}</li>
                            ))}
                        </ul>
                        <Link href="/mockups-propertysell/b/search" className="mt-2 flex min-h-[52px] items-center justify-center self-stretch rounded-full bg-[#b09e80] px-7 text-xs font-extrabold uppercase tracking-[0.18em] text-[#192537] sm:self-start">Find a home to try</Link>
                    </div>
                </div>
            </section>

            <SiteFooter />
        </>
    );
}
