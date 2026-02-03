"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

interface ConciergeModalProps {
    isOpen: boolean;
    onClose: () => void;
    serviceName?: string;
}

export const ConciergeModal: React.FC<ConciergeModalProps> = ({ isOpen, onClose, serviceName }) => {
    const t = useTranslations('PropertyDetail');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: '',
        website: '' // Honeypot
    });
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    useEffect(() => {
        if (isOpen) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
        }
        return () => {
            document.body.classList.remove('modal-open');
        };
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');

        try {
            const response = await fetch('/api/contact-concierge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    service: serviceName || 'VIP Concierge'
                }),
            });

            if (response.status === 429) {
                const data = await response.json();
                toast.error(data.message || "Por favor aguarde uns minutos.");
                setStatus('error');
                return;
            }

            if (response.ok) {
                setStatus('success');
                setTimeout(() => {
                    onClose();
                    setStatus('idle');
                    setFormData({ name: '', email: '', message: '', website: '' });
                }, 2000);
            } else {
                setStatus('error');
            }
        } catch (error) {
            setStatus('error');
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100000] flex items-start justify-center p-4 overflow-y-auto pt-[140px] pb-10 scrollbar-hide">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden"
                    >
                        <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors">
                            <X size={20} className="text-gray-400" />
                        </button>

                        <div className="p-8 md:p-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-[#B08D4A]/10 text-[#B08D4A] rounded-full">
                                    <Sparkles size={24} />
                                </div>
                                <h2 className="text-2xl font-bold text-navy-950">{t('concierge.title')}</h2>
                            </div>

                            {status === 'success' ? (
                                <div className="py-12 text-center space-y-4">
                                    <div className="w-20 h-20 bg-[#fdfbf7] text-[#b29a7a] rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-[#b29a7a]/5">
                                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 text-center">{t('concierge.success')}</h3>
                                    <p className="text-gray-500 text-center">{t('concierge.successDesc')}</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <p className="text-navy-900/60 text-sm mb-6">
                                        {t('concierge.description', { serviceName: serviceName || t('concierge.defaultService') })}
                                    </p>

                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold tracking-widest text-[#B08D4A]">{t('concierge.nameLabel')}</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full h-12 px-5 bg-gray-50 border border-gray-100 rounded-2xl focus:border-[#B08D4A] outline-none transition-all"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold tracking-widest text-[#B08D4A]">{t('concierge.emailLabel')}</label>
                                        <input
                                            required
                                            type="email"
                                            className="w-full h-12 px-5 bg-gray-50 border border-gray-100 rounded-2xl focus:border-[#B08D4A] outline-none transition-all"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold tracking-widest text-[#B08D4A]">{t('concierge.messageLabel')}</label>
                                        <textarea
                                            rows={3}
                                            className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl focus:border-[#B08D4A] outline-none transition-all resize-none"
                                            value={formData.message}
                                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        />
                                    </div>

                                    {/* HONEYPOT FIELD (Hidden) */}
                                    <input
                                        type="text"
                                        name="website"
                                        value={formData.website}
                                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                        style={{ display: 'none' }}
                                        tabIndex={-1}
                                        autoComplete="off"
                                    />

                                    <button
                                        type="submit"
                                        disabled={status === 'loading'}
                                        className="w-full py-4 bg-[#B08D4A] text-white font-bold uppercase tracking-widest rounded-2xl hover:bg-[#8e7d65] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
                                    >
                                        {status === 'loading' ? t('concierge.sending') : (
                                            <>
                                                <Send size={18} />
                                                {t('concierge.sendRequest')}
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
