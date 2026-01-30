"use client";

import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

import { useTranslations } from 'next-intl';

export const ConciergeIntro = () => {
    const t = useTranslations('Concierge');
    const containerRef = useRef(null);

    return (
        <section ref={containerRef} className="py-12 md:py-20 bg-white relative">
            <div className="container mx-auto px-4 lg:px-8">
                <div className="flex flex-col lg:flex-row lg:items-center gap-16 xl:gap-24">

                    {/* Left Column: Text Content */}
                    <div className="w-full lg:w-1/2 space-y-10 z-10 text-left">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                        >
                            <span className="text-gold-400 uppercase tracking-[0.3em] text-xs font-bold mb-6 block">
                                {t('introOverTitle')}
                            </span>
                            <h2 className="text-4xl md:text-5xl xl:text-6xl font-playfair font-bold text-navy-950 leading-[1.1] tracking-tight">
                                {t('introTitle')}
                            </h2>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="space-y-8"
                        >
                            <p className="text-[#696969] text-lg font-light leading-relaxed max-w-xl">
                                {t('introDescription')}
                            </p>

                            {/* Service Highlights */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 pt-4">
                                <div className="space-y-3 border-l-[3px] border-gold-400 pl-6">
                                    <h4 className="font-bold text-navy-950 text-xl">{t('supportTitle')}</h4>
                                    <p className="text-sm text-[#696969] leading-relaxed">{t('supportDesc')}</p>
                                </div>
                                <div className="space-y-3 border-l-[3px] border-gold-400 pl-6">
                                    <h4 className="font-bold text-navy-950 text-xl">{t('expertiseTitle')}</h4>
                                    <p className="text-sm text-[#696969] leading-relaxed">{t('expertiseDesc')}</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Column: Visual Elements */}
                    <div className="w-full lg:w-1/2 relative mt-16 lg:mt-0">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="relative z-10 rounded-[30px] md:rounded-[40px] overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] isolate"
                        >
                            <img
                                className="w-full h-auto object-cover min-h-[350px] md:min-h-[500px]"
                                src="/legacy/concierge/images/concierge-image.png"
                                alt="Concierge Experience"
                            />
                            {/* Overlay Gradient for depth */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                        </motion.div>

                        {/* Decorative background elements */}
                        <div className="absolute -bottom-12 -left-12 w-48 h-48 md:w-80 md:h-80 bg-gold-400/5 rounded-full blur-[80px] -z-10" />
                        <div className="absolute -top-12 -right-12 w-48 h-48 md:w-64 md:h-64 bg-navy-950/5 rounded-full blur-[60px] -z-10" />

                    </div>

                </div>
            </div>

            {/* Elegant Background Accent */}
            <div className="absolute top-0 right-0 w-[40%] h-full bg-[#fcfcfc] -z-20 transform translate-x-[15%]" />
        </section>
    );
};
