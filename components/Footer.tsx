"use client";
import { Facebook, Instagram, Linkedin } from "lucide-react";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/routing";
import { toast } from "sonner";

export const Footer = () => {
    const t = useTranslations('Footer');
    const tNav = useTranslations('Navbar');
    const pathname = usePathname();
    const [email, setEmail] = useState("");
    const [website, setWebsite] = useState(""); // Honeypot

    const navLinks = [
        { path: '/', label: tNav('book') },
        { path: '/join', label: tNav('owner') },
        { path: '/about-us', label: tNav('about') },
        { path: '/properties', label: tNav('properties') },
        { path: '/for-sale', label: tNav('forSale') },
        { path: '/concierge', label: tNav('concierge') },
        { path: '/blog', label: tNav('blog') },
        { path: '/contact', label: tNav('contact') },
    ];

    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || status === 'loading') return;

        setStatus('loading');
        try {
            const response = await fetch('/api/newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, website }),
            });

            if (response.status === 429) {
                toast.error(t('newsletterWait'));
                setStatus('error');
                return;
            }

            if (response.ok) {
                setStatus('success');
                setEmail("");
                setWebsite("");
                setTimeout(() => setStatus('idle'), 5000);
            } else {
                setStatus('error');
            }
        } catch {
            setStatus('error');
        }
    };

    if (pathname.includes('/booking/checkout') || pathname.includes('/admin')) return null;

    return (
        <footer className="relative text-white pt-24 pb-10 font-[family-name:var(--font-montserrat)]">
            {/* Background Image & Overlay */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/legacy/home/images/footer-BG.png"
                    alt="Footer Background"
                    fill
                    className="object-cover object-center"
                />
                {/* Gradient Overlay */}
                <div
                    className="absolute inset-0 z-10"
                    style={{ background: "linear-gradient(180deg, #192537cc 0%, #192537 100%)" }}
                ></div>
            </div>

            <div className="container mx-auto px-4 relative z-10 flex flex-col items-center">

                {/* Top Section: CTA & Form */}
                <div className="flex flex-col items-center text-center mb-16 space-y-6 w-full max-w-4xl">
                    <h2 className="text-3xl md:text-4xl font-sans font-bold">{t('getInTouch')}</h2>
                    <p className="text-gray-300 font-light leading-relaxed max-w-2xl">
                        {t('newsletterIntro')}
                    </p>

                    <div className="w-full max-w-xl mt-8">
                        <form onSubmit={handleSubmit} className="flex items-center bg-white rounded-full p-1 shadow-xl border border-white/10">
                            <input
                                type="email"
                                name="email"
                                aria-label={t('emailLabel')}
                                autoComplete="email"
                                inputMode="email"
                                autoCapitalize="none"
                                spellCheck={false}
                                placeholder={t('enterEmail')}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="flex-grow bg-transparent text-gray-900 placeholder-gray-400 font-light focus:outline-none pl-4 md:pl-6 py-2 md:py-2.5 text-base min-w-0"
                                required
                            />
                            {/* HONEYPOT FIELD (Hidden) */}
                            <input
                                type="text"
                                name="website"
                                value={website}
                                onChange={(e) => setWebsite(e.target.value)}
                                style={{ display: 'none' }}
                                tabIndex={-1}
                                autoComplete="off"
                                aria-hidden="true"
                            />
                            <button
                                type="submit"
                                disabled={!email.trim() || status === 'loading'}
                                className={`px-6 sm:px-8 md:px-12 py-3.5 md:py-4 bg-[#a39076] text-white text-[13px] md:text-[14px] !rounded-full transition-all duration-300 border border-white/10 whitespace-nowrap ml-1 md:ml-2 font-bold tracking-tight ${!email.trim() || status === 'loading' ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#8e7d65] cursor-pointer'}`}
                            >
                                {status === 'loading' ? '...' : status === 'success' ? '✓' : t('subscribe')}
                            </button>
                        </form>
                        <p role="status" aria-live="polite" className={`text-sm mt-3 min-h-5 ${status === 'error' ? 'text-red-300' : 'text-[#d8c9ae]'}`}>
                            {status === 'error' ? t('newsletterError') : status === 'success' ? t('newsletterSuccess') : ''}
                        </p>
                    </div>
                </div>

                {/* Middle Section: Navigation & Socials */}
                <div className="w-full flex flex-col items-center gap-6 md:gap-8 mb-16">
                    {/* Navigation */}
                    <nav>
                        <ul className="flex flex-wrap justify-center gap-x-6 md:gap-x-8 gap-y-1 md:gap-y-4">
                            {navLinks.map((link) => (
                                <li key={link.path}>
                                    <Link
                                        href={link.path}
                                        className="inline-flex min-h-11 md:min-h-0 items-center whitespace-nowrap text-sm !font-bold uppercase tracking-widest text-white hover:text-[#a39076] transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* Social Icons */}
                    <div className="flex items-center gap-4 md:gap-6">
                        <a href="https://www.facebook.com/lovely.memories.pt" target="_blank" rel="noreferrer" aria-label="Facebook" className="flex size-11 items-center justify-center rounded-full text-white hover:text-[#a39076] transition-colors">
                            <Facebook size={22} strokeWidth={2} />
                        </a>
                        <a href="https://www.instagram.com/lovely_memories_pt/" target="_blank" rel="noreferrer" aria-label="Instagram" className="flex size-11 items-center justify-center rounded-full text-white hover:text-[#a39076] transition-colors">
                            <Instagram size={22} strokeWidth={2} />
                        </a>
                        <a href="https://www.linkedin.com/company/lovely-memories-lda/" target="_blank" rel="noreferrer" aria-label="LinkedIn" className="flex size-11 items-center justify-center rounded-full text-white hover:text-[#a39076] transition-colors">
                            <Linkedin size={22} strokeWidth={2} />
                        </a>
                    </div>
                </div>

                {/* Bottom Divider & Links */}
                <div className="w-full border-t border-[#b09e80] pt-20 lg:pt-8 text-[11px] xl:text-xs tracking-widest uppercase text-[#b09e80] relative mt-16 lg:mt-12">

                    {/* Logo Centered on Line */}
                    <div
                        className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[62%]"
                    >
                        <Image
                            src="/legacy/home/images/logo-1.svg"
                            alt="Lovely Memories"
                            width={300}
                            height={100}
                            className="h-28 w-auto object-contain"
                        />
                    </div>

                    <div className="w-full grid grid-cols-1 lg:grid-cols-[1fr_280px_1fr] items-center gap-6 lg:gap-4">
                        {/* Links Column */}
                        <div className="flex flex-wrap justify-center lg:justify-start gap-x-4 xl:gap-x-6 gap-y-0 lg:gap-y-2">
                            <Link href="/privacy-policy" className="inline-flex min-h-11 lg:min-h-0 items-center !font-bold hover:text-white transition-colors">
                                {t('privacyPolicy')}
                            </Link>
                            <Link href="/terms-conditions" className="inline-flex min-h-11 lg:min-h-0 items-center !font-bold hover:text-white transition-colors">
                                {t('termsConditions')}
                            </Link>
                        </div>

                        {/* Spacer for Centered Logo */}
                        <div className="hidden lg:block h-1" />

                        {/* Copyright Column */}
                        <div className="text-center lg:text-right">
                            <p className="!font-bold">{t('rights')}</p>
                        </div>
                    </div>
                </div>

            </div>
        </footer>
    );
};
