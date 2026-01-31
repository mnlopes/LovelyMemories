"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from "next-intl";

export const AboutTeam = () => {
    const t = useTranslations('AboutTeam');

    const teamMembers = [
        {
            name: "Achilleas Kitsikoudis",
            role: t('roles.cofounder'),
            image: "/legacy/about-us/images/achilleas.png"
        },
        {
            name: "João Santos",
            role: t('roles.interiorDesigner'),
            image: "/legacy/about-us/images/joao.png"
        },
        {
            name: "Maria João Lemos",
            role: t('roles.operations'),
            image: "/legacy/about-us/images/maria.png"
        }
    ];

    return (
        <div className="lm-team-wrap relative w-full bg-[#f8f9fa] py-24 px-4 overflow-hidden">
            <div className="max-w-5xl mx-auto flex flex-col items-center">
                <header className="text-center mb-16">
                    <span className="text-[#b09e80] text-xs font-bold uppercase tracking-[0.4em] block mb-4">{t('header')}</span>
                    <h2 className="text-4xl md:text-5xl font-montserrat font-bold text-[#1a1a1a]">{t('title')}</h2>
                </header>

                <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 justify-items-center items-start">
                    {teamMembers.map((member, index) => (
                        <motion.div
                            key={index}
                            whileHover="hover"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="w-full max-w-[320px] md:max-w-none flex flex-col items-center group mx-auto"
                        >
                            <div className="w-full relative aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl mb-8">
                                <motion.img
                                    variants={{
                                        hover: { scale: 1.1 }
                                    }}
                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                    className="w-full h-full object-cover"
                                    src={member.image}
                                    alt={member.name}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            </div>

                            <div className="text-center w-full">
                                <h4 className="text-xl font-bold text-gray-900 mb-2 min-h-[3.5rem] md:min-h-0 flex items-center justify-center md:items-start md:h-auto">{member.name}</h4>
                                <div className="h-[2px] w-8 bg-[#b09e80] mx-auto mb-3 transition-all duration-500 group-hover:w-16"></div>
                                <p className="text-sm text-gray-500 uppercase tracking-widest">{member.role}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};


