"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Input } from './ui/Input';
import { useEffect } from 'react';

interface RevenueReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    initialPlan?: 'base' | 'luxe' | null;
}

export const RevenueReportModal: React.FC<RevenueReportModalProps> = ({ isOpen, onClose, onSuccess, initialPlan }) => {
    const t = useTranslations('OwnerHero');
    const locale = useLocale();
    const isRtl = locale === 'he';

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phoneNumber: '',
        address: '',
        location: '',
        plan: initialPlan || 'base',
        numProperties: '1'
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Dropdown States
    const [isPlanOpen, setIsPlanOpen] = useState(false);
    const [isNumOpen, setIsNumOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            document.body.classList.add('modal-open');
            if (initialPlan) {
                setFormData(prev => ({ ...prev, plan: initialPlan }));
            }
        } else {
            document.body.classList.remove('modal-open');
        }
        return () => {
            document.body.classList.remove('modal-open');
        };
    }, [isOpen, initialPlan]);

    const planOptions = [
        { value: 'base', label: t('form.basePlan') },
        { value: 'luxe', label: t('form.luxePlan') }
    ];

    const numOptions = [
        { value: '1', label: t('form.num1') },
        { value: '2-5', label: t('form.num2_5') },
        { value: '6-10', label: t('form.num6_10') },
        { value: '10+', label: t('form.num10plus') }
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate API call
        try {
            const response = await fetch('/api/contact-owner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                setIsSuccess(true);
                onSuccess?.();
                setTimeout(() => {
                    onClose();
                    setIsSuccess(false);
                }, 2500);
            }
        } catch (error) {
            console.error("Error submitting form:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100000] flex items-start justify-center p-4 overflow-y-auto pt-[140px] pb-10 scrollbar-hide">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className={`relative w-full max-w-xl bg-white rounded-[32px] shadow-2xl ${isRtl ? 'text-right' : 'text-left'}`}
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className={`absolute top-6 ${isRtl ? 'left-6' : 'right-6'} p-2 rounded-full hover:bg-gray-100 transition-colors shadow-sm border border-gray-100`}
                        >
                            <X size={20} className="text-gray-400" />
                        </button>

                        <div className="p-8 md:p-12">
                            <h2 className={`text-3xl font-bold text-[#0A1128] mb-2 ${isRtl ? 'pl-8' : 'pr-8'}`}>
                                {t('form.title')}
                            </h2>
                            <p className="text-gray-500 mb-8 font-medium">{t('form.subtitle')}</p>

                            {isSuccess ? (
                                <div className="py-12 text-center">
                                    <div className="w-20 h-20 bg-[#fdfbf7] text-[#b29a7a] rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-[#b29a7a]/5">
                                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">{t('form.success')}</h3>
                                    <p className="text-gray-500">{t('form.reportPreparing')}</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="relative">
                                        <Input
                                            type="text"
                                            placeholder={t('form.fullName')}
                                            required
                                            className="h-14 bg-white border-gray-200 focus:border-[#b29a7a] focus:ring-[#b29a7a]/20"
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input
                                            type="email"
                                            placeholder={t('form.email')}
                                            required
                                            className="h-14 bg-white border-gray-200 focus:border-[#b29a7a] focus:ring-[#b29a7a]/20"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        />
                                        <Input
                                            type="tel"
                                            placeholder={t('form.phone')}
                                            required
                                            className="h-14 bg-white border-gray-200 focus:border-[#b29a7a] focus:ring-[#b29a7a]/20"
                                            value={formData.phoneNumber}
                                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                        />
                                    </div>

                                    <Input
                                        type="text"
                                        placeholder={t('form.address')}
                                        required
                                        className="h-14 bg-white border-gray-200 focus:border-[#b29a7a] focus:ring-[#b29a7a]/20"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    />

                                    <Input
                                        type="text"
                                        placeholder={t('form.location')}
                                        required
                                        className="h-14 bg-white border-gray-200 focus:border-[#b29a7a] focus:ring-[#b29a7a]/20"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    />

                                    {/* Custom Plan Dropdown - Back to Full Width */}
                                    <div className="relative">
                                        <div
                                            onClick={() => { setIsPlanOpen(!isPlanOpen); setIsNumOpen(false); }}
                                            className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl cursor-pointer flex justify-between items-center group hover:border-[#b29a7a] transition-all"
                                        >
                                            <span className="text-gray-700 font-medium">
                                                {planOptions.find(o => o.value === formData.plan)?.label}
                                            </span>
                                            <ChevronDown className={`text-gray-400 transition-transform duration-300 ${isPlanOpen ? 'rotate-180 text-[#b29a7a]' : ''}`} size={20} />
                                        </div>

                                        <AnimatePresence>
                                            {isPlanOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 10 }}
                                                    className="absolute z-[110] w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] overflow-hidden"
                                                >
                                                    {planOptions.map((opt) => (
                                                        <div
                                                            key={opt.value}
                                                            onClick={() => {
                                                                setFormData({ ...formData, plan: opt.value as 'base' | 'luxe' });
                                                                setIsPlanOpen(false);
                                                            }}
                                                            className="px-6 py-4 hover:bg-[#b29a7a]/5 hover:text-[#b29a7a] transition-colors cursor-pointer text-gray-600 font-medium border-b border-gray-50 last:border-0"
                                                        >
                                                            {opt.label}
                                                        </div>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Custom Num Dropdown - Back to Full Width */}
                                    <div className="relative">
                                        <div
                                            onClick={() => { setIsNumOpen(!isNumOpen); setIsPlanOpen(false); }}
                                            className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl cursor-pointer flex justify-between items-center group hover:border-[#b29a7a] transition-all"
                                        >
                                            <span className="text-gray-700 font-medium">
                                                {numOptions.find(o => o.value === formData.numProperties)?.label}
                                            </span>
                                            <ChevronDown className={`text-gray-400 transition-transform duration-300 ${isNumOpen ? 'rotate-180 text-[#b29a7a]' : ''}`} size={20} />
                                        </div>

                                        <AnimatePresence>
                                            {isNumOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 10 }}
                                                    className="absolute z-[110] w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] overflow-hidden max-h-[220px] overflow-y-auto"
                                                >
                                                    {numOptions.map((opt) => (
                                                        <div
                                                            key={opt.value}
                                                            onClick={() => {
                                                                setFormData({ ...formData, numProperties: opt.value });
                                                                setIsNumOpen(false);
                                                            }}
                                                            className="px-6 py-4 hover:bg-[#b29a7a]/5 hover:text-[#b29a7a] transition-colors cursor-pointer text-gray-600 font-medium border-b border-gray-50 last:border-0"
                                                        >
                                                            {opt.label}
                                                        </div>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full py-5 bg-[#b29a7a] text-white font-bold uppercase tracking-[0.2em] rounded-2xl shadow-lg hover:bg-[#8e7d65] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? t('form.submitting') : t('form.submit')}
                                    </button>

                                    <p className="text-xs text-center text-gray-400 mt-4">
                                        {t.rich('form.privacyAgreement', {
                                            link: (chunks) => <a href="#" className="text-[#b29a7a] hover:underline font-medium">{chunks}</a>
                                        })}
                                    </p>
                                </form>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
