"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Link, usePathname } from "@/i18n/routing";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslations } from "next-intl";

export const Navbar = () => {
    const t = useTranslations('Navbar');
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    // Handle Scroll for sticky/transparent effects if legacy CSS relies on it
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const isActive = (path: string) => {
        if (path === "/" && pathname === "/") return true;
        if (path !== "/" && pathname.startsWith(path)) return true;
        return false;
    };

    const navLinks = [
        { path: '/', label: t('book') },
        { path: '/owner', label: t('owner') },
        { path: '/about-us', label: t('about') },
        { path: '/properties', label: t('properties') },
        { path: '/concierge', label: t('concierge') },
        { path: '/blog', label: t('blog') },
        { path: '/contact', label: t('contact') },
    ];

    return (
        <header
            className="fixed top-0 left-0 right-0 z-[9999] transition-all duration-300 bg-[#192537] py-6 shadow-lg"
        >
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between">

                    {/* Brand / Logo */}
                    <Link href="/" className="relative z-50 flex-shrink-0">
                        <figure className="mb-0">
                            <img
                                src="/legacy/home/images/logo.svg"
                                alt="Lovely Memories"
                                className="w-auto h-12 md:h-14 transition-all duration-300"
                            />
                        </figure>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center gap-8">
                        <ul className="flex items-center gap-8 m-0 p-0 list-none">
                            {navLinks.map((link) => (
                                <li key={link.path}>
                                    <Link
                                        href={link.path}
                                        className={`text-base font-bold uppercase tracking-widest hover:text-[#b09e80] transition-colors ${isActive(link.path) ? 'text-[#b09e80]' : 'text-white'
                                            }`}
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* Right Side Actions (Login / Lang) */}
                    <div className="hidden lg:flex items-center gap-6">
                        <Link
                            href="/my-account"
                            className="flex items-center gap-2 text-white hover:text-[#b09e80] transition-colors group"
                        >
                            <span className="p-2 border border-white/30 rounded-full group-hover:border-[#b09e80] transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                            </span>
                            <span className="text-base font-bold uppercase tracking-widest hidden xl:block">{t('login')}</span>
                        </Link>

                        {/* Language Switcher */}
                        <LanguageSwitcher />
                    </div>

                    {/* Mobile Toggler */}
                    <button
                        className="lg:hidden relative z-50 p-2 text-white focus:outline-none"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label="Toggle navigation"
                    >
                        <div className="w-6 flex flex-col items-end gap-1.5">
                            <span className={`h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? 'w-6 rotate-45 translate-y-2' : 'w-6'}`}></span>
                            <span className={`h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? 'opacity-0' : 'w-4'}`}></span>
                            <span className={`h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? 'w-6 -rotate-45 -translate-y-2' : 'w-5'}`}></span>
                        </div>
                    </button>

                    {/* Mobile Menu Overlay */}
                    <div
                        className={`fixed inset-0 bg-[#0A1128] z-40 flex flex-col items-center justify-center transition-all duration-500 ${isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
                            }`}
                    >
                        <ul className="flex flex-col items-center gap-6 text-center">
                            {[...navLinks, { path: '/login', label: t('login') }].map((link) => (
                                <li key={link.path}>
                                    <Link
                                        href={link.path}
                                        onClick={() => setIsMenuOpen(false)}
                                        className={`text-2xl font-bold uppercase tracking-widest hover:text-[#b09e80] transition-colors ${isActive(link.path) ? 'text-[#b09e80]' : 'text-white'
                                            }`}
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </header>
    );
};

