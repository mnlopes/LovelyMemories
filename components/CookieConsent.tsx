'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import Cookies from 'js-cookie';
import { Cookie, Settings, X } from 'lucide-react';

const CONSENT_COOKIE_NAME = 'lovely-memories-consent';

export const CookieConsent = () => {
    const t = useTranslations('CookieConsent');
    const [isVisible, setIsVisible] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [preferences, setPreferences] = useState({
        necessary: true,
        analytics: false,
        marketing: false,
    });

    useEffect(() => {
        const consent = Cookies.get(CONSENT_COOKIE_NAME);
        if (!consent) {
            setIsVisible(true);
        } else {
            try {
                const savedPrefs = JSON.parse(consent);
                applyConsent(savedPrefs);
            } catch (e) {
                setIsVisible(true);
            }
        }

        // Listen for custom event to re-open settings
        const handleOpenSettings = () => {
            setIsVisible(true);
            setShowSettings(true);
        };
        window.addEventListener('open-cookie-settings', handleOpenSettings);
        return () => window.removeEventListener('open-cookie-settings', handleOpenSettings);
    }, []);

    const applyConsent = (prefs: typeof preferences) => {
        if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('consent', 'update', {
                ad_storage: prefs.marketing ? 'granted' : 'denied',
                ad_user_data: prefs.marketing ? 'granted' : 'denied',
                ad_personalization: prefs.marketing ? 'granted' : 'denied',
                analytics_storage: prefs.analytics ? 'granted' : 'denied',
            });
        }
    };

    const handleAcceptAll = () => {
        const allIn = { necessary: true, analytics: true, marketing: true };
        Cookies.set(CONSENT_COOKIE_NAME, JSON.stringify(allIn), { expires: 365 });
        applyConsent(allIn);
        setIsVisible(false);
    };

    const handleRejectAll = () => {
        const minimal = { necessary: true, analytics: false, marketing: false };
        Cookies.set(CONSENT_COOKIE_NAME, JSON.stringify(minimal), { expires: 365 });
        applyConsent(minimal);
        setIsVisible(false);
    };

    const handleSavePreferences = () => {
        Cookies.set(CONSENT_COOKIE_NAME, JSON.stringify(preferences), { expires: 365 });
        applyConsent(preferences);
        setIsVisible(false);
        setShowSettings(false);
    };

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-[99999] p-0 flex justify-end pointer-events-none">
                <motion.div
                    initial={{ y: 50, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 50, opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="w-full max-w-[380px] bg-[#192537]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden pointer-events-auto"
                >
                    <div className="p-6">
                        {!showSettings ? (
                            <div className="space-y-5">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-[#a39076]/20 rounded-2xl text-[#a39076] shrink-0">
                                        <Cookie size={24} />
                                    </div>
                                    <h3 className="text-lg font-bold text-white tracking-tight">{t('title')}</h3>
                                </div>
                                
                                <p className="text-gray-400 text-[13px] leading-relaxed">
                                    {t('description')}
                                </p>

                                <div className="flex flex-col gap-2 pt-2">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleAcceptAll}
                                            className="flex-1 py-2.5 bg-[#a39076] hover:bg-[#8e7d65] text-white rounded-full transition-all text-[13px] font-bold shadow-lg shadow-[#a39076]/10"
                                        >
                                            {t('acceptAll')}
                                        </button>
                                        <button
                                            onClick={handleRejectAll}
                                            className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-full border border-white/10 transition-all text-[13px] font-semibold"
                                        >
                                            {t('rejectAll')}
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setShowSettings(true)}
                                        className="w-full py-2 text-white/50 hover:text-[#a39076] transition-colors text-[12px] font-medium flex items-center justify-center gap-2"
                                    >
                                        <Settings size={14} />
                                        {t('customize')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-white tracking-tight">{t('customize')}</h3>
                                    <button 
                                        onClick={() => setShowSettings(false)}
                                        className="text-white/50 hover:text-white transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                                
                                <div className="space-y-3">
                                    {/* Necessary */}
                                    <div className="p-3 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold text-white">{t('necessary.title')}</span>
                                            <div className="w-8 h-4 bg-[#a39076] rounded-full relative opacity-50 cursor-not-allowed">
                                                <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full" />
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-gray-400 leading-tight">{t('necessary.description')}</p>
                                    </div>

                                    {/* Analytics */}
                                    <div 
                                        onClick={() => setPreferences(p => ({ ...p, analytics: !p.analytics }))}
                                        className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-2 ${preferences.analytics ? 'bg-[#a39076]/10 border-[#a39076]/30' : 'bg-white/5 border-white/5'}`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold text-white">{t('analytics.title')}</span>
                                            <div className={`w-8 h-4 rounded-full relative transition-colors ${preferences.analytics ? 'bg-[#a39076]' : 'bg-gray-600'}`}>
                                                <motion.div 
                                                    animate={{ x: preferences.analytics ? 18 : 2 }}
                                                    className="absolute top-0.5 w-3 h-3 bg-white rounded-full" 
                                                />
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-gray-400 leading-tight">{t('analytics.description')}</p>
                                    </div>

                                    {/* Marketing */}
                                    <div 
                                        onClick={() => setPreferences(p => ({ ...p, marketing: !p.marketing }))}
                                        className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-2 ${preferences.marketing ? 'bg-[#a39076]/10 border-[#a39076]/30' : 'bg-white/5 border-white/5'}`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold text-white">{t('marketing.title')}</span>
                                            <div className={`w-8 h-4 rounded-full relative transition-colors ${preferences.marketing ? 'bg-[#a39076]' : 'bg-gray-600'}`}>
                                                <motion.div 
                                                    animate={{ x: preferences.marketing ? 18 : 2 }}
                                                    className="absolute top-0.5 w-3 h-3 bg-white rounded-full" 
                                                />
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-gray-400 leading-tight">{t('marketing.description')}</p>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        onClick={handleSavePreferences}
                                        className="w-full py-2.5 bg-[#a39076] hover:bg-[#8e7d65] text-white rounded-full text-[13px] font-bold transition-all"
                                    >
                                        {t('save')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
