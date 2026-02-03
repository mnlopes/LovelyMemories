"use client";

import React from 'react';
import Image from 'next/image';
import { Building2 } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useTranslations, useLocale } from "next-intl";
import { getProperties } from '@/lib/services';

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

// Helper to safely extract number from potential object/string
const safeCount = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseInt(val, 10) || 0;
    if (typeof val === 'object' && val !== null) {
        return parseInt(val.en || val.pt || val.he || Object.values(val)[0] || '0', 10) || 0;
    }
    return 0;
};

interface Property {
    id: string;
    title: string;
    subtitleKey?: string;
    image: string;
    link: string;
    delay: number;
}

// PROPERTIES constant removed, now using Supabase

export const HomeFeaturedProperties = () => {
    const t = useTranslations('Home');
    const locale = useLocale();
    const [properties, setProperties] = React.useState<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchProperties = async () => {
            setIsLoading(true);
            const data = await getProperties();
            // Shuffle and take only 5
            const shuffled = [...data].sort(() => 0.5 - Math.random());
            setProperties(shuffled.slice(0, 5));
            setIsLoading(false);
        };
        fetchProperties();
    }, []);

    return (
        <React.Fragment>
            {/* 
                MOBILE IMPLEMENTATION (Carousel) 
            */}
            <div className="section-block section-buildings md:hidden pt-12 pb-6">
                <div className="container mx-auto px-4">
                    <div className="mb-6">
                        <div className="w-full">
                            <h5 className="text-2xl font-bold text-[#192537]">{t('featuredTitle')}</h5>
                        </div>
                    </div>
                    {/* Horizontal Scroll Container */}
                    <div className="flex flex-nowrap overflow-x-auto snap-x snap-mandatory gap-2 px-4 pb-4 no-scrollbar min-h-[400px]">
                        {isLoading ? (
                            <div className="w-full flex items-center justify-center py-20">
                                <div className="w-10 h-10 border-4 border-[#b09e80] border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : properties.length === 0 ? (
                            <div className="w-full text-center py-20 text-gray-400">No properties found.</div>
                        ) : (
                            properties.slice(0, 5).map((property, index) => {
                                const isBuilding = property.is_multi_unit;
                                const baseRoute = isBuilding ? 'buildings' : 'properties';
                                return (
                                    <Link
                                        key={property.id}
                                        href={`/${baseRoute}/${property.slug}`}
                                        className="flex-none w-[85vw] max-w-[320px] snap-center group relative block"
                                    >
                                        <figure className="mb-0 h-[450px] w-full relative overflow-hidden rounded-2xl">
                                            <Image
                                                src={property.image || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop'}
                                                alt={getLocalizedStr(property.title, locale)}
                                                fill
                                                sizes="(max-width: 768px) 85vw"
                                                style={{ objectFit: 'cover' }}
                                                className="transition-transform duration-700 group-hover:scale-105"
                                            />
                                            {isBuilding && (
                                                <div className="absolute top-4 right-4 z-20">
                                                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#AD9C7E]/85 backdrop-blur-md border border-white/30 text-white shadow-xl">
                                                        <Building2 className="w-3.5 h-3.5" />
                                                        <span className="text-[11px] font-bold uppercase tracking-widest leading-none">Building</span>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/60 to-transparent z-10">
                                                <h6 className="text-white font-sans font-bold text-xl mb-1">
                                                    {getLocalizedStr(property.title, locale)}
                                                </h6>
                                                {!isBuilding && (
                                                    <p className="text-white/90 text-sm font-light">
                                                        {safeCount(property.bedrooms)} {t('bedrooms')} • {safeCount(property.max_guests)} {t('guests')}
                                                    </p>
                                                )}
                                            </div>
                                        </figure>
                                    </Link>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* 
                DESKTOP IMPLEMENTATION (Legacy HTML)
            */}
            <div className="section-block section-buildings reveal-pending reveal-visible hidden md:block py-20">
                <div className="container mx-auto px-4">
                    <div className="mb-12">
                        <div className="w-full">
                            <h5 className="section-title text-center text-3xl font-sans font-bold text-[#192537]">{t('featuredTitle')}</h5>
                        </div>
                    </div>
                    {/* Centered Flex Structure */}
                    <div className="flex flex-wrap justify-center gap-6 buildings-posts">
                        {isLoading ? (
                            <>
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="w-full md:w-[calc(50%-1.5rem)] lg:w-[calc(33.333%-2rem)] xl:w-[calc(20%-2rem)] aspect-[3/4] rounded-2xl bg-gray-100 animate-pulse" />
                                ))}
                            </>
                        ) : (
                            properties.slice(0, 5).map((property, index) => {
                                const isBuilding = property.is_multi_unit;
                                const baseRoute = isBuilding ? 'buildings' : 'properties';
                                return (
                                    <Link
                                        key={property.id}
                                        href={`/${baseRoute}/${property.slug}`}
                                        className="buildings-posts__card reveal-pending reveal-visible group block w-full md:w-[calc(50%-1.5rem)] lg:w-[calc(33.333%-2rem)] xl:w-[calc(20%-2rem)]"
                                        style={{ transitionDelay: `${index * 100}ms` }}
                                    >
                                        <figure className="mb-0 buildings-posts__card--img rounded-2xl overflow-hidden relative aspect-[3/4] w-full shadow-md">
                                            <Image
                                                src={property.image || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop'}
                                                alt={getLocalizedStr(property.title, locale)}
                                                fill
                                                sizes="(max-width: 1200px) 50vw, 20vw"
                                                style={{ objectFit: 'cover' }}
                                                className="transition-transform duration-700 group-hover:scale-110"
                                            />
                                            {isBuilding && (
                                                <div className="absolute top-4 right-4 z-20">
                                                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#AD9C7E]/85 backdrop-blur-md border border-white/30 text-white shadow-xl scale-100 transition-all duration-300 group-hover:scale-105 group-hover:bg-[#AD9C7E]">
                                                        <Building2 className="w-3.5 h-3.5" />
                                                        <span className="text-[11px] font-bold uppercase tracking-widest leading-none">Building</span>
                                                    </div>
                                                </div>
                                            )}
                                            {/* Gradient Overlay for text readability */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80 transition-opacity duration-300"></div>

                                            <div className="absolute bottom-0 left-0 w-full p-6 z-10 text-left">
                                                <h6 className="text-white font-sans font-bold text-xl mb-1 leading-tight">
                                                    {getLocalizedStr(property.title, locale)}
                                                </h6>
                                                {!isBuilding && (
                                                    <p className="text-white/90 text-sm font-light tracking-wide">
                                                        {safeCount(property.bedrooms)} {t('bedrooms')} • {safeCount(property.max_guests)} {t('guests')}
                                                    </p>
                                                )}
                                            </div>
                                        </figure>
                                    </Link>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </React.Fragment>
    );
};
