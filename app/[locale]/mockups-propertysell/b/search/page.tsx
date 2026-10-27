"use client";

import { useState } from "react";
import Image from "next/image";
import { Bell, ChevronDown, List, Map as MapIcon, MapPin, Minus, Plus, TrendingUp } from "lucide-react";
import { Link } from "@/i18n/routing";
import { SiteHeader } from "../../_components/SiteChrome";
import { HOMES, eur, eurShort, type SaleHome } from "../../_components/data";

const ACTIVE = HOMES.filter((h) => h.status !== 'sold');
const DETAIL = '/mockups-propertysell/b/garden-house-paranhos';

function Chip({ children }: { children: React.ReactNode }) {
    return (
        <button type="button" className="flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-[#d6d9de] bg-white px-4 text-[13px] font-semibold">
            {children}
        </button>
    );
}

function EarnedBadge({ h }: { h: SaleHome }) {
    if (!h.earned) return null;
    return (
        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-[#e6f4ea] px-2.5 py-1 text-xs font-bold text-[#1d6b40]">
            <TrendingUp className="size-3" aria-hidden="true" />Earned {eur(h.earned)} last year
        </span>
    );
}

// Stylised Porto / Gaia map: the Douro, the Atlantic edge and a few streets.
function MapBackdrop() {
    return (
        <div aria-hidden="true" className="absolute inset-0">
            <div className="absolute inset-y-0 left-0 w-[6%] bg-[#b7d0e2]" />
            <div className="absolute -left-[4%] top-[60%] h-[7%] w-[110%] -rotate-3 rounded-[40px] bg-[#b7d0e2]" />
            <div className="absolute left-[9%] top-[14%] h-[15%] w-[15%] rounded-[28px] bg-[#d3e3cd]" />
            <div className="absolute left-[36%] top-[44%] h-[7%] w-[8%] rounded-[18px] bg-[#d3e3cd]" />
            <div className="absolute left-[70%] top-[82%] h-[10%] w-[14%] rounded-[24px] bg-[#d3e3cd]" />
            <div className="absolute inset-x-0 top-[34%] h-2.5 rotate-[4deg] bg-white" />
            <div className="absolute inset-x-0 top-[22%] h-[7px] -rotate-6 bg-white" />
            <div className="absolute inset-x-0 top-[84%] h-2 -rotate-2 bg-white" />
            <div className="absolute -top-[5%] bottom-[40%] left-[48%] w-2 rotate-12 bg-white" />
            <div className="absolute -top-[5%] bottom-[40%] left-[70%] w-[7px] -rotate-[8deg] bg-white" />
            <div className="absolute -bottom-[5%] top-[66%] left-[58%] w-2 rotate-6 bg-white" />
            <span className="absolute left-[30%] top-[8%] text-sm font-extrabold tracking-[0.4em] text-[#8a8f99]">PORTO</span>
            <span className="absolute left-[18%] top-[90%] text-xs font-extrabold tracking-[0.3em] text-[#8a8f99]">VILA NOVA DE GAIA</span>
            <span className="absolute left-[24%] top-[61.5%] -rotate-3 text-[11px] font-bold tracking-[0.3em] text-[#5d7d94]">RIO DOURO</span>
            <span className="absolute left-[7.5%] top-[47%] text-[11px] font-bold tracking-[0.25em] text-[#8a8f99]">FOZ</span>
        </div>
    );
}

export default function MapSearch() {
    const [selected, setSelected] = useState('paranhos');
    const [view, setView] = useState<'map' | 'list'>('map');
    const sel = ACTIVE.find((h) => h.id === selected) ?? ACTIVE[0];

    const showOnMap = (id: string) => {
        setSelected(id);
        setView('map');
    };

    return (
        <>
            <SiteHeader variant="b" mode="buy" />

            <div className="border-b border-[#e8eaee] bg-white px-4 py-3 lg:px-6">
                <div className="mx-auto flex max-w-[1392px] items-center justify-between gap-3">
                    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
                        <Chip>Porto &amp; Gaia<ChevronDown className="size-3.5" aria-hidden="true" /></Chip>
                        <Chip>Any type<ChevronDown className="size-3.5" aria-hidden="true" /></Chip>
                        <Chip>Up to €750,000<ChevronDown className="size-3.5" aria-hidden="true" /></Chip>
                        <Chip>Bedrooms<ChevronDown className="size-3.5" aria-hidden="true" /></Chip>
                        <Chip><TrendingUp className="size-3.5 text-[#7a6a4d]" aria-hidden="true" />Already earning</Chip>
                        <Chip>Can be booked as a stay</Chip>
                    </div>
                    <button type="button" className="hidden min-h-11 shrink-0 items-center gap-2 rounded-full bg-[#192537] px-5 text-[13px] font-bold text-white lg:flex">
                        <Bell className="size-4" aria-hidden="true" />Alert me of new homes
                    </button>
                </div>
            </div>

            <div className="relative lg:flex">
                <section aria-label="Results" className={`${view === 'list' ? 'flex' : 'hidden'} flex-col gap-3.5 px-4 py-5 lg:flex lg:h-[calc(100vh-210px)] lg:min-h-[640px] lg:w-[560px] lg:shrink-0 lg:overflow-y-auto lg:px-6`}>
                    <div className="flex items-center justify-between gap-3">
                        <h1 className="text-lg font-bold">{ACTIVE.length} homes for sale <span className="font-medium text-[#4b5563]">· Porto &amp; Gaia</span></h1>
                        <label className="hidden items-center gap-2 text-[13px] text-[#4b5563] sm:flex">Sort
                            <select className="rounded-full border border-[#dfe2e6] bg-white px-3 py-2 text-[13px] font-semibold text-[#192537]"><option>Best match</option><option>Price: low to high</option><option>Highest earnings</option></select>
                        </label>
                    </div>
                    {ACTIVE.map((h) => (
                        <article
                            key={h.id}
                            className={`flex gap-4 rounded-[18px] border bg-white p-3 transition-shadow ${h.id === selected ? 'border-[#192537] shadow-[0_0_0_1px_#192537,0_12px_30px_-12px_rgba(25,37,55,0.35)]' : 'border-[#e8eaee]'}`}
                        >
                            <span className="relative h-[124px] w-[112px] shrink-0 overflow-hidden rounded-xl sm:h-[140px] sm:w-[168px]">
                                <Image src={h.img} alt={h.title} fill sizes="168px" className="object-cover" />
                            </span>
                            <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-0.5">
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="text-xl font-bold tracking-tight">{eur(h.price)}</span>
                                    {h.status === 'reserved' && <span className="rounded-full bg-[#eef1f5] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#334155]">Reserved</span>}
                                </div>
                                <span className="text-[15px] font-semibold leading-tight">{h.title}</span>
                                <span className="text-[13px] text-[#4b5563]">{h.typology} · {h.area} m²</span>
                                <span className="hidden sm:block"><EarnedBadge h={h} /></span>
                                <div className="mt-auto flex gap-2">
                                    <button type="button" onClick={() => showOnMap(h.id)} aria-label={`Show ${h.title} on the map`} className="flex min-h-10 items-center gap-1.5 rounded-full border border-[#d6d9de] px-3 text-xs font-bold">
                                        <MapPin className="size-3.5" aria-hidden="true" /><span className="hidden sm:inline">Show on map</span><span className="sm:hidden">Map</span>
                                    </button>
                                    <Link href={DETAIL} className="flex min-h-10 items-center rounded-full bg-[#192537] px-4 text-xs font-bold text-white">View home</Link>
                                </div>
                            </div>
                        </article>
                    ))}
                </section>

                <section aria-label="Map" className={`${view === 'map' ? 'block' : 'hidden'} relative h-[calc(100svh-190px)] min-h-[520px] overflow-hidden bg-[#ece9e1] lg:block lg:h-[calc(100vh-210px)] lg:min-h-[640px] lg:flex-1`}>
                    {/* On phones the map is squeezed above the bottom sheet so no pin hides under it. */}
                    <div className="absolute inset-x-0 top-0 h-[64%] lg:h-full">
                    <MapBackdrop />

                    <label className="absolute left-4 top-4 hidden items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[13px] font-semibold shadow-[0_6px_18px_rgba(0,0,0,0.1)] sm:flex">
                        <input type="checkbox" defaultChecked className="size-4 accent-[#192537]" />Search as I move the map
                    </label>
                    <div className="absolute right-4 top-4 flex flex-col overflow-hidden rounded-[14px] bg-white shadow-[0_6px_18px_rgba(0,0,0,0.1)]">
                        <button type="button" aria-label="Zoom in" className="flex size-11 items-center justify-center border-b border-[#eceef1]"><Plus className="size-5" aria-hidden="true" /></button>
                        <button type="button" aria-label="Zoom out" className="flex size-11 items-center justify-center"><Minus className="size-5" aria-hidden="true" /></button>
                    </div>

                    {ACTIVE.map((h) => {
                        const active = h.id === selected;
                        return (
                            <button
                                key={h.id}
                                type="button"
                                aria-pressed={active}
                                aria-label={`${h.title}, ${eur(h.price)}`}
                                onClick={() => setSelected(h.id)}
                                style={{ left: `${h.map.x}%`, top: `${h.map.y}%` }}
                                className={`absolute -translate-x-1/2 -translate-y-full rounded-full text-[13px] transition-transform ${
                                    active
                                        ? 'z-20 scale-110 bg-[#192537] px-3.5 py-2 font-extrabold text-white shadow-[0_8px_22px_rgba(25,37,55,0.4)]'
                                        : 'z-10 border border-[#d6d9de] bg-white px-3 py-2 font-bold text-[#192537] shadow-[0_4px_14px_rgba(0,0,0,0.14)]'
                                }`}
                            >
                                {eurShort(h.price)}
                            </button>
                        );
                    })}

                    {/* Desktop: card for the selected pin, parked in a corner so it never hides other pins */}
                    <div className="absolute bottom-5 left-5 z-30 hidden w-[280px] overflow-hidden rounded-[18px] bg-white shadow-[0_18px_44px_rgba(10,17,40,0.28)] lg:block">
                        <span className="relative block h-[140px]"><Image src={sel.img} alt={sel.title} fill sizes="270px" className="object-cover" /></span>
                        <div className="flex flex-col gap-1 px-4 pb-4 pt-3.5">
                            <span className="text-[19px] font-bold">{eur(sel.price)}</span>
                            <span className="text-sm font-semibold">{sel.title}</span>
                            <span className="text-xs text-[#4b5563]">{sel.typology} · {sel.area} m²</span>
                            <Link href={DETAIL} className="mt-2 flex min-h-[42px] items-center justify-center rounded-full bg-[#192537] text-xs font-bold uppercase tracking-[0.14em] text-white">View home</Link>
                        </div>
                    </div>
                    </div>

                    {/* Mobile: bottom sheet with the selected home */}
                    <div className="absolute inset-x-0 bottom-0 z-30 flex flex-col gap-3.5 rounded-t-3xl bg-white px-4 pb-5 pt-2.5 shadow-[0_-12px_30px_rgba(0,0,0,0.14)] lg:hidden">
                        <span aria-hidden="true" className="h-[5px] w-10 self-center rounded-full bg-[#d6d9de]" />
                        <div className="flex gap-3.5">
                            <span className="relative size-[100px] shrink-0 overflow-hidden rounded-[14px]"><Image src={sel.img} alt={sel.title} fill sizes="100px" className="object-cover" /></span>
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                                <span className="text-xl font-bold tracking-tight">{eur(sel.price)}</span>
                                <span className="text-sm font-semibold leading-tight">{sel.title}</span>
                                <span className="text-xs text-[#4b5563]">{sel.typology} · {sel.area} m²</span>
                                <EarnedBadge h={sel} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                            <Link href={`${DETAIL}#visit`} className="flex min-h-12 items-center justify-center rounded-full border border-[#d6d9de] text-xs font-bold uppercase tracking-[0.12em]">Book a visit</Link>
                            <Link href={DETAIL} className="flex min-h-12 items-center justify-center rounded-full bg-[#192537] text-xs font-bold uppercase tracking-[0.12em] text-white">View home</Link>
                        </div>
                    </div>
                </section>

                {/* Mobile map/list switch */}
                <button
                    type="button"
                    onClick={() => setView(view === 'map' ? 'list' : 'map')}
                    className={`fixed left-1/2 z-40 flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-[#192537] px-5 text-[13px] font-bold text-white shadow-[0_8px_22px_rgba(25,37,55,0.35)] lg:hidden ${view === 'map' ? 'bottom-[236px]' : 'bottom-6'}`}
                >
                    {view === 'map' ? <><List className="size-4" aria-hidden="true" />List · {ACTIVE.length} homes</> : <><MapIcon className="size-4" aria-hidden="true" />Map</>}
                </button>
            </div>
        </>
    );
}
