"use client";

import { useState } from "react";
import { X, Save, Loader2 } from "lucide-react";
import { upsertFaq } from "@/app/actions/cms";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Faq } from "@/lib/types";

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
                    <label className="text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest px-1">
                        {t('locale')}
                    </label>
                    <select 
                        value={formData.locale} 
                        onChange={(e) => setFormData(prev => ({ ...prev, locale: e.target.value }))} 
                        className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f0f0f0] dark:border-white/5 py-3.5 px-5 rounded-2xl text-xs font-bold outline-none focus:ring-1 focus:ring-admin-accent transition-all appearance-none cursor-pointer"
                    >
                        <option value="en">English (EN)</option>
                        <option value="pt">Português (PT)</option>
                        <option value="he">Hebrew (HE)</option>
                    </select>
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
