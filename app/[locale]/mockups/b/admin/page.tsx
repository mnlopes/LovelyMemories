"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus } from "lucide-react";
import { AdminShell } from "../../_components/AdminShell";
import { HOMES, eur } from "../../_components/data";

type Card = { name: string; when: string; home: string; purpose: string; source: string; highlight?: string };

const byId = (id: string) => HOMES.find((h) => h.id === id)!;

const COLUMNS: { title: string; dot: string; total: string; cards: Card[] }[] = [
    { title: 'New', dot: '#c5a059', total: '3 leads', cards: [
        { name: 'Sarah Mitchell', when: '10:42', home: 'paranhos', purpose: 'Invest', source: 'Website' },
        { name: 'João Ferreira', when: '09:15', home: 'ribeira', purpose: 'Live in it', source: 'Website' },
        { name: 'Daniel Cohen', when: 'Yesterday', home: 'almada', purpose: 'Invest', source: 'WhatsApp' },
    ] },
    { title: 'Contacted', dot: '#64748b', total: '2 leads', cards: [
        { name: 'Emma Schneider', when: '2 days', home: 'paranhos', purpose: 'Invest', source: 'Website' },
        { name: 'Luca Romano', when: '3 days', home: 'ribeira', purpose: 'Both', source: 'Stayed as guest', highlight: 'Stayed here in September' },
    ] },
    { title: 'Visit booked', dot: '#2563eb', total: '3 visits', cards: [
        { name: 'Marie Laurent', when: '24 Oct', home: 'foz', purpose: 'Both', source: 'Website', highlight: 'Wed 28 Oct · 11:00' },
        { name: 'Sarah Mitchell', when: '27 Oct', home: 'paranhos', purpose: 'Invest', source: 'Website', highlight: 'Thu 29 Oct · 16:30 · video' },
        { name: 'Daniel Cohen', when: '27 Oct', home: 'almada', purpose: 'Invest', source: 'WhatsApp', highlight: 'Mon 2 Nov · 10:00' },
    ] },
    { title: 'Offer', dot: '#7c3aed', total: '€185,000', cards: [
        { name: 'Tomás Silva', when: '22 Oct', home: 'gaia', purpose: 'Live in it', source: 'Website', highlight: 'Offer €185,000 · awaiting owner' },
    ] },
    { title: 'Sold', dot: '#1d6b40', total: '€265,000', cards: [
        { name: 'Hannah Weber', when: '14 Oct', home: 'cedofeita', purpose: 'Invest', source: 'Stayed as guest', highlight: 'Deed signed · kept under management' },
    ] },
];

const VISITS = [
    { dow: 'Wed', day: '28', month: 'Oct', time: '11:00', name: 'Marie Laurent', home: 'foz', how: 'in person', note: 'No guests that day' },
    { dow: 'Thu', day: '29', month: 'Oct', time: '16:30', name: 'Sarah Mitchell', home: 'paranhos', how: 'video call', note: 'Guests check out at 11:00' },
    { dow: 'Mon', day: '2', month: 'Nov', time: '10:00', name: 'Daniel Cohen', home: 'almada', how: 'in person', note: 'No guests that day' },
];

export default function SalesPipeline() {
    const [view, setView] = useState<'board' | 'table'>('board');

    return (
        <AdminShell variant="b" active="Sales">
            <div className="flex flex-col gap-7">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="flex flex-col gap-1.5">
                        <h1 className="text-2xl font-bold tracking-tight md:text-[30px]">Sales pipeline</h1>
                        <p className="text-sm text-[#4a4a4a]">Every buyer, from the first message to the signed deed. Drag a card to move it.</p>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                        <div role="group" aria-label="View" className="flex gap-1 rounded-xl bg-[#efefef] p-1">
                            {(['board', 'table'] as const).map((v) => (
                                <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`min-h-9 rounded-[9px] px-3.5 text-[13px] font-bold capitalize ${view === v ? 'bg-white shadow-sm' : 'text-[#4a4a4a]'}`}>{v}</button>
                            ))}
                        </div>
                        <button type="button" className="flex min-h-11 items-center gap-2 rounded-xl bg-[#111111] px-5 text-[13px] font-bold text-white"><Plus className="size-4" aria-hidden="true" />New sale listing</button>
                    </div>
                </div>

                <section className="flex flex-col gap-3">
                    <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-[#4a4a4a]">Upcoming visits</h2>
                    <div className="-mx-4 flex snap-x scroll-px-4 gap-3.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 xl:grid-cols-3">
                        {VISITS.map((v) => (
                            <div key={v.name + v.day} className="flex w-[85%] shrink-0 snap-start items-center gap-3.5 rounded-[18px] border border-[#e8e8e8] bg-white p-4 sm:w-auto">
                                <span className="flex w-[58px] shrink-0 flex-col items-center rounded-[14px] bg-[#111111] py-2 text-white">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#e5d3ae]">{v.dow}</span>
                                    <span className="text-[22px] font-bold leading-tight">{v.day}</span>
                                    <span className="text-[10px]">{v.month}</span>
                                </span>
                                <span className="flex min-w-0 flex-col gap-0.5">
                                    <span className="text-sm font-bold">{v.time} · {v.name}</span>
                                    <span className="truncate text-[13px] text-[#4a4a4a]">{byId(v.home).title} · {v.how}</span>
                                    <span className="text-xs font-semibold text-[#1d6b40]">{v.note}</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                {view === 'board' ? (
                    <div className="-mx-4 snap-x overflow-x-auto scroll-px-4 px-4 pb-2 sm:mx-0 sm:px-0 sm:scroll-px-0">
                        <div className="flex gap-4">
                            {COLUMNS.map((c) => (
                                <section key={c.title} className="flex w-[280px] shrink-0 snap-start flex-col gap-3 rounded-[18px] bg-[#f1f1f1] p-3.5 xl:w-auto xl:flex-1">
                                    <div className="flex items-center justify-between gap-2 px-1">
                                        <h2 className="flex items-center gap-2 text-sm font-bold">
                                            <span aria-hidden="true" className="size-2 rounded-full" style={{ background: c.dot }} />
                                            {c.title}
                                            <span className="rounded-full bg-white px-2 text-xs font-bold text-[#4a4a4a]">{c.cards.length}</span>
                                        </h2>
                                        <span className="text-xs font-semibold text-[#4a4a4a]">{c.total}</span>
                                    </div>
                                    {c.cards.map((k) => {
                                        const h = byId(k.home);
                                        return (
                                            <article key={k.name + k.when} className="flex flex-col gap-2.5 rounded-[14px] border border-[#e6e6e6] bg-white p-3.5 shadow-[0_2px_6px_rgba(0,0,0,0.04)]">
                                                <div className="flex items-center justify-between gap-2"><strong className="text-sm">{k.name}</strong><span className="text-[11px] text-[#4a4a4a]">{k.when}</span></div>
                                                <div className="flex items-center gap-2.5">
                                                    <span className="relative size-10 shrink-0 overflow-hidden rounded-[10px]"><Image src={h.img} alt="" fill sizes="40px" className="object-cover" /></span>
                                                    <span className="flex min-w-0 flex-col gap-0.5"><span className="truncate text-[13px] font-semibold">{h.title}</span><span className="text-xs text-[#4a4a4a]">{eur(h.price)}</span></span>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    <span className="rounded-full bg-[#f4f4f4] px-2.5 py-0.5 text-[11px] font-semibold text-[#333333]">{k.purpose}</span>
                                                    <span className="rounded-full bg-[#f4f4f4] px-2.5 py-0.5 text-[11px] font-semibold text-[#333333]">{k.source}</span>
                                                </div>
                                                {k.highlight && <span className="text-[13px] font-bold text-[#6e5218]">{k.highlight}</span>}
                                            </article>
                                        );
                                    })}
                                </section>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-[18px] border border-[#e8e8e8] bg-white">
                        <table className="w-full min-w-[720px] border-collapse text-[13px]">
                            <thead>
                                <tr className="bg-[#fafafa] text-left">
                                    {['Buyer', 'Listing', 'Stage', 'Next step'].map((c) => (
                                        <th key={c} scope="col" className="border-b border-[#e8e8e8] px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#4a4a4a]">{c}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {COLUMNS.flatMap((c) => c.cards.map((k) => (
                                    <tr key={c.title + k.name + k.when} className="border-b border-[#f0f0f0] last:border-0">
                                        <td className="px-5 py-3.5"><strong>{k.name}</strong><span className="block text-[#4a4a4a]">{k.source}</span></td>
                                        <td className="px-5 py-3.5">{byId(k.home).title}</td>
                                        <td className="px-5 py-3.5"><span className="inline-flex items-center gap-2"><span aria-hidden="true" className="size-2 rounded-full" style={{ background: c.dot }} />{c.title}</span></td>
                                        <td className="px-5 py-3.5 text-[#4a4a4a]">{k.highlight ?? '—'}</td>
                                    </tr>
                                )))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AdminShell>
    );
}
