"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslations, useLocale } from "next-intl";

const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b09e80] focus-visible:ring-offset-4 focus-visible:ring-offset-[#192537]";

export const Navbar = () => {
    const t = useTranslations('Navbar');
    const pathname = usePathname();
    const router = useRouter();
    const locale = useLocale();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Mobile menu: keep the page behind it still and close it with Escape
    useEffect(() => {
        if (!isMenuOpen) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsMenuOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = previous;
            window.removeEventListener("keydown", onKey);
        };
    }, [isMenuOpen]);

    if (pathname.includes('/booking/checkout') || pathname.includes('/admin')) return null;

    const isActive = (path: string) => {
        if (path === "/" && pathname === "/") return true;
        if (path !== "/" && pathname.startsWith(path)) return true;
        return false;
    };

    const navLinks = [
        { path: '/', label: t('book') },
        { path: '/join', label: t('owner') },
        { path: '/about-us', label: t('about') },
        { path: '/properties', label: t('properties') },
        { path: '/for-sale', label: t('forSale') },
        { path: '/concierge', label: t('concierge') },
        { path: '/blog', label: t('blog') },
        { path: '/contact', label: t('contact') },
    ];

    return (
        <header
            className="fixed top-0 left-0 right-0 z-[9999] transition-all duration-300 bg-[#192537] py-6 shadow-lg"
        >
            <div className="w-full max-w-[1440px] mx-auto px-4 lg:px-6">
                <div className="flex items-center justify-between gap-6 2xl:gap-10">

                    {/* Brand / Logo */}
                    <Link href="/" className="relative z-50 flex-shrink-0 self-center">
                        <figure className="mb-0 flex">
                            <img
                                src="/legacy/home/images/logo.svg"
                                alt="Lovely Memories"
                                className="w-auto h-12 md:h-14 transition-all duration-300"
                            />
                        </figure>
                    </Link>

                    {/* Desktop navigation (from xl; below it the menu button is used) */}
                    <nav className="hidden xl:flex items-center self-center mt-5 min-w-0">
                        <ul className="flex items-center gap-4 2xl:gap-6 m-0 p-0 list-none">
                            {navLinks.map((link) => (
                                <li key={link.path} className="shrink-0">
                                    <Link
                                        href={link.path}
                                        aria-current={isActive(link.path) ? 'page' : undefined}
                                        className={`block whitespace-nowrap rounded-full text-[12px] 2xl:text-[13px] font-bold uppercase tracking-widest transition-colors duration-300 ${focusRing} ${
                                            link.path === '/'
                                                ? 'border border-[#b09e80]/50 px-4 2xl:px-5 py-1.5 2xl:py-2 hover:bg-[#b09e80]/10 hover:border-[#b09e80]'
                                                : 'hover:text-[#b09e80]'
                                        } ${isActive(link.path) ? 'text-[#b09e80]' : 'text-white'}`}
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* Right side actions (login / language) */}
                    <div className="hidden xl:flex shrink-0 items-center gap-4 2xl:gap-5 self-center mt-5">
                        <Link
                            href="/login"
                            className={`flex items-center gap-2 whitespace-nowrap rounded-full text-white hover:text-[#b09e80] transition-colors group ${focusRing}`}
                        >
                            <span className="p-2 border border-white/30 rounded-full group-hover:border-[#b09e80] transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                            </span>
                            <span className="text-[12px] 2xl:text-[13px] font-bold uppercase tracking-widest">{t('login')}</span>
                        </Link>

                        {/* Language Switcher */}
                        <LanguageSwitcher />
                    </div>

                    {/* Mobile menu button */}
                    <button
                        type="button"
                        className="xl:hidden relative z-50 -mr-2 flex size-11 items-center justify-center rounded-full text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b09e80]"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label={isMenuOpen ? t('closeMenu') : t('openMenu')}
                        aria-expanded={isMenuOpen}
                        aria-controls="mobile-menu"
                    >
                        <div className="w-6 flex flex-col items-end gap-1.5">
                            <span className={`h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? 'w-6 rotate-45 translate-y-2' : 'w-6'}`}></span>
                            <span className={`h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? 'opacity-0' : 'w-4'}`}></span>
                            <span className={`h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? 'w-6 -rotate-45 -translate-y-2' : 'w-5'}`}></span>
                        </div>
                    </button>

                    {/* Mobile menu overlay: scrolls on short screens, starts below the logo */}
                    <div
                        id="mobile-menu"
                        className={`xl:hidden fixed inset-0 bg-[#0A1128] z-40 overflow-y-auto overscroll-contain transition-all duration-500 ${isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
                            }`}
                    >
                        <div className="min-h-full flex flex-col items-center justify-center px-6 pt-28 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
                            <ul className="flex flex-col items-center gap-1 m-0 p-0 list-none text-center">
                                {[...navLinks, { path: '/login', label: t('login') }].map((link) => (
                                    <li key={link.path}>
                                        <Link
                                            href={link.path}
                                            onClick={() => setIsMenuOpen(false)}
                                            aria-current={isActive(link.path) ? 'page' : undefined}
                                            className={`inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-full text-xl sm:text-2xl font-bold uppercase tracking-widest transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b09e80] ${
                                                link.path === '/'
                                                    ? 'mb-3 border border-[#b09e80]/50 px-8 hover:bg-[#b09e80]/10 hover:border-[#b09e80]'
                                                    : 'px-4 hover:text-[#b09e80]'
                                            } ${isActive(link.path) ? 'text-[#b09e80]' : 'text-white'}`}
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>

                            {/* Language switcher (mobile) */}
                            <div className="mt-8 flex items-center gap-3">
                                {[
                                    { code: 'pt', label: 'PT', flag: '/legacy/home/images/portuguese-flag.svg' },
                                    { code: 'en', label: 'EN', flag: '/legacy/home/images/english-flag.svg' },
                                ].map((lang) => (
                                    <button
                                        key={lang.code}
                                        type="button"
                                        onClick={() => {
                                            router.replace(pathname, { locale: lang.code });
                                            setIsMenuOpen(false);
                                        }}
                                        aria-label={lang.label}
                                        aria-pressed={locale === lang.code}
                                        className={`flex min-h-11 items-center gap-2 rounded-full border px-5 text-sm font-bold uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b09e80] ${
                                            locale === lang.code
                                                ? 'border-[#b09e80] text-[#b09e80] bg-[#b09e80]/10'
                                                : 'border-white/20 text-white hover:border-[#b09e80]/60'
                                        }`}
                                    >
                                        <span className="relative w-5 h-5 rounded-full overflow-hidden border border-white/10">
                                            <Image src={lang.flag} alt={lang.label} fill className="object-cover" />
                                        </span>
                                        {lang.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};
