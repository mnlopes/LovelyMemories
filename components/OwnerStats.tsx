"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from "next-intl";

export const OwnerStats = () => {
    const t = useTranslations('OwnerStats');

    const stats = [
        {
            val: "+112k",
            label: t('bookings'),
            icon: "/legacy/owner/images/calendar.svg"
        },
        {
            val: "+299k",
            label: t('guests'),
            icon: "/legacy/owner/images/people.svg"
        },
        {
            val: "+44m€",
            label: t('revenue'),
            icon: "/legacy/owner/images/stats.svg"
        }
    ];
    return (
        <section className="py-20 bg-gray-50/50">
            <div className="container mx-auto px-4">
                <div className="flex flex-wrap justify-center gap-12 lg:gap-24">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                            className="text-center"
                        >
                            <div className="mb-6 flex justify-center">
                                <img
                                    src={stat.icon}
                                    alt={stat.label}
                                    className="w-16 h-16 object-contain"
                                />
                            </div>
                            <h3 className="text-4xl md:text-5xl font-bold text-[#0A1128] mb-2 font-montserrat">
                                {stat.val}
                            </h3>
                            <p className="text-[#c5a059] uppercase tracking-[0.2em] text-[10px] font-bold">
                                {stat.label}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};
