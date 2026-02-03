"use client";

import React from 'react';
import Image from 'next/image';
import { Link } from "@/i18n/routing";
import { ArrowLeft, MapPin, Building2, Bed, Home, Users, Maximize, Bath } from 'lucide-react';
import { useTranslations, useLocale } from "next-intl";

interface BuildingUnitsPageProps {
    building: any;
    units: any[];
}

// Helper to safely extract number from potential object/string
const safeCount = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseInt(val, 10) || 0;
    if (typeof val === 'object' && val !== null) {
        return parseInt(val.en || val.pt || val.he || Object.values(val)[0] || '0', 10) || 0;
    }
    return 0;
};

// Helper to safely extract string from potential localized object
const getLocalizedStr = (val: any, locale: string = 'en'): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
        const preferred = val[locale] || val['en'] || val['pt'] || Object.values(val)[0];
        return typeof preferred === 'string' ? preferred : '';
    }
    return '';
};

export default function BuildingUnitsPage({ building, units }: BuildingUnitsPageProps) {
    const locale = useLocale();
    const t = useTranslations('PropertiesGrid');
    const td = useTranslations('PropertyDetail');

    const activeUnits = units.filter(u => !u.isComingSoon);
    const sortedUnits = [...units].sort((a, b) => {
        if (!a.isComingSoon && b.isComingSoon) return -1;
        if (a.isComingSoon && !b.isComingSoon) return 1;
        return 0;
    });

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-[#f8f9fa] pt-24 lg:pt-28">
            {/* Left Sidebar - Building Information */}
            <aside className="w-full lg:w-[400px] xl:w-[450px] lg:h-[calc(100vh-7rem)] lg:sticky lg:top-28 bg-white border-r border-gray-100 flex flex-col z-10 shadow-sm">

                {/* Scrollable sidebar content */}
                <div className="flex-1 overflow-y-auto p-8 flex flex-col">
                    <Link
                        href={(() => {
                            if (typeof window !== 'undefined') {
                                const params = new URLSearchParams(window.location.search);
                                if (params.get('location') || params.get('from') || params.get('to')) {
                                    return `/search?${params.toString()}`;
                                }
                            }
                            return `/properties`;
                        })()}
                        className="inline-flex items-center gap-2 text-gray-500 hover:text-[#192537] transition-colors mb-8 text-xs font-bold uppercase tracking-widest w-fit"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t('backToAllHomes')}
                    </Link>

                    <div className="mb-8 relative aspect-video w-full overflow-hidden rounded-2xl shadow-md">
                        <Image
                            src={building.image}
                            alt={building.title}
                            fill
                            className="object-cover"
                        />
                    </div>

                    <div className="flex flex-col gap-4">
                        <h1 className="text-3xl md:text-4xl font-sans font-bold text-[#192537] leading-tight">
                            {getLocalizedStr(building.title, locale)}
                        </h1>

                        <div className="flex items-center gap-2 text-gray-600 font-medium">
                            <MapPin className="w-5 h-5 text-[#AD9C7E]" />
                            <span>{building.location.address}, {building.location.city}</span>
                        </div>

                        <div className="h-px w-20 bg-[#AD9C7E]/30 my-2" />

                        <p className="text-gray-500 text-lg leading-relaxed">
                            {getLocalizedStr(building.subtitle, locale)}
                        </p>

                        <div className="flex items-center gap-3 mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <Building2 className="w-5 h-5 text-[#AD9C7E]" />
                            <span className="text-sm font-bold text-[#192537]">{activeUnits.length} {t('apartments')}</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Right Content - Units Grid */}
            <main className="flex-1 p-6 md:p-12 overflow-y-auto">
                <div className="max-w-[1600px] mx-auto">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-[#192537] mb-2">Available Apartments</h2>
                        <p className="text-gray-500">Choose from {activeUnits.length} unique apartments within this building.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                        {sortedUnits.map((unit) => {
                            const isComingSoon = unit.isComingSoon;

                            return (
                                <div
                                    key={unit.id}
                                    className={`group block w-full bg-white rounded-2xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] border border-gray-100/50 overflow-hidden transition-all duration-500 flex flex-col ${isComingSoon
                                        ? 'opacity-80'
                                        : 'hover:-translate-y-2 hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)]'
                                        }`}
                                >
                                    <div className={`block relative aspect-[4/3] w-full overflow-hidden ${isComingSoon ? '' : 'cursor-pointer'}`}>
                                        {isComingSoon ? (
                                            <div className="relative w-full h-full grayscale-[0.3]">
                                                <Image
                                                    src={unit.image}
                                                    alt={unit.title}
                                                    fill
                                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                                                    className="object-cover transition-transform duration-1000"
                                                />
                                            </div>
                                        ) : (
                                            <Link href={`/properties/${unit.slug}`} className="block relative w-full h-full">
                                                <Image
                                                    src={unit.image}
                                                    alt={unit.title}
                                                    fill
                                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                                                    className="object-cover transition-transform duration-1000 group-hover:scale-110"
                                                />
                                            </Link>
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent z-10" />
                                        <div className="absolute bottom-0 left-0 w-full p-6 z-20">
                                            <h3 className="text-white font-sans font-bold text-lg mb-0.5 tracking-tight">
                                                {getLocalizedStr(unit.title, locale)}
                                            </h3>
                                            <p className="text-white/80 text-[10px] font-light tracking-wide">
                                                {getLocalizedStr(unit.subtitle, locale)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-6 space-y-4 flex-1 flex flex-col justify-end">
                                        {isComingSoon ? (
                                            <div className="flex flex-col items-center justify-center py-10 border-b border-gray-100">
                                                <p className="text-gray-400 text-[13px] font-bold italic uppercase tracking-[0.3em] text-center">
                                                    {t('comingSoon')}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-x-2 gap-y-3 items-center w-full">
                                                <div className="flex items-center gap-1.5">
                                                    <Users className="text-[#AD9C7E] w-4 h-4 shrink-0" />
                                                    <p className="text-[#192537] text-[12px] font-medium whitespace-nowrap">
                                                        <span className="font-bold">{safeCount(unit.guests)}</span> {td('guestsCount', { count: safeCount(unit.guests) })}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Bed className="text-[#AD9C7E] w-4 h-4 shrink-0" />
                                                    <p className="text-[#192537] text-[12px] font-medium whitespace-nowrap">
                                                        <span className="font-bold">{safeCount(unit.bedrooms)}</span> {td('bedroomsCount', { count: safeCount(unit.bedrooms) })}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Maximize className="text-[#AD9C7E] w-4 h-4 shrink-0" />
                                                    <p className="text-[#192537] text-[12px] font-medium whitespace-nowrap">
                                                        <span className="font-bold">{safeCount(unit.area)}</span> m²
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Bath className="text-[#AD9C7E] w-4 h-4 shrink-0" />
                                                    <p className="text-[#192537] text-[12px] font-medium whitespace-nowrap">
                                                        <span className="font-bold">{safeCount(unit.bathrooms)}</span> {td('bathroomsCount', { count: safeCount(unit.bathrooms) })}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* CTA Button */}
                                        <div className="pt-2">
                                            {isComingSoon ? (
                                                <div className="block w-full text-center py-4 px-6 bg-gray-100 text-gray-400 font-bold uppercase tracking-widest text-sm rounded-full cursor-not-allowed">
                                                    {t('viewHome')}
                                                </div>
                                            ) : (
                                                <Link
                                                    href={`/properties/${unit.slug}`}
                                                    className="block w-full text-center py-4 px-6 bg-[#192537] hover:bg-[#253654] text-white font-bold uppercase tracking-widest text-sm rounded-full transition-all duration-300 shadow-md active:scale-[0.98]"
                                                >
                                                    {t('viewHome')}
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>
        </div>
    );
}
