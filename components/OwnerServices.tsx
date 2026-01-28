"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from "next-intl";

export const OwnerServices = () => {
    const t = useTranslations('OwnerServices');
    return (
        <section className="py-24 bg-white overflow-hidden">
            <div className="container mx-auto px-4">
                <div className="flex flex-col lg:flex-row items-center gap-16 xl:gap-24">
                    <div className="w-full lg:w-5/12 order-2 lg:order-1">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="space-y-8"
                        >
                            <h3 className="text-3xl md:text-4xl font-playfair font-bold text-[#0A1128] leading-tight">
                                {t('title')}
                            </h3>
                            <p className="text-[#696969] text-lg font-light leading-relaxed">
                                {t('desc')}
                            </p>
                            <div className="h-px w-20 bg-[#c5a059]/30" />
                            <p className="text-[#696969] text-base font-light italic">
                                {t('quote')}
                            </p>
                        </motion.div>
                    </div>

                    <div className="w-full lg:w-7/12 order-1 lg:order-2">
                        <motion.div
                            initial={{ opacity: 0, scale: 1.05 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.2 }}
                            className="relative"
                        >
                            <div className="relative rounded-[40px] overflow-hidden shadow-2xl">
                                <img
                                    src="/legacy/owner/images/owners-svc.jpg"
                                    alt="Owner Services"
                                    className="w-full h-auto object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-[#0A1128]/20 to-transparent" />
                            </div>
                            {/* Decorative element */}
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#c5a059]/5 rounded-full blur-3xl -z-10" />
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
};
