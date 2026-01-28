"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from "next-intl";

export const OwnerFeatures = () => {
    const t = useTranslations('OwnerFeatures');

    const features = [
        {
            title: t('transparency.title'),
            desc: t('transparency.desc'),
            icon: "/legacy/owner/images/check.svg"
        },
        {
            title: t('checkin.title'),
            desc: t('checkin.desc'),
            icon: "/legacy/owner/images/calendar-lg.svg"
        },
        {
            title: t('cleaning.title'),
            desc: t('cleaning.desc'),
            icon: "/legacy/owner/images/stars.svg"
        },
        {
            title: t('account.title'),
            desc: t('account.desc'),
            icon: "/legacy/owner/images/user.svg"
        },
        {
            title: t('design.title'),
            desc: t('design.desc'),
            icon: "/legacy/owner/images/house.svg"
        },
        {
            title: t('legal.title'),
            desc: t('legal.desc'),
            icon: "/legacy/owner/images/gavel.svg"
        }
    ];

    return (
        <section className="py-24 bg-white">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-20">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                            className="text-center group"
                        >
                            <div className="mb-8 flex justify-center">
                                <div className="w-20 h-20 flex items-center justify-center rounded-2xl bg-gray-50 group-hover:bg-[#c5a059]/10 transition-colors duration-500">
                                    <img
                                        src={feature.icon}
                                        alt={feature.title}
                                        className="w-12 h-12 object-contain"
                                    />
                                </div>
                            </div>
                            <h4 className="text-xl font-bold text-[#0A1128] mb-4 group-hover:text-[#c5a059] transition-colors">
                                {feature.title}
                            </h4>
                            <p className="text-[#696969] leading-relaxed font-light">
                                {feature.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};
