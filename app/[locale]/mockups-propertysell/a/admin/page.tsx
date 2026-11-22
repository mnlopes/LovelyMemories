"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus } from "lucide-react";
import { Link } from "@/i18n/routing";
import { AdminShell } from "../../_components/AdminShell";
import { HOMES, eur } from "../../_components/data";

type Status = 'available' | 'reserved' | 'under_offer' | 'sold';

// Example rows: reference, status, visibility and last update are illustrative.
const META: Record<string, { ref: string; status: Status; published: boolean; date: string; onRequest?: boolean }> = {
    ribeira: { ref: 'LM-V-0001', status: 'available', published: true, date: '12 Nov 2026' },
    foz: { ref: 'LM-V-0002', status: 'available', published: false, date: '09 Nov 2026', onRequest: true },
    paranhos: { ref: 'LM-V-0003', status: 'available', published: true, date: '20 Nov 2026' },
    almada: { ref: 'LM-V-0004', status: 'under_offer', published: true, date: '04 Nov 2026' },
    gaia: { ref: 'LM-V-0005', status: 'reserved', published: true, date: '28 Oct 2026' },
    cedofeita: { ref: 'LM-V-0006', status: 'sold', published: true, date: '15 Oct 2026' },
};

const STATUS: Record<Status, { label: string; cls: string }> = {
    available: { label: 'Available', cls: 'bg-[#e6f4ea] text-[#1d6b40]' },
    reserved: { label: 'Reserved', cls: 'bg-[#eef1f5] text-[#334155]' },
    under_offer: { label: 'Under offer', cls: 'bg-[#fbf3e2] text-[#6e5218]' },
    sold: { label: 'Sold', cls: 'bg-[#111111] text-white' },
};

const EDIT = '/mockups-propertysell/a/admin/edit';

function Chip({ cls, children }: { cls: string; children: React.ReactNode }) {
    return <span className={`inline-flex items-center self-start whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>{children}</span>;
}

function Visibility({ published }: { published: boolean }) {
    return published
        ? <Chip cls="border border-[#cfe6d7] bg-white text-[#1d6b40]">Published</Chip>
        : <Chip cls="border border-[#e0e0e0] bg-[#f4f4f4] text-[#4a4a4a]">Draft</Chip>;
}

export default function SaleListings() {
    const [filter, setFilter] = useState<'all' | Status>('all');
    const rows = HOMES.map((h) => ({ h, m: META[h.id] })).filter((r) => filter === 'all' || r.m.status === filter);
    const price = (r: (typeof rows)[number]) => (r.m.onRequest ? 'Price on request' : eur(r.h.price));

    return (
        <AdminShell variant="a" active="Sale listings">
            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="flex flex-col gap-1.5">
                        <h1 className="text-2xl font-bold tracking-tight md:text-[30px]">Sale listings</h1>
                        <p className="text-sm text-[#4a4a4a]">Homes shown in the “For Sale” tab. Requests from buyers arrive in the team inbox by email.</p>
                    </div>
                    <div className="flex flex-wrap items-end gap-2.5">
                        <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#4a4a4a]">Status
                            <select value={filter} onChange={(e) => setFilter(e.target.value as 'all' | Status)} className="min-h-11 rounded-xl border border-[#dcdcdc] bg-white px-3 text-[13px] text-[#111111]">
                                <option value="all">All statuses</option>
                                <option value="available">Available</option>
                                <option value="reserved">Reserved</option>
                                <option value="under_offer">Under offer</option>
                                <option value="sold">Sold</option>
                            </select>
                        </label>
                        <Link href={EDIT} className="flex min-h-11 items-center gap-2 rounded-xl bg-[#111111] px-5 text-[13px] font-bold text-white"><Plus className="size-4" aria-hidden="true" />New listing</Link>
                    </div>
                </div>

                {/* Desktop: table */}
                <div className="hidden overflow-x-auto rounded-[18px] border border-[#e8e8e8] bg-white md:block">
                    <table className="w-full min-w-[900px] border-collapse text-[13px]">
                        <thead>
                            <tr className="bg-[#fafafa] text-left">
                                {['Listing', 'Reference', 'City', 'Price', 'Status', 'Visibility', 'Updated'].map((c) => (
                                    <th key={c} scope="col" className="border-b border-[#e8e8e8] px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#4a4a4a]">{c}</th>
                                ))}
                                <th scope="col" className="border-b border-[#e8e8e8] px-5 py-3.5"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.h.id} className="border-b border-[#f0f0f0] last:border-0">
                                    <td className="px-5 py-4">
                                        <span className="flex items-center gap-3">
                                            <span className="relative size-12 shrink-0 overflow-hidden rounded-[10px]"><Image src={r.h.img} alt="" fill sizes="48px" className="object-cover" /></span>
                                            <span className="flex flex-col gap-0.5"><span className="font-semibold">{r.h.title}</span><span className="text-[#4a4a4a]">{r.h.subtitle}</span></span>
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4 font-semibold">{r.m.ref}</td>
                                    <td className="px-5 py-4">{r.h.city}</td>
                                    <td className="whitespace-nowrap px-5 py-4 font-semibold">{price(r)}</td>
                                    <td className="px-5 py-4"><Chip cls={STATUS[r.m.status].cls}>{STATUS[r.m.status].label}</Chip></td>
                                    <td className="px-5 py-4"><Visibility published={r.m.published} /></td>
                                    <td className="whitespace-nowrap px-5 py-4 text-[#4a4a4a]">{r.m.date}</td>
                                    <td className="px-5 py-4 text-right"><Link href={EDIT} className="inline-flex min-h-9 items-center rounded-[10px] border border-[#e0e0e0] bg-white px-3.5 text-xs font-bold">Edit</Link></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile: cards */}
                <ul className="flex flex-col gap-3 md:hidden">
                    {rows.map((r) => (
                        <li key={r.h.id} className="flex flex-col gap-3 rounded-[18px] border border-[#e8e8e8] bg-white p-4">
                            <span className="flex items-center gap-3">
                                <span className="relative size-14 shrink-0 overflow-hidden rounded-[10px]"><Image src={r.h.img} alt="" fill sizes="56px" className="object-cover" /></span>
                                <span className="flex min-w-0 flex-col gap-0.5">
                                    <span className="truncate text-[15px] font-bold">{r.h.title}</span>
                                    <span className="text-xs text-[#4a4a4a]">{r.m.ref} · {r.h.city}</span>
                                    <span className="text-sm font-semibold">{price(r)}</span>
                                </span>
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                                <Chip cls={STATUS[r.m.status].cls}>{STATUS[r.m.status].label}</Chip>
                                <Visibility published={r.m.published} />
                                <span className="text-xs text-[#4a4a4a]">{r.m.date}</span>
                            </div>
                            <Link href={EDIT} className="flex min-h-10 items-center justify-center rounded-[10px] border border-[#e0e0e0] bg-white px-4 text-xs font-bold">Edit</Link>
                        </li>
                    ))}
                </ul>
                {rows.length === 0 && <p className="rounded-[18px] border border-dashed border-[#d4d4d4] p-8 text-center text-sm text-[#4a4a4a]">No listings with this status.</p>}
            </div>
        </AdminShell>
    );
}
