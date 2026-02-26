"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const LANGUAGES = [
    { code: 'en', label: 'English', flag: '/legacy/home/images/english-flag.svg' },
    { code: 'pt', label: 'Português', flag: '/legacy/home/images/portuguese-flag.svg' }
];

interface AdminLanguageSwitcherProps {
    isCollapsed?: boolean;
}

export const AdminLanguageSwitcher = ({ isCollapsed }: AdminLanguageSwitcherProps) => {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const currentLang = LANGUAGES.find(l => l.code === locale) || LANGUAGES[0];

    const handleSwitch = (newLocale: string) => {
        router.replace(pathname, { locale: newLocale });
        setIsOpen(false);
    };

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
        <div className="relative w-full" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full flex items-center transition-all rounded-lg hover:bg-admin-bg border border-transparent hover:border-admin-border group",
                    isCollapsed ? "justify-center p-2" : "gap-3 px-3 py-2"
                )}
            >
                <div className="relative w-5 h-5 rounded-full overflow-hidden border border-admin-border shrink-0">
                    <Image
                        src={currentLang.flag}
                        alt={currentLang.label}
                        fill
                        className="object-cover"
                    />
                </div>
                {!isCollapsed && (
                    <>
                        <span className="text-xs font-bold text-admin-text-secondary group-hover:text-admin-text-primary transition-colors">
                            {currentLang.label}
                        </span>
                        <ChevronUp className={cn(
                            "ml-auto size-3.5 text-admin-text-secondary transition-transform duration-200",
                            isOpen && "rotate-180"
                        )} />
                    </>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                            "absolute bottom-full mb-2 bg-admin-surface border border-admin-border rounded-xl shadow-xl overflow-hidden py-1.5 z-[100]",
                            isCollapsed ? "left-0 w-40" : "left-0 right-0 w-full"
                        )}
                    >
                        {LANGUAGES.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => handleSwitch(lang.code)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2 text-xs font-bold transition-all hover:bg-admin-bg relative group",
                                    locale === lang.code ? 'text-admin-accent' : 'text-admin-text-secondary hover:text-admin-text-primary'
                                )}
                            >
                                <div className="relative w-4 h-4 rounded-full overflow-hidden border border-admin-border shrink-0">
                                    <Image
                                        src={lang.flag}
                                        alt={lang.label}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <span>{lang.label}</span>
                                {locale === lang.code && (
                                    <div className="ml-auto size-1.5 rounded-full bg-admin-accent shadow-sm" />
                                )}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
