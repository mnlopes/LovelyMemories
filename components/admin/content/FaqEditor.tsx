"use client";

import { useState } from "react";
import { X, Save, Loader2, ChevronDown, Check } from "lucide-react";
import { upsertFaq } from "@/app/actions/cms";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Faq } from "@/lib/types";

const languages = [
    { code: 'en', label: 'English (EN)', flag: '/legacy/home/images/english-flag.svg' },
    { code: 'pt', label: 'Português (PT)', flag: '/legacy/home/images/portuguese-flag.svg' },
    { code: 'he', label: 'Hebrew (HE)', flag: '/legacy/home/images/he.svg' }
];

interface FaqEditorProps {
    faq: Faq | null;
    locale: string;
    onClose: () => void;
    onSave: () => void;
}

export default function FaqEditor({ faq, locale, onClose, onSave }: FaqEditorProps) {
    const t = useTranslations('AdminContent.faq.editor');
    const [formData, setFormData] = useState<Faq>({
        id: faq?.id || undefined,
        question: faq?.question || "",
        answer: faq?.answer || "",
        locale: faq?.locale || locale,
        display_order: faq?.display_order ?? 0
    });

    const [isSaving, setIsSaving] = useState(false);
    const [showLangDropdown, setShowLangDropdown] = useState(false);

    const handleSave = async () => {
        if (!formData.question || !formData.answer) {
            toast.error("Question and Answer are required!");
            return;
        }

        setIsSaving(true);
        const res = await upsertFaq(formData);

        if (res.success) {
            toast.success("FAQ saved!");
            onSave();
        } else {
            toast.error("Save failed: " + res.error);
        }
        setIsSaving(false);
    };

    return (
        <div className="bg-white dark:bg-white/5 rounded-3xl border border-[#f5f5f5] dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative">
            {/* Header */}
            <div className="px-8 py-5 border-b border-[#f5f5f5] dark:border-white/10 flex items-center justify-between bg-[#fafafa] dark:bg-admin-dark-bg/50">
                <div>
                    <h3 className="text-xl font-black text-[#171717] dark:text-admin-dark-text-primary uppercase tracking-tight">
                        {faq ? t('edit') : t('create')}
                    </h3>
                    <p className="text-[10px] text-[#a3a3a3] font-bold uppercase tracking-widest mt-1">
                        {t('locale')}: {formData.locale.toUpperCase()}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-3 text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white hover:bg-white dark:hover:bg-white/5 rounded-2xl transition-all">
                        <X className="size-5" />
                    </button>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving} 
                        className="flex items-center gap-2 px-6 py-3 bg-[#171717] dark:bg-white text-white dark:text-black rounded-2xl text-sm font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
                    >
                        {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} 
                        {t('save')}
                    </button>
                </div>
            </div>

            {/* Form Fields */}
            <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                <div className="max-w-xs space-y-2">
                    <label className="text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest px-1 block">
                        {t('locale')}
                    </label>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowLangDropdown(!showLangDropdown)}
                            className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f0f0f0] dark:border-white/5 py-3.5 px-5 rounded-2xl text-xs font-bold outline-none focus:ring-1 focus:ring-admin-accent transition-all cursor-pointer flex items-center justify-between text-left"
                        >
                            <span className="flex items-center gap-3 min-w-0">
                                {(() => {
                                    const selected = languages.find(l => l.code === formData.locale);
                                    return (
                                        <>
                                            {selected?.flag && (
                                                <img 
                                                    src={selected.flag} 
                                                    alt={selected.label} 
                                                    className="w-5 h-5 rounded-full object-cover border border-black/10 dark:border-white/10 shrink-0" 
                                                />
                                            )}
                                            <span className="truncate text-[#171717] dark:text-admin-dark-text-primary">{selected?.label || formData.locale.toUpperCase()}</span>
                                        </>
                                    );
                                })()}
                            </span>
                            <ChevronDown className="size-4 text-gray-400 shrink-0 ml-2" />
                        </button>

                        {showLangDropdown && (
                            <>
                                <div 
                                    className="fixed inset-0 z-40" 
                                    onClick={() => setShowLangDropdown(false)} 
                                />
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1a2331] border border-[#f0f0f0] dark:border-white/10 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-[#f5f5f5] dark:divide-white/5 animate-in fade-in slide-in-from-top-2 duration-150 max-h-60 overflow-y-auto custom-scrollbar">
                                    {languages.map((lang) => {
                                        const isSelected = formData.locale === lang.code;
                                        return (
                                            <button
                                                key={lang.code}
                                                type="button"
                                                onClick={() => {
                                                    setFormData(prev => ({ ...prev, locale: lang.code }));
                                                    setShowLangDropdown(false);
                                                }}
                                                className={`w-full px-5 py-3 flex items-center justify-between text-left text-xs font-bold transition-colors ${
                                                    isSelected 
                                                        ? 'bg-[#a39076]/10 text-[#a39076] dark:bg-[#a39076]/20' 
                                                        : 'text-[#171717] dark:text-admin-dark-text-primary hover:bg-[#fafafa] dark:hover:bg-white/5'
                                                }`}
                                            >
                                                <span className="flex items-center gap-3 min-w-0">
                                                    <img 
                                                        src={lang.flag} 
                                                        alt={lang.label} 
                                                        className="w-5 h-5 rounded-full object-cover border border-black/10 dark:border-white/10 shrink-0" 
                                                    />
                                                    <span className="truncate">{lang.label}</span>
                                                </span>
                                                {isSelected && <Check className="size-3.5 text-[#a39076] shrink-0 ml-2" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest px-1">
                        {t('question')}
                    </label>
                    <input 
                        type="text" 
                        placeholder="..." 
                        value={formData.question} 
                        onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))} 
                        className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f0f0f0] dark:border-white/5 py-3.5 px-5 rounded-2xl text-sm font-semibold outline-none focus:ring-1 focus:ring-admin-accent transition-all" 
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest px-1">
                        {t('answer')}
                    </label>
                    <textarea 
                        placeholder="..." 
                        value={formData.answer} 
                        onChange={(e) => setFormData(prev => ({ ...prev, answer: e.target.value }))} 
                        rows={6} 
                        className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f0f0f0] dark:border-white/5 py-4 px-5 rounded-2xl text-sm font-medium outline-none focus:ring-1 focus:ring-admin-accent transition-all resize-none" 
                    />
                </div>
            </div>
        </div>
    );
}
