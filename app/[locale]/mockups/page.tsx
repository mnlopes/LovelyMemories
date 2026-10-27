import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { IMG } from "./_components/data";

const OPTIONS = [
    {
        id: 'A',
        title: 'A dedicated “For Sale” tab',
        text: 'A new tab in the menu with its own catalogue of homes for sale, a property page with a contact form, and a simple lead inbox in the backoffice.',
        img: IMG.cottage,
        screens: [
            { href: '/mockups/a', label: 'For Sale page' },
            { href: '/mockups/a/garden-house-paranhos', label: 'Property for sale' },
            { href: '/mockups/a/admin', label: 'Backoffice — new sale listing' },
            { href: '/mockups/a/admin/leads', label: 'Backoffice — sale leads' },
        ],
    },
    {
        id: 'B',
        title: '“Stay or buy”, built into the search',
        text: 'Selling lives inside the search guests already use: a map of homes for sale, an earnings calculator based on real booking data and visits booked like a stay.',
        img: IMG.livingGarden,
        screens: [
            { href: '/mockups/b', label: 'Homepage — Stay / Buy' },
            { href: '/mockups/b/search', label: 'Map search' },
            { href: '/mockups/b/garden-house-paranhos', label: 'Property — earnings & visits' },
            { href: '/mockups/b/admin', label: 'Backoffice — sales pipeline' },
        ],
    },
];

export default function MockupsIndex() {
    return (
        <main className="pb-20">
            <section className="bg-[#192537] px-4 pb-24 pt-12 lg:px-6 lg:pt-16">
                <div className="mx-auto flex max-w-[1180px] flex-col gap-5">
                    <img src={IMG.logo} alt="Lovely Memories" className="h-12 w-auto self-start" />
                    <p className="mt-6 text-xs font-bold uppercase tracking-[0.3em] text-[#b09e80]">Design proposals</p>
                    <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl">Homes for sale on Lovely Memories</h1>
                    <p className="max-w-2xl text-base leading-relaxed text-white/80 md:text-lg">
                        Two ways to add properties for sale to the website. Both are clickable and work on mobile — try them on your phone too.
                    </p>
                </div>
            </section>

            <div className="mx-auto -mt-14 grid max-w-[1180px] gap-6 px-4 md:grid-cols-2 lg:px-6">
                {OPTIONS.map((o) => (
                    <article key={o.id} className="flex flex-col overflow-hidden rounded-3xl border border-[#eceef1] bg-white shadow-[0_20px_50px_-24px_rgba(25,37,55,0.35)]">
                        <div className="relative aspect-[16/9]">
                            <Image src={o.img} alt="" fill sizes="(max-width: 768px) 100vw, 590px" className="object-cover" />
                            <span className="absolute left-5 top-5 rounded-full bg-[#b09e80] px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#192537]">
                                Option {o.id}
                            </span>
                        </div>
                        <div className="flex flex-1 flex-col gap-4 p-6 md:p-8">
                            <h2 className="text-2xl font-bold leading-snug">{o.title}</h2>
                            <p className="text-[15px] leading-relaxed text-[#4b5563]">{o.text}</p>
                            <ul className="mt-2 flex flex-col divide-y divide-[#eef0f2] border-y border-[#eef0f2]">
                                {o.screens.map((s) => (
                                    <li key={s.href}>
                                        <Link href={s.href} className="flex min-h-12 items-center justify-between gap-3 py-3 text-[15px] font-semibold text-[#192537] hover:text-[#7a6a4d]">
                                            {s.label}
                                            <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                            <Link
                                href={o.screens[0].href}
                                className="mt-auto flex min-h-12 items-center justify-center rounded-full bg-[#192537] text-xs font-bold uppercase tracking-[0.18em] text-white"
                            >
                                Open option {o.id}
                            </Link>
                        </div>
                    </article>
                ))}
            </div>

            <p className="mx-auto mt-10 max-w-[1180px] px-4 text-sm text-[#6b7280] lg:px-6">
                Example content: properties, prices, earnings and contacts shown in these designs are illustrative.
            </p>
        </main>
    );
}
