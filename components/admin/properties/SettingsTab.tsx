"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Sparkles, Loader2, Globe, Edit3, Check } from "lucide-react";
import { toast } from "sonner";
import { PropertyFormData } from "./PropertyFormSchema";
import { translatePropertyFields } from "@/app/actions/translate";

interface SettingsTabProps {
    onAutoTranslate: () => Promise<void>;
    isTranslating: boolean;
    activeLang: string;
    setActiveLang: (lang: string) => void;
}

export default function SettingsTab({ onAutoTranslate, isTranslating, activeLang, setActiveLang }: SettingsTabProps) {
    const [activeSubTab, setActiveSubTab] = useState<'general' | 'translations'>('translations');
    const { getValues } = useFormContext<PropertyFormData>();

    const languages = [
        { code: 'he', label: 'Hebrew (Israel)', flag: '🇮🇱' },
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
                    Translations
                </button>
                <button
                    type="button"
                    onClick={() => setActiveSubTab('general')}
                    className={`text-sm font-semibold transition-colors ${activeSubTab === 'general' ? 'text-[#171717]' : 'text-[#a3a3a3] hover:text-[#171717]'}`}
                >
                    General
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
                                    AI Auto-Translate
                                </h3>
                                <p className="text-sm text-[#737373] mt-2 max-w-xl">
                                    Automatically translate your content from the current active language (EN/PT) to all other supported languages using AI.
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
                                Start Translation
                            </button>
                        </div>
                    </div>

                    {/* Manual Translation / Language Management */}
                    <div>
                        <h3 className="text-lg font-bold text-[#171717] mb-4">Secondary Languages</h3>
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
                                                Editing Now
                                            </>
                                        ) : (
                                            <>
                                                <Edit3 className="size-4" />
                                                Edit Content
                                            </>
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                        {activeLang === 'he' && (
                            <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-800 text-sm">
                                <span className="font-bold">Note:</span> You are currently editing in <strong>Hebrew</strong>. Go back to any tab (Basic Info, Amenities...) to edit the Hebrew content. Switch back to EN/PT here or in the top bar when done.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeSubTab === 'general' && (
                <div className="flex flex-col items-center justify-center h-48 text-[#a3a3a3]">
                    <p className="text-lg font-medium">General Settings</p>
                    <p className="text-sm mt-2">More settings configurations coming soon.</p>
                </div>
            )}
        </div>
    );
}
