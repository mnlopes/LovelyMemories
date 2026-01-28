"use client";

import React from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useTranslations } from "next-intl";

interface Property {
    id: string;
    title: string;
    subtitleKey?: string;
    image: string;
    link: string;
    delay: number;
}

const PROPERTIES: Property[] = [
    {
        id: 'paraiso-331',
        title: 'Paraíso 331',
        subtitleKey: 'gardenHuts',
        image: '/legacy/home/images/e7de979846a74b7dd3407aec0a0f3e9294605259.jpg',
        link: '/properties/paraiso-331',
        delay: 0
    },
    {
        id: 'paraiso-332',
        title: 'Paraíso 332',
        subtitleKey: 'gardenHuts',
        image: '/legacy/home/images/footer-BG.png',
        link: '/properties/paraiso-331-2',
        delay: 100
    },
    {
        id: 'praca-dos-poveiros',
        title: 'Praça dos Poveiros',
        subtitleKey: '',
        image: '/legacy/home/images/footer-BG.png',
        link: '/properties/praca-dos-poveiros',
        delay: 200
    },
    {
        id: 'rdm-ii',
        title: 'RDM II',
        subtitleKey: '',
        image: '/legacy/home/images/footer-BG.png',
        link: '/properties/rdm-ii',
        delay: 300
    },
    {
        id: 'the-flower-power',
        title: 'The Flower Power',
        subtitleKey: '',
        image: '/legacy/home/images/footer-BG.png',
        link: '/properties/the-flower-power',
        delay: 400
    }
];

export const HomeFeaturedProperties = () => {
    const t = useTranslations('Home');

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
                    <div className="flex flex-nowrap overflow-x-auto snap-x snap-mandatory gap-2 px-4 pb-4 no-scrollbar">
                        {PROPERTIES.map((property) => (
                            <Link
                                key={property.id}
                                href={property.link}
                                className="flex-none w-[85vw] max-w-[320px] snap-center group relative block"
                            >
                                <figure className="mb-0 h-[450px] w-full relative overflow-hidden rounded-2xl">
                                    <Image
                                        src={property.image}
                                        alt={property.title}
                                        fill
                                        sizes="(max-width: 768px) 85vw"
                                        style={{ objectFit: 'cover' }}
                                        className="transition-transform duration-700 group-hover:scale-105"
                                    />
                                    <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/60 to-transparent z-10">
                                        <h6 className="text-white font-sans font-bold text-xl mb-1">{property.title}</h6>
                                        {property.subtitleKey && (
                                            <p className="text-white/90 text-sm font-light">{t(property.subtitleKey)}</p>
                                        )}
                                    </div>
                                </figure>
                            </Link>
                        ))}
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
                    {/* Modern Tailwind Grid Structure replacing legacy row/cols */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 buildings-posts">
                        {PROPERTIES.map((property) => (
                            <Link
                                key={property.id}
                                href={property.link}
                                className="buildings-posts__card reveal-pending reveal-visible group block w-full"
                                style={{ transitionDelay: `${property.delay}ms` }}
                            >
                                <figure className="mb-0 buildings-posts__card--img rounded-2xl overflow-hidden relative aspect-[3/4] w-full shadow-md">
                                    <Image
                                        src={property.image}
                                        alt={property.title}
                                        fill
                                        sizes="(max-width: 1200px) 50vw, 20vw"
                                        style={{ objectFit: 'cover' }}
                                        className="transition-transform duration-700 group-hover:scale-110"
                                    />
                                    {/* Gradient Overlay for text readability */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80 transition-opacity duration-300"></div>

                                    <div className="absolute bottom-0 left-0 w-full p-6 z-10 text-left">
                                        <h6 className="text-white font-sans font-bold text-xl mb-1 leading-tight">{property.title}</h6>
                                        {property.subtitleKey ? (
                                            <p className="text-white/90 text-sm font-light tracking-wide">{t(property.subtitleKey)}</p>
                                        ) : (
                                            <p className="min-h-[1.25rem]"></p>
                                        )}
                                    </div>
                                </figure>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </React.Fragment>
    );
};
