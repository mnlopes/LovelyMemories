"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown } from 'lucide-react';

interface RevenueReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialPlan?: 'base' | 'luxe' | null;
}

export const RevenueReportModal: React.FC<RevenueReportModalProps> = ({ isOpen, onClose, initialPlan }) => {
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

    const planOptions = [
        { value: 'base', label: 'Base Fee (+20%)' },
        { value: 'luxe', label: 'Luxe (+25%)' }
    ];

    const numOptions = [
        { value: '1', label: '1 Property' },
        { value: '2-5', label: '2 - 5 Properties' },
        { value: '6-10', label: '6 - 10 Properties' },
        { value: '10+', label: 'More than 10 Properties' }
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
                setTimeout(() => {
                    onClose();
                    setIsSuccess(false);
                }, 2000);
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
                <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
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
                        className="relative w-full max-w-xl bg-white rounded-[32px] shadow-2xl"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors shadow-sm border border-gray-100"
                        >
                            <X size={20} className="text-gray-400" />
                        </button>

                        <div className="p-8 md:p-12">
                            <h2 className="text-3xl font-bold text-[#0A1128] mb-2 pr-8">
                                Get your customised Revenue Report
                            </h2>
                            <p className="text-gray-500 mb-8 font-medium">Property details</p>

                            {isSuccess ? (
                                <div className="py-12 text-center">
                                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">Enviado com sucesso!</h3>
                                    <p className="text-gray-500 mt-2">Entraremos em contacto brevemente.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Full Name*"
                                            required
                                            className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#b29a7a]/20 focus:border-[#b29a7a] transition-all placeholder:text-gray-400"
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input
                                            type="email"
                                            placeholder="Email*"
                                            required
                                            className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#b29a7a]/20 focus:border-[#b29a7a] transition-all placeholder:text-gray-400"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        />
                                        <input
                                            type="tel"
                                            placeholder="Phone Number*"
                                            required
                                            className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#b29a7a]/20 focus:border-[#b29a7a] transition-all placeholder:text-gray-400"
                                            value={formData.phoneNumber}
                                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                        />
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="Address*"
                                        required
                                        className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#b29a7a]/20 focus:border-[#b29a7a] transition-all placeholder:text-gray-400"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    />

                                    <input
                                        type="text"
                                        placeholder="Location*"
                                        required
                                        className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#b29a7a]/20 focus:border-[#b29a7a] transition-all placeholder:text-gray-400"
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
                                        {isSubmitting ? 'Sending...' : 'Send'}
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
