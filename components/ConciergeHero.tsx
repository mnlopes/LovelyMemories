"use client";

import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

import { useTranslations } from 'next-intl';

export const ConciergeHero = () => {
    const t = useTranslations('Concierge');
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end start"],
    });

    // Parallax & Fade Effects
    const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
    const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
    const textY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

    return (
        <section ref={ref} className="relative h-screen min-h-[700px] overflow-hidden bg-navy-950 flex items-center justify-center">

            {/* 1. Background with Ken Burns Effect & Parallax */}
            <motion.div
                style={{ y }}
                className="absolute inset-0 w-full h-full z-0"
            >
                <motion.div
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 10, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
                    className="w-full h-full"
                >
                    <img
                        className="w-full h-full object-cover"
                        src="/images/concierge-hero-no-person.png"
                        alt="Concierge Feature"
                    />
                </motion.div>

                {/* Vignette & Gradients for "Cinematic" Look */}
                <div className="absolute inset-0 bg-radial-gradient from-transparent via-navy-950/40 to-navy-950/90" />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-transparent to-navy-950/30" />
            </motion.div>

            {/* 2. Content Overlay */}
            <div className="relative container mx-auto px-4 text-center z-10">
                <motion.div
                    style={{ y: textY }}
                    className="flex flex-col items-center"
                >
                    {/* Floating Overline (Moved Above) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="mb-8"
                    >
                        <span className="inline-block text-navy-950 uppercase tracking-[0.5em] text-xs md:text-sm font-bold font-montserrat backdrop-blur-sm py-3 px-8 rounded-full border border-white/20 bg-white/10 shadow-lg">
                            {t('heroOverTitle')}
                        </span>
                    </motion.div>

                    {/* Main Title with Staggered Reveal */}
                    <motion.h1
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="text-7xl md:text-8xl lg:text-[130px] font-playfair font-bold text-white tracking-tighter mb-8 leading-none drop-shadow-2xl"
                    >
                        <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/70">
                            {t('heroTitle')}
                        </span>
                    </motion.h1>

                    {/* Animated Divider Lines REMOVED */}

                    {/* Subtitle / Description - Optional if needed, kept minimal for impact */}
                </motion.div>
            </div>

            {/* 3. Scroll Indicator (Animated Mouse) */}
            <motion.div
                style={{ opacity }}
                className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-20 pointer-events-none"
            >
                <span className="text-white/50 text-[10px] uppercase tracking-[0.3em] font-montserrat">{t('scrollExplore')}</span>
                <div className="w-[1px] h-16 bg-gradient-to-b from-[#AD9C7E] to-transparent relative overflow-hidden">
                    <motion.div
                        animate={{ y: ["-100%", "100%"] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="absolute top-0 left-0 w-full h-1/2 bg-white blur-[1px]"
                    />
                </div>
            </motion.div>

            <style jsx>{`
                .bg-radial-gradient {
                    background-image: radial-gradient(circle at center, transparent 0%, rgba(10, 17, 40, 0.4) 50%, rgba(10, 17, 40, 0.95) 100%);
                }
            `}</style>
        </section>
    );
};
