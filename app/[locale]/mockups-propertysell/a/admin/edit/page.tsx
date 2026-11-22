"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckCircle2, Circle, Eye } from "lucide-react";
import { Link } from "@/i18n/routing";
import { AdminShell } from "../../../_components/AdminShell";
import { FEATURED } from "../../../_components/data";
import { InfoTab } from "./_tabs/InfoTab";
import { DocumentsTab, LocationTab, PerformanceTab, SaleTab } from "./_tabs/MoreTabs";
import { PhotosTab } from "./_tabs/PhotosTab";
import { card, type Form } from "./_tabs/ui";

const TABS = ['Photos', 'Info', 'Sale', 'Location', 'Documents', 'Performance'] as const;
type Tab = (typeof TABS)[number];

const PHOTO_COUNT = 4;

export default function EditSaleListing() {
    const [tab, setTab] = useState<Tab>('Info');
    const [published, setPublished] = useState(true);
    // Paranhos is already published; clear the energy class to see the checklist.
    const [form, setForm] = useState<Form>({ title: FEATURED.title, type: 'House', price: '310,000', priceOnRequest: false, city: 'Porto', energy: 'C', titlePt: '' });
    const set: <K extends keyof Form>(key: K, value: Form[K]) => void = (key, value) => setForm((f) => ({ ...f, [key]: value }));
    const h = FEATURED;

    const checks: [string, boolean][] = [
        ['Title', form.title.trim() !== '' || form.titlePt.trim() !== ''],
        ['At least one photo', PHOTO_COUNT > 0],
        ['Type', form.type !== ''],
        ['Price (or “Price on request”)', form.priceOnRequest || form.price.trim() !== ''],
        ['Energy class', form.energy !== ''],
        ['City', form.city !== ''],
    ];
    const missing = checks.filter(([, ok]) => !ok);
    const priceLabel = form.priceOnRequest ? 'Price on request' : form.price.trim() ? `€${form.price}` : '—';

    return (
        <AdminShell variant="a" active="Sale listings">
            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-1.5">
                    <nav aria-label="Breadcrumb" className="flex gap-2 text-[13px] text-[#6b6b6b]">
                        <Link href="/mockups-propertysell/a/admin" className="hover:underline">Sale listings</Link><span aria-hidden="true">/</span><span className="font-semibold text-[#111111]">Edit listing</span>
                    </nav>
                    <h1 className="text-2xl font-bold tracking-tight md:text-[30px]">{form.title || form.titlePt || 'Untitled listing'}</h1>
                </div>

                <div role="tablist" aria-label="Listing sections" className="-mx-4 flex gap-7 overflow-x-auto border-b border-[#e8e8e8] px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
                    {TABS.map((t) => (
                        <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`shrink-0 pb-3 text-[13px] font-bold ${tab === t ? '-mb-px border-b-2 border-[#111111] text-[#111111]' : 'text-[#6b6b6b]'}`}>{t}</button>
                    ))}
                </div>

                <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
                    <div className="flex min-w-0 flex-1 flex-col gap-5">
                        {tab === 'Photos' && <PhotosTab />}
                        {tab === 'Info' && <InfoTab form={form} set={set} />}
                        {tab === 'Sale' && <SaleTab form={form} set={set} />}
                        {tab === 'Location' && <LocationTab form={form} set={set} />}
                        {tab === 'Documents' && <DocumentsTab form={form} set={set} />}
                        {tab === 'Performance' && <PerformanceTab />}
                    </div>

                    <div className="flex w-full min-w-0 flex-col gap-5 xl:w-[320px] xl:shrink-0">
                        <section className={card}>
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="text-[15px] font-bold">Status</h2>
                                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${published ? 'border border-[#cfe6d7] text-[#1d6b40]' : 'bg-[#f4f4f4] text-[#4a4a4a]'}`}>{published ? 'Published' : 'Draft'}</span>
                            </div>
                            <p className="text-xs text-[#6b6b6b]">Reference <strong className="text-[#111111]">LM-V-0003</strong> · generated automatically</p>
                            <div className="flex flex-col gap-2 border-t border-[#eeeeee] pt-3.5">
                                <h3 className="text-xs font-semibold text-[#4a4a4a]">{missing.length ? 'Missing to publish' : 'Ready to publish'}</h3>
                                <ul className="flex flex-col gap-1.5">
                                    {checks.map(([k, ok]) => (
                                        <li key={k} className={`flex items-center gap-2 text-[13px] ${ok ? 'text-[#4a4a4a]' : 'font-semibold text-[#8a6d36]'}`}>
                                            {ok ? <CheckCircle2 className="size-4 shrink-0 text-[#2d8653]" aria-hidden="true" /> : <Circle className="size-4 shrink-0" aria-hidden="true" />}
                                            {k}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                <Link href="/mockups-propertysell/a/garden-house-paranhos" className="col-span-2 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#e0e0e0] bg-white px-4 text-[13px] font-bold"><Eye className="size-4" aria-hidden="true" />View page</Link>
                                <button type="button" className="min-h-11 rounded-xl border border-[#e0e0e0] bg-white px-4 text-[13px] font-bold">Save</button>
                                <button
                                    type="button"
                                    disabled={missing.length > 0 && !published}
                                    onClick={() => setPublished(!published)}
                                    className="min-h-11 rounded-xl bg-[#111111] px-4 text-[13px] font-bold text-white disabled:cursor-not-allowed disabled:bg-[#b5b5b5]"
                                >
                                    {published ? 'Unpublish' : 'Publish'}
                                </button>
                            </div>
                        </section>

                        <section className={card}>
                            <h2 className="text-[15px] font-bold">Card preview</h2>
                            <div className="overflow-hidden rounded-2xl border border-[#eeeeee]">
                                <div className="relative aspect-[4/3]">
                                    <Image src={h.img} alt="" fill sizes="320px" className="object-cover" />
                                    <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                                    <span className="absolute inset-x-3 bottom-3 truncate text-center text-base font-bold text-white">{form.title || form.titlePt || 'Untitled listing'}</span>
                                </div>
                                <div className="flex items-center justify-between gap-2 px-3.5 py-3">
                                    <span className="text-lg font-bold text-[#192537]">{priceLabel}</span>
                                    <span className="text-[11px] text-[#4a4a4a]">T1 · 68 m²{form.energy ? ` · Energy ${form.energy}` : ''}</span>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </AdminShell>
    );
}
