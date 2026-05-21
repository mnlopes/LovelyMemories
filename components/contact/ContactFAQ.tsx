'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { getFaqs } from '@/app/actions/cms';

export default function ContactFAQ() {
    const t = useTranslations('Contact.faq');
    const params = useParams();
    const locale = (params?.locale as string) || 'en';
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const [dbFaqs, setDbFaqs] = useState<{ q: string; a: string }[]>([]);
    const [hasLoaded, setHasLoaded] = useState(false);

    useEffect(() => {
        const fetchDbFaqs = async () => {
            try {
                const data = await getFaqs(locale);
                if (data && data.length > 0) {
                    setDbFaqs(data.map(item => ({ q: item.question, a: item.answer })));
                }
            } catch (err) {
                console.error("Failed to load FAQs from database:", err);
            } finally {
                setHasLoaded(true);
            }
        };
        fetchDbFaqs();
    }, [locale]);

    // Hardcoded fallback data from next-intl
    const getFallbackFaqs = () => {
        try {
            // Check if key exists (if missing, next-intl returns the key itself)
            const q1 = t('q1');
            if (q1 && q1 !== 'Contact.faq.q1' && q1 !== 'q1') {
                return [
                    { q: t('q1'), a: t('a1') },
                    { q: t('q2'), a: t('a2') },
                    { q: t('q3'), a: t('a3') },
                    { q: t('q4'), a: t('a4') },
                ];
            }
        } catch {
            // Fallback to empty
        }
        return [];
    };

    const fallbackFaqs = getFallbackFaqs();
    const faqs = hasLoaded && dbFaqs.length > 0 ? dbFaqs : fallbackFaqs;

    // Generate JSON-LD Schema for SEO
    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map((faq) => ({
            "@type": "Question",
            "name": faq.q,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.a
            }
        }))
    };

    const toggleFaq = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section className="py-20 lg:py-32 bg-white relative z-10 border-t border-navy-100">
            {/* Inject JSON-LD into the head of the document */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            />
            
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-navy-950 mb-4">
                        {t('title')}
                    </h2>
                    <div className="w-16 h-1 bg-[#B09E80] mx-auto rounded-full"></div>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, index) => {
                        const isOpen = openIndex === index;
                        return (
                            <div 
                                key={index} 
                                className="border border-navy-100 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow duration-300"
                            >
                                <button
                                    onClick={() => toggleFaq(index)}
                                    className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 focus:outline-none"
                                >
                                    <span className={`text-lg md:text-xl font-medium transition-colors duration-300 ${isOpen ? 'text-[#B09E80]' : 'text-navy-950'}`}>
                                        {faq.q}
                                    </span>
                                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${isOpen ? 'bg-[#B09E80]/10 text-[#B09E80]' : 'bg-navy-50 text-navy-900'}`}>
                                        <motion.div
                                            animate={{ rotate: isOpen ? 180 : 0 }}
                                            transition={{ duration: 0.3, ease: "easeInOut" }}
                                        >
                                            <ChevronDown className="w-5 h-5" />
                                        </motion.div>
                                    </div>
                                </button>
                                
                                <AnimatePresence initial={false}>
                                    {isOpen && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: "easeInOut" }}
                                        >
                                            <div className="px-6 pb-6 pt-2 text-navy-900/80 leading-relaxed font-light text-base md:text-lg">
                                                {faq.a}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
