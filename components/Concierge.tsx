"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";

const SERVICES = [
    {
        titleKey: "privateTransfers",
        image: "/legacy/home/images/services-image-1.png",
        descriptionKey: "privateTransfersDesc"
    },
    {
        titleKey: "breakfastAtHome",
        image: "/legacy/home/images/services-image-2.png",
        descriptionKey: "breakfastAtHomeDesc"
    },
    {
        titleKey: "chefAtHome",
        image: "/legacy/home/images/services-image-3.png",
        descriptionKey: "chefAtHomeDesc"
    },
    {
        titleKey: "anotherService",
        image: "/legacy/home/images/services-image-2-1.png",
        descriptionKey: "anotherServiceDesc"
    },
    {
        titleKey: "experiences",
        image: "/legacy/home/images/services-image-1.png",
        descriptionKey: "experiencesDesc"
    }
];

export const Concierge = () => {
    const t = useTranslations('Concierge');
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isMouseDown, setIsMouseDown] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

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

    const features = [
        { icon: "/legacy/home/images/alt-check.svg", textKey: "exclusiveSelection" },
        { icon: "/legacy/home/images/padlock-icon.svg", textKey: "safetyGuaranteed" },
        { icon: "/legacy/home/images/chat-icon.svg", textKey: "support24h" }
    ];

    return (
        <section className="section-block section-services py-20 lg:py-40 bg-[#FCFCFC] relative">
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
                        className="w-full flex flex-col md:flex-row justify-between items-start md:items-end gap-8"
                    >
                        <div className="flex-1 max-w-none pr-8">
                            <h6 className="uppercase tracking-[0.2em] text-[#B09E80] text-sm font-bold mb-3">
                                {t('subtitle')}
                            </h6>
                            <h2 className="text-[32px] lg:text-[42px] font-semibold font-sans text-[#0A1128] leading-[1.15]">
                                {t('mainTitle')}
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
                            onClick={() => handleButtonClick('left')}
                            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-[#B09E80] text-white flex items-center justify-center shadow-lg hover:bg-[#9E8C6D] transition-all duration-300 scale-100 -ml-2 lg:-ml-6"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>

                        {/* RIGHT ARROW */}
                        <button
                            onClick={() => handleButtonClick('right')}
                            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-[#B09E80] text-white flex items-center justify-center shadow-lg hover:bg-[#9E8C6D] transition-all duration-300 scale-100 -mr-2 lg:-mr-6"
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
                            className="flex gap-8 overflow-x-auto hide-scrollbar select-none cursor-grab active:cursor-grabbing py-12 px-4"
                            style={{ scrollBehavior: 'smooth' }}
                        >
                            {SERVICES.map((service, i) => (
                                <motion.div
                                    key={i}
                                    className="flex-none relative w-[300px] h-[450px] rounded-[24px] overflow-hidden shadow-xl"
                                    whileHover={{ y: -5 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                >
                                    <Image
                                        src={service.image}
                                        alt={t(service.titleKey)}
                                        fill
                                        sizes="300px"
                                        className="object-cover transition-transform duration-700 ease-out hover:scale-110"
                                        draggable={false}
                                    />

                                    {/* Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80"></div>

                                    {/* Content */}
                                    <div className="absolute bottom-0 left-0 w-full p-6 pb-8 flex justify-center items-end h-full">
                                        <h4 className="text-white text-[26px] font-bold font-sans leading-tight text-center drop-shadow-md">
                                            {t(service.titleKey)}
                                        </h4>
                                    </div>
                                </motion.div>
                            ))}
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
