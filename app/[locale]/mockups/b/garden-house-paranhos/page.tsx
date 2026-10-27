"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowLeft, Check, Grid3x3, Heart, Share2 } from "lucide-react";
import { Link } from "@/i18n/routing";
import { SiteFooter, SiteHeader } from "../../_components/SiteChrome";
import { FEATURED, IMG, eur, perM2 } from "../../_components/data";

const PLANS = [
    { id: 'base', pct: 25, label: 'Base — 25%', sub: 'Guests, pricing, cleaning' },
    { id: 'luxe', pct: 30, label: 'Base + Luxe — 30%', sub: 'Adds concierge and upkeep' },
];

const DAYS = [
    { dow: 'Wed', day: '28', month: 'Oct' },
    { dow: 'Thu', day: '29', month: 'Oct' },
    { dow: 'Fri', day: '30', month: 'Oct' },
    { dow: 'Sat', day: '31', month: 'Oct' },
    { dow: 'Mon', day: '2', month: 'Nov' },
    { dow: 'Tue', day: '3', month: 'Nov' },
];
const TIMES = ['10:00', '11:00', '12:00', '15:00', '16:30', '18:00'];
// Stand-in for "a guest is staying at that time", which would come from the booking calendar.
const isTaken = (day: number, slot: number) => (day + slot) % 4 === 0;

const FACTS = [['Typology', 'T1 house'], ['Gross area', '68 m²'], ['Garden', '140 m² plot'], ['Bathrooms', '1'], ['Energy class', 'C'], ['Renovated', '2021 · furnished']];

const eyebrow = "text-xs font-bold uppercase tracking-[0.3em] text-[#7a6a4d]";
const h2 = "text-[28px] font-bold leading-tight tracking-tight md:text-[38px]";
const inputCls = "min-h-[46px] rounded-xl border border-[#dfe2e6] bg-white px-3.5 text-sm text-[#192537]";

export default function SaleDetailB() {
    const h = FEATURED;
    const [rate, setRate] = useState(95);
    const [occ, setOcc] = useState(78);
    const [plan, setPlan] = useState('base');
    const [day, setDay] = useState(1);
    const [slot, setSlot] = useState('11:00');
    const [kind, setKind] = useState<'person' | 'video'>('person');
    const [confirmed, setConfirmed] = useState(false);

    const pct = PLANS.find((p) => p.id === plan)!.pct;
    const nights = Math.round((365 * occ) / 100);
    const gross = rate * nights;
    const fee = (gross * pct) / 100;
    const net = gross - fee;
    const netYield = ((net / h.price) * 100).toFixed(1);

    const pickDay = (d: number) => {
        const keep = TIMES.indexOf(slot);
        setDay(d);
        if (keep < 0 || isTaken(d, keep)) setSlot(TIMES.find((_, i) => !isTaken(d, i))!);
    };
    const d = DAYS[day];
    const summary = `${d.dow} ${d.day} ${d.month} at ${slot} · ${kind === 'video' ? 'Video call' : 'In person'}`;

    const choice = (active: boolean) =>
        active ? 'border-2 border-[#192537] bg-[#f6f3ec]' : 'border border-[#d6d9de] bg-white';

    return (
        <>
            <SiteHeader variant="b" mode="buy" />

            <section className="relative flex min-h-[600px] flex-col justify-between overflow-hidden bg-[#0a1128] lg:min-h-[640px]">
                <Image src={IMG.livingGarden} alt="Living room opening onto the private garden" fill priority sizes="100vw" className="object-cover object-[78%_center] lg:object-center" />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#0a1128]/95 via-[#0a1128]/40 to-[#0a1128]/30" />
                <div className="relative mx-auto flex w-full max-w-[1280px] items-center justify-between gap-3 px-4 pt-5 lg:px-6 lg:pt-6">
                    <Link href="/mockups/b/search" className="flex min-h-11 items-center gap-2 rounded-full bg-white/90 px-4 text-[13px] font-bold"><ArrowLeft className="size-4" aria-hidden="true" /><span className="hidden sm:inline">Back to the map</span><span className="sm:hidden">Map</span></Link>
                    <div className="flex gap-2">
                        <button type="button" className="flex min-h-11 items-center gap-2 rounded-full bg-white/90 px-4 text-[13px] font-bold"><Grid3x3 className="size-4" aria-hidden="true" />24<span className="hidden sm:inline"> photos</span></button>
                        <button type="button" aria-label="Save to favourites" className="flex size-11 items-center justify-center rounded-full bg-white/90"><Heart className="size-[18px]" aria-hidden="true" /></button>
                        <button type="button" aria-label="Share" className="flex size-11 items-center justify-center rounded-full bg-white/90"><Share2 className="size-[18px]" aria-hidden="true" /></button>
                    </div>
                </div>
                <div className="relative mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 pb-8 pt-24 lg:flex-row lg:items-end lg:justify-between lg:gap-8 lg:px-6 lg:pb-12">
                    <div className="flex flex-col gap-3.5">
                        <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-[#b09e80] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#192537]">For sale</span>
                            <span className="rounded-full border border-white/35 bg-white/15 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white">Already earning as a rental</span>
                            <span className="hidden rounded-full border border-white/35 bg-white/15 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white sm:inline">Can be booked as a stay</span>
                        </div>
                        <h1 className="text-[40px] font-bold leading-[1.05] tracking-tight text-white md:text-[64px]">{h.title}</h1>
                        <p className="text-base text-white/85 md:text-[19px]">A private garden, ten minutes from Trindade · Paranhos, Porto</p>
                        <p className="flex items-baseline gap-2.5 lg:hidden">
                            <span className="text-[28px] font-bold tracking-tight text-white">{eur(h.price)}</span>
                            <span className="text-[13px] text-white/75">{perM2(h)}</span>
                        </p>
                    </div>
                    <div className="hidden w-[380px] shrink-0 flex-col gap-4 rounded-[22px] border border-white/20 bg-[#0a1128]/70 p-6 backdrop-blur lg:flex">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/75">Asking price</span>
                            <span className="text-[40px] font-bold tracking-tight text-white">{eur(h.price)}</span>
                            <span className="text-[13px] text-white/75">{perM2(h)} · Ref. LM-V-0042</span>
                        </div>
                        <div className="flex gap-2.5">
                            <a href="#visit" className="flex min-h-[50px] flex-1 items-center justify-center rounded-full bg-[#b09e80] text-xs font-extrabold uppercase tracking-[0.16em] text-[#192537]">Book a visit</a>
                            <a href="#earnings" className="flex min-h-[50px] flex-1 items-center justify-center rounded-full border border-white/50 text-xs font-bold uppercase tracking-[0.16em] text-white">See earnings</a>
                        </div>
                    </div>
                </div>
            </section>

            <div className="bg-[#192537] px-4 py-5 lg:px-6">
                <ul className="mx-auto grid max-w-[1280px] grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
                    {FACTS.map(([k, v]) => (
                        <li key={k} className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">{k}</span>
                            <span className="text-base font-bold text-white md:text-lg">{v}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <section className="bg-white px-4 py-16 lg:px-6 lg:py-20">
                <div className="mx-auto flex max-w-[1280px] flex-col gap-10 lg:flex-row lg:items-center lg:gap-14">
                    <div className="flex flex-1 flex-col gap-4">
                        <p className={eyebrow}>The home</p>
                        <h2 className={h2}>A garden of your own, ten minutes from Trindade</h2>
                        <p className="text-base leading-[1.75] text-[#374151] md:text-[17px]">A quiet single-storey house tucked behind Rua de Costa Cabral, with its own lawn and a sunny terrace for long dinners outside. Fully renovated in 2021: open-plan kitchen and living room, a double bedroom and a bathroom with walk-in shower.</p>
                        <p className="text-base leading-[1.75] text-[#374151] md:text-[17px]">It is sold furnished and is already one of our holiday homes — the licence, the furniture and the guests are in place from day one.</p>
                    </div>
                    <div className="grid h-[360px] w-full grid-cols-2 grid-rows-2 gap-3 md:h-[452px] lg:flex-1">
                        <span className="relative row-span-2 overflow-hidden rounded-[20px]"><Image src={IMG.cottage} alt="Garden and terrace" fill sizes="(max-width: 1024px) 50vw, 300px" className="object-cover" /></span>
                        <span className="relative overflow-hidden rounded-[20px]"><Image src={IMG.bedroom} alt="Double bedroom" fill sizes="(max-width: 1024px) 50vw, 300px" className="object-cover" /></span>
                        <span className="relative overflow-hidden rounded-[20px]"><Image src={IMG.garden} alt="View over the neighbourhood gardens" fill sizes="(max-width: 1024px) 50vw, 300px" className="object-cover" /></span>
                    </div>
                </div>
            </section>

            <section id="earnings" className="scroll-mt-24 px-4 py-16 lg:px-6 lg:py-20">
                <div className="mx-auto flex max-w-[1280px] flex-col gap-8">
                    <div className="flex max-w-[760px] flex-col gap-2.5">
                        <p className={eyebrow}>Earnings calculator</p>
                        <h2 className={h2}>What could this home earn for you?</h2>
                        <p className="text-base leading-relaxed text-[#4b5563]">The sliders start at this home&apos;s real numbers from the last 12 months with us. Move them to test your own scenario.</p>
                    </div>
                    <div className="flex flex-col gap-5 lg:flex-row lg:gap-6">
                        <div className="flex flex-1 flex-col gap-7 rounded-3xl border border-[#eceef1] bg-white p-6 md:p-8">
                            <label className="flex flex-col gap-3">
                                <span className="flex items-baseline justify-between gap-3"><span className="text-sm font-bold">Average nightly rate</span><span className="text-[22px] font-bold">€{rate}</span></span>
                                <input type="range" min={60} max={180} step={5} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="h-6 w-full accent-[#192537]" />
                                <span className="flex justify-between text-xs text-[#6b7280]"><span>€60</span><span>Last 12 months: €95</span><span>€180</span></span>
                            </label>
                            <label className="flex flex-col gap-3">
                                <span className="flex items-baseline justify-between gap-3"><span className="text-sm font-bold">Occupancy</span><span className="text-[22px] font-bold">{occ}%</span></span>
                                <input type="range" min={40} max={95} step={1} value={occ} onChange={(e) => setOcc(Number(e.target.value))} className="h-6 w-full accent-[#192537]" />
                                <span className="flex justify-between text-xs text-[#6b7280]"><span>40%</span><span>Last 12 months: 78%</span><span>95%</span></span>
                            </label>
                            <div className="flex flex-col gap-3">
                                <span className="text-sm font-bold">Management by Lovely Memories</span>
                                <div role="group" aria-label="Management plan" className="grid gap-2.5 sm:grid-cols-2">
                                    {PLANS.map((p) => (
                                        <button key={p.id} type="button" aria-pressed={plan === p.id} onClick={() => setPlan(p.id)} className={`flex flex-col gap-0.5 rounded-2xl px-4 py-3.5 text-left ${choice(plan === p.id)}`}>
                                            <span className="text-sm font-bold">{p.label}</span>
                                            <span className="text-xs text-[#4b5563]">{p.sub}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-1 flex-col gap-6 rounded-3xl bg-[#192537] p-6 md:p-8" aria-live="polite">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Your net income per year</span>
                                <span className="text-[44px] font-bold leading-[1.1] tracking-tight text-white md:text-[52px]">{eur(net)}</span>
                                <span className="text-base font-bold text-[#b09e80]">{netYield}% net yield on {eur(h.price)}</span>
                            </div>
                            <div className="flex flex-col gap-2.5">
                                <div aria-hidden="true" className="flex h-3.5 overflow-hidden rounded-full bg-white/10">
                                    <span className="bg-[#b09e80] transition-all" style={{ width: `${100 - pct}%` }} />
                                    <span className="bg-white/35 transition-all" style={{ width: `${pct}%` }} />
                                </div>
                                <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/80">
                                    <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="size-2.5 rounded-[3px] bg-[#b09e80]" />You keep</span>
                                    <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="size-2.5 rounded-[3px] bg-white/35" />Management fee</span>
                                </div>
                            </div>
                            <dl className="flex flex-col border-t border-white/15">
                                {[['Nights booked per year', `${nights} nights`], ['Gross rental revenue', eur(gross)], [`Management fee (${pct}%)`, `− ${eur(fee)}`]].map(([k, v]) => (
                                    <div key={k} className="flex justify-between gap-3 border-b border-white/15 py-3.5"><dt className="text-sm text-white/80">{k}</dt><dd className="text-sm font-bold text-white">{v}</dd></div>
                                ))}
                                <div className="flex justify-between gap-3 py-3.5"><dt className="text-[15px] font-bold text-white">Net to you</dt><dd className="text-[15px] font-extrabold text-[#b09e80]">{eur(net)}</dd></div>
                            </dl>
                            <p className="text-xs leading-relaxed text-white/65">Estimate before taxes, condominium fees and utilities. Not a guarantee of future income.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section id="visit" className="scroll-mt-24 bg-white px-4 py-16 lg:px-6 lg:py-20">
                <div className="mx-auto flex max-w-[1280px] flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
                    <div className="flex flex-col gap-4 lg:w-[380px] lg:shrink-0">
                        <p className={eyebrow}>Visit</p>
                        <h2 className={h2}>Book a visit like you book a stay</h2>
                        <p className="text-base leading-relaxed text-[#4b5563]">Pick a day and a time. Times when guests are staying are greyed out automatically, straight from the booking calendar.</p>
                        <div className="mt-2 flex items-center gap-4 rounded-[20px] border border-[#eceef1] bg-[#f8f9fa] p-5">
                            <span className="relative size-[72px] shrink-0 overflow-hidden rounded-[14px]"><Image src={IMG.neon} alt="" fill sizes="72px" className="object-cover" /></span>
                            <div className="flex flex-col gap-1">
                                <span className="text-[15px] font-bold">Rather sleep on it?</span>
                                <span className="text-[13px] leading-normal text-[#4b5563]">Book a night here from €95 — credited back if you buy.</span>
                                <Link href="/mockups/b" className="text-xs font-bold uppercase tracking-[0.14em] text-[#7a6a4d]">See availability</Link>
                            </div>
                        </div>
                    </div>

                    <div className="min-w-0 flex-1 rounded-3xl border border-[#e3e6ea] bg-white p-5 shadow-[0_20px_50px_-24px_rgba(25,37,55,0.25)] md:p-7">
                        {confirmed ? (
                            <div className="flex flex-col items-start gap-3.5 px-1 py-6">
                                <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-[#e6f4ea]"><Check className="size-7 text-[#1d6b40]" strokeWidth={3} /></span>
                                <h3 className="text-[26px] font-bold">Visit requested</h3>
                                <p className="text-base leading-relaxed text-[#374151]"><strong className="text-[#192537]">{summary}</strong> — {h.title}. We&apos;ll confirm by email and send you the exact address.</p>
                                <div className="flex flex-wrap gap-2.5">
                                    <button type="button" className="min-h-[46px] rounded-full border border-[#d6d9de] px-5 text-[13px] font-bold">Add to calendar</button>
                                    <button type="button" onClick={() => setConfirmed(false)} className="min-h-[46px] rounded-full px-5 text-[13px] font-bold text-[#7a6a4d]">Change time</button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col gap-2.5">
                                    <span className="text-[13px] font-bold">Choose a day</span>
                                    <div className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-6 md:px-0">
                                        {DAYS.map((x, i) => (
                                            <button
                                                key={x.day}
                                                type="button"
                                                aria-pressed={i === day}
                                                onClick={() => pickDay(i)}
                                                className={`flex min-h-[76px] w-[76px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl md:w-auto ${i === day ? 'border-2 border-[#192537] bg-[#192537] text-white' : 'border border-[#d6d9de] bg-white'}`}
                                            >
                                                <span className={`text-[11px] font-bold uppercase tracking-[0.14em] ${i === day ? '' : 'text-[#4b5563]'}`}>{x.dow}</span>
                                                <span className="text-[22px] font-bold">{x.day}</span>
                                                <span className={`text-[11px] ${i === day ? '' : 'text-[#4b5563]'}`}>{x.month}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2.5">
                                    <span className="text-[13px] font-bold">Choose a time</span>
                                    <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
                                        {TIMES.map((t, i) => {
                                            const taken = isTaken(day, i);
                                            return taken ? (
                                                <button key={t} type="button" disabled aria-label={`${t}, guests staying`} className="min-h-[46px] cursor-not-allowed rounded-xl border border-dashed border-[#d6d9de] bg-[#f4f5f7] text-sm text-[#6b7280] line-through">{t}</button>
                                            ) : (
                                                <button key={t} type="button" aria-pressed={slot === t} onClick={() => setSlot(t)} className={`min-h-[46px] rounded-xl text-sm ${slot === t ? 'border-2 border-[#192537] bg-[#f6f3ec] font-extrabold' : 'border border-[#d6d9de] bg-white font-semibold'}`}>{t}</button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2.5">
                                    {(['person', 'video'] as const).map((k) => (
                                        <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={`min-h-11 rounded-full px-5 text-[13px] ${kind === k ? 'border-2 border-[#192537] bg-[#192537] font-bold text-white' : 'border border-[#d6d9de] bg-white font-semibold'}`}>
                                            {k === 'person' ? 'In person' : 'Video call'}
                                        </button>
                                    ))}
                                </div>
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#374151]">Full name<input type="text" placeholder="Your name" className={inputCls} /></label>
                                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#374151]">Email<input type="email" placeholder="you@email.com" className={inputCls} /></label>
                                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#374151]">Phone<input type="tel" placeholder="+351" className={inputCls} /></label>
                                </div>
                                <div className="flex flex-col gap-4 border-t border-[#eceef1] pt-5 sm:flex-row sm:items-center sm:justify-between">
                                    <strong className="text-[15px]">{summary}</strong>
                                    <button type="button" onClick={() => setConfirmed(true)} className="min-h-[52px] rounded-full bg-[#192537] px-8 text-xs font-bold uppercase tracking-[0.18em] text-white">Request this visit</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-[#eceef1] bg-white px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] lg:hidden">
                <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-lg font-bold">{eur(h.price)}</span>
                    <a href="#earnings" className="text-[11px] font-semibold text-[#7a6a4d]">Earns ~{eur(net)}/yr net</a>
                </div>
                <a href="#visit" className="flex min-h-12 items-center justify-center rounded-full bg-[#192537] px-6 text-xs font-bold uppercase tracking-[0.14em] text-white">Book a visit</a>
            </div>

            <SiteFooter />
            <div aria-hidden="true" className="h-20 bg-[#0a1128] lg:hidden" />
        </>
    );
}
