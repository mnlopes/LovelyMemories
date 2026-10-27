"use client";

import {
    Activity, BarChart3, Calendar, Handshake, Hotel, KeyRound, LayoutDashboard, LayoutGrid, PenLine, Wallet,
    type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { IMG } from "./data";

type Item = { label: string; icon: LucideIcon; href?: string; badge?: number };

// Mirrors the real AdminSidebar sections, plus the one new entry each proposal adds.
const NAV: Record<'a' | 'b', { title: string; items: Item[] }[]> = {
    a: [
        { title: 'Operations', items: [
            { label: 'Overview', icon: LayoutDashboard },
            { label: 'Properties', icon: Hotel, href: '/mockups-propertysell/a/admin' },
            { label: 'Sale leads', icon: PenLine, href: '/mockups-propertysell/a/admin/leads', badge: 3 },
            { label: 'Bookings', icon: Calendar },
            { label: 'Owners', icon: KeyRound },
            { label: 'Content', icon: LayoutGrid },
        ] },
        { title: 'Business', items: [
            { label: 'Finances', icon: Wallet },
            { label: 'Performance', icon: BarChart3 },
            { label: 'Activity', icon: Activity },
        ] },
    ],
    b: [
        { title: 'Operations', items: [
            { label: 'Overview', icon: LayoutDashboard },
            { label: 'Properties', icon: Hotel },
            { label: 'Sales', icon: Handshake, href: '/mockups-propertysell/b/admin', badge: 3 },
            { label: 'Bookings', icon: Calendar },
            { label: 'Owners', icon: KeyRound },
            { label: 'Content', icon: LayoutGrid },
        ] },
        { title: 'Business', items: [
            { label: 'Finances', icon: Wallet },
            { label: 'Performance', icon: BarChart3 },
            { label: 'Activity', icon: Activity },
        ] },
    ],
};

function NavEntry({ item, active, compact }: { item: Item; active: boolean; compact?: boolean }) {
    const Icon = item.icon;
    const cls = `flex items-center gap-3 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
        compact ? 'px-3.5 py-2' : 'p-2.5'
    } ${active ? 'bg-[#f4efe4] text-[#111111]' : 'text-[#4a4a4a] hover:bg-[#f6f6f6]'}`;
    const body = (
        <>
            <Icon className="size-[18px]" aria-hidden="true" />
            {item.label}
            {item.badge ? (
                <span className="ml-auto rounded-full bg-[#c5a059] px-1.5 py-0.5 text-[10px] font-extrabold text-[#111111]">{item.badge}</span>
            ) : active && !compact ? (
                <span aria-hidden="true" className="ml-auto size-1.5 rounded-full bg-[#b08d4a]" />
            ) : null}
        </>
    );
    return item.href ? (
        <Link href={item.href} aria-current={active ? 'page' : undefined} className={cls}>{body}</Link>
    ) : (
        <span className={`${cls} cursor-default`}>{body}</span>
    );
}

export function AdminShell({ variant, active, children }: { variant: 'a' | 'b'; active: string; children: React.ReactNode }) {
    const sections = NAV[variant];
    return (
        <div className="flex min-h-screen flex-col bg-[#fafafa] text-[#111111] lg:flex-row">
            {/* Desktop sidebar */}
            <aside className="hidden w-[264px] shrink-0 flex-col gap-7 border-r border-[#e8e8e8] bg-white px-4 py-7 lg:flex">
                <div className="flex flex-col gap-1.5 px-2.5">
                    <img src={IMG.logo} alt="Lovely Memories" className="h-10 w-auto self-start brightness-0" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6b6b6b]">Backoffice</span>
                </div>
                <nav aria-label="Backoffice" className="flex flex-col gap-6">
                    {sections.map((s) => (
                        <div key={s.title} className="flex flex-col gap-0.5">
                            <p className="mb-2 px-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#6b6b6b]">{s.title}</p>
                            {s.items.map((it) => <NavEntry key={it.label} item={it} active={it.label === active} />)}
                        </div>
                    ))}
                </nav>
            </aside>

            {/* Mobile top bar */}
            <div className="sticky top-0 z-30 border-b border-[#e8e8e8] bg-white lg:hidden">
                <div className="flex items-center justify-between px-4 pt-3">
                    <img src={IMG.logo} alt="Lovely Memories" className="h-8 w-auto brightness-0" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6b6b6b]">Backoffice</span>
                </div>
                <nav
                    aria-label="Backoffice"
                    className="flex gap-1 overflow-x-auto px-3 py-2.5 [scrollbar-width:none]"
                    ref={(nav) => {
                        // Bring the current entry into view on narrow screens.
                        const current = nav?.querySelector<HTMLElement>('[aria-current="page"]');
                        if (nav && current) nav.scrollLeft = current.offsetLeft - nav.clientWidth / 2 + current.clientWidth / 2;
                    }}
                >
                    {sections.flatMap((s) => s.items).map((it) => (
                        <NavEntry key={it.label} item={it} active={it.label === active} compact />
                    ))}
                </nav>
            </div>

            <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
        </div>
    );
}
