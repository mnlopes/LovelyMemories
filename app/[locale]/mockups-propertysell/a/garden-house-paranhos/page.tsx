import Image from "next/image";
import { ArrowLeft, Check, FileText, Grid3x3, Heart, MapPin, MessageCircle, Share2, TrendingUp } from "lucide-react";
import { Link } from "@/i18n/routing";
import { SiteFooter, SiteHeader } from "../../_components/SiteChrome";
import { FEATURED, HOMES, IMG, eur, perM2 } from "../../_components/data";

const GALLERY = [
    { src: IMG.cottage, alt: 'Garden and terrace' },
    { src: IMG.livingGarden, alt: 'Living room opening onto the garden' },
    { src: IMG.bedroom, alt: 'Double bedroom' },
    { src: IMG.garden, alt: 'View over the neighbourhood gardens' },
    { src: IMG.living, alt: 'Lounge area' },
];

const FACTS = [
    ['Typology', 'T1 house'], ['Gross area', '68 m²'], ['Plot', '140 m²'], ['Bedrooms', '1'],
    ['Bathrooms', '1'], ['Energy class', 'C'], ['Renovated', '2021'], ['Furnished', 'Yes'],
];

const FEATURES = ['Private garden and terrace', 'Sold furnished and equipped', 'Air conditioning', 'Fibre internet', 'Double glazing', 'Open-plan equipped kitchen'];

const STATS = [['Gross revenue', '€26,900'], ['Gross yield', '8.7%'], ['Occupancy', '78%'], ['Guest rating', '4.92']];

const inputCls = "min-h-[46px] rounded-xl border border-[#dfe2e6] bg-white px-3.5 text-sm text-[#192537]";
const labelCls = "flex flex-col gap-1.5 text-xs font-semibold text-[#374151]";

export default function SaleDetailA() {
    const h = FEATURED;
    const similar = HOMES.filter((x) => ['ribeira', 'almada', 'foz'].includes(x.id));

    return (
        <>
            <SiteHeader variant="a" />

            <main className="mx-auto flex max-w-[1280px] flex-col gap-7 px-4 pb-16 pt-6 lg:px-6 lg:pb-20 lg:pt-7">
                <Link href="/mockups-propertysell/a" className="inline-flex items-center gap-2 self-start text-xs font-bold uppercase tracking-[0.18em] text-[#7a6a4d]">
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Back to homes for sale
                </Link>

                <div className="relative">
                    <div className="-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:grid md:h-[480px] md:grid-cols-4 md:grid-rows-2 md:overflow-hidden md:rounded-[20px] md:px-0">
                        {GALLERY.map((g, i) => (
                            <div key={g.src} className={`relative aspect-[4/3] w-[86%] shrink-0 snap-center overflow-hidden rounded-2xl md:aspect-auto md:w-auto md:rounded-none ${i === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}>
                                <Image src={g.src} alt={g.alt} fill priority={i === 0} sizes="(max-width: 768px) 86vw, (max-width: 1280px) 50vw, 640px" className="object-cover" />
                            </div>
                        ))}
                    </div>
                    <div className="absolute bottom-4 right-4 hidden gap-2.5 md:flex">
                        <button type="button" className="flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-[13px] font-semibold shadow-[0_6px_20px_rgba(0,0,0,0.18)]"><FileText className="size-4" aria-hidden="true" />Floor plan</button>
                        <button type="button" className="flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-[13px] font-semibold shadow-[0_6px_20px_rgba(0,0,0,0.18)]"><Grid3x3 className="size-4" aria-hidden="true" />View all 24 photos</button>
                    </div>
                    <p className="mt-2 text-center text-xs text-[#6b7280] md:hidden">Swipe for more · 24 photos</p>
                </div>

                <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
                    <div className="flex min-w-0 flex-1 flex-col gap-10">
                        <div className="flex flex-col gap-3.5">
                            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-[13px] text-[#6b7280]">
                                <Link href="/" className="text-[#4b5563]">Home</Link><span aria-hidden="true">›</span>
                                <Link href="/mockups-propertysell/a" className="text-[#4b5563]">Homes for sale</Link><span aria-hidden="true">›</span>
                                <span className="font-semibold text-[#192537]">Porto</span>
                            </nav>
                            <div className="flex flex-wrap gap-2">
                                <span className="rounded-full bg-[#192537] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white">For sale</span>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f4ea] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#1d6b40]"><TrendingUp className="size-3" aria-hidden="true" />Income-generating</span>
                                <span className="rounded-full border border-[#d6d9de] px-3 py-1 text-[11px] font-semibold text-[#4b5563]">Ref. LM-V-0042</span>
                            </div>
                            <h1 className="text-[34px] font-bold leading-[1.1] tracking-tight md:text-5xl">{h.title}</h1>
                            <p className="text-lg leading-snug text-[#4b5563] md:text-xl">T1 house with a private garden, 10 minutes from Trindade</p>
                            <p className="flex items-center gap-2 text-sm text-[#6b7280]"><MapPin className="size-4 text-[#b09e80]" aria-hidden="true" />Rua de Costa Cabral, Paranhos, Porto</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {FACTS.map(([k, v]) => (
                                <div key={k} className="flex flex-col gap-1.5 rounded-2xl border border-[#eceef1] bg-white p-4">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6b7280]">{k}</span>
                                    <span className="text-[17px] font-bold">{v}</span>
                                </div>
                            ))}
                        </div>

                        <section className="flex flex-col gap-3.5">
                            <h2 className="text-2xl font-bold">About this home</h2>
                            <p className="text-base leading-[1.75] text-[#374151]">A quiet single-storey house tucked behind Rua de Costa Cabral, with its own lawn and a sunny terrace for outdoor dining. Fully renovated in 2021 with an open-plan kitchen and living room, a double bedroom and a bathroom with walk-in shower.</p>
                            <p className="text-base leading-[1.75] text-[#374151]">Sold furnished and fully equipped. The house is currently run by Lovely Memories as a holiday rental, so it can earn from day one — or simply become your home in Porto.</p>
                        </section>

                        <section className="flex flex-col gap-4">
                            <h2 className="text-2xl font-bold">Features</h2>
                            <ul className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
                                {FEATURES.map((f) => (
                                    <li key={f} className="flex items-center gap-3 text-[15px] text-[#374151]">
                                        <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-[#f3efe6]"><Check className="size-3.5 text-[#7a6a4d]" strokeWidth={3} aria-hidden="true" /></span>
                                        {f}
                                    </li>
                                ))}
                            </ul>
                        </section>

                        <section className="flex flex-col gap-6 rounded-3xl bg-[#192537] p-6 md:p-9">
                            <div className="flex flex-col gap-2.5">
                                <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#b09e80]">Investment snapshot</p>
                                <h2 className="text-2xl font-bold leading-snug text-white md:text-[28px]">Already earning as a Lovely Memories rental</h2>
                                <p className="text-sm text-white/75">Real figures from our booking system, last 12 months.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                {STATS.map(([k, v]) => (
                                    <div key={k} className="flex flex-col gap-1.5 rounded-2xl border border-white/12 bg-white/[0.06] p-4">
                                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">{k}</span>
                                        <span className={`text-2xl font-bold ${k === 'Gross yield' ? 'text-[#b09e80]' : 'text-white'}`}>{v}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-col gap-5 border-t border-white/12 pt-5 md:flex-row md:items-center md:justify-between">
                                <ul className="flex flex-col gap-2.5">
                                    {['Active short-term rental licence (AL)', 'Full booking history available on request', 'Keep it under Lovely Memories management'].map((t) => (
                                        <li key={t} className="flex items-center gap-2.5 text-sm text-white"><Check className="size-4 shrink-0 text-[#b09e80]" strokeWidth={3} aria-hidden="true" />{t}</li>
                                    ))}
                                </ul>
                                <Link href="/join" className="flex min-h-12 items-center justify-center rounded-full border border-[#b09e80] px-6 text-xs font-bold uppercase tracking-[0.16em] text-[#b09e80]">See management plans</Link>
                            </div>
                        </section>

                        <section className="flex flex-col gap-4">
                            <h2 className="text-2xl font-bold">Location</h2>
                            <div role="img" aria-label="Map of Paranhos, Porto, with the approximate location of the house" className="relative h-[260px] overflow-hidden rounded-[20px] border border-[#dde3e8] bg-[#e8edf1] md:h-[320px]">
                                <div aria-hidden="true" className="absolute -left-[10%] top-[38%] h-3.5 w-[120%] -rotate-[8deg] bg-white" />
                                <div aria-hidden="true" className="absolute -left-[10%] top-[72%] h-2 w-[120%] rotate-[4deg] bg-white" />
                                <div aria-hidden="true" className="absolute -top-[10%] left-[30%] h-[120%] w-3 rotate-[14deg] bg-white" />
                                <div aria-hidden="true" className="absolute -top-[10%] left-[68%] h-[120%] w-2 -rotate-[6deg] bg-white" />
                                <div aria-hidden="true" className="absolute left-[8%] top-[10%] h-[90px] w-[150px] rounded-[18px] bg-[#d6e6d3]" />
                                <div aria-hidden="true" className="absolute bottom-[8%] right-[6%] h-[70px] w-[190px] rounded-[18px] bg-[#d6e6d3]" />
                                <div aria-hidden="true" className="absolute left-1/2 top-1/2 size-[140px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#b09e80]/60 bg-[#b09e80]/20" />
                                <div aria-hidden="true" className="absolute left-1/2 top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#192537] shadow-[0_8px_20px_rgba(25,37,55,0.35)]"><MapPin className="size-5 text-white" /></div>
                                <p className="absolute bottom-4 left-4 right-4 w-fit rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-[#374151] shadow-[0_4px_14px_rgba(0,0,0,0.08)]">Approximate area · exact address shared on request</p>
                            </div>
                            <ul className="grid gap-3 sm:grid-cols-3">
                                {[['Trindade metro', '10 min walk'], ['Bolhão market', '15 min walk'], ['Porto airport', '20 min by car']].map(([k, v]) => (
                                    <li key={k} className="flex flex-col gap-1 rounded-2xl border border-[#eceef1] bg-white px-4 py-3.5"><span className="text-sm font-semibold">{k}</span><span className="text-[13px] text-[#6b7280]">{v}</span></li>
                                ))}
                            </ul>
                        </section>

                        <section className="flex flex-col gap-3.5">
                            <h2 className="text-2xl font-bold">Documents</h2>
                            <div className="flex flex-wrap gap-3">
                                {['Energy certificate (PDF)', 'Floor plan (PDF)'].map((d) => (
                                    <a key={d} href="#" className="inline-flex min-h-12 items-center gap-2.5 rounded-2xl border border-[#e3e6ea] bg-white px-4 text-sm font-semibold"><FileText className="size-[18px] text-[#7a6a4d]" aria-hidden="true" />{d}</a>
                                ))}
                            </div>
                        </section>
                    </div>

                    <aside id="contact" className="flex w-full scroll-mt-24 flex-col gap-4 lg:w-[380px] lg:shrink-0">
                        <div className="flex flex-col gap-5 rounded-[20px] border border-[#eceef1] bg-white p-6 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.14)] md:p-7">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6b7280]">Asking price</span>
                                    <span className="text-[38px] font-bold leading-[1.1] tracking-tight">{eur(h.price)}</span>
                                    <span className="text-[13px] text-[#6b7280]">{perM2(h)}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button type="button" aria-label="Save to favourites" className="flex size-11 items-center justify-center rounded-full border border-[#e3e6ea]"><Heart className="size-[18px]" aria-hidden="true" /></button>
                                    <button type="button" aria-label="Share" className="flex size-11 items-center justify-center rounded-full border border-[#e3e6ea]"><Share2 className="size-[18px]" aria-hidden="true" /></button>
                                </div>
                            </div>
                            <p className="flex items-center gap-2 text-[13px] text-[#374151]"><span aria-hidden="true" className="size-2 rounded-full bg-[#2d8653]" /><strong className="text-[#1d6b40]">Available</strong> · Listed 12 days ago</p>
                            <div className="grid grid-cols-2 gap-1 rounded-full bg-[#f1f3f5] p-1">
                                <button type="button" aria-pressed="true" className="min-h-10 rounded-full bg-[#192537] text-xs font-bold tracking-wide text-white">Request info</button>
                                <button type="button" aria-pressed="false" className="min-h-10 rounded-full text-xs font-bold tracking-wide text-[#374151]">Book a visit</button>
                            </div>
                            <form className="flex flex-col gap-3">
                                <label className={labelCls}>Full name<input type="text" placeholder="Your name" className={inputCls} /></label>
                                <label className={labelCls}>Email<input type="email" placeholder="you@email.com" className={inputCls} /></label>
                                <label className={labelCls}>Phone<input type="tel" placeholder="+351" className={inputCls} /></label>
                                <label className={labelCls}>I&apos;m buying to
                                    <select className={inputCls}><option>Live in it</option><option>Invest / rent it out</option><option>Both</option></select>
                                </label>
                                <label className={labelCls}>Message
                                    <textarea rows={3} defaultValue={`I'd like more information about ${h.title} (Ref. LM-V-0042).`} className="rounded-xl border border-[#dfe2e6] bg-white px-3.5 py-3 text-sm leading-normal text-[#192537]" />
                                </label>
                                <label className="flex items-start gap-2.5 text-xs leading-normal text-[#4b5563]">
                                    <input type="checkbox" className="mt-0.5 size-4 accent-[#192537]" />
                                    I agree to the processing of my data under the Privacy Policy.
                                </label>
                                <button type="button" className="min-h-[52px] rounded-full bg-[#192537] text-xs font-bold uppercase tracking-[0.18em] text-white">Request information</button>
                                <a href="#" className="flex min-h-[50px] items-center justify-center gap-2.5 rounded-full border border-[#d6d9de] text-[13px] font-semibold"><MessageCircle className="size-[18px] text-[#1d6b40]" aria-hidden="true" />Message us on WhatsApp</a>
                                <p className="text-center text-xs text-[#6b7280]">No obligation — we&apos;ll get back to you shortly.</p>
                            </form>
                        </div>
                        <div className="flex items-center gap-4 rounded-[20px] border border-[#eceef1] bg-white px-6 py-5">
                            <span aria-hidden="true" className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-[#192537] text-base font-extrabold tracking-wide text-[#b09e80]">LM</span>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[15px] font-bold">Lovely Memories Sales</span>
                                <span className="text-[13px] text-[#4b5563]">Your contact for this home</span>
                                <span className="text-xs text-[#6b7280]">Licence AMI nº [XXXXX]</span>
                            </div>
                        </div>
                    </aside>
                </div>

                <section className="flex flex-col gap-5 border-t border-[#e9ebee] pt-8">
                    <div className="flex items-end justify-between gap-3">
                        <h2 className="text-2xl font-bold">You may also like</h2>
                        <Link href="/mockups-propertysell/a" className="text-xs font-bold uppercase tracking-[0.18em] text-[#7a6a4d]">See all</Link>
                    </div>
                    <div className="-mx-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:px-0">
                        {similar.map((s) => (
                            <Link key={s.id} href="/mockups-propertysell/a/garden-house-paranhos" className="flex w-[78%] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-[#eef0f2] bg-white md:w-auto">
                                <span className="relative block aspect-[16/10]"><Image src={s.img} alt={s.title} fill sizes="(max-width: 768px) 78vw, 400px" className="object-cover" /></span>
                                <span className="flex flex-col gap-1 px-4 py-4">
                                    <span className="font-bold">{s.title}</span>
                                    <span className="text-[13px] text-[#6b7280]">{s.typology} · {s.area} m² · {s.city}</span>
                                    <span className="mt-1 text-lg font-bold">{eur(s.price)}</span>
                                </span>
                            </Link>
                        ))}
                    </div>
                </section>
            </main>

            <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-[#eceef1] bg-white px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] lg:hidden">
                <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-lg font-bold">{eur(h.price)}</span>
                    <span className="text-[11px] font-semibold text-[#1d6b40]">Available</span>
                </div>
                <a href="#" aria-label="Message us on WhatsApp" className="flex size-12 items-center justify-center rounded-full border border-[#d6d9de]"><MessageCircle className="size-5 text-[#1d6b40]" aria-hidden="true" /></a>
                <a href="#contact" className="flex min-h-12 items-center justify-center rounded-full bg-[#192537] px-6 text-xs font-bold uppercase tracking-[0.14em] text-white">Request info</a>
            </div>

            <SiteFooter />
            {/* Keeps the footer clear of the fixed mobile price bar. */}
            <div aria-hidden="true" className="h-20 bg-[#0a1128] lg:hidden" />
        </>
    );
}
