"use client";

import React, { useState } from "react";
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast, Toaster } from "sonner";
import { useTranslations } from "next-intl";

interface FormData {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    location: string;
}

export const OwnerHero = () => {
    const t = useTranslations('OwnerHero');
    const [formData, setFormData] = useState<FormData>({
        fullName: "",
        email: "",
        phone: "",
        address: "",
        location: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.fullName || !formData.email) {
            toast.error("Por favor, preencha os campos obrigatórios");
            return;
        }
        setIsSubmitting(true);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        toast.success(t('form.success'));
        setFormData({ fullName: "", email: "", phone: "", address: "", location: "" });
        setIsSubmitting(false);
    };

    return (
        <section className="relative min-h-screen flex items-center bg-white overflow-hidden z-0" style={{ minHeight: '100vh' }}>
            <Toaster position="top-right" richColors />
            {/* Background Image (Bottom half) - Robust implementation */}
            <div className="absolute bottom-0 left-0 w-full z-0 pointer-events-none" style={{ height: '45vh' }}>
                <img
                    src="/images/owner-hero-bg.png"
                    alt="Property Background"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-white/10" />
            </div>

            <div className="container mx-auto px-4 max-w-[1440px] relative z-10 pt-24 pb-24 lg:pt-32 lg:pb-32">
                <div className="flex flex-col lg:flex-row items-start justify-between gap-12 lg:gap-24 relative">

                    {/* Left: Text & Badge */}
                    <div className="w-full lg:w-7/12 relative z-10 pt-10 lg:pt-20">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            className="max-w-3xl -mt-10 lg:-mt-20"
                        >
                            <span className="text-[#b29a7a] font-bold text-sm uppercase tracking-[0.3em] block mb-8">
                                {t('subtitle')}
                            </span>
                            <h1
                                className="text-5xl md:text-6xl lg:text-[80px] font-playfair leading-[1.05] mb-10"
                                style={{ fontWeight: 900, color: '#0A1128' }}
                            >
                                {t.rich('title', {
                                    br: () => <br />
                                })}
                            </h1>
                            <p className="text-gray-500 text-lg md:text-xl lg:text-2xl font-light max-w-xl mb-12 leading-relaxed">
                                {t('description')}
                            </p>
                        </motion.div>

                        {/* Earn 40% Badge - Glassmorphism Effect */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="lg:absolute lg:top-[105%] lg:left-0 z-10 flex items-center justify-start lg:block w-fit"
                        >
                            <div
                                className="rounded-full flex flex-col items-center justify-center text-white backdrop-blur-xl shrink-0 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border border-white/20"
                                style={{
                                    width: '250px',
                                    height: '250px',
                                    backgroundColor: 'rgba(178, 154, 122, 0.7)', // Semi-transparent gold for glass feel
                                    boxShadow: 'inset 0 0 20px rgba(255,255,255,0.1)'
                                }}
                            >
                                <span className="text-lg uppercase tracking-[0.3em] font-bold opacity-80 mb-1">{t('badge.earn')}</span>
                                <span className="text-7xl font-bold leading-none">{t('badge.percent')}</span>
                                <span className="text-lg uppercase tracking-[0.3em] font-bold opacity-80 mt-1">{t('badge.more')}</span>
                            </div>
                        </motion.div>
                    </div>

                    {/* Right: Capture Form Card - New Style */}
                    <div className="w-full lg:w-5/12 flex justify-center lg:justify-end relative z-10">
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, delay: 0.4 }}
                            className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-gray-100 w-full max-w-[500px]"
                        >
                            <h2
                                className="text-[36px] mb-2 leading-tight"
                                style={{ color: '#192537', fontWeight: 900 }}
                            >
                                {t('form.title')}
                            </h2>
                            <p
                                className="mb-10 font-medium"
                                style={{ color: '#192537', opacity: 0.7 }}
                            >
                                {t('form.subtitle')}
                            </p>

                            <form onSubmit={handleSubmit} className="flex flex-col gap-10">
                                <div className="flex flex-col gap-6">
                                    <Input
                                        name="fullName"
                                        placeholder={t('form.fullName')}
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        className="h-14 bg-gray-50/50 border-gray-100 focus:border-[#b29a7a] focus:ring-[#b29a7a]/20"
                                        required
                                    />
                                    <Input
                                        name="email"
                                        type="email"
                                        placeholder={t('form.email')}
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="h-14 bg-gray-50/50 border-gray-100 focus:border-[#b29a7a] focus:ring-[#b29a7a]/20"
                                        required
                                    />
                                    <Input
                                        name="phone"
                                        type="tel"
                                        placeholder={t('form.phone')}
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="h-14 bg-gray-50/50 border-gray-100 focus:border-[#b29a7a] focus:ring-[#b29a7a]/20"
                                    />
                                    <Input
                                        name="address"
                                        placeholder={t('form.address')}
                                        value={formData.address}
                                        onChange={handleChange}
                                        className="h-14 bg-gray-50/50 border-gray-100 focus:border-[#b29a7a] focus:ring-[#b29a7a]/20"
                                    />
                                    <Input
                                        name="location"
                                        placeholder={t('form.location')}
                                        value={formData.location}
                                        onChange={handleChange}
                                        className="h-14 bg-gray-50/50 border-gray-100 focus:border-[#b29a7a] focus:ring-[#b29a7a]/20"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full h-14 text-white font-bold shadow-lg transition-all rounded-full !rounded-full"
                                    style={{
                                        backgroundColor: isSubmitting ? '#a68f6e' : '#b29a7a',
                                        boxShadow: '0 10px 15px -3px rgba(178, 154, 122, 0.2)',
                                        borderRadius: '9999px'
                                    }}
                                >
                                    {isSubmitting ? t('form.submitting') : t('form.submit')}
                                </Button>

                                <p className="text-xs text-center text-gray-400 mt-4">
                                    By submitting, you agree to our{" "}
                                    <a href="#" className="text-[#b29a7a] hover:underline">Privacy Policy</a>
                                </p>
                            </form>
                        </motion.div>
                    </div>

                </div>
            </div>
        </section>
    );
};
