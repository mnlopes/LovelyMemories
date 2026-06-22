"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const LANGUAGES = [
    { code: 'en', label: 'English', flag: '/legacy/home/images/english-flag.svg' },
    { code: 'pt', label: 'Português', flag: '/legacy/home/images/portuguese-flag.svg' }
];

export const LanguageSwitcher = () => {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Current language object
    const currentLang = LANGUAGES.find(l => l.code === locale) || LANGUAGES[0];

    const handleSwitch = (newLocale: string) => {
        router.replace(pathname, { locale: newLocale });
        setIsOpen(false);
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative z-50" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 focus:outline-none hover:scale-105 transition-transform duration-200"
            >
                <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-white/20 hover:border-[#b09e80] transition-colors">
                    {/* Using a simple img tag for now if next/image proves tricky with dynamic paths without require, but next/image is better */}
                    <Image
                        src={currentLang.flag}
                        alt={currentLang.label}
                        fill
                        className="object-cover"
                    />
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 top-full mt-3 w-40 bg-[#0A1128] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-2"
                    >
                        {LANGUAGES.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => handleSwitch(lang.code)}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors hover:bg-white/5 ${locale === lang.code ? 'text-[#b09e80]' : 'text-gray-300'
                                    }`}
                            >
                                <div className="relative w-6 h-6 rounded-full overflow-hidden border border-white/10 shrink-0">
                                    <Image
                                        src={lang.flag}
                                        alt={lang.label}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <span>{lang.label}</span>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
