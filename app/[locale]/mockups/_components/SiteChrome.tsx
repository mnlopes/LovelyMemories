"use client";

import { useState } from "react";
import { Menu, User, X } from "lucide-react";
import { Link } from "@/i18n/routing";
import { IMG } from "./data";

type Mode = 'stay' | 'buy';

type HeaderProps = {
    variant: 'a' | 'b';
    /** Option B only: which side of the Stay / Buy switch is lit. */
    mode?: Mode;
    /** Option B only: when given, the switch toggles in place instead of navigating. */
    onModeChange?: (mode: Mode) => void;
};

const linkClass = "text-[12px] font-bold uppercase tracking-[0.16em] text-white hover:text-[#b09e80] transition-colors";

const SHARED_LINKS = [
    { href: '/join', label: 'Management' },
    { href: '/about-us', label: 'About us' },
    { href: '/properties', label: 'Properties' },
    { href: '/concierge', label: 'Concierge' },
    { href: '/blog', label: 'Blog' },
    { href: '/contact', label: 'Contact' },
];

function StayBuySwitch({ mode = 'buy', onModeChange, compact }: { mode?: Mode; onModeChange?: (m: Mode) => void; compact?: boolean }) {
    const seg = (active: boolean) =>
        `rounded-full ${compact ? 'px-3 py-1.5 text-[11px]' : 'px-4 py-1.5 text-[12px]'} font-bold uppercase tracking-[0.16em] transition-colors ${
            active ? 'bg-[#b09e80] text-[#192537]' : 'text-white hover:text-[#b09e80]'
        }`;
    return (
        <span role="group" aria-label="Stay or buy" className="inline-flex gap-0.5 rounded-full border border-[#b09e80]/60 p-[3px]">
            {onModeChange ? (
                <>
                    <button type="button" aria-pressed={mode === 'stay'} onClick={() => onModeChange('stay')} className={seg(mode === 'stay')}>Stay</button>
                    <button type="button" aria-pressed={mode === 'buy'} onClick={() => onModeChange('buy')} className={seg(mode === 'buy')}>Buy</button>
                </>
            ) : (
                <>
                    <Link href="/mockups/b" className={seg(mode === 'stay')}>Stay</Link>
                    <Link href="/mockups/b/search" aria-current={mode === 'buy' ? 'page' : undefined} className={seg(mode === 'buy')}>Buy</Link>
                </>
            )}
        </span>
    );
}

export function SiteHeader({ variant, mode, onModeChange }: HeaderProps) {
    const [open, setOpen] = useState(false);
    const homeHref = variant === 'a' ? '/mockups/a' : '/mockups/b';

    return (
        <header className="sticky top-0 z-50 bg-[#192537] shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
            <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3.5 lg:px-6 lg:py-5">
                <Link href={homeHref} aria-label="Lovely Memories — home" className="flex shrink-0">
                    <img src={IMG.logo} alt="Lovely Memories" className="h-10 w-auto lg:h-[52px]" />
                </Link>

                <nav aria-label="Main" className="hidden flex-1 lg:block">
                    <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 xl:gap-x-7">
                        {variant === 'a' ? (
                            <li>
                                <Link href="/" className="inline-block rounded-full border border-[#b09e80]/60 px-4 py-1.5 text-[12px] font-bold uppercase tracking-[0.16em] text-white hover:bg-[#b09e80]/10">Reserve</Link>
                            </li>
                        ) : (
                            <li><StayBuySwitch mode={mode} onModeChange={onModeChange} /></li>
                        )}
                        {SHARED_LINKS.map((l) => (
                            <li key={l.href} className="contents">
                                <Link href={l.href} className={linkClass}>{l.label}</Link>
                                {variant === 'a' && l.href === '/properties' && (
                                    <Link
                                        href="/mockups/a"
                                        aria-current="page"
                                        className="border-b-2 border-[#b09e80] pb-1 text-[12px] font-bold uppercase tracking-[0.16em] text-[#b09e80]"
                                    >
                                        For sale
                                    </Link>
                                )}
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="flex items-center gap-2 lg:gap-3">
                    {variant === 'b' && (
                        <span className="lg:hidden"><StayBuySwitch mode={mode} onModeChange={onModeChange} compact /></span>
                    )}
                    <button type="button" aria-label="Login" className="hidden size-10 items-center justify-center rounded-full border border-white/30 text-white lg:flex">
                        <User className="size-4" />
                    </button>
                    <button type="button" aria-label="Language: English" className="hidden h-10 min-w-10 rounded-full border border-white/30 text-[11px] font-bold tracking-widest text-white lg:block">EN</button>
                    <button
                        type="button"
                        aria-label={open ? 'Close menu' : 'Open menu'}
                        aria-expanded={open}
                        onClick={() => setOpen(!open)}
                        className="flex size-11 items-center justify-center text-white lg:hidden"
                    >
                        {open ? <X className="size-6" /> : <Menu className="size-6" />}
                    </button>
                </div>
            </div>

            {open && (
                <div className="absolute inset-x-0 top-full z-40 h-[100dvh] overflow-y-auto bg-[#0a1128] px-6 py-10 lg:hidden">
                    <ul className="flex flex-col items-center gap-6 text-center">
                        {variant === 'a' && (
                            <li><Link href="/" onClick={() => setOpen(false)} className="text-xl font-bold uppercase tracking-widest text-white">Reserve</Link></li>
                        )}
                        {SHARED_LINKS.map((l) => (
                            <li key={l.href} className="contents">
                                <Link href={l.href} onClick={() => setOpen(false)} className="text-xl font-bold uppercase tracking-widest text-white">{l.label}</Link>
                                {variant === 'a' && l.href === '/properties' && (
                                    <Link href="/mockups/a" onClick={() => setOpen(false)} className="rounded-full border border-[#b09e80] px-6 py-2 text-xl font-bold uppercase tracking-widest text-[#b09e80]">For sale</Link>
                                )}
                            </li>
                        ))}
                        <li><Link href="/login" onClick={() => setOpen(false)} className="text-xl font-bold uppercase tracking-widest text-white">Login</Link></li>
                    </ul>
                </div>
            )}
        </header>
    );
}

export function SiteFooter() {
    return (
        <footer className="bg-[#0a1128] px-4 py-12 lg:px-6">
            <div className="mx-auto flex max-w-[1280px] flex-col gap-8">
                <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
                    <img src={IMG.logo} alt="Lovely Memories" className="h-12 w-auto self-start" />
                    <div className="grid grid-cols-2 gap-10 sm:gap-16">
                        <div className="flex flex-col gap-2.5">
                            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.24em] text-[#b09e80]">Explore</p>
                            <Link href="/" className="text-sm text-white/80 hover:text-white">Reserve a stay</Link>
                            <Link href="/properties" className="text-sm text-white/80 hover:text-white">Properties</Link>
                            <Link href="/mockups" className="text-sm text-white/80 hover:text-white">Homes for sale</Link>
                            <Link href="/concierge" className="text-sm text-white/80 hover:text-white">Concierge</Link>
                        </div>
                        <div className="flex flex-col gap-2.5">
                            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.24em] text-[#b09e80]">Company</p>
                            <Link href="/about-us" className="text-sm text-white/80 hover:text-white">About us</Link>
                            <Link href="/join" className="text-sm text-white/80 hover:text-white">Management</Link>
                            <Link href="/blog" className="text-sm text-white/80 hover:text-white">Blog</Link>
                            <Link href="/contact" className="text-sm text-white/80 hover:text-white">Contact</Link>
                        </div>
                    </div>
                </div>
                <p className="border-t border-white/10 pt-6 text-xs text-white/60">
                    © 2026 Lovely Memories · Real-estate brokerage licence AMI nº [XXXXX]
                </p>
            </div>
        </footer>
    );
}
