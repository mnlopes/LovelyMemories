"use client";

import dynamic from "next/dynamic";
const DemographicsMap = dynamic(() => import("@/components/admin/DemographicsMap").then(mod => mod.DemographicsMap), {
    ssr: false,
    loading: () => <div className="h-full w-full min-h-[300px] bg-[#111] animate-pulse rounded-2xl border border-white/5" />
});
import { AnalyticsPanels } from "@/components/admin/AnalyticsPanels";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { TrafficTimeline } from "@/components/admin/TrafficTimeline";
import { useState, useEffect } from "react";
import { Sparkles, Loader2, Globe, Edit3, Check, Settings as SettingsIcon, Mail, Activity, Users, BarChart3, Clock, MapPin, Trash2, RefreshCw, X, ExternalLink, ChevronRight, Zap, Link2Off, AlertTriangle } from "lucide-react";
import { syncAllPropertiesICal } from "@/app/actions/ical";

export default function SettingsPage() {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [activeTab, setActiveTab] = useState<'general' | 'translations' | 'analytics' | 'ical'>('general');

    const [isTranslating, setIsTranslating] = useState(false);
    const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini');
    const [geminiKey, setGeminiKey] = useState('');
    const [openAIKey, setOpenAIKey] = useState('');
    const [forceUpdate, setForceUpdate] = useState(true);
    const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);

    const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);
    const [isUpdatingMaintenance, setIsUpdatingMaintenance] = useState(false);
    const [resendStatus, setResendStatus] = useState<'checking' | 'connected' | 'restricted' | 'error' | null>(null);
    const [resendError, setResendError] = useState<string | null>(null);

    const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error' | null>(null);
    const [dbLatency, setDbLatency] = useState<string | null>(null);
    const [isFlushingCache, setIsFlushingCache] = useState(false);

    // Analytics State
    const [analyticsStats, setAnalyticsStats] = useState<{
        liveVisitors: number,
        topCountries: any[],
        mapData: any[], // New field for full map data
        topDevices: any[],
        topBrowsers: any[],
        topSources: any[],
        totalSample: number
    } | null>(null);
    const [recentLogs, setRecentLogs] = useState<any[]>([]);
    const [chartData, setChartData] = useState<number[]>(Array(60).fill(0));
    const [timeRange, setTimeRange] = useState<'60m' | '6h' | '12h' | '24h'>('60m');
    const [totalDbLogs, setTotalDbLogs] = useState<number | null>(null);
    const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
    const [logLimit, setLogLimit] = useState(35);
    const [isPurgingLogs, setIsPurgingLogs] = useState(false);
    const [selectedLog, setSelectedLog] = useState<any | null>(null);
    const [isLive, setIsLive] = useState(true);
    const [showAdminLogs, setShowAdminLogs] = useState(false);

    // iCal Sync State
    const [icalInterval, setIcalInterval] = useState<number>(5);
    const [isUpdatingIcal, setIsUpdatingIcal] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
    const [isSyncingAll, setIsSyncingAll] = useState(false);
    const [syncFailures, setSyncFailures] = useState<any[]>([]);

    // iCal Robot Monitor State
    const [propertySyncData, setPropertySyncData] = useState<any[]>([]);
    const [isLoadingIcal, setIsLoadingIcal] = useState(false);

    // ... (AUTH EFFECT - Skipped for brevity in replacement if unchanged, but included if needed) ...

    // Auto-refresh logic (Polling)
    useEffect(() => {
        if (isAuthorized && isLive && activeTab === 'analytics') {
            const interval = setInterval(() => {
                loadAnalytics();
            }, 5000); // Poll every 5 seconds
            return () => clearInterval(interval);
        }
    }, [isAuthorized, isLive, activeTab, timeRange, showAdminLogs]);

    // Polling for iCal tab
    useEffect(() => {
        if (isAuthorized && activeTab === 'ical') {
            loadPropertySyncData();
            const interval = setInterval(() => {
                loadPropertySyncData();
            }, 5000); // Poll every 5 seconds

            return () => clearInterval(interval);
        }
    }, [isAuthorized, activeTab]);

    const loadPropertySyncData = async () => {
        try {
            const { getPropertySyncStatuses } = await import('@/app/actions/settings');
            const res = await getPropertySyncStatuses();
            if (res.success) {
                setPropertySyncData(res.properties || []);
            }
        } catch (error) {
            console.error("Failed to load property sync data:", error);
        }
    };

    const loadAnalytics = async (customLimit?: number) => {
        // Don't show global loading spinner on background refreshes
        // setIsLoadingAnalytics(true); 
        try {
            const { getVisitorStats, getRecentVisits, getTrafficData, getLogCount } = await import('@/app/actions/settings');
            const statsRes = await getVisitorStats(showAdminLogs);
            const logsRes = await getRecentVisits(customLimit || logLimit, showAdminLogs);
            const chartRes = await getTrafficData(timeRange, showAdminLogs);
            const countRes = await getLogCount();

            if (statsRes.success) setAnalyticsStats(statsRes as any);
            if (logsRes.success) setRecentLogs(logsRes.logs || []);
            if (chartRes.success) setChartData(chartRes.data || []);
            if (countRes.success) setTotalDbLogs(countRes.count ?? null);
        } catch (error) {
            console.error("Failed to load analytics:", error);
        } finally {
            setIsLoadingAnalytics(false);
        }
    };
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profile?.role !== 'super_admin') {
                const locale = window.location.pathname.split('/')[1] || 'en';
                router.push(`/${locale}/admin/properties`);
            } else {
                setIsAuthorized(true);
            }
        };
        checkAuth();
    }, [router]);

    // Load system settings
    useEffect(() => {
        if (isAuthorized) {
            const loadSettings = async () => {
                try {
                    const { getSystemSetting } = await import('@/app/actions/settings');
                    const maintenance = await getSystemSetting('maintenance_mode');
                    setMaintenanceMode(!!maintenance);

                    // Initial checks
                    handleCheckResend();
                    handleCheckDB();

                    // Load iCal Settings
                    const interval = await getSystemSetting('ical_sync_interval');
                    if (interval) setIcalInterval(Number(interval));
                    
                    const lastSync = await getSystemSetting('ical_last_sync_at');
                    if (lastSync) setLastSyncTime(lastSync);
                } catch (error) {
                    console.error("Failed to load settings:", error);
                }
            };
            loadSettings();
        }
    }, [isAuthorized]);

    // Load keys from storage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const gKey = localStorage.getItem('gemini_api_key');
            if (gKey) setGeminiKey(gKey);

            const oKey = localStorage.getItem('openai_api_key');
            if (oKey) setOpenAIKey(oKey);
        }
    }, [provider]);

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

    const handleToggleMaintenance = async () => {
        setIsUpdatingMaintenance(true);
        try {
            const { updateSystemSetting } = await import('@/app/actions/settings');
            const newStatus = !maintenanceMode;
            const result = await updateSystemSetting('maintenance_mode', newStatus);

            if (result.success) {
                setMaintenanceMode(newStatus);
                toast.success(newStatus ? "Maintenance Mode Activated" : "Maintenance Mode Deactivated");
            } else {
                toast.error("Failed to update maintenance mode");
            }
        } catch (error) {
            toast.error("An error occurred");
            console.error(error);
        } finally {
            setIsUpdatingMaintenance(false);
        }
    };

    const handleCheckResend = async () => {
        setResendStatus('checking');
        try {
            const { checkResendStatus } = await import('@/app/actions/settings');
            const result = await checkResendStatus();
            if (result.success) {
                setResendStatus(result.type as any || 'connected');
                setResendError(null);
            } else {
                setResendStatus('error');
                setResendError(result.error || "Invalid API Key");
            }
        } catch (error) {
            setResendStatus('error');
            setResendError("Connection check failed");
        }
    };

    const handleCheckDB = async () => {
        setDbStatus('checking');
        try {
            const { checkDatabaseStatus } = await import('@/app/actions/settings');
            const result = await checkDatabaseStatus();
            if (result.success) {
                setDbStatus('connected');
                setDbLatency(result.latency || null);
            } else {
                setDbStatus('error');
            }
        } catch (error) {
            setDbStatus('error');
        }
    };

    const handleFlushCache = async () => {
        setIsFlushingCache(true);
        const loadingToast = toast.loading("Invoking global revalidation...");
        try {
            const { flushGlobalCache } = await import('@/app/actions/settings');
            const result = await flushGlobalCache();
            if (result.success) {
                toast.success("Global Cache Flushed", { id: loadingToast });
            } else {
                toast.error(result.error || "Failed to flush cache", { id: loadingToast });
            }
        } catch (error) {
            toast.error("Unexpected error occurred", { id: loadingToast });
        } finally {
            setIsFlushingCache(false);
        }
    };

    const handleUpdateIcalInterval = async (val: number) => {
        setIsUpdatingIcal(true);
        try {
            const { updateSystemSetting } = await import('@/app/actions/settings');
            const result = await updateSystemSetting('ical_sync_interval', val);
            if (result.success) {
                setIcalInterval(val);
                toast.success(`Sync interval updated to ${val} minutes`);
            } else {
                toast.error("Failed to update interval");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsUpdatingIcal(false);
        }
    };

    const handleManualSyncAll = async () => {
        setIsSyncingAll(true);
        setSyncFailures([]);
        const loadingToast = toast.loading("Starting global iCal synchronization...");
        try {
            const result = await syncAllPropertiesICal();
            if (result.success) {
                setLastSyncTime(new Date().toISOString());
                setSyncFailures(result.failures || []);
                
                if (result.failures && result.failures.length > 0) {
                    toast.warning(`Sync partially complete. ${result.totalNewEvents} new events imported, but ${result.failures.length} properties failed.`, { id: loadingToast });
                } else {
                    toast.success(`Sync complete! Found ${result.totalNewEvents} new events across ${result.propertiesSynced} properties`, { id: loadingToast });
                }
            } else {
                toast.error(result.error || "Sync failed", { id: loadingToast });
            }
        } catch (error) {
            toast.error("An error occurred during sync", { id: loadingToast });
        } finally {
            setIsSyncingAll(false);
        }
    };



    const handleClearLogs = async () => {
        // Visual clear only as requested
        setRecentLogs([]);
        toast.success("Logs cleared visually. Database still holds historical records.");
    };

    const handlePurgeLogs = async () => {
        if (!confirm("This will permanently delete ALL logs older than 7 days from the database. Proceed?")) return;

        setIsPurgingLogs(true);
        const loadingToast = toast.loading("Purging historical logs...");
        try {
            const { purgeLogs } = await import('@/app/actions/settings');
            const result = await purgeLogs(7);
            if (result.success) {
                toast.success("Logs pruned successfully", { id: loadingToast });
                loadAnalytics();
            } else {
                toast.error(result.error || "Failed to purge logs", { id: loadingToast });
            }
        } catch (error) {
            toast.error("Unexpected error", { id: loadingToast });
        } finally {
            setIsPurgingLogs(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
    };

    useEffect(() => {
        if (activeTab === 'analytics' && isAuthorized) {
            loadAnalytics();
            if (isLive) {
                const interval = setInterval(() => loadAnalytics(), 15000); // 15s when live
                return () => clearInterval(interval);
            }
        }
    }, [activeTab, isAuthorized, timeRange, isLive, showAdminLogs]);

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

    if (isAuthorized === null) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#171717]"></div>
            </div>
        );
    }

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
                <button
                    type="button"
                    onClick={() => setActiveTab('analytics')}
                    className={`pb-4 text-sm font-semibold transition-all relative ${activeTab === 'analytics' ? 'text-[#171717] dark:text-admin-dark-text-primary' : 'text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white'}`}
                >
                    Analytics
                    {activeTab === 'analytics' && (
                        <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#171717] dark:bg-white rounded-t-full"></span>
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('ical')}
                    className={`pb-4 text-sm font-semibold transition-all relative ${activeTab === 'ical' ? 'text-[#171717] dark:text-admin-dark-text-primary' : 'text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white'}`}
                >
                    iCal Robot
                    {activeTab === 'ical' && (
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
            )}

            {activeTab === 'general' && (
                <div className="space-y-8 max-w-4xl">
                    {/* Maintenance Mode Section */}
                    <div className="bg-white dark:bg-admin-dark-surface rounded-2xl p-8 border border-[#eaeaea] dark:border-admin-dark-border shadow-sm transition-colors duration-300">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary flex items-center gap-2">
                                    <div className={cn("size-2 rounded-full", maintenanceMode ? "bg-rose-500 animate-pulse" : "bg-emerald-500")} />
                                    Maintenance Mode
                                </h3>
                                <p className="text-sm text-[#737373] dark:text-admin-dark-text-secondary max-w-md">
                                    When active, the public site will be restricted. Only administrators will have access to manage the platform.
                                </p>
                            </div>
                            <button
                                onClick={handleToggleMaintenance}
                                disabled={isUpdatingMaintenance}
                                className={cn(
                                    "px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2",
                                    maintenanceMode
                                        ? "bg-rose-600 text-white hover:bg-rose-700 hover:shadow-lg hover:shadow-rose-500/20"
                                        : "bg-[#f5f5f5] dark:bg-white/5 text-[#171717] dark:text-white hover:bg-[#eaeaea] dark:hover:bg-white/10"
                                )}
                            >
                                {isUpdatingMaintenance ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : maintenanceMode ? (
                                    "Deactivate Maintenance"
                                ) : (
                                    "Activate Maintenance"
                                )}
                            </button>
                        </div>

                        {maintenanceMode && (
                            <div className="mt-6 p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-xl flex items-start gap-3">
                                <div className="text-rose-600 dark:text-rose-400 mt-0.5">⚠️</div>
                                <div className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed font-medium">
                                    <b>Warning:</b> The "Panic Button" is ON. Visitors will see the maintenance landing page. This is useful for critical updates or security patches.
                                </div>
                            </div>
                        )}
                    </div>

                    {/* External Services Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Resend Status */}
                        <div className="bg-white dark:bg-admin-dark-surface rounded-2xl p-6 border border-[#eaeaea] dark:border-admin-dark-border shadow-sm transition-colors duration-300 flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400">
                                        <Mail className="size-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-[#171717] dark:text-admin-dark-text-primary">Email Service</h4>
                                        <p className="text-[10px] text-[#a3a3a3] uppercase font-bold tracking-widest">Resend Infrastructure</p>
                                    </div>
                                </div>
                                <div className={cn(
                                    "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border transition-all",
                                    resendStatus === 'connected' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20" :
                                        resendStatus === 'restricted' ? "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-100 dark:border-sky-500/20" :
                                            resendStatus === 'error' ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-500/20" :
                                                "bg-gray-50 dark:bg-white/5 text-gray-500 border-gray-100 dark:border-white/10"
                                )}>
                                    {resendStatus === 'restricted' ? 'Restricted' : (resendStatus || 'Offline')}
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-4 gap-4">
                                <div className="flex-1">
                                    {resendStatus === 'error' && resendError && (
                                        <p className="text-[10px] text-rose-500 font-medium truncate italic">{resendError}</p>
                                    )}
                                    {resendStatus === 'restricted' && (
                                        <p className="text-[10px] text-sky-500 font-medium italic">Validated (Sending Only)</p>
                                    )}
                                    {resendStatus === 'connected' && (
                                        <p className="text-[10px] text-emerald-500 font-medium italic">All systems operational</p>
                                    )}
                                </div>
                                <button
                                    onClick={handleCheckResend}
                                    disabled={resendStatus === 'checking'}
                                    className="text-[10px] font-black uppercase tracking-widest text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white transition-colors"
                                >
                                    {resendStatus === 'checking' ? 'Testing...' : 'Test Connection'}
                                </button>
                            </div>
                        </div>

                        {/* Database Health Card */}
                        <div className="bg-white dark:bg-admin-dark-surface rounded-2xl p-6 border border-[#eaeaea] dark:border-admin-dark-border shadow-sm transition-colors duration-300 flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400">
                                        <Loader2 className={cn("size-5", dbStatus === 'checking' && "animate-spin")} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-[#171717] dark:text-admin-dark-text-primary">Database Health</h4>
                                        <p className="text-[10px] text-[#a3a3a3] uppercase font-bold tracking-widest">Supabase Engine</p>
                                    </div>
                                </div>
                                <div className={cn(
                                    "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border transition-all",
                                    dbStatus === 'connected' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20" :
                                        dbStatus === 'error' ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-500/20" :
                                            "bg-gray-50 dark:bg-white/5 text-gray-500 border-gray-100 dark:border-white/10"
                                )}>
                                    {dbStatus || 'Offline'}
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-4">
                                <p className="text-[10px] text-[#a3a3a3] font-medium italic">
                                    {dbStatus === 'connected' ? `Connection active (${dbLatency})` : 'System managed link.'}
                                </p>
                                <button
                                    onClick={handleCheckDB}
                                    disabled={dbStatus === 'checking'}
                                    className="text-[10px] font-black uppercase tracking-widest text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white transition-colors"
                                >
                                    Ping
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* iCal Synchronization Robot Settings */}
                    <div className="bg-white dark:bg-admin-dark-surface rounded-2xl p-8 border border-[#eaeaea] dark:border-admin-dark-border shadow-sm transition-colors duration-300">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary flex items-center gap-2">
                                    <Zap className="size-5 text-sky-500" />
                                    iCal Synchronization Robot
                                </h3>
                                <p className="text-sm text-[#737373] dark:text-admin-dark-text-secondary max-w-md">
                                    Configure how often the system checks external calendars (Airbnb, etc.) for new reservations.
                                </p>
                                {lastSyncTime && (
                                    <p className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-widest flex items-center gap-1 mt-2">
                                        <Clock className="size-3" />
                                        Last Global Sync: {new Date(lastSyncTime).toLocaleString()}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex flex-wrap bg-[#f5f5f5] dark:bg-admin-dark-bg p-1 rounded-xl border border-[#eaeaea] dark:border-admin-dark-border shrink-0">
                                    {[1, 2, 3, 5, 10, 30].map((mins) => (
                                        <button
                                            key={mins}
                                            onClick={() => handleUpdateIcalInterval(mins)}
                                            disabled={isUpdatingIcal}
                                            className={cn(
                                                "px-3 md:px-4 py-2 text-xs font-bold rounded-lg transition-all",
                                                icalInterval === mins 
                                                    ? "bg-white dark:bg-admin-dark-surface shadow-sm text-[#171717] dark:text-admin-dark-text-primary" 
                                                    : "text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white"
                                            )}
                                        >
                                            {mins === 1 ? '1 min' : `${mins} min`}
                                        </button>
                                    ))}
                                </div>
                                
                                <div className="h-8 w-px bg-[#eaeaea] dark:bg-admin-dark-border mx-2 hidden lg:block" />

                                <button
                                    onClick={handleManualSyncAll}
                                    disabled={isSyncingAll}
                                    className="px-6 py-2.5 bg-sky-500 text-white rounded-xl font-bold text-sm hover:bg-sky-600 transition-all flex items-center gap-2 shadow-sm shadow-sky-500/10 disabled:opacity-50 whitespace-nowrap"
                                >
                                    {isSyncingAll ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                                    Sync All Now
                                </button>
                            </div>
                        </div>

                        {/* Sync Failures Display */}
                        {syncFailures.length > 0 && (
                            <div className="mt-8 pt-6 border-t border-rose-100 dark:border-rose-500/10 transition-all duration-500 animate-in fade-in slide-in-from-top-4">
                                <div className="flex items-center gap-2 mb-4 text-rose-600 dark:text-rose-400">
                                    <X className="size-4" />
                                    <h4 className="text-sm font-bold uppercase tracking-wider">Sync Failures ({syncFailures.length})</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {syncFailures.map((failure, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-rose-50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/10 rounded-xl hover:bg-rose-100/50 dark:hover:bg-rose-500/10 transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className="size-8 rounded-lg bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
                                                    <MapPin className="size-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-[#171717] dark:text-admin-dark-text-primary">{typeof failure.title === 'object' && failure.title !== null ? ((failure.title as any).en || (failure.title as any).pt || (failure.title as any).he || 'Untitled') : (failure.title || 'Untitled')}</p>
                                                    <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium break-all">{failure.error}</p>
                                                </div>
                                            </div>
                                            <div className="text-[9px] font-bold text-[#a3a3a3] uppercase tracking-widest hidden sm:block shrink-0 ml-4">
                                                ID: {typeof failure.id === 'string' ? failure.id.substring(0, 6) : 'N/A'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <button 
                                        onClick={() => setSyncFailures([])}
                                        className="text-xs font-bold text-[#737373] hover:text-[#171717] dark:hover:text-white transition-colors flex items-center gap-1"
                                    >
                                        <X className="size-3" />
                                        Dismiss Error List
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Site Performance & Cache */}
                    <div className="bg-white dark:bg-admin-dark-surface rounded-2xl p-8 border border-[#eaeaea] dark:border-admin-dark-border shadow-sm transition-colors duration-300">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary flex items-center gap-2">
                                    <Sparkles className="size-5 text-amber-500" />
                                    Site Performance
                                </h3>
                                <p className="text-sm text-[#737373] dark:text-admin-dark-text-secondary max-w-md">
                                    Force a global revalidation of all cached routes. Use this after bulk updates or when changes aren't immediately visible.
                                </p>
                            </div>
                            <button
                                onClick={handleFlushCache}
                                disabled={isFlushingCache}
                                className="px-6 py-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-xl font-bold text-sm hover:bg-amber-500/20 transition-all flex items-center gap-2"
                            >
                                {isFlushingCache ? <Loader2 className="size-4 animate-spin" /> : <Globe className="size-4" />}
                                Flush Global Cache
                            </button>
                        </div>
                    </div>

                    {/* Database Maintenance Section */}
                    <div className="bg-white dark:bg-admin-dark-surface rounded-2xl p-8 border border-[#eaeaea] dark:border-admin-dark-border shadow-sm transition-colors duration-300">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary flex items-center gap-2">
                                    <Trash2 className="size-5 text-red-500" />
                                    Data Retention & Purge
                                </h3>
                                <p className="text-sm text-[#737373] dark:text-admin-dark-text-secondary max-w-md">
                                    Manage the size of your visitor logs database. Total records currently stored: <b className="text-black dark:text-white">{totalDbLogs !== null ? totalDbLogs.toLocaleString() : '...'}</b>
                                </p>
                            </div>
                            <button
                                onClick={handlePurgeLogs}
                                disabled={isPurgingLogs}
                                className="px-6 py-2.5 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 rounded-xl font-bold text-sm hover:bg-red-500/20 transition-all flex items-center gap-2"
                            >
                                {isPurgingLogs ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                                Purge Logs ({'>'} 7 days)
                            </button>
                        </div>
                    </div>

                    {/* Informational Card */}
                    <div className="p-6 rounded-2xl bg-[#fafafa]/50 dark:bg-admin-dark-bg/50 border border-[#f5f5f5] dark:border-admin-dark-border">
                        <h4 className="text-xs font-bold text-[#171717] dark:text-white uppercase tracking-widest mb-3">About these settings</h4>
                        <p className="text-xs text-[#a3a3a3] leading-relaxed">
                            Maintenance mode and service checks are critical tools for the Super Admin. Changes made here affect the public availability of the site in real-time. Use with caution.
                        </p>
                    </div>
                </div>
            )}

            {activeTab === 'analytics' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white uppercase tracking-tighter">Real-time Performance</h2>
                        <div className="flex bg-[#171717] dark:bg-admin-dark-surface p-1 rounded-xl border border-white/5 shadow-inner">
                            {(['60m', '6h', '12h', '24h'] as const).map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setTimeRange(r)}
                                    className={cn(
                                        "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                                        timeRange === r
                                            ? "bg-white text-black shadow-lg"
                                            : "text-white/40 hover:text-white"
                                    )}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Activity Timeline (Vercel Style) */}
                    <div className="mb-4">
                        <TrafficTimeline data={chartData} range={timeRange} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* Demographics Map (Takes 2 columns on large screens) */}
                        <div className="lg:col-span-2 min-h-[300px]">
                            <DemographicsMap
                                data={analyticsStats?.mapData || []}
                                className="h-full min-h-[300px]"
                            />
                        </div>

                        {/* Live Visitors Card (Enhanced) */}
                        <div className="bg-[#111] dark:bg-admin-dark-surface rounded-2xl p-6 border border-white/5 shadow-2xl flex flex-col justify-center relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Activity className="size-24 text-emerald-500" />
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20">
                                        <Activity className="size-6" />
                                    </div>
                                    <h4 className="font-bold text-white/40 uppercase text-xs tracking-[0.2em]">Live Visitors</h4>
                                </div>

                                <div className="flex items-baseline gap-2">
                                    <p className="text-6xl font-black text-white tracking-tighter">
                                        {analyticsStats?.liveVisitors || 0}
                                    </p>
                                    <div className="size-3 rounded-full bg-emerald-500 animate-pulse mb-2 shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                                </div>
                                <p className="text-xs text-white/30 font-medium italic mt-2">Real-time unique sessions (last 5min)</p>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Panels (Devices, Sources, Browsers) */}
                    <div className="mb-8">
                        <AnalyticsPanels
                            devices={analyticsStats?.topDevices || []}
                            browsers={analyticsStats?.topBrowsers || []}
                            sources={analyticsStats?.topSources || []}
                            total={analyticsStats?.totalSample || 0}
                        />
                    </div>

                    {/* Detailed Log Table - HIGH DENSITY */}
                    <div className="bg-[#171717] dark:bg-admin-dark-surface rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                            <h3 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-tighter">
                                <BarChart3 className="size-4 text-sky-500" />
                                Activity Logs
                            </h3>
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-4 border-r border-white/5 pr-6">
                                    <button
                                        onClick={() => setIsLive(!isLive)}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all text-[9px] font-bold uppercase tracking-widest",
                                            isLive
                                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                                : "bg-white/5 border-white/10 text-white/40 hover:text-white"
                                        )}
                                    >
                                        <div className={cn(
                                            "size-1.5 rounded-full",
                                            isLive ? "bg-emerald-500 animate-pulse" : "bg-white/20"
                                        )} />
                                        {isLive ? 'Live' : 'Paused'}
                                    </button>

                                    <button
                                        onClick={() => setShowAdminLogs(!showAdminLogs)}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all text-[9px] font-bold uppercase tracking-widest",
                                            showAdminLogs
                                                ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                                                : "bg-white/5 border-white/10 text-white/40 hover:text-white"
                                        )}
                                    >
                                        <Users className="size-3" />
                                        {showAdminLogs ? 'Admins' : 'Visitors'}
                                    </button>
                                </div>

                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={handleClearLogs}
                                        disabled={isPurgingLogs || recentLogs.length === 0}
                                        className="text-[9px] font-bold uppercase tracking-widest text-red-500 hover:text-red-600 disabled:opacity-30 flex items-center gap-2 transition-all"
                                    >
                                        {isPurgingLogs ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                                        Clear Screen
                                    </button>
                                    <div className="h-4 w-[1px] bg-white/10" />
                                    <button
                                        onClick={() => loadAnalytics()}
                                        className="text-[9px] font-bold uppercase tracking-widest text-sky-400 hover:opacity-70 flex items-center gap-2 transition-all font-mono"
                                    >
                                        {isLoadingAnalytics ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                                        REFRESH
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto font-mono">
                            <table className="w-full text-left table-fixed">
                                <thead className="bg-[#f5f5f5] dark:bg-white/5 border-b border-white/10">
                                    <tr>
                                        <th className="w-[120px] px-4 py-2 text-[9px] font-black text-[#a3a3a3] uppercase tracking-widest">Time</th>
                                        <th className="w-[180px] px-4 py-2 text-[9px] font-black text-[#a3a3a3] uppercase tracking-widest">Source</th>
                                        <th className="px-4 py-2 text-[9px] font-black text-[#a3a3a3] uppercase tracking-widest">Request Path</th>
                                        <th className="w-[60px] px-4 py-2 text-[9px] font-black text-[#a3a3a3] uppercase tracking-widest text-right">Loc</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {recentLogs.map((log: any) => {
                                        const isAdmin = log.is_admin_view;
                                        const role = log.user_role || 'visitor';

                                        return (
                                            <tr
                                                key={log.id}
                                                onClick={() => setSelectedLog(log)}
                                                className={cn(
                                                    "hover:bg-white/[0.05] transition-colors group cursor-pointer border-l-[3px]",
                                                    isAdmin ? "border-violet-500" : "border-emerald-500",
                                                    selectedLog?.id === log.id && "bg-white/[0.08]"
                                                )}
                                            >
                                                <td className="px-4 py-1.5 whitespace-nowrap">
                                                    <span className="text-[10px] text-[#737373]">
                                                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-1.5 whitespace-nowrap overflow-hidden">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-[#a3a3a3] min-w-[18px]">
                                                            {log.country === 'Unknown' || !log.country ? 'DEV' : log.country}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-white/90 truncate">
                                                            {log.city === 'Unknown' || !log.city ? 'Localhost' : log.city}
                                                        </span>
                                                        {role !== 'visitor' && (
                                                            <span className={cn(
                                                                "px-1 py-[1px] rounded-[2px] text-[7px] font-black",
                                                                role === 'super_admin' ? "bg-amber-100 text-amber-700" : "bg-violet-100 text-violet-700"
                                                            )}>
                                                                {role.charAt(0)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-1.5 overflow-hidden">
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn(
                                                            "text-[9px] font-bold px-1 rounded-[2px]",
                                                            isAdmin ? "text-violet-400 bg-violet-400/10" : "text-emerald-400 bg-emerald-400/10"
                                                        )}>
                                                            {isAdmin ? 'SYS' : 'GET'}
                                                        </span>
                                                        <span className="text-[10px] text-white/60 truncate font-mono tracking-tight">
                                                            {log.path || '/'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-1.5 text-right whitespace-nowrap">
                                                    <span className="text-[9px] font-bold text-[#a3a3a3]">{log.locale}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {recentLogs.length > 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-4 text-center bg-white/[0.01]">
                                                <button
                                                    onClick={() => {
                                                        const newLimit = logLimit + 50;
                                                        setLogLimit(newLimit);
                                                        loadAnalytics(newLimit);
                                                    }}
                                                    className="text-[9px] font-black uppercase tracking-widest text-white border border-white/10 px-6 py-2 rounded-lg hover:bg-white hover:text-[#171717] transition-all shadow-sm"
                                                >
                                                    {isLoadingAnalytics ? "Loading Logs..." : `Show More (+50 Rows)`}
                                                </button>
                                            </td>
                                        </tr>
                                    )}
                                    {recentLogs.length === 0 && !isLoadingAnalytics && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-[#404040] text-xs font-mono italic">
                                                Listening for traffic...
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'ical' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-[#171717] dark:text-white uppercase tracking-tighter">iCal Synchronization Robot</h2>
                            <p className="text-sm text-[#737373] dark:text-admin-dark-text-secondary">Monitor real-time synchronization across all properties.</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => loadPropertySyncData()}
                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-admin-dark-surface border border-[#eaeaea] dark:border-admin-dark-border rounded-xl text-sm font-bold text-[#171717] dark:text-white hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg transition-all shadow-sm"
                            >
                                <RefreshCw className={cn("size-4", isLoadingIcal && "animate-spin")} />
                                Refresh Status
                            </button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white dark:bg-admin-dark-surface rounded-2xl p-6 border border-[#eaeaea] dark:border-admin-dark-border shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500">
                                    <Globe className="size-5" />
                                </div>
                                <h4 className="font-bold text-xs uppercase tracking-widest text-[#737373]">Total Properties</h4>
                            </div>
                            <p className="text-4xl font-black text-[#171717] dark:text-white tracking-tighter">
                                {propertySyncData.length}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-admin-dark-surface rounded-2xl p-6 border border-[#eaeaea] dark:border-admin-dark-border shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                    <Check className="size-5" />
                                </div>
                                <h4 className="font-bold text-xs uppercase tracking-widest text-[#737373]">Healthy</h4>
                            </div>
                            <p className="text-4xl font-black text-emerald-500 tracking-tighter">
                                {propertySyncData.filter(p => p.sync_status === 'success').length}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-admin-dark-surface rounded-2xl p-6 border border-[#eaeaea] dark:border-admin-dark-border shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
                                    <Activity className="size-5" />
                                </div>
                                <h4 className="font-bold text-xs uppercase tracking-widest text-[#737373]">Issues Found</h4>
                            </div>
                            <p className="text-4xl font-black text-rose-500 tracking-tighter">
                                {propertySyncData.filter(p => p.sync_status === 'failed').length}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-admin-dark-surface rounded-2xl p-6 border border-[#eaeaea] dark:border-admin-dark-border shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                                    <Link2Off className="size-5" />
                                </div>
                                <h4 className="font-bold text-xs uppercase tracking-widest text-[#737373]">Missing Links</h4>
                            </div>
                            <p className="text-4xl font-black text-amber-500 tracking-tighter">
                                {propertySyncData.filter(p => !p.ical_import_urls || p.ical_import_urls.length === 0).length}
                            </p>
                        </div>
                    </div>

                    {/* Properties Table */}
                    <div className="bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#eaeaea] dark:border-admin-dark-border shadow-sm overflow-hidden transition-colors duration-300">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[#f5f5f5] dark:bg-admin-dark-bg border-b border-[#eaeaea] dark:border-admin-dark-border">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-[#a3a3a3] dark:text-admin-dark-text-secondary uppercase tracking-widest">Property</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-[#a3a3a3] dark:text-admin-dark-text-secondary uppercase tracking-widest">Last Sync</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-[#a3a3a3] dark:text-admin-dark-text-secondary uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-[#a3a3a3] dark:text-admin-dark-text-secondary uppercase tracking-widest">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#eaeaea] dark:divide-admin-dark-border">
                                    {propertySyncData.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-[#a3a3a3] text-sm italic">
                                                No properties with iCal URLs found.
                                            </td>
                                        </tr>
                                    ) : propertySyncData.map((property) => {
                                        const lastSync = property.last_sync_at ? new Date(property.last_sync_at) : null;
                                        const now = new Date();
                                        const intervalMs = (icalInterval || 3) * 60 * 1000;
                                        const isOverdue = lastSync ? (now.getTime() - lastSync.getTime() > intervalMs) : true;
                                        
                                        return (
                                            <tr key={property.id} className="hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-[#171717] dark:text-white text-sm leading-tight">
                                                            {typeof property.title === "object" 
                                                                ? (property.title?.pt || property.title?.en || "Unnamed Property") 
                                                                : (property.title || `Property ${property.id.substring(0, 8)}`)}
                                                        </span>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] text-[#a3a3a3] font-mono uppercase">ID: {property.id.substring(0, 8)}</span>
                                                            {(!property.ical_import_urls || property.ical_import_urls.length === 0) && (
                                                                <>
                                                                    <span className="text-[#a3a3a3] text-[10px]">•</span>
                                                                    <span className="flex items-center gap-1 text-[9px] font-black text-rose-500 uppercase tracking-widest">
                                                                        <AlertTriangle className="size-3" />
                                                                        Sync Link Missing
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="size-3.5 text-[#a3a3a3]" />
                                                        <span className="text-sm text-[#171717] dark:text-white font-medium">
                                                            {lastSync ? lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : 'Never'}
                                                        </span>
                                                        {isOverdue && property.is_active && property.ical_import_urls?.length > 0 && (
                                                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase tracking-tighter animate-pulse border border-amber-500/20">
                                                                In Queue
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className={cn(
                                                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest w-fit border",
                                                        property.sync_status === 'success' 
                                                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                                            : property.sync_status === 'failed'
                                                                ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                                                : "bg-gray-500/10 text-gray-500 border-gray-500/20"
                                                    )}>
                                                        {property.sync_status || 'Pending'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {property.last_sync_error ? (
                                                        <p className="text-[11px] text-rose-500 dark:text-rose-400 font-medium max-w-[200px] truncate hover:whitespace-normal transition-all" title={property.last_sync_error}>
                                                            {property.last_sync_error}
                                                        </p>
                                                    ) : (
                                                        <span className="text-xs text-[#a3a3a3]">Synced successfully</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Vercel-style Log Detail Panel */}
            {activeTab === 'analytics' && selectedLog && (
                <div className="fixed top-0 right-0 w-[450px] h-full bg-[#0a0a0a] border-l border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] z-50 animate-in slide-in-from-right duration-300 overflow-y-auto">
                    <div className="sticky top-0 bg-[#0a0a0a]/90 backdrop-blur-md z-10 p-6 border-b border-white/5 flex items-center justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                                    selectedLog.status >= 400 ? "bg-red-500/20 text-red-500" : "bg-emerald-500/20 text-emerald-500"
                                )}>
                                    {selectedLog.method || 'GET'} {selectedLog.status || 200}
                                </span>
                                <span className="text-[10px] font-bold text-white/40 font-mono">{selectedLog.id.slice(0, 8)}</span>
                            </div>
                            <h3 className="text-white font-mono text-xs truncate max-w-[300px]">
                                {selectedLog.path || '/'}
                            </h3>
                        </div>
                        <button
                            onClick={() => setSelectedLog(null)}
                            className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
                        >
                            <X className="size-5" />
                        </button>
                    </div>

                    <div className="p-8 space-y-10">
                        {/* Status Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="size-2 rounded-full bg-emerald-500" />
                                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Request started</span>
                                <span className="text-[10px] font-bold text-white/40 ml-auto font-mono">
                                    {new Date(selectedLog.created_at).toUTCString()}
                                </span>
                            </div>

                            <div className="grid grid-cols-[100px_1fr] gap-x-4 gap-y-6">
                                <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Path</label>
                                <span className="text-[11px] text-sky-400 font-mono break-all leading-relaxed bg-white/5 px-2 py-1 rounded-md">{selectedLog.path}</span>

                                <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Host</label>
                                <span className="text-[11px] text-white/80 font-mono break-all leading-relaxed">{selectedLog.host || 'Unknown'}</span>

                                <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest">User Agent</label>
                                <span className="text-[10px] text-white/50 leading-relaxed font-mono bg-white/[0.02] p-3 rounded-lg border border-white/5">
                                    {selectedLog.user_agent}
                                </span>

                                <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Referer</label>
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <span className="text-[11px] text-white/40 font-mono truncate italic">
                                        {selectedLog.referer || 'Direct'}
                                    </span>
                                </div>

                                <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Request ID</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-white/40 font-mono break-all leading-relaxed bg-white/5 px-2 py-1 rounded-md flex-1">
                                        {selectedLog.request_id || 'N/A'}
                                    </span>
                                    {selectedLog.request_id && (
                                        <button
                                            onClick={() => copyToClipboard(selectedLog.request_id)}
                                            className="p-1.5 hover:bg-white/10 rounded-md text-white/20 hover:text-white transition-colors"
                                        >
                                            <Edit3 className="size-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Location & Routing Section */}
                        <div className="pt-8 border-t border-white/5 space-y-4">
                            <div className="flex items-center gap-3">
                                <MapPin className="size-4 text-sky-400" />
                                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Network \ Routing</span>
                            </div>

                            <div className="grid grid-cols-[100px_1fr] gap-x-4 gap-y-4">
                                <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Region</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-white/80 uppercase font-mono">{selectedLog.region || 'Local'}</span>
                                    <span className="text-[10px] text-white/20 font-mono">({selectedLog.city}, {selectedLog.country})</span>
                                </div>

                                <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Device</label>
                                <span className="text-[10px] font-bold text-white/80 uppercase font-mono">{selectedLog.device_type || 'Unknown'}</span>

                                <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest">IP Address</label>
                                <span className="text-[10px] font-bold text-white/40 font-mono">{selectedLog.ip_address}</span>
                            </div>
                        </div>

                        {/* Function Invocation Section */}
                        <div className="pt-8 border-t border-white/5 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="size-2 rounded-full bg-violet-500" />
                                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Context Information</span>
                            </div>

                            <div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-6">
                                <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest">User Role</label>
                                <span className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-black uppercase w-fit",
                                    selectedLog.user_role === 'super_admin' ? "bg-amber-500/20 text-amber-500" : "bg-white/10 text-white/40"
                                )}>
                                    {selectedLog.user_role || 'visitor'}
                                </span>

                                <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Is Admin View</label>
                                <span className="text-[10px] font-bold text-white/60 font-mono">
                                    {selectedLog.is_admin_view ? 'TRUE' : 'FALSE'}
                                </span>

                                <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Locale</label>
                                <span className="text-[10px] font-bold text-sky-400 font-mono uppercase">
                                    {selectedLog.locale}
                                </span>
                            </div>
                        </div>

                        {/* Interaction Trace */}
                        <div className="pt-8 border-t border-white/5">
                            <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/10 flex items-start gap-3">
                                <RefreshCw className="size-4 text-violet-400 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-violet-300 uppercase tracking-wider">Middleware Execution</p>
                                    <p className="text-[10px] text-violet-300/60 leading-relaxed">
                                        This log was captured via Edge Middleware with `event.waitUntil` for zero-latency impact on the user experience.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
