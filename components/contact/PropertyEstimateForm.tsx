"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export default function PropertyEstimateForm() {
    const t = useTranslations('Contact');
    const [isOpen, setIsOpen] = useState(false);
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

    const handleSelect = (value: string) => {
        setSelectedBedroom(value);
        setIsOpen(false);
    };

    return (
        <div className="bg-white rounded-[20px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] p-8 md:p-10 w-full max-w-md mx-auto">
            {/* Icon */}
            <div className="mb-6 flex justify-center md:justify-start">
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
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div>
                    <input
                        type="email"
                        placeholder={t('emailPlaceholder')}
                        className="w-full px-6 py-4 rounded-full border border-gray-300 focus:border-[#B09E80] focus:ring-1 focus:ring-[#B09E80] outline-none transition-colors text-navy-900 placeholder:text-gray-400"
                    />
                </div>
                <div>
                    <input
                        type="text"
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
                                className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
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
                    className="w-full bg-[#B09E80] hover:bg-[#8e7f65] text-white font-bold py-4 rounded-full transition-colors duration-300 mt-4 shadow-sm"
                >
                    {t('cta')}
                </button>
            </form>
        </div>
    );
}
