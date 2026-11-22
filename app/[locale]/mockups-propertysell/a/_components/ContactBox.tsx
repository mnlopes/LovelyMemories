"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";

const inputCls = "min-h-[46px] rounded-xl border border-[#dfe2e6] bg-white px-3.5 text-sm text-[#192537]";
const labelCls = "flex flex-col gap-1.5 text-xs font-semibold text-[#374151]";

type Mode = 'info' | 'visit';

export function ContactBox({ title, reference }: { title: string; reference: string }) {
    const [mode, setMode] = useState<Mode>('info');
    const visit = mode === 'visit';

    return (
        <>
            <div className="grid grid-cols-2 gap-1 rounded-full bg-[#f1f3f5] p-1">
                <button
                    type="button"
                    aria-pressed={!visit}
                    onClick={() => setMode('info')}
                    className={`min-h-10 rounded-full text-xs font-bold tracking-wide ${!visit ? 'bg-[#192537] text-white' : 'text-[#374151]'}`}
                >
                    Request info
                </button>
                <button
                    type="button"
                    aria-pressed={visit}
                    onClick={() => setMode('visit')}
                    className={`min-h-10 rounded-full text-xs font-bold tracking-wide ${visit ? 'bg-[#192537] text-white' : 'text-[#374151]'}`}
                >
                    Book a visit
                </button>
            </div>
            <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
                <label className={labelCls}>Full name<input type="text" placeholder="Your name" className={inputCls} /></label>
                <label className={labelCls}>Email<input type="email" placeholder="you@email.com" className={inputCls} /></label>
                <label className={labelCls}>Phone<input type="tel" placeholder="+351" className={inputCls} /></label>
                <label className={labelCls}>I&apos;m buying to
                    <select className={inputCls}><option>Live in it</option><option>Invest / rent it out</option><option>Both</option></select>
                </label>
                {visit && (
                    <label className={labelCls}>Preferred dates and times
                        <input type="text" placeholder="e.g. Saturday morning, or any weekday after 5 pm" className={inputCls} />
                    </label>
                )}
                <label className={labelCls}>Message
                    <textarea
                        key={mode}
                        rows={3}
                        defaultValue={visit ? `I'd like to visit ${title} (Ref. ${reference}).` : `I'd like more information about ${title} (Ref. ${reference}).`}
                        className="rounded-xl border border-[#dfe2e6] bg-white px-3.5 py-3 text-sm leading-normal text-[#192537]"
                    />
                </label>
                <label className="flex items-start gap-2.5 text-xs leading-normal text-[#4b5563]">
                    <input type="checkbox" className="mt-0.5 size-4 accent-[#192537]" />
                    I agree to the processing of my data under the Privacy Policy.
                </label>
                <button type="submit" className="min-h-[52px] rounded-full bg-[#192537] text-xs font-bold uppercase tracking-[0.18em] text-white">
                    {visit ? 'Request a visit' : 'Request information'}
                </button>
                <a href="#" className="flex min-h-[50px] items-center justify-center gap-2.5 rounded-full border border-[#d6d9de] text-[13px] font-semibold"><MessageCircle className="size-[18px] text-[#1d6b40]" aria-hidden="true" />Message us on WhatsApp</a>
                <p className="text-center text-xs text-[#6b7280]">No obligation — we&apos;ll get back to you shortly.</p>
            </form>
        </>
    );
}
