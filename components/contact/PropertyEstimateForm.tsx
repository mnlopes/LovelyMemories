"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export default function PropertyEstimateForm() {
    const t = useTranslations('Contact');
    const [isOpen, setIsOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [location, setLocation] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const [selectedBedroom, setSelectedBedroom] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const bedroomOptions = ["1", "2", "3", "4+"];

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [dropdownRef]);

    const handleSelect = (option: string) => {
        setSelectedBedroom(option);
        setIsOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/contact-general', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    location,
                    bedrooms: selectedBedroom
                }),
            });

            if (response.ok) {
                setIsSuccess(true);
                setEmail("");
                setLocation("");
                setSelectedBedroom("");
            }
        } catch (error) {
            console.error("Error submitting form:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-[20px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] p-8 md:p-10 w-full max-w-md mx-auto rtl:text-right">
            {/* Icon */}
            <div className="mb-6 flex justify-center md:justify-start rtl:md:justify-end">
                <img
                    src="/legacy/contact/images/GroupHome-Icon.svg"
                    alt="Property Icon"
                    className="h-24 w-auto"
                />
            </div>

            {/* Title */}
            <h2 className="text-2xl md:text-3xl font-bold text-navy-950 mb-4 leading-tight">
                {t('formTitle')}
            </h2>

            {/* Description */}
            <p className="text-navy-900/70 mb-8 text-sm md:text-base leading-relaxed">
                {t('formSubtitle')}
            </p>

            {/* Form */}
            {isSuccess ? (
                <div className="text-center py-10 space-y-4">
                    <div className="w-20 h-20 bg-[#fdfbf7] text-[#b29a7a] rounded-full flex items-center justify-center mx-auto shadow-sm border border-[#b29a7a]/5">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-navy-950">{t('success')}</h3>
                    <p className="text-navy-900/60 text-sm">{t('successDesc')}</p>
                    <button
                        onClick={() => setIsSuccess(false)}
                        className="text-[#B09E80] text-xs font-bold uppercase tracking-widest hover:underline"
                    >
                        {t('sendAnother')}
                    </button>
                </div>
            ) : (
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t('emailPlaceholder')}
                            className="w-full px-6 py-4 rounded-full border border-gray-300 focus:border-[#B09E80] focus:ring-1 focus:ring-[#B09E80] outline-none transition-colors text-navy-900 placeholder:text-gray-400"
                        />
                    </div>
                    <div>
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder={t('locationPlaceholder')}
                            className="w-full px-6 py-4 rounded-full border border-gray-300 focus:border-[#B09E80] focus:ring-1 focus:ring-[#B09E80] outline-none transition-colors text-navy-900 placeholder:text-gray-400"
                        />
                    </div>

                    {/* Custom Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <div
                            className={`w-full px-6 py-4 rounded-full border cursor-pointer flex items-center justify-between transition-colors bg-white
                                        ${isOpen ? 'border-[#B09E80] ring-1 ring-[#B09E80]' : 'border-gray-300 hover:border-[#B09E80]'}
                            `}
                            onClick={() => setIsOpen(!isOpen)}
                        >
                            <span className={`${selectedBedroom ? 'text-navy-900' : 'text-gray-400'}`}>
                                {selectedBedroom || t('bedroomsPlaceholder')}
                            </span>
                            <ChevronDown
                                className={`w-4 h-4 text-[#B09E80] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                                strokeWidth={3}
                            />
                        </div>

                        <AnimatePresence>
                            {isOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                    className="absolute z-10 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden"
                                >
                                    {/* Header of Dropdown */}
                                    <div className="px-6 py-3 bg-[#bebebe] text-white font-medium">
                                        {t('bedroomsPlaceholder')}
                                    </div>

                                    {/* Options */}
                                    <div className="max-h-60 overflow-y-auto">
                                        {bedroomOptions.map((option) => (
                                            <div
                                                key={option}
                                                className="px-6 py-3 hover:bg-gray-50 cursor-pointer text-navy-900 transition-colors border-b border-gray-100 last:border-0"
                                                onClick={() => handleSelect(option)}
                                            >
                                                {option}
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-[#B09E80] hover:bg-[#8e7f65] text-white font-bold py-4 rounded-full transition-colors duration-300 mt-4 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? '...' : t('cta')}
                    </button>
                </form>
            )}
        </div>
    );
}
