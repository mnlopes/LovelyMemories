"use client";

import React from 'react';
import Image from 'next/image';
import { Link } from "@/i18n/routing";
import { ArrowLeft, MapPin, Building2, Bed, Home, Maximize, Bath, Users } from 'lucide-react';
import { useTranslations } from "next-intl";
import { LegacyIcon } from './LegacyIcon';

import { getProperties } from '@/lib/services';
import { useLocale } from 'next-intl';

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

export const PropertiesGrid = () => {
    const locale = useLocale();
    const t = useTranslations('PropertiesGrid');
    const [properties, setProperties] = React.useState<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [selectedRegion, setSelectedRegion] = React.useState('all');
    const [visibleCount, setVisibleCount] = React.useState(4);

    React.useEffect(() => {
        const fetchProperties = async () => {
            setIsLoading(true);
            const data = await getProperties();
            setProperties(data);
            setIsLoading(false);
        };
        fetchProperties();
    }, []);

    const regions = ['all', 'porto', 'gaia', 'lisboa', 'algarve', 'mykonos'];

    // Count real bookable properties: a building contributes its number of units,
    // a standalone counts as one. Mirrors the "X Apartamentos" label on each card.
    const countProperties = (list: any[]) =>
        list.reduce((sum, p) => sum + (p.is_multi_unit ? safeCount(p.unitsCount) : 1), 0);

    const filteredProperties = properties.filter(p =>
        selectedRegion === 'all' || p.location.region.toLowerCase() === selectedRegion || p.location.city.toLowerCase() === selectedRegion
    );

    const sortedProperties = [...filteredProperties].sort((a, b) => {
        if (!a.isComingSoon && b.isComingSoon) return -1;
        if (a.isComingSoon && !b.isComingSoon) return 1;
        return 0;
    });

    const loadMore = () => {
        setVisibleCount(prev => prev + 4);
    };

    // Reset visible count when filter changes
    React.useEffect(() => {
        setVisibleCount(4);
    }, [selectedRegion]);

    return (
        <section className="py-20 bg-[#f8f9fa]">
            <div className="container mx-auto px-4">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
                    <div>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-[#b09e80] hover:text-[#9e8c6d] transition-colors mb-6 text-sm font-bold uppercase tracking-widest"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            {t('backToHome')}
                        </Link>
                        <h1 className="text-4xl md:text-5xl font-sans font-bold text-[#192537] mb-4">
                            {t('title')}
                        </h1>
                        <p className="text-gray-500 max-w-2xl font-sans text-lg">
                            {t('subtitle')}
                        </p>
                    </div>
                </div>

                {/* Region Filter Bar - Premium Redesign */}
                <div className="mb-20">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-5 sm:gap-x-8 md:gap-x-12 gap-y-4 md:gap-y-6 border-b border-gray-100 pb-2 relative">
                        {regions.map(region => {
                            const count = region === 'all'
                                ? countProperties(properties)
                                : countProperties(properties.filter(p => (p.location.region.toLowerCase() === region || p.location.city.toLowerCase() === region)));
                            const isActive = selectedRegion === region;

                            return (
                                <button
                                    key={region}
                                    onClick={() => setSelectedRegion(region)}
                                    className="relative group pb-4 transition-all duration-300"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[11px] font-bold uppercase tracking-[0.3em] transition-colors duration-300 ${isActive ? 'text-[#192537]' : 'text-gray-400 group-hover:text-[#b09e80]'
                                            }`}>
                                            {t(`regions.${region}`)}
                                        </span>
                                        <span className={`text-[9px] font-bold py-0.5 px-1.5 rounded-full transition-all duration-300 ${isActive ? 'bg-[#192537] text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-[#b09e80]/10 group-hover:text-[#b09e80]'
                                            }`}>
                                            {count}
                                        </span>
                                    </div>
                                    {/* Animated Underline */}
                                    <div className={`absolute bottom-0 left-0 w-full h-[2px] bg-[#192537] transition-transform duration-500 origin-left ${isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100 group-hover:bg-[#b09e80]'
                                        }`}></div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Grid Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-y-12 gap-x-8 min-h-[400px]">
                    {isLoading ? (
                        <>
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="aspect-[1/1] rounded-2xl bg-gray-100 animate-pulse" />
                            ))}
                        </>
                    ) : filteredProperties.length === 0 ? (
                        <div className="col-span-full text-center py-20 text-gray-400">No properties found in this region.</div>
                    ) : (
                        sortedProperties.slice(0, visibleCount).map((property: any, index: number) => (
                            <div
                                key={property.id || index}
                                className={`group block w-full bg-white rounded-2xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] border border-gray-100/50 overflow-hidden transition-all duration-500 ${property.isComingSoon
                                    ? 'opacity-80'
                                    : 'hover:-translate-y-2 hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)]'
                                    }`}
                            >
                                <div className={`block relative aspect-[1/1] w-full overflow-hidden ${property.isComingSoon ? '' : 'cursor-pointer'}`}>
                                    {property.isComingSoon ? (
                                        <Image
                                            src={property.image || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop'}
                                            alt={property.title}
                                            fill
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                                            style={{ objectFit: 'cover' }}
                                            className="transition-transform duration-1000 grayscale-[0.3]"
                                        />
                                    ) : (
                                        <Link href={property.is_multi_unit ? `/buildings/${property.slug}` : `/properties/${property.singleUnitSlug || property.slug}`}>
                                            <Image
                                                src={property.image || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop'}
                                                alt={property.title}
                                                fill
                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                                                style={{ objectFit: 'cover' }}
                                                className="transition-transform duration-1000 group-hover:scale-110"
                                            />
                                            {property.is_multi_unit && (
                                                <div className="absolute top-4 right-4 z-30">
                                                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#AD9C7E]/40 backdrop-blur-md border border-white/30 text-white shadow-2xl scale-100 transition-all duration-300 group-hover:scale-105 group-hover:bg-[#AD9C7E] group-hover:border-[#AD9C7E]">
                                                        <Building2 className="w-3.5 h-3.5" />
                                                        <span className="text-[11px] font-bold uppercase tracking-widest leading-none">Building</span>
                                                    </div>
                                                </div>
                                            )}
                                        </Link>
                                    )}
                                    {/* Bottom-to-top dark gradient */}
                                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10 opacity-90 pointer-events-none"></div>

                                    {/* Overlay Content - Center Aligned */}
                                    <div className="absolute bottom-0 left-0 w-full p-6 z-20 text-center pointer-events-none">
                                        <h6 className="text-white font-sans font-bold text-2xl mb-1 leading-tight tracking-tight drop-shadow-md">
                                            {getLocalizedStr(property.title, locale)}
                                        </h6>
                                        <p className="text-white/80 text-sm font-light uppercase tracking-[0.2em]">
                                            {getLocalizedStr(property.subtitle, locale)}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-6 space-y-4">
                                    {/* Location Row - Center Aligned */}
                                    <div className="flex items-center justify-between pb-4 border-b border-gray-50 px-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <MapPin className="text-[#AD9C7E] w-3.5 h-3.5 flex-shrink-0" />
                                            <p className="text-[#192537] text-[11px] font-bold uppercase tracking-wider truncate">
                                                {property.location.city}
                                            </p>
                                        </div>
                                        <p className="text-gray-400 text-[11px] font-medium truncate ml-4 max-w-[140px]">
                                            {property.location.address}
                                        </p>
                                    </div>

                                    {/* Units Type Row - Center Aligned */}
                                    {property.isComingSoon ? (
                                        <div className="flex flex-col items-center justify-center py-4 border-b border-gray-100 min-h-[5.5rem]">
                                            <p className="text-gray-300 text-sm font-bold italic uppercase tracking-[0.4em]">
                                                {t('comingSoon')}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-4 border-b border-gray-100 min-h-[5.5rem] px-4">
                                            {property.is_multi_unit ? (
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="text-[#AD9C7E] w-[18px] h-[18px]" />
                                                    <p className="text-[#192537] text-sm font-bold">
                                                        {safeCount(property.unitsCount)} {safeCount(property.unitsCount) === 1 ? t('apartment') : t('apartments')}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-x-8 gap-y-4 items-center justify-center w-full max-w-[280px]">
                                                    <div className="flex items-center gap-2">
                                                        <Users className="text-[#AD9C7E] w-[18px] h-[18px]" />
                                                        <p className="text-[#192537] text-sm">
                                                            <span className="font-bold">{property.guests}</span> {property.guests === 1 ? 'Guest' : 'Guests'}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Bed className="text-[#AD9C7E] w-[18px] h-[18px]" />
                                                        <p className="text-[#192537] text-sm whitespace-nowrap">
                                                            <span className="font-bold">{property.bedrooms}</span> {property.bedrooms === 1 ? 'Bedroom' : 'Bedrooms'}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Maximize className="text-[#AD9C7E] w-[18px] h-[18px]" />
                                                        <p className="text-[#192537] text-sm whitespace-nowrap">
                                                            <span className="font-bold">{property.area || 0}</span> m²
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Bath className="text-[#AD9C7E] w-[18px] h-[18px]" />
                                                        <p className="text-[#192537] text-sm whitespace-nowrap">
                                                            <span className="font-bold">{property.bathrooms || 0}</span> {property.bathrooms === 1 ? 'Bathroom' : 'Bathrooms'}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* CTA Button */}
                                    <div className="pt-2">
                                        {property.isComingSoon ? (
                                            <div className="block w-full text-center py-4 px-6 bg-gray-100 text-gray-400 font-bold uppercase tracking-widest text-sm rounded-full cursor-not-allowed">
                                                {t('viewBuilding')}
                                            </div>
                                        ) : (
                                            <Link
                                                href={property.is_multi_unit ? `/buildings/${property.slug}` : `/properties/${property.singleUnitSlug || property.slug}`}
                                                className="block w-full text-center py-4 px-6 bg-[#192537] hover:bg-[#253654] text-white font-bold uppercase tracking-widest text-sm rounded-full transition-all duration-300 shadow-md active:scale-[0.98]"
                                            >
                                                {property.is_multi_unit ? t('viewBuilding') : t('viewHome')}
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Premium Modern Load More Button */}
                {visibleCount < filteredProperties.length && (
                    <div className="mt-24 flex flex-col items-center group cursor-pointer" onClick={loadMore}>
                        <div className="relative overflow-hidden mb-8 h-6 flex items-center justify-center min-w-[300px]">
                            <span className="block text-[#192537] font-bold uppercase tracking-[0.3em] text-sm transition-transform duration-500 group-hover:-translate-y-full text-center mr-[-0.3em]">
                                {t('loadMore')}
                            </span>
                            <span className="absolute inset-0 flex items-center justify-center text-[#b09e80] font-bold uppercase tracking-[0.3em] text-sm translate-y-full transition-transform duration-500 group-hover:translate-y-0 mr-[-0.3em]">
                                {t('discoverMore')}
                            </span>
                        </div>
                        <div className="relative w-40 h-[1.5px] bg-gray-200 overflow-hidden mb-8">
                            <div className="absolute top-0 left-0 h-full w-full bg-[#192537] -translate-x-full transition-transform duration-700 ease-out group-hover:translate-x-0"></div>
                        </div>
                        <div className="flex items-center justify-center w-14 h-14 border border-gray-200 rounded-full transition-all duration-500 group-hover:border-[#192537] group-hover:bg-[#192537] group-hover:text-white group-hover:rotate-90 shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};
