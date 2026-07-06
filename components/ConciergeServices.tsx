"use client";

import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { getConciergeServices } from "@/lib/services";
import { CmsPageSection } from "@/lib/types";

interface ConciergeService {
    id: string;
    name_en: string;
    name_pt: string;
    name_he?: string;
    description_en?: string;
    description_pt?: string;
    description_he?: string;
    image?: string;
    link_url?: string | null;
}

export const ConciergeServices = ({ initialSections }: { initialSections?: CmsPageSection[] }) => {
    const t = useTranslations('Concierge');
    const header = initialSections?.find((s) => s.section_type === 'services-header');
    const headerOverline = header?.subtitle || t('subtitle');
    const headerTitle = header?.title || t('mainTitle');
    const locale = useLocale();
    const [services, setServices] = useState<ConciergeService[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const scrollRef = useRef<HTMLDivElement>(null);
    const [isMouseDown, setIsMouseDown] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const dragStartXRef = useRef<number | null>(null);

    React.useEffect(() => {
        const fetchServices = async () => {
            setIsLoading(true);
            const data = await getConciergeServices();
            setServices(data);
            setIsLoading(false);
        };
        fetchServices();
    }, []);

    const handleButtonClick = (direction: 'left' | 'right') => {
        if (!scrollRef.current) return;
        const amount = 340; // Adjusted for wider cards
        const target = direction === 'left'
            ? scrollRef.current.scrollLeft - amount
            : scrollRef.current.scrollLeft + amount;

        scrollRef.current.scrollTo({
            left: target,
            behavior: 'smooth'
        });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollRef.current) return;
        setIsMouseDown(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
        dragStartXRef.current = e.pageX;
    };

    const handleMouseUp = () => {
        setIsMouseDown(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isMouseDown || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    const handleCardClick = (e: React.MouseEvent) => {
        // Suppress the click when the pointer was dragged (slider drag-to-scroll),
        // otherwise releasing a drag over a linked card would open the partner site.
        if (dragStartXRef.current !== null && Math.abs(e.pageX - dragStartXRef.current) > 5) {
            e.preventDefault();
        }
    };

    const features = [
        { icon: "/legacy/home/images/alt-check.svg", textKey: "exclusiveSelection" },
        { icon: "/legacy/home/images/padlock-icon.svg", textKey: "safetyGuaranteed" },
        { icon: "/legacy/home/images/chat-icon.svg", textKey: "support24h" }
    ];

    if (!isLoading && services.length === 0) {
        return null;
    }

    return (
        <section className="py-20 lg:py-40 bg-[#FCFCFC] relative">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-[#B09E80]/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

            <div className="container mx-auto px-4">
                <div className="flex flex-col gap-12">

                    {/* HEADER SECTION: Title + Features */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="w-full flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8"
                    >
                        <div className="flex-1 max-w-none lg:pr-8">
                            <p className="uppercase tracking-[0.2em] text-[#9E8C6D] text-sm font-bold mb-3">
                                {headerOverline}
                            </p>
                            <h2 className="text-[32px] lg:text-[42px] font-semibold font-sans text-[#0A1128] leading-[1.15]">
                                {headerTitle}
                            </h2>
                        </div>

                        {/* Features List - Horizontal on Desktop */}
                        <ul className="flex flex-col sm:flex-row gap-6 sm:gap-8">
                            {features.map((item, idx) => (
                                <motion.li
                                    key={idx}
                                    className="flex items-center gap-3 group cursor-default"
                                    initial={{ opacity: 0, x: 20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                                    viewport={{ once: true }}
                                >
                                    <div className="w-8 h-8 flex items-center justify-center">
                                        <img
                                            src={item.icon}
                                            alt=""
                                            className="w-full h-full object-contain transition-all duration-300"
                                            style={{
                                                /* Default Gold Filter */
                                                filter: 'brightness(0) saturate(100%) invert(67%) sepia(16%) saturate(601%) hue-rotate(3deg) brightness(87%) contrast(85%)',
                                            }}
                                        />
                                    </div>
                                    <span className="text-sm font-bold text-[#192537] font-sans group-hover:text-[#B09E80] transition-colors duration-300">
                                        {t(item.textKey)}
                                    </span>
                                </motion.li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* SLIDER SECTION */}
                    <div className="relative w-full group px-4 lg:px-12">

                        {/* LEFT ARROW */}
                        <button
                            type="button"
                            aria-label={t('prevSlide')}
                            onClick={() => handleButtonClick('left')}
                            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 !rounded-full bg-[#B09E80] text-white flex items-center justify-center shadow-lg hover:bg-[#9E8C6D] transition-all duration-300 scale-100 -ml-2 lg:-ml-6 cursor-pointer overflow-hidden"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>

                        {/* RIGHT ARROW */}
                        <button
                            type="button"
                            aria-label={t('nextSlide')}
                            onClick={() => handleButtonClick('right')}
                            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 !rounded-full bg-[#B09E80] text-white flex items-center justify-center shadow-lg hover:bg-[#9E8C6D] transition-all duration-300 scale-100 -mr-2 lg:-mr-6 cursor-pointer overflow-hidden"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>


                        {/* SLIDER CONTAINER */}
                        <div
                            ref={scrollRef}
                            onMouseDown={handleMouseDown}
                            onMouseLeave={handleMouseUp}
                            onMouseUp={handleMouseUp}
                            onMouseMove={handleMouseMove}
                            className="flex gap-8 overflow-x-auto hide-scrollbar select-none cursor-grab active:cursor-grabbing py-12 px-4 min-h-[400px]"
                            style={{ scrollBehavior: 'smooth' }}
                        >
                            {isLoading ? (
                                <div className="w-full flex items-center justify-center py-20">
                                    <div className="w-10 h-10 border-4 border-[#b09e80] border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : (
                                services.map((service, i) => {
                                    const name = locale === 'pt' ? service.name_pt : locale === 'he' ? (service.name_he || service.name_en) : service.name_en;
                                    const description = locale === 'pt' ? service.description_pt : locale === 'he' ? (service.description_he || service.description_en) : service.description_en;
                                    const card = (
                                        <motion.div
                                            className="group/card relative w-[300px] h-[450px] rounded-[24px] overflow-hidden shadow-xl"
                                            whileHover={{ y: -5 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                        >
                                            <Image
                                                src={service.image || "/legacy/home/images/services-image-1.png"}
                                                alt={name}
                                                fill
                                                sizes="300px"
                                                className="object-cover transition-transform duration-700 ease-out group-hover/card:scale-110"
                                                draggable={false}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80"></div>
                                            {service.link_url && (
                                                <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center opacity-80 lg:opacity-0 lg:group-hover/card:opacity-100 transition-opacity duration-300">
                                                    <ArrowUpRight className="w-4 h-4 text-white" />
                                                </div>
                                            )}
                                            <div className="absolute bottom-0 left-0 w-full p-6 pb-8 flex flex-col justify-end items-center gap-3 h-full text-center">
                                                <h3 className="text-white text-[26px] font-bold font-sans leading-tight drop-shadow-md">
                                                    {name}
                                                </h3>
                                                {description && (
                                                    <p className="text-white/80 text-sm leading-relaxed line-clamp-3 lg:opacity-0 lg:translate-y-2 lg:group-hover/card:opacity-100 lg:group-hover/card:translate-y-0 transition-all duration-300">
                                                        {description}
                                                    </p>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                    return service.link_url ? (
                                        <a
                                            key={service.id || i}
                                            href={service.link_url}
                                            target="_blank"
                                            rel="noopener noreferrer nofollow"
                                            onClick={handleCardClick}
                                            draggable={false}
                                            className="flex-none"
                                        >
                                            {card}
                                        </a>
                                    ) : (
                                        <div key={service.id || i} className="flex-none">
                                            {card}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                </div>
            </div>
            <style jsx>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </section>
    );
};
