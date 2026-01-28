"use client";

import React, { useRef } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { useTranslations } from "next-intl";

const StoryItem = ({ story, index }: { story: any, index: number }) => {
    const isEven = index % 2 === 0;

    return (
        <div className="relative mb-32 last:mb-0">
            {/* Timeline Dot */}
            <div className="absolute left-1/2 -translate-x-1/2 top-0 z-10 hidden md:block">
                <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="w-5 h-5 rounded-full bg-white border-4 border-[#b09e80] shadow-[0_0_15px_rgba(176,158,128,0.5)]"
                />
            </div>

            <div className={`flex flex-col md:flex-row items-center gap-12 ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                {/* Content Side */}
                <motion.div
                    initial={{ opacity: 0, x: isEven ? -60 : 60 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    viewport={{ once: true, amount: 0.2 }}
                    className="w-full md:w-1/2 flex flex-col justify-center"
                >
                    <div className={`p-8 max-w-lg ${isEven ? 'md:ml-auto md:text-right' : 'md:mr-auto md:text-left'}`}>
                        <motion.span
                            whileHover={{ scale: 1.05 }}
                            style={{ backgroundColor: '#b09e80' }}
                            className="inline-block px-6 py-2 rounded-full text-white font-bold text-sm uppercase tracking-widest mb-6 shadow-xl"
                        >
                            {story.year}
                        </motion.span>
                        <h3 className="text-3xl md:text-4xl font-light mb-6 text-gray-900 tracking-tight">
                            {story.title}
                        </h3>
                        <p className="text-gray-500 leading-relaxed text-lg font-light">
                            {story.text}
                        </p>
                    </div>
                </motion.div>

                {/* Image Side */}
                <motion.div
                    initial={{ opacity: 0, x: isEven ? 60 : -60 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                    viewport={{ once: true, amount: 0.2 }}
                    className="w-full md:w-5/12"
                >
                    <div className="relative group overflow-hidden rounded-lg shadow-2xl w-full" style={{ aspectRatio: '16/10' }}>
                        <motion.img
                            whileHover={{ scale: 1.05 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            src={story.image}
                            alt={story.title}
                            className="absolute inset-0 w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-500"
                        />
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-all duration-300" />
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export const AboutStory = () => {
    const t = useTranslations('AboutStory');
    const containerRef = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start center", "end center"]
    });

    const scaleY = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    const stories = [
        {
            year: "2020",
            title: t('stories.2020.title'),
            text: t('stories.2020.text'),
            image: "/legacy/about-us/images/about-feature.png"
        },
        {
            year: "2021",
            title: t('stories.2021.title'),
            text: t('stories.2021.text'),
            image: "/legacy/about-us/images/services-image-2-1.png"
        },
        {
            year: "2022",
            title: t('stories.2022.title'),
            text: t('stories.2022.text'),
            image: "/legacy/about-us/images/blog-img-3.png"
        },
        {
            year: "2023",
            title: t('stories.2023.title'),
            text: t('stories.2023.text'),
            image: "/legacy/about-us/images/owner-section-image-2.png"
        },
        {
            year: "2024",
            title: t('stories.2024.title'),
            text: t('stories.2024.text'),
            image: "/legacy/about-us/images/the-flower-power.png"
        },
        {
            year: "2025",
            title: t('stories.2025.title'),
            text: t('stories.2025.text'),
            image: "/legacy/about-us/images/services-image-2-1.png"
        },
        {
            year: "2026",
            title: t('stories.2026.title'),
            text: t('stories.2026.text'),
            image: "/legacy/about-us/images/the-flower-power.png"
        }
    ];

    return (
        <section ref={containerRef} className="bg-white py-32 overflow-hidden">
            <div className="container mx-auto px-4">
                <div className="text-center mb-32 relative z-10">
                    <h5
                        className="text-sm uppercase tracking-[0.3em] font-bold text-[#b09e80] mb-4"
                    >
                        {t('header')}
                    </h5>
                    <h2
                        className="text-4xl md:text-5xl font-light text-gray-900 mb-8"
                    >
                        {t('title')}
                    </h2>
                    <div
                        className="h-[1px] bg-[#b09e80] mx-auto opacity-50 w-20"
                    />
                </div>

                <div className="relative">
                    {/* Vertical Timeline Path */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[2px] bg-gray-200 hidden md:block" />

                    {/* Active Progress Path */}
                    <motion.div
                        style={{ scaleY }}
                        className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[2px] bg-[#b09e80] origin-top hidden md:block"
                    />

                    <div className="relative z-20">
                        {stories.map((story, index) => (
                            <StoryItem key={index} story={story} index={index} />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};


