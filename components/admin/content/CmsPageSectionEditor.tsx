"use client";

import { useState } from "react";
import { X, Save, Loader2, Plus, Trash2 } from "lucide-react";
import { upsertPageSection } from "@/app/actions/cms";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { CmsPageSection } from "@/lib/types";

interface CmsPageSectionEditorProps {
    section: CmsPageSection | null;
    pageSlug: string;
    locale: string;
    onClose: () => void;
    onSave: () => void;
}

export default function CmsPageSectionEditor({ section, pageSlug, locale, onClose, onSave }: CmsPageSectionEditorProps) {
    const t = useTranslations('AdminContent.cmsPage.editor');
    const [formData, setFormData] = useState<CmsPageSection>({
        id: section?.id || undefined,
        page_slug: section?.page_slug || pageSlug,
        title: section?.title || "",
        content: section?.content || "",
        icon: section?.icon || (pageSlug === "privacy-policy" ? "Shield" : "FileText"),
        locale: section?.locale || locale,
        display_order: section?.display_order ?? 0,
        list_items: section?.list_items || []
    });

    const [isSaving, setIsSaving] = useState(false);
    
    // States for adding a new list item
    const [newItemLabel, setNewItemLabel] = useState("");
    const [newItemDesc, setNewItemDesc] = useState("");

    const handleSave = async () => {
        if (!formData.title || !formData.content) {
            toast.error("Title and Content are required!");
            return;
        }

        setIsSaving(true);
        const res = await upsertPageSection(formData);

        if (res.success) {
            toast.success("Section saved!");
            onSave();
        } else {
            toast.error("Save failed: " + res.error);
        }
        setIsSaving(false);
    };

    const addListItem = () => {
        if (!newItemLabel || !newItemDesc) {
            toast.error("Both label and description are required for list items!");
            return;
        }
        setFormData(prev => ({
            ...prev,
            list_items: [...prev.list_items, { label: newItemLabel, desc: newItemDesc }]
        }));
        setNewItemLabel("");
        setNewItemDesc("");
    };

    const removeListItem = (index: number) => {
        setFormData(prev => ({
            ...prev,
            list_items: prev.list_items.filter((_, idx) => idx !== index)
        }));
    };

    return (
        <div className="bg-white dark:bg-white/5 rounded-3xl border border-[#f5f5f5] dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative">
            {/* Header */}
            <div className="px-8 py-5 border-b border-[#f5f5f5] dark:border-white/10 flex items-center justify-between bg-[#fafafa] dark:bg-admin-dark-bg/50">
                <div>
                    <h3 className="text-xl font-black text-[#171717] dark:text-admin-dark-text-primary uppercase tracking-tight">
                        {section ? t('edit') : t('create')}
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
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-2">
                        <label className="text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest px-1">
                            {t('locale')}
                        </label>
                        <select 
                            value={formData.locale} 
                            onChange={(e) => setFormData(prev => ({ ...prev, locale: e.target.value }))} 
                            className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f0f0f0] dark:border-white/5 py-3.5 px-5 rounded-2xl text-xs font-bold outline-none focus:ring-1 focus:ring-admin-accent transition-all cursor-pointer"
                        >
                            <option value="en">English (EN)</option>
                            <option value="pt">Português (PT)</option>
                            <option value="he">Hebrew (HE)</option>
                        </select>
                    </div>

                    <div className="flex-1 space-y-2">
                        <label className="text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest px-1">
                            {t('icon')}
                        </label>
                        <select 
                            value={formData.icon} 
                            onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))} 
                            className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f0f0f0] dark:border-white/5 py-3.5 px-5 rounded-2xl text-xs font-bold outline-none focus:ring-1 focus:ring-admin-accent transition-all cursor-pointer"
                        >
                            <option value="Shield">Shield (Security/Privacy)</option>
                            <option value="Cookie">Cookie (Cookies Policy)</option>
                            <option value="UserCheck">User Check (User Rights)</option>
                            <option value="Mail">Mail (Contacts/Emails)</option>
                            <option value="FileText">File Text (General Terms)</option>
                            <option value="Calendar">Calendar (Bookings)</option>
                            <option value="CreditCard">Credit Card (Payments)</option>
                            <option value="AlertCircle">Alert Circle (Responsibilities)</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest px-1">
                        {t('title')}
                    </label>
                    <input 
                        type="text" 
                        placeholder="..." 
                        value={formData.title} 
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} 
                        className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f0f0f0] dark:border-white/5 py-3.5 px-5 rounded-2xl text-sm font-semibold outline-none focus:ring-1 focus:ring-admin-accent transition-all" 
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest px-1">
                        {t('content')}
                    </label>
                    <textarea 
                        placeholder="..." 
                        value={formData.content} 
                        onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))} 
                        rows={5} 
                        className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f0f0f0] dark:border-white/5 py-4 px-5 rounded-2xl text-sm font-medium outline-none focus:ring-1 focus:ring-admin-accent transition-all resize-none" 
                    />
                </div>

                {/* Sub-items List Manager */}
                <div className="border-t border-[#f5f5f5] dark:border-white/10 pt-8 space-y-4">
                    <label className="text-[10px] font-black text-[#a3a3a3] uppercase tracking-widest px-1 block">
                        {t('listItems')}
                    </label>

                    {/* Add Item form */}
                    <div className="bg-[#fafafa] dark:bg-admin-dark-bg/30 border border-[#f0f0f0] dark:border-white/5 p-6 rounded-2xl space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <span className="text-[9px] font-bold text-[#a3a3a3] uppercase tracking-wider">{t('itemLabel')}</span>
                                <input 
                                    type="text"
                                    placeholder="e.g. Check-in"
                                    value={newItemLabel}
                                    onChange={(e) => setNewItemLabel(e.target.value)}
                                    className="w-full bg-white dark:bg-admin-dark-bg border border-[#e5e5e5] dark:border-white/5 py-2.5 px-4 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-admin-accent"
                                />
                            </div>
                            <div className="space-y-1">
                                <span className="text-[9px] font-bold text-[#a3a3a3] uppercase tracking-wider">{t('itemDesc')}</span>
                                <input 
                                    type="text"
                                    placeholder="e.g. Standard check-in is from 15:00 onwards."
                                    value={newItemDesc}
                                    onChange={(e) => setNewItemDesc(e.target.value)}
                                    className="w-full bg-white dark:bg-admin-dark-bg border border-[#e5e5e5] dark:border-white/5 py-2.5 px-4 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-admin-accent"
                                />
                            </div>
                        </div>
                        <button 
                            type="button"
                            onClick={addListItem}
                            className="flex items-center gap-1.5 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-white/10 dark:hover:bg-white/20 text-[#171717] dark:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                        >
                            <Plus className="size-3.5" />
                            {t('addItem')}
                        </button>
                    </div>

                    {/* Current list items */}
                    {formData.list_items.length > 0 && (
                        <div className="border border-[#f0f0f0] dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-[#f5f5f5] dark:divide-white/5">
                            {formData.list_items.map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-4 bg-white dark:bg-white/5 hover:bg-[#fafafa] dark:hover:bg-white/10 transition-colors">
                                    <div className="min-w-0 flex-1 pr-4">
                                        <span className="block font-bold text-[#a39076] text-xs mb-0.5">{item.label}</span>
                                        <span className="block text-xs text-gray-500 dark:text-gray-400">{item.desc}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeListItem(index)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all flex-shrink-0"
                                    >
                                        <Trash2 className="size-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
