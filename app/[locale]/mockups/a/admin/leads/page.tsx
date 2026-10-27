"use client";

import { useState } from "react";
import Image from "next/image";
import { Download } from "lucide-react";
import { AdminShell } from "../../../_components/AdminShell";
import { HOMES, eur } from "../../../_components/data";

type Status = 'new' | 'contacted' | 'visit' | 'offer';

const byId = (id: string) => HOMES.find((h) => h.id === id)!;

const LEADS: { when: string; name: string; contact: string; home: string; purpose: string; source: string; status: Status; note?: string }[] = [
    { when: 'Today, 10:42', name: 'Sarah Mitchell', contact: 'sarah.m@example.com', home: 'paranhos', purpose: 'Invest', source: 'Website form', status: 'new' },
    { when: 'Today, 09:15', name: 'João Ferreira', contact: '+351 912 000 000', home: 'ribeira', purpose: 'Live in it', source: 'Website form', status: 'new' },
    { when: 'Yesterday', name: 'Daniel Cohen', contact: '+972 50 000 0000', home: 'almada', purpose: 'Invest', source: 'WhatsApp', status: 'new' },
    { when: '24 Oct', name: 'Marie Laurent', contact: 'marie.l@example.com', home: 'foz', purpose: 'Both', source: 'Website form', status: 'visit', note: 'Wed 28 Oct · 11:00' },
    { when: '22 Oct', name: 'Tomás Silva', contact: '+351 936 000 000', home: 'gaia', purpose: 'Live in it', source: 'Website form', status: 'offer' },
    { when: '18 Oct', name: 'Emma Schneider', contact: 'emma.s@example.com', home: 'paranhos', purpose: 'Invest', source: 'Website form', status: 'contacted' },
];

const STATUS: Record<Status, { label: string; cls: string }> = {
    new: { label: 'New', cls: 'bg-[#fbf3e2] text-[#6e5218]' },
    contacted: { label: 'Contacted', cls: 'bg-[#eef1f5] text-[#334155]' },
    visit: { label: 'Visit scheduled', cls: 'bg-[#e7f0fb] text-[#1e4f8a]' },
    offer: { label: 'Under offer', cls: 'bg-[#e6f4ea] text-[#1d6b40]' },
};

function StatusChip({ status, note }: { status: Status; note?: string }) {
    const s = STATUS[status];
    return (
        <span className="inline-flex flex-col gap-0.5">
            <span className={`inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-bold ${s.cls}`}>
                {status === 'new' && <span aria-hidden="true" className="size-1.5 rounded-full bg-[#c5a059]" />}
                {s.label}
            </span>
            {note && <span className="text-xs text-[#4a4a4a]">{note}</span>}
        </span>
    );
}

export default function SaleLeads() {
    const [filter, setFilter] = useState<'all' | Status>('all');
    const leads = LEADS.filter((l) => filter === 'all' || l.status === filter);

    return (
        <AdminShell variant="a" active="Sale leads">
            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="flex flex-col gap-1.5">
                        <h1 className="text-2xl font-bold tracking-tight md:text-[30px]">Sale leads</h1>
                        <p className="text-sm text-[#4a4a4a]">Every request from the “For Sale” pages lands here — and in your inbox.</p>
                    </div>
                    <div className="flex flex-wrap items-end gap-2.5">
                        <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#4a4a4a]">Status
                            <select value={filter} onChange={(e) => setFilter(e.target.value as 'all' | Status)} className="min-h-11 rounded-xl border border-[#dcdcdc] bg-white px-3 text-[13px] text-[#111111]">
                                <option value="all">All statuses</option>
                                <option value="new">New</option>
                                <option value="contacted">Contacted</option>
                                <option value="visit">Visit scheduled</option>
                                <option value="offer">Under offer</option>
                            </select>
                        </label>
                        <button type="button" className="flex min-h-11 items-center gap-2 rounded-xl border border-[#e0e0e0] bg-white px-4 text-[13px] font-bold"><Download className="size-4" aria-hidden="true" />Export CSV</button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                    {[['New leads · 7 days', '3'], ['Visits scheduled', '2'], ['Active sale listings', '5'], ['Under offer', '1']].map(([k, v]) => (
                        <div key={k} className="flex flex-col gap-2 rounded-[18px] border border-[#e8e8e8] bg-white p-4 md:p-5">
                            <span className="text-xs font-semibold text-[#4a4a4a]">{k}</span>
                            <span className="text-[28px] font-bold leading-none">{v}</span>
                        </div>
                    ))}
                </div>

                {/* Desktop: table */}
                <div className="hidden overflow-x-auto rounded-[18px] border border-[#e8e8e8] bg-white md:block">
                    <table className="w-full min-w-[860px] border-collapse text-[13px]">
                        <thead>
                            <tr className="bg-[#fafafa] text-left">
                                {['Received', 'Contact', 'Listing', 'Buying to', 'Source', 'Status'].map((c) => (
                                    <th key={c} scope="col" className="border-b border-[#e8e8e8] px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#4a4a4a]">{c}</th>
                                ))}
                                <th scope="col" className="border-b border-[#e8e8e8] px-5 py-3.5"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {leads.map((l) => {
                                const h = byId(l.home);
                                return (
                                    <tr key={l.name + l.when} className="border-b border-[#f0f0f0] last:border-0">
                                        <td className="whitespace-nowrap px-5 py-4 text-[#4a4a4a]">{l.when}</td>
                                        <td className="px-5 py-4"><span className="flex flex-col gap-0.5"><strong className="text-sm">{l.name}</strong><span className="text-[#4a4a4a]">{l.contact}</span></span></td>
                                        <td className="px-5 py-4">
                                            <span className="flex items-center gap-3">
                                                <span className="relative size-11 shrink-0 overflow-hidden rounded-[10px]"><Image src={h.img} alt="" fill sizes="44px" className="object-cover" /></span>
                                                <span className="flex flex-col gap-0.5"><span className="font-semibold">{h.title}</span><span className="text-[#4a4a4a]">{eur(h.price)}</span></span>
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">{l.purpose}</td>
                                        <td className="px-5 py-4 text-[#4a4a4a]">{l.source}</td>
                                        <td className="whitespace-nowrap px-5 py-4"><StatusChip status={l.status} note={l.note} /></td>
                                        <td className="px-5 py-4 text-right"><button type="button" className="min-h-9 rounded-[10px] border border-[#e0e0e0] bg-white px-3.5 text-xs font-bold">Open</button></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile: cards */}
                <ul className="flex flex-col gap-3 md:hidden">
                    {leads.map((l) => {
                        const h = byId(l.home);
                        return (
                            <li key={l.name + l.when} className="flex flex-col gap-3 rounded-[18px] border border-[#e8e8e8] bg-white p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <span className="flex flex-col gap-0.5"><strong className="text-[15px]">{l.name}</strong><span className="text-[13px] text-[#4a4a4a]">{l.contact}</span></span>
                                    <span className="whitespace-nowrap text-xs text-[#4a4a4a]">{l.when}</span>
                                </div>
                                <span className="flex items-center gap-3">
                                    <span className="relative size-11 shrink-0 overflow-hidden rounded-[10px]"><Image src={h.img} alt="" fill sizes="44px" className="object-cover" /></span>
                                    <span className="flex flex-col gap-0.5 text-[13px]"><span className="font-semibold">{h.title}</span><span className="text-[#4a4a4a]">{eur(h.price)} · {l.purpose} · {l.source}</span></span>
                                </span>
                                <div className="flex items-center justify-between gap-3">
                                    <StatusChip status={l.status} note={l.note} />
                                    <button type="button" className="min-h-10 rounded-[10px] border border-[#e0e0e0] bg-white px-4 text-xs font-bold">Open</button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </AdminShell>
    );
}
