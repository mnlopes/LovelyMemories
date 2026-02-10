"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useTranslations } from "next-intl";

export const OwnerExperience = () => {
    const t = useTranslations('OwnerExperience');
    const mouseX = useMotionValue(50);
    const smoothMouseX = useSpring(mouseX, { damping: 30, stiffness: 150 });
    const [containerWidth, setContainerWidth] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.offsetWidth);
            }
        };

        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    const handleDownload = () => {
        window.open('/docs/Decoration Services Enso.pdf', '_blank');
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const position = ((x - rect.left) / rect.width) * 100;

        mouseX.set(Math.max(0, Math.min(100, position)));
    };

    const handleMouseLeave = () => {
        // Optional: Reset to center or keep at last position
        // mouseX.set(50); 
    };

    return (
        <section className="py-24 bg-[#0A1128]">
            <div className="container mx-auto px-4">
                <div className="flex flex-col lg:flex-row items-center gap-16 xl:gap-32">

                    {/* Left side: Interactive Image Slider - Increased size */}
                    <div className="w-full lg:w-[58%] flex flex-col items-center space-y-12">
                        {/* Partner Logo - Adjusted size to match larger layout */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="w-64 md:w-[400px] mx-auto"
                        >
                            <img
                                src="/images/design/enso-logo.png"
                                alt="Ensō Interiors Logo"
                                className="w-full h-auto"
                            />
                        </motion.div>

                        <div className="relative w-full">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 1 }}
                                ref={containerRef}
                                onMouseMove={handleMove}
                                onTouchMove={handleMove}
                                onMouseLeave={handleMouseLeave}
                                className="relative aspect-video rounded-[32px] overflow-hidden shadow-2xl cursor-none select-none group/slider"
                            >
                                {/* Before Image (Base) */}
                                <div className="absolute inset-0">
                                    <img
                                        src="/images/design/Design_Antes.png"
                                        alt="Before Design"
                                        className="w-full h-full object-cover scale-105"
                                    />
                                    <div className="absolute top-6 left-6 bg-black/50 backdrop-blur-md text-white px-5 py-1.5 rounded-full text-xs font-black uppercase tracking-[0.2em]">
                                        {t('before')}
                                    </div>
                                </div>

                                {/* After Image (Overlay with clipping) */}
                                <motion.div
                                    className="absolute inset-0 overflow-hidden"
                                    style={{ width: useTransform(smoothMouseX, (v) => `${v}%`) }}
                                >
                                    <img
                                        src="/images/design/Design_Depois.png"
                                        alt="After Design"
                                        className="absolute inset-0 object-cover max-w-none scale-105"
                                        style={{ width: containerWidth, height: '100%' }}
                                    />
                                    <div className="absolute top-6 left-6 bg-[#b29a7a] text-white px-5 py-1.5 rounded-full text-xs font-black uppercase tracking-[0.2em] whitespace-nowrap shadow-xl">
                                        {t('after')}
                                    </div>
                                </motion.div>

                                {/* Simple Divider Line (follows mouse smoothly) */}
                                <motion.div
                                    className="absolute top-0 bottom-0 w-0.5 bg-white/50 backdrop-blur-sm z-10"
                                    style={{ left: useTransform(smoothMouseX, (v) => `${v}%`) }}
                                />

                                {/* Subtle glow effect at the divider */}
                                <motion.div
                                    className="absolute top-0 bottom-0 w-20 bg-gradient-to-r from-transparent via-white/10 to-transparent z-0 pointer-events-none"
                                    style={{
                                        left: useTransform(smoothMouseX, (v) => `calc(${v}% - 40px)`),
                                        opacity: useTransform(smoothMouseX, [0, 50, 100], [0, 1, 0])
                                    }}
                                />
                            </motion.div>

                            <div className="mt-4 text-center">
                                <p className="text-white/40 text-sm font-medium uppercase tracking-widest flex items-center justify-center gap-3">
                                    <span className="w-8 h-px bg-white/10"></span>
                                    {t('moveToCompare')}
                                    <span className="w-8 h-px bg-white/10"></span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right side: Content - Slightly narrower to accommodate larger images */}
                    <div className="w-full lg:w-[42%] space-y-12">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="space-y-10"
                        >
                            <div className="space-y-8">
                                <h3 className="text-4xl md:text-5xl font-playfair font-bold text-white leading-tight">
                                    {t('title')}
                                </h3>

                                <div className="space-y-6 text-gray-300">
                                    <p className="text-lg font-light leading-relaxed">
                                        {t('desc')}
                                    </p>
                                    <p className="text-lg font-light leading-relaxed">
                                        {t('desc2')}
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Download Card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 0.4 }}
                            className="bg-white/5 backdrop-blur-md p-8 md:p-10 rounded-[30px] border border-white/10 max-w-lg"
                        >
                            <h4 className="text-white text-2xl font-bold mb-6">
                                {t('trust.title')}
                            </h4>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleDownload}
                                className="group relative w-full h-16 rounded-full bg-[#b29a7a] text-white font-bold uppercase tracking-widest text-sm shadow-xl transition-all cursor-pointer overflow-hidden"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-3">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    {t('trust.cta')}
                                </span>
                                <div className="absolute inset-0 bg-white/10 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
                            </motion.button>
                        </motion.div>
                    </div>

                </div>
            </div >
        </section >
    );
};
