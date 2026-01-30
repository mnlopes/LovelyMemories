"use client";

import React from 'react';
import Image from 'next/image';
import { Link } from "@/i18n/routing";
import { ArrowLeft, MapPin, Building2, Bed, Home } from 'lucide-react';
import { useTranslations } from "next-intl";
import { LegacyIcon } from './LegacyIcon';

import { PROPERTIES } from "@/lib/data";

export const PropertiesGrid = () => {
    const t = useTranslations('PropertiesGrid');
    const [selectedRegion, setSelectedRegion] = React.useState('all');
    const [visibleCount, setVisibleCount] = React.useState(4);

    const regions = ['all', 'porto', 'lisboa', 'algarve'];

    const filteredProperties = (PROPERTIES as any[]).filter(p =>
        selectedRegion === 'all' || p.region.toLowerCase() === selectedRegion
    );

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
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-12 gap-y-6 border-b border-gray-100 pb-2 relative">
                        {regions.map(region => {
                            const count = region === 'all'
                                ? PROPERTIES.length
                                : PROPERTIES.filter(p => p.region.toLowerCase() === region).length;
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-y-12 gap-x-8">
                    {filteredProperties.slice(0, visibleCount).map((property: any, index: number) => (
                        <div
                            key={index}
                            className={`group block w-full bg-white rounded-2xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] border border-gray-100/50 overflow-hidden transition-all duration-500 ${property.isComingSoon
                                ? 'opacity-80'
                                : 'hover:-translate-y-2 hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)]'
                                }`}
                        >
                            <div className={`block relative aspect-[1/1] w-full overflow-hidden ${property.isComingSoon ? '' : 'cursor-pointer'}`}>
                                {property.isComingSoon ? (
                                    <Image
                                        src={property.image}
                                        alt={property.title}
                                        fill
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                                        style={{ objectFit: 'cover' }}
                                        className="transition-transform duration-1000 grayscale-[0.3]"
                                    />
                                ) : (
                                    <Link href={`/properties/${property.slug}`}>
                                        <Image
                                            src={property.image}
                                            alt={property.title}
                                            fill
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                                            style={{ objectFit: 'cover' }}
                                            className="transition-transform duration-1000 group-hover:scale-110"
                                        />
                                    </Link>
                                )}
                                {/* Bottom-to-top dark gradient */}
                                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10 opacity-90 pointer-events-none"></div>

                                {/* Overlay Content - Center Aligned */}
                                <div className="absolute bottom-0 left-0 w-full p-6 z-20 text-center pointer-events-none">
                                    <h6 className="text-white font-sans font-bold text-2xl mb-1 leading-tight tracking-tight drop-shadow-md">
                                        {property.title}
                                    </h6>
                                    <p className="text-white/80 text-sm font-light uppercase tracking-[0.2em]">
                                        {property.subtitle}
                                    </p>
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Location Row - Center Aligned */}
                                <div className="flex flex-col items-center text-center pb-4 border-b border-gray-50">
                                    <MapPin className="text-[#AD9C7E] w-5 h-5 mb-2" />
                                    <p className="text-[#192537] text-sm font-semibold tracking-tight">
                                        {property.location.city}
                                    </p>
                                </div>

                                {/* Units Type Row - Center Aligned */}
                                {property.isComingSoon ? (
                                    <div className="flex flex-col items-center justify-center py-4 border-b border-gray-100 min-h-[4rem]">
                                        <p className="text-gray-300 text-sm font-bold italic uppercase tracking-[0.4em]">
                                            {t('comingSoon')}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-x-6 gap-y-3 pb-4 border-b border-gray-100 min-h-[4rem] items-center justify-center">
                                        {property.types.map((type: any, idx: number) => {
                                            const label = type.label.toLowerCase();
                                            const Icon = label.includes('apartment') ? Building2 :
                                                label.includes('room') ? Bed : Home;

                                            return (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <Icon className="text-[#AD9C7E] w-[18px] h-[18px]" />
                                                    <p className="text-[#192537] text-sm whitespace-nowrap m-0">
                                                        <span className="font-bold">{type.count}</span> {type.label}
                                                    </p>
                                                </div>
                                            );
                                        })}
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
                                            href={`/properties/${property.slug}`}
                                            className="block w-full text-center py-4 px-6 bg-[#192537] hover:bg-[#253654] text-white font-bold uppercase tracking-widest text-sm rounded-full transition-all duration-300 shadow-md active:scale-[0.98]"
                                        >
                                            {t('viewBuilding')}
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
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
