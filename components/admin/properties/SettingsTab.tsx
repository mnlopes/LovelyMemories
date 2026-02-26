"use client";

import { useState, useEffect } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Sparkles, Loader2, Globe, Edit3, Check, User } from "lucide-react";
import { toast } from "sonner";
import { PropertyFormData } from "./PropertyFormSchema";
import { translatePropertyFields } from "@/app/actions/translate";
import { getOwners } from "@/app/actions/user";

interface SettingsTabProps {
    onAutoTranslate: () => Promise<void>;
    isTranslating: boolean;
    activeLang: string;
    setActiveLang: (lang: string) => void;
}

export default function SettingsTab({ onAutoTranslate, isTranslating, activeLang, setActiveLang }: SettingsTabProps) {
    const t = useTranslations('PropertyEditor');
    const [activeSubTab, setActiveSubTab] = useState<'general' | 'translations'>('translations');
    const { getValues, control, watch } = useFormContext<PropertyFormData>();
    const [owners, setOwners] = useState<{ id: string, full_name: string | null, email: string | null }[]>([]);
    const [isLoadingOwners, setIsLoadingOwners] = useState(false);

    useEffect(() => {
        const fetchOwners = async () => {
            setIsLoadingOwners(true);
            try {
                const data = await getOwners();
                setOwners(data || []);
            } catch (error) {
                console.error("Failed to fetch owners:", error);
                toast.error("Failed to load owners list");
            } finally {
                setIsLoadingOwners(false);
            }
        };

        if (activeSubTab === 'general') {
            fetchOwners();
        }
    }, [activeSubTab]);

    const languages: { code: string; label: string; flag: string }[] = [
        // { code: 'he', label: 'Hebrew (Israel)', flag: '🇮🇱' },
        // Add more secondary languages here
    ];

    return (
        <div className="space-y-6">
            {/* Sub-Tabs Navigation */}
            <div className="flex items-center gap-6 border-b border-[#eaeaea] pb-4">
                <button
                    type="button"
                    onClick={() => setActiveSubTab('translations')}
                    className={`text-sm font-semibold transition-colors ${activeSubTab === 'translations' ? 'text-[#171717]' : 'text-[#a3a3a3] hover:text-[#171717]'}`}
                >
                    {t('settings.translations')}
                </button>
                <button
                    type="button"
                    onClick={() => setActiveSubTab('general')}
                    className={`text-sm font-semibold transition-colors ${activeSubTab === 'general' ? 'text-[#171717]' : 'text-[#a3a3a3] hover:text-[#171717]'}`}
                >
                    {t('settings.general')}
                </button>
            </div>

            {/* Content */}
            {activeSubTab === 'translations' && (
                <div className="space-y-8">
                    {/* AI Translation Section */}
                    <div className="bg-[#fafafa] rounded-2xl p-6 border border-[#eaeaea]">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-[#171717] flex items-center gap-2">
                                    <Sparkles className="size-5 text-violet-600" />
                                    {t('settings.aiTranslate')}
                                </h3>
                                <p className="text-sm text-[#737373] mt-2 max-w-xl">
                                    {t('settings.aiTranslateDesc')}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={onAutoTranslate}
                                disabled={isTranslating}
                                className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-bold shadow-sm hover:shadow-md transition-all disabled:opacity-50 flex items-center gap-2 shrink-0"
                            >
                                {isTranslating ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Sparkles className="size-4" />
                                )}
                                {t('settings.startTranslation')}
                            </button>
                        </div>
                    </div>

                    {/* Manual Translation / Language Management */}
                    <div>
                        <h3 className="text-lg font-bold text-[#171717] mb-4">{t('settings.secondaryLangs')}</h3>
                        <div className="grid gap-4">
                            {languages.map((lang) => (
                                <div key={lang.code} className="flex items-center justify-between p-4 bg-white border border-[#eaeaea] rounded-xl hover:border-[#d4d4d4] transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="size-10 rounded-full bg-[#f5f5f5] flex items-center justify-center text-xl">
                                            {lang.flag}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-[#171717]">{lang.label}</p>
                                            <p className="text-xs text-[#a3a3a3] uppercase font-bold tracking-wider">{lang.code}</p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setActiveLang(lang.code)}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all flex items-center gap-2
                                            ${activeLang === lang.code
                                                ? 'bg-[#171717] text-white border-[#171717]'
                                                : 'bg-white text-[#171717] border-[#eaeaea] hover:bg-[#fafafa]'
                                            }`}
                                    >
                                        {activeLang === lang.code ? (
                                            <>
                                                <Check className="size-4" />
                                                {t('settings.editingNow')}
                                            </>
                                        ) : (
                                            <>
                                                <Edit3 className="size-4" />
                                                {t('settings.editContent')}
                                            </>
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeSubTab === 'general' && (
                <div className="space-y-8">
                    {/* Owner Assignment */}
                    <div className="bg-white p-6 rounded-2xl border border-[#eaeaea] space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="size-10 rounded-full bg-blue-50 flex items-center justify-center">
                                <User className="size-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-[#171717]">Property Owner</h3>
                                <p className="text-sm text-[#737373]">Assign an owner to this property to give them access to the Owner Portal.</p>
                            </div>
                        </div>

                        {isLoadingOwners ? (
                            <div className="flex items-center gap-2 text-sm text-[#a3a3a3] py-4">
                                <Loader2 className="size-4 animate-spin" />
                                Loading owners...
                            </div>
                        ) : (
                            <Controller
                                control={control}
                                name="owner_id"
                                render={({ field }) => (
                                    <div className="relative">
                                        <select
                                            {...field}
                                            value={field.value || ""}
                                            onChange={(e) => field.onChange(e.target.value || null)}
                                            className="w-full h-12 pl-4 pr-10 bg-[#fafafa] border border-[#eaeaea] rounded-xl text-sm font-medium text-[#171717] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717] transition-all appearance-none"
                                        >
                                            <option value="">Select an owner...</option>
                                            {owners.map((owner) => (
                                                <option key={owner.id} value={owner.id}>
                                                    {owner.full_name || owner.email} ({owner.email})
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#a3a3a3]">
                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                    </div>
                                )}
                            />
                        )}
                        <p className="text-xs text-[#a3a3a3] pl-1">
                            Only users with the 'Owner' role are listed here. To add a new owner, create a user and assign the role in the Users section.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
