"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from "next-intl";

export const OwnerPricing = () => {
    const t = useTranslations('OwnerPricing');
    const [selectedPack, setSelectedPack] = useState<'base' | 'luxe' | null>(null);

    const totalFee = selectedPack === 'base' ? 20 : selectedPack === 'luxe' ? 25 : 0;

    const baseServices = [
        t('services.marketStudy'),
        t('services.dashboard'),
        t('services.listing'),
        t('services.bookingMgmt'),
        t('services.communication'),
        t('services.optimization'),
        t('services.consultancy'),
        t('services.accountManager'),
        t('services.cleaning'),
        t('services.photoshoot'),
        t('services.screening'),
        t('services.damage'),
        t('services.noContract'),
        t('services.noLimit')
    ];

    const luxeServices = [
        t('services.checkIn'),
        t('services.maintenance'),
        t('services.qualityControl'),
        t('services.amenities'),
        t('services.sef'),
        t('services.guestSupport'),
        t('services.linen'),
        t('services.admin'),
        t('services.taxes'),
        t('services.invoice'),
        t('services.suppliers')
    ];

    return (
        <section className="py-20 bg-white overflow-visible text-[14px] relative z-0">
            <div className="container mx-auto px-4 max-w-5xl relative">
                <div className="text-center mb-10 space-y-4">
                    <h2 className="text-3xl md:text-4xl font-playfair font-bold text-[#0A1128]">
                        {t('title')}
                    </h2>
                    <p className="text-[#696969] font-light max-w-2xl mx-auto leading-relaxed text-base">
                        {t('subtitle')}
                    </p>
                </div>

                <div className="relative flex flex-col md:flex-row items-stretch justify-center gap-6 md:gap-8 mb-12 py-10">

                    {/* Plus Sign Separator (Desktop) */}
                    <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 items-center justify-center pointer-events-none">
                        <motion.div
                            animate={{
                                scale: selectedPack === 'luxe' ? 1.1 : 1,
                                backgroundColor: selectedPack === 'luxe' ? '#b29a7a' : '#ffffff'
                            }}
                            className={`w-14 h-14 rounded-full shadow-lg border flex items-center justify-center transition-colors duration-300 ${selectedPack === 'luxe' ? 'border-[#b29a7a]' : 'border-gray-100'}`}
                        >
                            <span className={`text-2xl font-bold transition-colors duration-300 ${selectedPack === 'luxe' ? 'text-white' : 'text-gray-300'}`}>+</span>
                        </motion.div>
                    </div>

                    {/* Base Fee Pack */}
                    <motion.div
                        whileHover={{ y: -6 }}
                        onClick={() => setSelectedPack('base')}
                        className={`relative flex-1 md:max-w-[360px] w-full flex flex-col rounded-[28px] transition-all duration-300 cursor-pointer border-2 ${selectedPack ? 'border-[#192537] shadow-[0_25px_50px_-12px_rgba(25,37,55,0.2)] z-[5]' : 'border-gray-100 shadow-lg opacity-80 hover:opacity-100'}`}
                    >
                        <div className="bg-[#0A1128] p-6 text-center relative rounded-t-[26px]">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full w-24 h-24 flex items-center justify-center shadow-md border border-gray-50">
                                <span className="text-2xl font-black text-[#0A1128]">+20%</span>
                            </div>
                            <h4 className="text-2xl font-bold text-white mt-4">{t('base.title')}</h4>
                        </div>
                        <div className="p-6 flex-grow bg-white">
                            <ul className="space-y-2">
                                {baseServices.map((svc, i) => (
                                    <li key={i} className="flex items-start gap-3.5 border-b border-gray-50 pb-2 last:border-0 text-left">
                                        <svg className="w-4 h-4 text-[#0A1128] mt-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span className="text-[#0A1128] font-semibold text-[14px] leading-snug">{svc}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="p-4 bg-gray-50/50 text-center rounded-b-[26px]">
                            <div className={`text-[11px] font-bold uppercase tracking-[0.25em] ${selectedPack ? 'text-[#b29a7a]' : 'text-gray-400'}`}>
                                {selectedPack === 'luxe' ? t('base.selected') + ' + ' + t('luxe.selected') : selectedPack === 'base' ? t('base.selected') : t('base.clickToSelect')}
                            </div>
                        </div>
                    </motion.div>

                    {/* Plus Sign (Mobile) */}
                    <div className="md:hidden flex justify-center z-10 -my-3">
                        <motion.div
                            animate={{
                                scale: selectedPack === 'luxe' ? 1.1 : 1,
                                backgroundColor: selectedPack === 'luxe' ? '#b29a7a' : '#ffffff'
                            }}
                            className={`w-11 h-11 rounded-full shadow-md border flex items-center justify-center transition-colors duration-300 ${selectedPack === 'luxe' ? 'border-[#b29a7a]' : 'border-gray-100'}`}
                        >
                            <span className={`text-xl font-bold transition-colors duration-300 ${selectedPack === 'luxe' ? 'text-white' : 'text-gray-300'}`}>+</span>
                        </motion.div>
                    </div>

                    {/* Luxe Pack */}
                    <motion.div
                        whileHover={{ y: -6 }}
                        onClick={() => setSelectedPack('luxe')}
                        className={`relative flex-1 md:max-w-[360px] w-full flex flex-col rounded-[28px] transition-all duration-300 cursor-pointer border-2 ${selectedPack === 'luxe' ? 'border-[#b29a7a] shadow-[0_25px_50px_-12px_rgba(178,154,122,0.25)] z-[5]' : 'border-gray-100 shadow-lg opacity-80 hover:opacity-100'}`}
                    >
                        <div className="bg-[#b29a7a] p-6 text-center relative text-white rounded-t-[26px]">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full w-24 h-24 flex items-center justify-center shadow-md border border-gray-50">
                                <span className="text-2xl font-black text-[#b29a7a]">+5%</span>
                            </div>
                            <h4 className="text-2xl font-bold mt-4">{t('luxe.title')}</h4>
                        </div>
                        <div className="p-6 flex-grow bg-white">
                            <ul className="space-y-2">
                                {luxeServices.map((svc, i) => (
                                    <li key={i} className="flex items-start gap-3.5 border-b border-gray-50 pb-2 last:border-0 text-left">
                                        <svg className="w-4 h-4 text-[#b29a7a] mt-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span className="text-[#b29a7a] font-semibold text-[14px] leading-snug">{svc}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="p-4 bg-gray-50/50 text-center rounded-b-[26px]">
                            <div className={`text-[11px] font-bold uppercase tracking-[0.25em] ${selectedPack === 'luxe' ? 'text-[#b29a7a]' : 'text-gray-400'}`}>
                                {selectedPack === 'luxe' ? t('luxe.selected') : t('luxe.add')}
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* total selection bar */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="bg-[#0A1128] rounded-[28px] p-8 md:p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl overflow-hidden relative max-w-5xl mx-auto"
                >
                    <div className="absolute top-0 left-0 w-2 h-full bg-[#b29a7a]" />

                    <div className="text-center md:text-left z-10 shrink-0">
                        <h6 className="text-[#b29a7a] uppercase tracking-[0.3em] font-bold text-[10px] mb-3">{t('total.fee')}</h6>
                        <div className="text-5xl md:text-6xl font-bold text-white flex items-baseline gap-1">
                            {totalFee}<span className="text-2xl opacity-50">%</span>
                        </div>
                        <p className="text-gray-500 text-[11px] mt-3 font-medium">{t('total.excludingVat')}</p>
                    </div>

                    <div className="flex-grow max-w-md text-center md:text-left text-gray-400 font-light text-[15px] leading-relaxed z-10 px-6">
                        {selectedPack === 'luxe' ? (
                            <p>{t('total.package')} <span className="text-white font-bold">{t('total.basePlusLuxe')}</span> {t('total.at')} <span className="text-[#b29a7a] font-bold">25%</span> {t('total.feeLabel')}</p>
                        ) : selectedPack === 'base' ? (
                            <p>{t('total.package')} <span className="text-white font-bold">{t('base.title')}</span> {t('total.at')} <span className="text-[#b29a7a] font-bold">20%</span> {t('total.feeLabel')}</p>
                        ) : (
                            <p>{t('total.selectPrompt')}</p>
                        )}
                    </div>

                    <button
                        className={`min-w-[180px] py-5 px-10 !rounded-[28px] font-bold uppercase tracking-[0.2em] text-[12px] transition-all duration-500 z-10 ${selectedPack ? 'bg-[#b29a7a] text-white shadow-xl hover:scale-105 active:scale-95' : 'bg-gray-800/50 text-gray-600 border border-gray-700/50 cursor-not-allowed'}`}
                    >
                        {t('total.cta')}
                    </button>

                    {/* Subtle aesthetic element for the bar */}
                    <div className="absolute -right-20 -bottom-20 w-56 h-56 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                </motion.div>
            </div>
        </section>
    );
};
