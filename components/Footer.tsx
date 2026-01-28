import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import React from "react";
import { useTranslations } from "next-intl";

export const Footer = () => {
    const t = useTranslations('Footer');
    const tNav = useTranslations('Navbar');

    const navLinks = [
        { path: '/', label: tNav('book') },
        { path: '/owner', label: tNav('owner') },
        { path: '/about-us', label: tNav('about') },
        { path: '/properties', label: tNav('properties') },
        { path: '/concierge', label: tNav('concierge') },
        { path: '/blog', label: tNav('blog') },
        { path: '/contact', label: tNav('contact') },
    ];

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
                    <h4 className="text-3xl md:text-4xl font-sans font-bold">{t('getInTouch')}</h4>
                    <p className="text-gray-300 font-light leading-relaxed max-w-2xl">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi tincidunt eu mauris a pulvinar.
                    </p>

                    <div className="w-full max-w-xl mt-8">
                        <form className="flex items-center bg-white rounded-full p-1.5 md:p-2 shadow-xl border border-white/10">
                            <input
                                type="email"
                                placeholder={t('enterEmail')}
                                className="flex-grow bg-transparent text-gray-900 placeholder-gray-400 font-light focus:outline-none pl-4 md:pl-6 py-2 md:py-2.5 text-sm md:text-base min-w-0"
                                required
                            />
                            <button
                                type="submit"
                                className="px-6 md:px-10 py-2.5 md:py-3 bg-[#a39076] text-white text-[10px] md:text-[12px] !rounded-full hover:bg-[#8e7d65] transition-all duration-300 whitespace-nowrap ml-1 md:ml-2 cursor-pointer"
                            >
                                {t('subscribe')}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Middle Section: Navigation & Socials */}
                <div className="w-full flex flex-col items-center gap-8 mb-16">
                    {/* Navigation */}
                    <nav>
                        <ul className="flex flex-wrap justify-center gap-x-8 gap-y-4">
                            {navLinks.map((link) => (
                                <li key={link.path}>
                                    <Link
                                        href={link.path}
                                        className="text-sm !font-bold uppercase tracking-widest text-white hover:text-[#a39076] transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* Social Icons */}
                    <div className="flex items-center gap-8">
                        <a href="http://facebook.com" target="_blank" rel="noreferrer" className="text-white hover:text-[#a39076] transition-colors">
                            <Facebook size={22} strokeWidth={2} />
                        </a>
                        <a href="http://instagram.com" target="_blank" rel="noreferrer" className="text-white hover:text-[#a39076] transition-colors">
                            <Instagram size={22} strokeWidth={2} />
                        </a>
                        <a href="http://x.com" target="_blank" rel="noreferrer" className="text-white hover:text-[#a39076] transition-colors">
                            <Twitter size={22} strokeWidth={2} />
                        </a>
                        <a href="http://linkedin.com" target="_blank" rel="noreferrer" className="text-white hover:text-[#a39076] transition-colors">
                            <Linkedin size={22} strokeWidth={2} />
                        </a>
                    </div>
                </div>

                {/* Bottom Divider & Links */}
                <div className="w-full border-t border-[#b09e80] pt-20 md:pt-8 flex flex-col md:flex-row justify-between items-center text-xs tracking-widest uppercase text-[#b09e80] gap-4 relative mt-16 md:mt-12">

                    {/* Logo Centered on Line */}
                    <div
                        className="absolute left-1/2 top-0"
                        style={{ transform: "translate(-50%, -50%)" }}
                    >
                        <Image
                            src="/legacy/home/images/logo-1.svg"
                            alt="Lovely Memories"
                            width={300}
                            height={100}
                            className="h-24 w-auto object-contain"
                        />
                    </div>

                    <div className="flex gap-6">
                        <Link href="/privacy-policy" className="!font-bold hover:text-white transition-colors">
                            {t('privacyPolicy')}
                        </Link>
                        <Link href="/terms-conditions" className="!font-bold hover:text-white transition-colors">
                            {t('termsConditions')}
                        </Link>
                    </div>
                    <div className="text-center md:text-right">
                        <p className="!font-bold">{t('rights')}</p>
                    </div>
                </div>

            </div>
        </footer>
    );
};
