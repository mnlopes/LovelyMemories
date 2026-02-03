"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2, Globe, Edit3, Check, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<'general' | 'translations'>('general');
    const [isTranslating, setIsTranslating] = useState(false);
    const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini');
    const [geminiKey, setGeminiKey] = useState('');
    const [openAIKey, setOpenAIKey] = useState('');
    const [forceUpdate, setForceUpdate] = useState(true);
    const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);

    // Load keys from storage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const gKey = localStorage.getItem('gemini_api_key');
            if (gKey) setGeminiKey(gKey);

            const oKey = localStorage.getItem('openai_api_key');
            if (oKey) setOpenAIKey(oKey);
        }
    }, [provider]); // Depend on provider to ensure sync if needed, though running once is fine, key logic handles it.

    const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (provider === 'gemini') {
            setGeminiKey(val);
            localStorage.setItem('gemini_api_key', val);
        } else {
            setOpenAIKey(val);
            localStorage.setItem('openai_api_key', val);
        }
    };

    const onAutoTranslate = async () => {
        setLastResult(null);
        const activeKey = provider === 'gemini' ? geminiKey : openAIKey;

        if (!activeKey) {
            toast.error(`Please enter a valid ${provider === 'gemini' ? 'Gemini' : 'OpenAI'} API Key first.`);
            return;
        }

        setIsTranslating(true);
        try {
            const { translateAllProperties } = await import('@/app/actions/translate');
            toast.info(`Starting batch translation with ${provider === 'gemini' ? 'Gemini' : 'OpenAI'}...`);

            const result = await translateAllProperties(activeKey, provider, forceUpdate);

            setLastResult({ success: result.success, message: result.message || result.error || 'Unknown result' });

            if (result.success) {
                toast.success(result.message);
            } else {
                toast.error(`Translation failed: ${result.error}`);
            }
        } catch (error) {
            setLastResult({ success: false, message: "An unexpected network error occurred." });
            toast.error("An unexpected error occurred.");
            console.error(error);
        } finally {
            setIsTranslating(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <div className="size-12 rounded-2xl bg-white dark:bg-admin-dark-surface border border-[#eaeaea] dark:border-admin-dark-border flex items-center justify-center shadow-sm transition-colors duration-300">
                    <SettingsIcon className="size-6 text-[#171717] dark:text-admin-dark-text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-[#171717] dark:text-admin-dark-text-primary">System Settings</h1>
                    <p className="text-[#a3a3a3]">Manage translations, languages, and general configurations.</p>
                </div>
            </div>

            {/* Sub-Tabs Navigation */}
            <div className="flex items-center gap-8 border-b border-[#eaeaea] dark:border-admin-dark-border mb-8 transition-colors duration-300">
                <button
                    type="button"
                    onClick={() => setActiveTab('general')}
                    className={`pb-4 text-sm font-semibold transition-all relative ${activeTab === 'general' ? 'text-[#171717] dark:text-admin-dark-text-primary' : 'text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white'}`}
                >
                    General
                    {activeTab === 'general' && (
                        <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#171717] dark:bg-white rounded-t-full"></span>
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('translations')}
                    className={`pb-4 text-sm font-semibold transition-all relative ${activeTab === 'translations' ? 'text-[#171717] dark:text-admin-dark-text-primary' : 'text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white'}`}
                >
                    Translations
                    {activeTab === 'translations' && (
                        <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#171717] dark:bg-white rounded-t-full"></span>
                    )}
                </button>
            </div>

            {/* Content */}
            {activeTab === 'translations' && (
                <div className="space-y-8 max-w-4xl">
                    {/* AI Translation Section */}
                    <div className="bg-white dark:bg-admin-dark-surface rounded-2xl p-8 border border-[#eaeaea] dark:border-admin-dark-border shadow-sm transition-colors duration-300">
                        <div className="flex flex-col gap-6">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary flex items-center gap-2">
                                        <Sparkles className="size-5 text-violet-600 dark:text-violet-400" />
                                        AI Configuration
                                    </h3>

                                    {/* Provider Toggles */}
                                    <div className="flex bg-[#f5f5f5] dark:bg-admin-dark-bg p-1 rounded-lg transition-colors">
                                        <button
                                            type="button"
                                            onClick={() => setProvider('gemini')}
                                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${provider === 'gemini' ? 'bg-white dark:bg-admin-dark-surface shadow text-[#171717] dark:text-admin-dark-text-primary' : 'text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white'}`}
                                        >
                                            Gemini (Free)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setProvider('openai')}
                                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${provider === 'openai' ? 'bg-white dark:bg-admin-dark-surface shadow text-[#171717] dark:text-admin-dark-text-primary' : 'text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white'}`}
                                        >
                                            OpenAI
                                        </button>
                                    </div>
                                </div>
                                <p className="text-sm text-[#737373] dark:text-admin-dark-text-secondary max-w-xl leading-relaxed">
                                    {provider === 'gemini'
                                        ? "Enter your Google Gemini API Key. (Get a free key from Google AI Studio)."
                                        : "Enter your OpenAI API Key. (Use your paid OpenAI account)."}
                                </p>
                            </div>

                            <div className="flex items-end gap-4 p-4 bg-[#fafafa] dark:bg-admin-dark-bg rounded-xl border border-[#f5f5f5] dark:border-admin-dark-border transition-colors">
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-[#a3a3a3] uppercase tracking-wider mb-1.5 block">
                                        {provider === 'gemini' ? 'Gemini API Key' : 'OpenAI API Key'}
                                    </label>
                                    <input
                                        type="password"
                                        value={provider === 'gemini' ? geminiKey : openAIKey}
                                        onChange={handleKeyChange}
                                        placeholder={provider === 'gemini' ? "AIza..." : "sk-..."}
                                        className="w-full bg-white dark:bg-admin-dark-surface border border-[#eaeaea] dark:border-admin-dark-border rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-white transition-all dark:text-admin-dark-text-primary"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={onAutoTranslate}
                                    disabled={isTranslating || !(provider === 'gemini' ? geminiKey : openAIKey)}
                                    className="px-6 py-2.5 bg-[#171717] dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold shadow-sm hover:bg-black dark:hover:bg-gray-200 transition-all disabled:opacity-50 flex items-center gap-2 shrink-0 h-[42px]"
                                >
                                    {isTranslating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                                    {isTranslating ? 'Translating...' : 'Start Batch Translation'}
                                </button>
                            </div>

                            {/* Options */}
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer select-none group">
                                    <div className={`size-5 rounded border flex items-center justify-center transition-all ${forceUpdate ? 'bg-[#171717] dark:bg-white border-[#171717] dark:border-white' : 'bg-white dark:bg-admin-dark-surface border-[#eaeaea] dark:border-admin-dark-border'}`}>
                                        {forceUpdate && <Check className={`size-3 ${forceUpdate ? 'text-white dark:text-black' : ''}`} />}
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={forceUpdate}
                                        onChange={(e) => setForceUpdate(e.target.checked)}
                                        className="hidden"
                                    />
                                    <span className="text-sm font-medium text-[#171717] dark:text-admin-dark-text-primary">Force overwrite existing translations</span>
                                </label>
                                <span className="text-xs text-[#a3a3a3]">(Use this to fix incorrect or English-in-Hebrew fields)</span>
                            </div>

                            {/* Result Feedback */}
                            {lastResult && (
                                <div className={`p-4 rounded-xl border text-sm flex items-start gap-3 transition-colors ${lastResult.success ? 'bg-green-50 dark:bg-green-500/10 border-green-100 dark:border-green-500/20 text-green-800 dark:text-green-400' : 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20 text-red-800 dark:text-red-400'}`}>
                                    <div className={`mt-0.5 size-5 rounded-full flex items-center justify-center shrink-0 ${lastResult.success ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'}`}>
                                        {lastResult.success ? <Check className="size-3" /> : '!'}
                                    </div>
                                    <div>
                                        <p className="font-bold">{lastResult.success ? 'Translation Complete!' : 'Something went wrong'}</p>
                                        <p className="mt-1 opacity-90">{lastResult.message}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Language Management */}
                    <div>
                        <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary mb-6">Managed Languages</h3>
                        <div className="grid gap-4">
                            {/* Hebrew */}
                            <div className="flex items-center justify-between p-6 bg-white dark:bg-admin-dark-surface border border-[#eaeaea] dark:border-admin-dark-border rounded-2xl hover:border-[#d4d4d4] dark:hover:border-admin-dark-text-secondary transition-colors shadow-sm">
                                <div className="flex items-center gap-5">
                                    <div className="size-12 rounded-full bg-[#f5f5f5] dark:bg-admin-dark-bg flex items-center justify-center text-2xl border border-transparent dark:border-admin-dark-border">
                                        🇮🇱
                                    </div>
                                    <div>
                                        <p className="font-bold text-[#171717] dark:text-admin-dark-text-primary text-lg">Hebrew (Israel)</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="px-2 py-0.5 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 rounded-md text-[10px] font-bold uppercase tracking-wider border border-violet-100 dark:border-violet-500/20">RTL</span>
                                            <span className="text-xs text-[#a3a3a3] font-medium">Secondary Language</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-[#171717] dark:text-admin-dark-text-primary uppercase tracking-wider">content management</p>
                                    <p className="text-xs text-[#a3a3a3]">Managed via Translation Center</p>
                                </div>
                            </div>

                            {/* Adding EN/PT as informational */}
                            <div className="flex items-center justify-between p-6 bg-[#fafafa] dark:bg-admin-dark-bg border border-[#eaeaea] dark:border-admin-dark-border rounded-2xl opacity-75">
                                <div className="flex items-center gap-5">
                                    <div className="flex -space-x-3">
                                        <div className="size-10 rounded-full bg-[#f5f5f5] dark:bg-admin-dark-surface flex items-center justify-center text-xl ring-2 ring-white dark:ring-admin-dark-bg">🇬🇧</div>
                                        <div className="size-10 rounded-full bg-[#f5f5f5] dark:bg-admin-dark-surface flex items-center justify-center text-xl ring-2 ring-white dark:ring-admin-dark-bg">🇵🇹</div>
                                    </div>
                                    <div>
                                        <p className="font-bold text-[#171717] dark:text-admin-dark-text-primary">English & Portuguese</p>
                                        <p className="text-xs text-[#a3a3a3]">Base languages managed directly in Property Editors.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }

            {
                activeTab === 'general' && (
                    <div className="flex flex-col items-center justify-center h-64 text-[#a3a3a3] bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#eaeaea] dark:border-admin-dark-border transition-colors duration-300">
                        <p className="text-lg font-medium text-admin-dark-text-primary">General Settings</p>
                        <p className="text-sm mt-2">Global system configurations will appear here.</p>
                    </div>
                )
            }
        </div >
    );
}
