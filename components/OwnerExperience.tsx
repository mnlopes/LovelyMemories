"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from "next-intl";

export const OwnerExperience = () => {
    const t = useTranslations('OwnerExperience');

    return (
        <section className="py-24 bg-[#FCFCFC]">
            <div className="container mx-auto px-4">
                <div className="flex flex-col lg:flex-row items-center gap-16 xl:gap-24">

                    {/* Image Area */}
                    <div className="w-full lg:w-1/2">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1 }}
                            className="relative rounded-[40px] overflow-hidden shadow-2xl"
                        >
                            <img
                                src="/legacy/owner/images/owners-exp.jpg"
                                alt="Experience you can trust"
                                className="w-full h-auto object-cover min-h-[400px]"
                            />
                        </motion.div>
                    </div>

                    {/* Content Area */}
                    <div className="w-full lg:w-1/2 space-y-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                        >
                            <h3 className="text-4xl md:text-5xl font-playfair font-bold text-[#0A1128] leading-tight mb-6">
                                {t('title')}
                            </h3>
                            <p className="text-[#696969] text-lg font-light leading-relaxed mb-10">
                                {t('desc')}
                            </p>
                        </motion.div>

                        {/* Trust Card - Matching User Screenshot */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="bg-white p-8 md:p-12 rounded-[30px] shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-gray-50 max-w-lg"
                        >
                            <h4
                                className="mb-4"
                                style={{ fontWeight: 900, fontSize: '26px', color: '#0A1128' }}
                            >
                                {t('trust.title')}
                            </h4>
                            <div className="space-y-2 mb-10 text-[#696969] text-lg">
                                <p>{t('trust.revenue')} <span className="font-bold text-[#0A1128]">+44m</span></p>
                                <p>{t('trust.market')} <span className="font-bold text-[#0A1128]">2016</span></p>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full h-14 rounded-full text-white font-bold uppercase tracking-widest text-sm shadow-lg transition-all cursor-pointer"
                                style={{
                                    backgroundColor: '#b29a7a',
                                    boxShadow: '0 10px 15px -3px rgba(178, 154, 122, 0.2)',
                                    borderRadius: '9999px'
                                }}
                            >
                                {t('trust.cta')}
                            </motion.button>
                        </motion.div>
                    </div>

                </div>
            </div>
        </section>
    );
};
