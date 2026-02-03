"use client";

import React, { useState } from 'react';
import { useTranslations } from "next-intl";

export const AboutForm = () => {
    const t = useTranslations('AboutForm');
    const [formData, setFormData] = useState({
        uname: '',
        uemail: '',
        message: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const response = await fetch('/api/contact-general', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.uemail,
                    fullName: formData.uname,
                    message: formData.message,
                    location: 'Página Sobre Nós'
                }),
            });

            if (response.ok) {
                setIsSuccess(true);
                setFormData({ uname: '', uemail: '', message: '' });
            }
        } catch (error) {
            console.error('Error submitting form:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="py-24 bg-[#BDA68B]"> {/* Matching the beige/brown tone from screenshot roughly */}
            <div className="container mx-auto px-4">
                <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-full max-w-2xl mb-12">
                        <h5 className="text-white font-bold text-xl mb-4">{t('title')}</h5>
                        <h6 className="text-white font-light text-lg md:text-xl opacity-90 leading-relaxed">
                            {t('subtitle')}
                        </h6>
                    </div>
                </div>
                <div className="flex justify-center">
                    <div className="w-full max-w-2xl">
                        <div>
                            {isSuccess ? (
                                <div className="bg-white/10 backdrop-blur-md p-12 rounded-xl text-center border border-white/20 min-h-[450px] flex flex-col items-center justify-center">
                                    <div className="w-20 h-20 bg-[#fdfbf7] text-[#b29a7a] rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-[#b29a7a]/5">
                                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2 text-center">{t('success')}</h3>
                                    <p className="text-white/80 text-center">{t('successDesc')}</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <input
                                            type="text"
                                            name="uname"
                                            className="w-full bg-white px-6 py-4 outline-none text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-white/50 transition-all rounded-sm"
                                            placeholder={t('name')}
                                            required
                                            value={formData.uname}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="email"
                                            name="uemail"
                                            className="w-full bg-white px-6 py-4 outline-none text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-white/50 transition-all rounded-sm"
                                            placeholder={t('email')}
                                            required
                                            value={formData.uemail}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div>
                                        <textarea
                                            name="message"
                                            className="w-full bg-white px-6 py-4 outline-none text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-white/50 transition-all rounded-sm min-h-[160px]"
                                            placeholder={t('message')}
                                            required
                                            value={formData.message}
                                            onChange={handleChange}
                                        ></textarea>
                                    </div>
                                    <div className="text-center pt-4">
                                        <button
                                            className="inline-block px-10 py-3 bg-[#4A5568] text-white font-bold text-sm uppercase tracking-widest hover:bg-[#2D3748] transition-colors rounded-sm shadow-lg border border-transparent hover:border-white/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                            type="submit"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? '...' : t('submit')}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};


