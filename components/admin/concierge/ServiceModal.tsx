"use client";

import { useState, useEffect } from 'react';
import { X, Upload, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { translateText } from '@/app/actions/translate';

interface Service {
    id?: string;
    name_en: string;
    name_pt: string;
    name_he: string;
    description_en: string;
    description_pt: string;
    description_he: string;
    image: string;
    is_active: boolean;
}

interface ServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    service?: Service | null;
    onSave: () => void;
}

export default function ServiceModal({ isOpen, onClose, service, onSave }: ServiceModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [activeLang, setActiveLang] = useState<'en' | 'pt' | 'he'>('en');
    const [formData, setFormData] = useState<Service>({
        name_en: '',
        name_pt: '',
        name_he: '',
        description_en: '',
        description_pt: '',
        description_he: '',
        image: '',
        is_active: true
    });

    useEffect(() => {
        if (service) {
            setFormData(service);
        } else {
            setFormData({
                name_en: '',
                name_pt: '',
                name_he: '',
                description_en: '',
                description_pt: '',
                description_he: '',
                image: '',
                is_active: true
            });
        }
    }, [service, isOpen]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `concierge/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('concierge')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('concierge').getPublicUrl(filePath);
            setFormData(prev => ({ ...prev, image: data.publicUrl }));
            toast.success('Image uploaded successfully');
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error('Failed to upload image');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (service?.id) {
                const { error } = await supabase
                    .from('concierge_services')
                    .update(formData)
                    .eq('id', service.id);
                if (error) throw error;
                toast.success('Service updated');
            } else {
                const { error } = await supabase
                    .from('concierge_services')
                    .insert([formData]);
                if (error) throw error;
                toast.success('Service created');
            }
            onSave();
            onClose();
        } catch (error: any) {
            console.error('Error saving service:', error);
            // Enhanced error extracting for Supabase/Postgrest
            const technicalMsg = error.message || error.details || (typeof error === 'object' ? JSON.stringify(error) : String(error));
            toast.error(`Failed to save service. Technical error: ${technicalMsg}`);

            if (technicalMsg.includes('column') || technicalMsg.includes('name_he')) {
                toast.error('PROBABLE CAUSE: You need to run the SQL migration in Supabase Dashboard!', { duration: 10000 });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleAutoTranslate = async (targetLang: 'pt' | 'he') => {
        if (!formData.name_en && !formData.description_en) {
            toast.error('Please fill in English fields first');
            return;
        }

        setIsTranslating(true);
        const loadingToast = toast.loading(`Translating to ${targetLang === 'pt' ? 'Portuguese' : 'Hebrew'}...`);

        try {
            const [translatedName, translatedDesc] = await Promise.all([
                formData.name_en ? translateText(formData.name_en, targetLang) : Promise.resolve(''),
                formData.description_en ? translateText(formData.description_en, targetLang) : Promise.resolve('')
            ]);

            if (targetLang === 'pt') {
                setFormData(prev => ({
                    ...prev,
                    name_pt: translatedName,
                    description_pt: translatedDesc
                }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    name_he: translatedName,
                    description_he: translatedDesc
                }));
            }

            toast.success('Translation completed', { id: loadingToast });
        } catch (error) {
            console.error('Translation failed:', error);
            toast.error('AI translation failed. Please try again or fill manually.', { id: loadingToast });
        } finally {
            setIsTranslating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal Panel */}
            <div className="relative w-full max-w-2xl bg-white dark:bg-admin-dark-surface rounded-2xl shadow-xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200 transition-colors duration-300">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-[#171717] dark:text-admin-dark-text-primary">
                            {service ? 'Edit Service' : 'Add New Service'}
                        </h2>
                        <button onClick={onClose} className="text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white transition-colors">
                            <X className="size-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Image Upload */}
                        <div>
                            <label className="block text-xs font-bold text-[#a3a3a3] uppercase tracking-wider mb-2">Service Image</label>
                            <div className="flex items-center gap-4">
                                {formData.image && (
                                    <div className="relative group">
                                        <img src={formData.image} alt="Preview" className="w-24 h-24 rounded-lg object-cover border border-[#f5f5f5] dark:border-admin-dark-border shadow-sm" />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <label className="cursor-pointer flex items-center justify-center gap-2 w-full border-2 border-dashed border-[#f5f5f5] dark:border-admin-dark-border rounded-xl p-4 hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg transition-all group">
                                        <Upload className="size-5 text-[#a3a3a3] group-hover:text-[#171717] dark:group-hover:text-white transition-colors" />
                                        <span className="text-sm font-medium text-[#171717] dark:text-admin-dark-text-primary transition-colors">Upload Image</span>
                                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                    </label>
                                    <p className="text-[10px] text-[#a3a3a3] mt-1 text-center font-medium">Recommended: 800x600px, Max 2MB</p>
                                </div>
                            </div>
                        </div>

                        {/* Language Toggle */}
                        <div className="flex items-center justify-between pb-2 border-b border-[#f5f5f5] dark:border-admin-dark-border mb-4 transition-colors">
                            <h3 className="text-sm font-bold text-[#171717] dark:text-admin-dark-text-primary">Service Details</h3>
                            <div className="flex p-1 bg-[#f5f5f5] dark:bg-admin-dark-bg rounded-xl border border-[#e5e5e5] dark:border-admin-dark-border transition-colors">
                                <button
                                    type="button"
                                    onClick={() => setActiveLang('en')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeLang === 'en'
                                        ? 'bg-white dark:bg-admin-dark-surface text-[#171717] dark:text-admin-dark-text-primary shadow-sm'
                                        : 'text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white'
                                        }`}
                                >
                                    <span>🇬🇧</span>
                                    <span>EN</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveLang('pt')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeLang === 'pt'
                                        ? 'bg-white dark:bg-admin-dark-surface text-[#171717] dark:text-admin-dark-text-primary shadow-sm'
                                        : 'text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white'
                                        }`}
                                >
                                    <span>🇵🇹</span>
                                    <span>PT</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveLang('he')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeLang === 'he'
                                        ? 'bg-white dark:bg-admin-dark-surface text-[#171717] dark:text-admin-dark-text-primary shadow-sm'
                                        : 'text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white'
                                        }`}
                                >
                                    <span>🇮🇱</span>
                                    <span>HE</span>
                                </button>
                            </div>
                        </div>

                        {/* Content Inputs */}
                        <div className="space-y-4">
                            {activeLang === 'en' ? (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-[#a3a3a3] uppercase tracking-wider mb-1">Name (English)</label>
                                        <input
                                            type="text"
                                            value={formData.name_en || ''}
                                            onChange={e => setFormData({ ...formData, name_en: e.target.value })}
                                            className="w-full border border-[#f5f5f5] dark:border-admin-dark-border dark:bg-admin-dark-bg rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-[#171717] dark:focus:ring-white outline-none dark:text-admin-dark-text-primary transition-all"
                                            placeholder="e.g. Private Chef"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[#a3a3a3] uppercase tracking-wider mb-1">Description (English)</label>
                                        <textarea
                                            value={formData.description_en || ''}
                                            onChange={e => setFormData({ ...formData, description_en: e.target.value })}
                                            className="w-full border border-[#f5f5f5] dark:border-admin-dark-border dark:bg-admin-dark-bg rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-[#171717] dark:focus:ring-white outline-none h-24 resize-none dark:text-admin-dark-text-primary transition-all"
                                            placeholder="Describe the service in English..."
                                        />
                                    </div>
                                </>
                            ) : activeLang === 'pt' ? (
                                <>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-xs font-bold text-[#a3a3a3] uppercase tracking-wider">Name (Portuguese)</label>
                                        <button
                                            type="button"
                                            disabled={isTranslating}
                                            onClick={() => handleAutoTranslate('pt')}
                                            className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 disabled:opacity-50 transition-colors"
                                        >
                                            {isTranslating ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                                            AI Translate from English
                                        </button>
                                    </div>
                                    <div className="mb-4">
                                        <input
                                            type="text"
                                            value={formData.name_pt || ''}
                                            onChange={e => setFormData({ ...formData, name_pt: e.target.value })}
                                            className="w-full border border-[#f5f5f5] dark:border-admin-dark-border dark:bg-admin-dark-bg rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-[#171717] dark:focus:ring-white outline-none dark:text-admin-dark-text-primary transition-all"
                                            placeholder="e.g. Chef Privado"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[#a3a3a3] uppercase tracking-wider mb-1">Description (Portuguese)</label>
                                        <textarea
                                            value={formData.description_pt || ''}
                                            onChange={e => setFormData({ ...formData, description_pt: e.target.value })}
                                            className="w-full border border-[#f5f5f5] dark:border-admin-dark-border dark:bg-admin-dark-bg rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-[#171717] dark:focus:ring-white outline-none h-24 resize-none dark:text-admin-dark-text-primary transition-all"
                                            placeholder="Descreve o serviço em Português..."
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-xs font-bold text-[#a3a3a3] uppercase tracking-wider">Name (Hebrew)</label>
                                        <button
                                            type="button"
                                            disabled={isTranslating}
                                            onClick={() => handleAutoTranslate('he')}
                                            className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 disabled:opacity-50 transition-colors"
                                        >
                                            {isTranslating ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                                            AI Translate from English
                                        </button>
                                    </div>
                                    <div className="mb-4">
                                        <input
                                            type="text"
                                            dir="rtl"
                                            value={formData.name_he || ''}
                                            onChange={e => setFormData({ ...formData, name_he: e.target.value })}
                                            className="w-full border border-[#f5f5f5] dark:border-admin-dark-border dark:bg-admin-dark-bg rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-[#171717] dark:focus:ring-white outline-none text-right dark:text-admin-dark-text-primary transition-all"
                                            placeholder="e.g. Private Chef (in Hebrew)"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[#a3a3a3] uppercase tracking-wider mb-1">Description (Hebrew)</label>
                                        <textarea
                                            dir="rtl"
                                            value={formData.description_he || ''}
                                            onChange={e => setFormData({ ...formData, description_he: e.target.value })}
                                            className="w-full border border-[#f5f5f5] dark:border-admin-dark-border dark:bg-admin-dark-bg rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-[#171717] dark:focus:ring-white outline-none h-24 resize-none text-right dark:text-admin-dark-text-primary transition-all"
                                            placeholder="Describe the service in Hebrew..."
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Active Toggle */}
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                                className={`w-11 h-6 rounded-full transition-colors relative ${formData.is_active ? 'bg-[#171717] dark:bg-white' : 'bg-[#e5e5e5] dark:bg-admin-dark-border'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 rounded-full transition-transform ${formData.is_active ? 'bg-white dark:bg-black left-6' : 'bg-white dark:bg-gray-400 left-1'}`} />
                            </button>
                            <span className="text-sm font-medium text-[#171717] dark:text-admin-dark-text-primary">
                                {formData.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-[#f5f5f5] dark:border-admin-dark-border transition-colors">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white transition-colors"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-6 py-2 bg-[#171717] dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold hover:bg-[#000000] dark:hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2 transition-all shadow-sm"
                            >
                                {isLoading && <Loader2 className="size-4 animate-spin" />}
                                {service ? 'Save Changes' : 'Create Service'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
