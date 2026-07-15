"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, MoreHorizontal, Search, Building2, Home, Trash2, Eye, EyeOff, CalendarDays, RefreshCw, AlertCircle, Globe } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { StatusModal } from "@/components/admin/ui/StatusModal";
import { syncPropertyICal } from "@/app/actions/ical";
import { toast } from "sonner";
import ImportAirbnbModal from "@/components/admin/properties/ImportAirbnbModal";
import { PropertyListCard } from "@/components/admin/properties/PropertyListCard";

export default function AdminProperties() {
    const params = useParams();
    const t = useTranslations('AdminProperties');
    const locale = (params?.locale as string) || 'en';
    const [properties, setProperties] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [role, setRole] = useState<string | null>(null);

    // Search & Filter
    const [searchQuery, setSearchQuery] = useState("");
    const [showBuildingsOnly, setShowBuildingsOnly] = useState(false);
    
    // Sync UI State
    // Ids of properties with a sync in flight (single Force Sync or Retry All),
    // so each row shows its own spinner.
    const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
    const [isRetryingAll, setIsRetryingAll] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Modal State
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        type: 'success' | 'error' | 'loading' | 'warning';
        title: string;
        message: string;
        actionLabel?: string;
        onAction?: () => void;
        cancelLabel?: string;
    }>({
        isOpen: false,
        type: 'success',
        title: '',
        message: ''
    });

    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function fetchData() {
            // Fetch Properties
            const { data } = await supabase
                .from('properties')
                .select('*')
                .order('created_at', { ascending: false });

            if (data) setProperties(data);

            // Fetch user role
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                if (profile) setRole(profile.role);
            }

            setIsLoading(false);
        }
        fetchData();

        // Background Polling for sync statuses (every 60 seconds)
        const pollInterval = setInterval(async () => {
            const { data } = await supabase
                .from('properties')
                .select('id, last_sync_at, sync_status, last_sync_error');
            
            if (data) {
                setProperties(prev => prev.map(p => {
                    const update = data.find(d => d.id === p.id);
                    return update ? { ...p, ...update } : p;
                }));
            }
        }, 60000); // 1 minute

        return () => clearInterval(pollInterval);
    }, []);

    // Close menu on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Handlers
    const updateStatus = async (id: string, newStatus: string) => {
        const property = properties.find(p => p.id === id);
        if (!property) return;

        const oldStatus = property.status || (property.is_active ? 'active' : 'hidden');

        // Optimistic Update
        setProperties(prev => prev.map(p => p.id === id ? { ...p, status: newStatus, is_active: newStatus === 'active' } : p));
        setOpenMenuId(null);

        // Server Action
        const { updatePropertyStatus } = await import("@/app/actions/property");
        const res = await updatePropertyStatus(id, newStatus);

        if (!res.success) {
            // Revert on error
            setProperties(prev => prev.map(p => p.id === id ? { ...p, status: oldStatus, is_active: oldStatus === 'active' } : p));
            console.error('Error updating status:', res.error);
            setModalConfig({
                isOpen: true,
                type: 'error',
                title: t('modals.updateFailed'),
                message: res.error || t('modals.failedMessage'),
                actionLabel: t('modals.close'),
                onAction: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
            });
        }
    };

    const confirmDelete = (id: string) => {
        setOpenMenuId(null);
        setModalConfig({
            isOpen: true,
            type: 'error',
            title: t('modals.deleteTitle'),
            message: t('modals.deleteMessage'),
            actionLabel: t('modals.deleteConfirm'),
            onAction: () => handleDelete(id)
        });
    };

    const handleDelete = async (id: string) => {
        setModalConfig(prev => ({ ...prev, type: 'loading', title: t('modals.deleting'), message: t('modals.removing') }));

        const { deleteProperty } = await import("@/app/actions/property");
        const res = await deleteProperty(id);

        if (!res.success) {
            // Check for Foreign Key Constraint code if passed
            if (res.code === '23503') {
                setModalConfig({
                    isOpen: true,
                    type: 'error',
                    title: t('modals.cannotDelete'),
                    message: t('modals.cannotDeleteMessage'),
                    actionLabel: t('modals.close'),
                    onAction: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
                });
            } else {
                setModalConfig({
                    isOpen: true,
                    type: 'error',
                    title: t('modals.errorDeleting'),
                    message: res.error || t('modals.unexpectedError'),
                    actionLabel: t('modals.close'),
                    onAction: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
                });
            }
        } else {
            // Success
            setProperties(prev => prev.filter(p => p.id !== id));
            setModalConfig({
                isOpen: true,
                type: 'success',
                title: t('modals.deletedTitle'),
                message: t('modals.deletedMessage'),
                actionLabel: t('modals.done'),
                onAction: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
            });
        }
    };

    // Runs one property's sync with a per-row spinner and refreshes its status in place.
    // Returns whether the sync succeeded. `quiet` suppresses per-property toasts (Retry All
    // shows one summary toast instead of 32).
    const runSync = async (propertyId: string, propertyName: string, quiet = false): Promise<boolean> => {
        setSyncingIds(prev => new Set(prev).add(propertyId));
        try {
            const res = await syncPropertyICal(propertyId);

            // Re-fetch property to get updated sync status
            const { data: updatedProp } = await supabase
                .from('properties')
                .select('last_sync_at, sync_status, last_sync_error')
                .eq('id', propertyId)
                .single();

            if (updatedProp) {
                setProperties(prev => prev.map(p => p.id === propertyId ? { ...p, ...updatedProp } : p));
            }

            if (!quiet) {
                if (res.success) {
                    if (res.newEvents && res.newEvents > 0) {
                        toast.success(`Synched! ${res.newEvents} new block(s) imported for ${propertyName}.`);
                    } else if (res.totalFound === 0) {
                        toast.warning(`No dates found in the Airbnb file for ${propertyName}.`);
                    } else {
                        toast.success(`Synched! Found ${res.totalFound} events, but all are already imported for ${propertyName}.`);
                    }
                } else {
                    toast.error(`Sync failed: ${res.error}`);
                }
            }
            return !!res.success;
        } catch (error) {
            if (!quiet) toast.error("An unexpected error occurred during sync.");
            return false;
        } finally {
            setSyncingIds(prev => {
                const next = new Set(prev);
                next.delete(propertyId);
                return next;
            });
        }
    };

    const handleForceSync = async (e: React.MouseEvent, propertyId: string, propertyName: string) => {
        e.stopPropagation();
        await runSync(propertyId, propertyName);
    };

    // Retry All: re-sync every failed property in place (no page reload), with each row
    // spinning while its sync runs. Small concurrency to avoid hammering Airbnb/Booking.
    const handleRetryAll = async () => {
        // Same filter as failedSyncCount so the button retries exactly what the banner counts.
        const failed = properties.filter(p => p.sync_status === 'failed' && p.is_active);
        if (failed.length === 0 || isRetryingAll) return;

        setIsRetryingAll(true);
        let recovered = 0;
        let stillFailing = 0;

        const queue = [...failed];
        const CONCURRENCY = 5;
        const worker = async () => {
            for (let prop = queue.shift(); prop; prop = queue.shift()) {
                const title = prop.title?.[locale] || prop.title?.en || 'Untitled';
                const ok = await runSync(prop.id, title, true);
                if (ok) recovered++; else stillFailing++;
            }
        };
        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, failed.length) }, worker));

        setIsRetryingAll(false);
        if (stillFailing === 0) {
            toast.success(`All ${recovered} propert${recovered === 1 ? 'y' : 'ies'} synced successfully.`);
        } else {
            toast.error(`${stillFailing} of ${failed.length} still failing — hover each red sync icon to see the reason.`);
        }
    };

    const formatRelativeTime = (dateStr: string | null) => {
        if (!dateStr) return 'Never';
        const date = new Date(dateStr);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    };

    // Global Sync Check
    const failedSyncCount = properties.filter(p => p.sync_status === 'failed' && p.is_active).length;

    // Filter Logic
    const filteredProperties = properties.filter(property => {
        const title = property.title?.[locale] || property.title?.en || 'Untitled';
        const location = property.city || property.address || '';
        const search = searchQuery.toLowerCase();

        const matchesSearch = title.toLowerCase().includes(search) || location.toLowerCase().includes(search);
        const matchesType = showBuildingsOnly ? property.is_multi_unit : true;

        return matchesSearch && matchesType;
    });

    return (
        <div className="space-y-10 pb-20">
            {/* Global Sync Warning */}
            {failedSyncCount > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 p-4 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400">
                            <AlertCircle className="size-5" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-red-800 dark:text-red-200">
                                {failedSyncCount === 1 ? 'One property failed to sync' : `${failedSyncCount} properties failed to sync`}
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                                Please check your iCal connections to ensure all calendars are up to date.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleRetryAll}
                        disabled={isRetryingAll}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-red-600/20 flex items-center gap-2"
                    >
                        {isRetryingAll && <RefreshCw className="size-3.5 animate-spin" />}
                        {isRetryingAll ? 'Retrying…' : 'Retry All'}
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-end">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#171717] dark:text-admin-dark-text-primary">{t('title')}</h2>
                    <p className="text-[#a3a3a3] mt-2 font-medium text-sm md:text-base">{t('subtitle', { count: properties.length })}</p>
                </div>
                <div className="flex gap-2 md:gap-3 flex-wrap">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="px-5 py-2.5 bg-white dark:bg-admin-dark-surface border border-[#eaeaea] dark:border-admin-dark-border text-[#171717] dark:text-admin-dark-text-primary rounded text-sm font-semibold hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg transition-all flex items-center gap-2"
                        title="Import from Airbnb"
                    >
                        <Globe className="size-4 text-[#a3a3a3]" />
                        <span className="hidden sm:inline">Import Airbnb</span>
                    </button>
                    <button
                        onClick={() => window.location.href = `/${locale}/admin/properties/new?mode=building`}
                        className="px-5 py-2.5 bg-white dark:bg-admin-dark-surface border border-[#eaeaea] dark:border-admin-dark-border text-[#171717] dark:text-admin-dark-text-primary rounded text-sm font-semibold hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg transition-all flex items-center gap-2"
                    >
                        <Building2 className="size-4" />
                        {t('addBuilding')}
                    </button>
                    <button
                        onClick={() => window.location.href = `/${locale}/admin/properties/new`}
                        className="px-5 py-2.5 bg-[#171717] dark:bg-white text-white dark:text-black rounded text-sm font-semibold hover:bg-black dark:hover:bg-gray-200 transition-all flex items-center gap-2"
                    >
                        <Home className="size-4" />
                        {t('addProperty')}
                    </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a3a3a3] size-4 group-focus-within:text-[#171717] dark:group-focus-within:text-white transition-colors" />
                    <input
                        type="text"
                        placeholder={t('searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-white/5 border border-[#f5f5f5] dark:border-white/10 pl-11 pr-4 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-gold-400 dark:focus:ring-white/20 outline-none shadow-sm dark:text-admin-dark-text-primary transition-all placeholder:text-[#a3a3a3] font-medium"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowBuildingsOnly(!showBuildingsOnly)}
                        className={`flex items-center gap-2 px-5 py-2.5 border rounded-xl text-xs font-bold transition-all ${showBuildingsOnly
                            ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400 shadow-sm shadow-blue-500/10'
                            : 'bg-white dark:bg-white/5 border-[#f5f5f5] dark:border-white/10 text-[#171717] dark:text-admin-dark-text-primary hover:bg-[#fafafa] dark:hover:bg-white/10'
                            }`}
                    >
                        <Building2 className="size-4" />
                        {t('buildingsOnly')}
                    </button>
                </div>
            </div>

            {/* Properties Table (desktop) */}
            <div className="hidden md:block bg-white dark:bg-white/5 rounded-2xl border border-[#f5f5f5] dark:border-white/10 overflow-visible shadow-sm dark:shadow-2xl dark:shadow-black/50 min-h-[400px] transition-all duration-500 premium-glow-dark">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-[#f5f5f5] dark:border-admin-dark-border">
                            <th className="px-8 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">{t('table.details')}</th>
                            <th className="px-8 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">{t('table.location')}</th>
                            <th className="px-8 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">{t('table.pricing')}</th>
                            <th className="px-8 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest">{t('table.status')}</th>
                            <th className="px-8 py-5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest text-right">{t('table.action')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f5f5f5] dark:divide-admin-dark-border">
                        {isLoading ? (
                            <tr>
                                <td colSpan={5} className="px-8 py-10 text-center text-[#a3a3a3] text-sm italic">{t('table.loading')}</td>
                            </tr>
                        ) : filteredProperties.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-8 py-10 text-center text-[#a3a3a3] text-sm">{t('table.empty')}</td>
                            </tr>
                        ) : filteredProperties.map((property) => {
                            const title = property.title?.[locale] || property.title?.en || 'Untitled';
                            const mainImage = property.images?.find((img: any) => img.is_main)?.url || property.images?.[0]?.url;
                            const subtitle = property.is_multi_unit ? t('badge.building') : `${property.type || 'Standard'} • ${property.bedrooms || 0} BR`;

                            return (
                                <tr key={property.id} className="group hover:bg-[#fafafa]/50 dark:hover:bg-white/[0.02] transition-all duration-300">
                                    <td className="px-8 py-6 cursor-pointer" onClick={() => window.location.href = `/${locale}/admin/properties/${property.id}`}>
                                        <div className="flex items-center gap-4">
                                            <div
                                                className="size-14 rounded-xl bg-[#f5f5f5] dark:bg-admin-dark-bg bg-cover bg-center shrink-0 border border-[#eeeeee] dark:border-white/10 shadow-sm transition-all group-hover:scale-105 duration-500"
                                                style={{ backgroundImage: `url(${mainImage || '/placeholder-property.jpg'})` }}
                                            ></div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-[#171717] dark:text-admin-dark-text-primary group-hover:text-gold-400 dark:group-hover:text-white transition-colors">{title}</p>
                                                    {property.is_multi_unit && (
                                                        <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[9px] font-bold uppercase tracking-wider border border-blue-200 dark:border-blue-500/30">
                                                            {t('badge.building')}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-[#a3a3a3] dark:text-admin-dark-text-secondary mt-0.5 font-medium">{subtitle}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-sm font-semibold text-[#171717] dark:text-admin-dark-text-primary">{property.city || property.address || 'N/A'}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-sm font-bold text-[#171717] dark:text-admin-dark-text-primary whitespace-nowrap">
                                            €{property.price_per_night || 0}
                                            <span className="text-[10px] text-[#a3a3a3] dark:text-admin-dark-text-secondary font-normal ml-1 italic">{t('table.perNight')}</span>
                                        </p>
                                    </td>
                                    <td className="px-8 py-6">
                                        {(() => {
                                            const status = property.status || (property.is_active ? 'active' : 'hidden');
                                            const config = {
                                                active: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/30', dot: 'bg-emerald-500', label: t('status.active') },
                                                coming_soon: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/30', dot: 'bg-amber-500', label: t('status.comingSoon') },
                                                hidden: { bg: 'bg-gray-50 dark:bg-gray-500/10', text: 'text-gray-400 dark:text-admin-dark-text-secondary', border: 'border-gray-100 dark:border-white/10', dot: 'bg-gray-400', label: t('status.hidden') }
                                            }[status as 'active' | 'coming_soon' | 'hidden'] || { bg: 'bg-gray-50', text: 'text-gray-400', border: 'border-gray-100', dot: 'bg-gray-400', label: t('status.unknown') };

                                            return (
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.05em] ${config.bg} ${config.text} border ${config.border} shadow-sm transition-all duration-300`}>
                                                    <span className={`size-1.5 rounded-full ${config.dot} shadow-[0_0_8px_currentColor]`}></span>
                                                    {config.label}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-8 py-6 text-right relative flex items-center justify-end gap-1">
                                        {!property.is_multi_unit && (
                                            <>
                                                <div className="group/sync relative flex items-center justify-center">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleForceSync(e, property.id, title)}
                                                        disabled={syncingIds.has(property.id)}
                                                        className={`transition-all p-2 rounded-xl disabled:opacity-50 relative
                                                            ${property.sync_status === 'failed' 
                                                                ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30' 
                                                                : 'text-[#a3a3a3] hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'}
                                                        `}
                                                        title={property.sync_status === 'failed' ? `CRITICAL ERROR: ${property.last_sync_error || 'Check iCal URL'}` : "Force Sync iCal"}
                                                    >
                                                        <RefreshCw className={`size-5 ${syncingIds.has(property.id) ? 'animate-spin text-emerald-500' : property.sync_status === 'failed' ? 'text-rose-600' : ''}`} />
                                                        {property.sync_status === 'failed' && (
                                                            <span className="absolute -top-0.5 -right-0.5 size-3 bg-rose-600 rounded-full border-2 border-white dark:border-admin-dark-bg animate-pulse shadow-sm"></span>
                                                        )}
                                                    </button>
                                                    
                                                    {/* Relative time indicator (Discreet text below) */}
                                                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover/sync:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap text-[9px] font-bold text-[#a3a3a3] dark:text-admin-dark-text-secondary">
                                                        {formatRelativeTime(property.last_sync_at)}
                                                        {property.sync_status === 'failed' && <span className="ml-1 text-rose-500 uppercase"> - Failed</span>}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.location.href = `/${locale}/admin/properties/${property.id}?tab=calendar`;
                                                    }}
                                                    className="text-[#a3a3a3] hover:text-blue-500 dark:hover:text-blue-400 transition-all p-2 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl"
                                                    title="View Calendar"
                                                >
                                                    <CalendarDays className="size-5" />
                                                </button>
                                            </>
                                        )}
                                        <button
                                            id={`menu-trigger-${property.id}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenMenuId(openMenuId === property.id ? null : property.id);
                                            }}
                                            className="text-[#a3a3a3] hover:text-[#171717] dark:hover:text-white transition-all p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl"
                                        >
                                            <MoreHorizontal className="size-5" />
                                        </button>

                                        {/* Dropdown Menu */}
                                        {openMenuId === property.id && (
                                            <div
                                                ref={menuRef}
                                                className="absolute right-8 top-12 w-48 bg-white dark:bg-admin-dark-surface rounded-xl shadow-xl border border-[#f5f5f5] dark:border-admin-dark-border z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                                            >
                                                <div className="p-1">
                                                    {(() => {
                                                        const status = property.status || (property.is_active ? 'active' : 'hidden');
                                                        return (
                                                            <>
                                                                {status !== 'active' && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); updateStatus(property.id, 'active'); }}
                                                                        className="w-full text-left px-3 py-2 text-xs font-medium text-[#171717] dark:text-admin-dark-text-primary hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg flex items-center gap-2 transition-colors"
                                                                    >
                                                                        <Eye className="size-4 text-emerald-500" />
                                                                        {t('actions.setActive')}
                                                                    </button>
                                                                )}
                                                                {status !== 'coming_soon' && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); updateStatus(property.id, 'coming_soon'); }}
                                                                        className="w-full text-left px-3 py-2 text-xs font-medium text-[#171717] dark:text-admin-dark-text-primary hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg flex items-center gap-2 transition-colors"
                                                                    >
                                                                        <Eye className="size-4 text-amber-500" />
                                                                        {t('actions.setComingSoon')}
                                                                    </button>
                                                                )}
                                                                {status !== 'hidden' && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); updateStatus(property.id, 'hidden'); }}
                                                                        className="w-full text-left px-3 py-2 text-xs font-medium text-[#171717] dark:text-admin-dark-text-primary hover:bg-gray-50 dark:hover:bg-admin-dark-bg rounded-lg flex items-center gap-2 transition-colors"
                                                                    >
                                                                        <EyeOff className="size-4 text-gray-400" />
                                                                        {t('actions.hide')}
                                                                    </button>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                    {(role === 'admin' || role === 'super_admin') && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); confirmDelete(property.id); }}
                                                            className="w-full text-left px-3 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg flex items-center gap-2 transition-colors"
                                                        >
                                                            <Trash2 className="size-4" />
                                                            {t('actions.delete')}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Properties list (mobile cards) */}
            <div className="md:hidden space-y-3 min-h-[300px]">
                {isLoading ? (
                    <p className="py-10 text-center text-[#a3a3a3] text-sm italic">{t('table.loading')}</p>
                ) : filteredProperties.length === 0 ? (
                    <p className="py-10 text-center text-[#a3a3a3] text-sm">{t('table.empty')}</p>
                ) : filteredProperties.map((property) => {
                    const title = property.title?.[locale] || property.title?.en || 'Untitled';
                    return (
                        <PropertyListCard
                            key={property.id}
                            property={property}
                            locale={locale}
                            t={t}
                            formatRelativeTime={formatRelativeTime}
                            syncing={syncingIds.has(property.id)}
                            onForceSync={(e) => handleForceSync(e, property.id, title)}
                            onOpenCalendar={() => window.location.href = `/${locale}/admin/properties/${property.id}?tab=calendar`}
                            onOpenMenu={() => setOpenMenuId(openMenuId === property.id ? null : property.id)}
                        />
                    );
                })}
            </div>

            {/* Mobile actions bottom sheet */}
            {openMenuId && (() => {
                const property = properties.find(p => p.id === openMenuId);
                if (!property) return null;
                const title = property.title?.[locale] || property.title?.en || 'Untitled';
                const status = property.status || (property.is_active ? 'active' : 'hidden');
                return (
                    <div className="md:hidden fixed inset-0 z-[120] flex items-end animate-in fade-in duration-200">
                        <div className="absolute inset-0 bg-black/50" onClick={() => setOpenMenuId(null)} />
                        <div className="relative w-full bg-white dark:bg-admin-dark-surface rounded-t-3xl border-t border-[#f5f5f5] dark:border-admin-dark-border p-2 pb-6 animate-in slide-in-from-bottom duration-300">
                            <div className="mx-auto mt-2 mb-3 h-1.5 w-10 rounded-full bg-gray-200 dark:bg-white/10" />
                            <p className="px-4 pb-2 text-xs font-bold text-[#a3a3a3] uppercase tracking-widest truncate">{title}</p>
                            {status !== 'active' && (
                                <button onClick={() => updateStatus(property.id, 'active')} className="w-full text-left px-4 py-3 text-sm font-medium text-[#171717] dark:text-admin-dark-text-primary hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl flex items-center gap-3">
                                    <Eye className="size-5 text-emerald-500" />{t('actions.setActive')}
                                </button>
                            )}
                            {status !== 'coming_soon' && (
                                <button onClick={() => updateStatus(property.id, 'coming_soon')} className="w-full text-left px-4 py-3 text-sm font-medium text-[#171717] dark:text-admin-dark-text-primary hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-xl flex items-center gap-3">
                                    <Eye className="size-5 text-amber-500" />{t('actions.setComingSoon')}
                                </button>
                            )}
                            {status !== 'hidden' && (
                                <button onClick={() => updateStatus(property.id, 'hidden')} className="w-full text-left px-4 py-3 text-sm font-medium text-[#171717] dark:text-admin-dark-text-primary hover:bg-gray-50 dark:hover:bg-admin-dark-bg rounded-xl flex items-center gap-3">
                                    <EyeOff className="size-5 text-gray-400" />{t('actions.hide')}
                                </button>
                            )}
                            {(role === 'admin' || role === 'super_admin') && (
                                <button onClick={() => confirmDelete(property.id)} className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl flex items-center gap-3">
                                    <Trash2 className="size-5" />{t('actions.delete')}
                                </button>
                            )}
                        </div>
                    </div>
                );
            })()}

            <StatusModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                type={modalConfig.type as any}
                title={modalConfig.title}
                message={modalConfig.message}
                actionLabel={modalConfig.actionLabel}
                onAction={modalConfig.onAction}
            />

            {/* Modals */}
            <ImportAirbnbModal 
                isOpen={isImportModalOpen} 
                onClose={() => setIsImportModalOpen(false)} 
            />
        </div>
    );
}
