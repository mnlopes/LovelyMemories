"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";

// Helper to safely extract string from potential localized object
const getLocalizedStr = (val: any, locale: string = 'en'): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
        const preferred = val[locale] || val['en'] || val['pt'] || Object.values(val)[0];
        return typeof preferred === 'string' ? preferred : String(preferred || '');
    }
    return String(val || '');
};

interface Highlight {
    image: string;
    text: string | Record<string, string>;
}

interface HighlightsSectionProps {
    propertyId: string;
    highlights: Highlight[];
}

export function HighlightsSection({ propertyId, highlights }: HighlightsSectionProps) {
    const locale = useLocale();
    const t = useTranslations('PropertyDetail');
    const tp = useTranslations('Properties');

    if (!highlights || highlights.length === 0) return null;

    const scrollNext = () => {
        const container = document.getElementById('highlights-container');
        if (container) {
            container.scrollBy({ left: 340, behavior: 'smooth' });
        }
    };

    const scrollPrev = () => {
        const container = document.getElementById('highlights-container');
        if (container) {
            container.scrollBy({ left: -340, behavior: 'smooth' });
        }
    };

    return (
        <section className="py-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-navy-950">{t('highlightsTitle')}</h3>
                {highlights.length > 3 && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={scrollPrev}
                            className="w-9 h-9 rounded-full border border-[#B08D4A] flex items-center justify-center hover:bg-[#B08D4A]/10 text-[#B08D4A] transition-all duration-300"
                            aria-label="Previous highlight"
                        >
                            <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
                        </button>
                        <button
                            onClick={scrollNext}
                            className="w-9 h-9 rounded-full border border-[#B08D4A] flex items-center justify-center hover:bg-[#B08D4A]/10 text-[#B08D4A] transition-all duration-300"
                            aria-label="Next highlight"
                        >
                            <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
                        </button>
                    </div>
                )}
            </div>

            <div
                className="relative overflow-hidden -mx-4 px-4"
            >
                <div
                    id="highlights-container"
                    className={`flex overflow-x-auto gap-6 pb-4 snap-x snap-mandatory hide-scrollbar scroll-smooth ${highlights.length <= 2 ? 'md:justify-center' : ''}`}
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {highlights.map((highlight, index) => (
                        <div
                            key={index}
                            className="group cursor-pointer min-w-[280px] md:min-w-[340px] flex-shrink-0 snap-center"
                        >
                            <div className="aspect-[4/3] relative rounded-xl overflow-hidden mb-4 shadow-sm">
                                <Image
                                    src={highlight.image}
                                    alt={getLocalizedStr(highlight.text, locale)}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                    sizes="(max-width: 768px) 100vw, 33vw"
                                />
                            </div>
                            <p className="text-sm text-navy-900/70 leading-relaxed group-hover:text-navy-950 transition-colors">
                                {getLocalizedStr(highlight.text, locale)}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
