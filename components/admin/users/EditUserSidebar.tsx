"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Save, User, Mail, Phone } from "lucide-react";
import { updateUserProfile } from "@/app/actions/user";
import { toast } from "sonner";
import { Profile } from "@/lib/types";
import { useTranslations } from "next-intl";

interface EditUserSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    userToEdit: Profile | null;
}

export function EditUserSidebar({ isOpen, onClose, onSuccess, userToEdit }: EditUserSidebarProps) {
    const t = useTranslations("AdminUsers.editSidebar");
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phone: "",
    });

    useEffect(() => {
        if (userToEdit) {
            setFormData({
                fullName: userToEdit.full_name || "",
                email: userToEdit.email || "",
                phone: userToEdit.phone || "",
            });
        }
    }, [userToEdit]);

    if (!isOpen || !userToEdit) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { success } = await updateUserProfile(userToEdit.id, formData);
            if (success) {
                toast.success(t('success'));
                onSuccess();
                onClose();
            } else {
                toast.error(t('error'));
            }
        } catch (error: any) {
            toast.error(t('unknownError'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                onClick={onClose}
            />

            {/* Sidebar */}
            <div
                className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white dark:bg-admin-dark-surface shadow-2xl transition-transform duration-300 ease-out transform ${isOpen ? "translate-x-0" : "translate-x-full"}`}
            >
                <div className="flex h-full flex-col">
                    {/* Header */}
                    <div className="p-8 border-b border-[#f5f5f5] dark:border-admin-dark-border flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-[#171717] dark:text-admin-dark-text-primary">{t('title')}</h3>
                            <p className="text-sm text-[#a3a3a3] mt-1">{t('description')}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg rounded-full transition-colors text-[#a3a3a3]"
                        >
                            <X className="size-5" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
                        {/* Name Section */}
                        <div className="space-y-4">
                            <label className="text-xs font-bold text-[#a3a3a3] uppercase tracking-widest">{t('fullNameLabel')}</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#a3a3a3]" />
                                <input
                                    type="text"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border pl-10 pr-4 py-3 rounded-xl text-sm focus:ring-1 focus:ring-[#171717] outline-none transition-all dark:text-admin-dark-text-primary"
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>

                        {/* Email Section */}
                        <div className="space-y-4">
                            <label className="text-xs font-bold text-[#a3a3a3] uppercase tracking-widest">{t('emailLabel')}</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#a3a3a3]" />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border pl-10 pr-4 py-3 rounded-xl text-sm focus:ring-1 focus:ring-[#171717] outline-none transition-all dark:text-admin-dark-text-primary"
                                    placeholder="john@example.com"
                                />
                            </div>
                            <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-xl">
                                <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
                                    ⚠️ {t('emailWarning')}
                                </p>
                            </div>
                        </div>

                        {/* Phone Section */}
                        <div className="space-y-4">
                            <label className="text-xs font-bold text-[#a3a3a3] uppercase tracking-widest">{t('phoneNumberLabel')}</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#a3a3a3]" />
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border pl-10 pr-4 py-3 rounded-xl text-sm focus:ring-1 focus:ring-[#171717] outline-none transition-all dark:text-admin-dark-text-primary"
                                    placeholder="+351 912 345 678"
                                />
                            </div>
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="p-8 border-t border-[#f5f5f5] dark:border-admin-dark-border bg-[#fafafa]/50 dark:bg-admin-dark-bg/50">
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-4 border border-[#f5f5f5] dark:border-admin-dark-border text-[#171717] dark:text-admin-dark-text-primary font-bold rounded-2xl hover:bg-white dark:hover:bg-admin-dark-surface transition-all"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex-[2] py-4 bg-[#171717] dark:bg-white text-white dark:text-black font-bold rounded-2xl hover:bg-black dark:hover:bg-gray-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
                                {t('saveChanges')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
