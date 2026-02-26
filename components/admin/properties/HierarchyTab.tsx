"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Link } from "@/i18n/routing";
import { Plus, Home, Eye, ExternalLink, Loader2 } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { StatusModal } from "@/components/admin/ui/StatusModal";

interface HierarchyTabProps {
    propertyId: string;
}

export default function HierarchyTab({ propertyId }: HierarchyTabProps) {
    const locale = useLocale();
    const t = useTranslations('PropertyEditor');
    const [units, setUnits] = useState<any[]>([]);
    const [availableUnits, setAvailableUnits] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLinking, setIsLinking] = useState(false);
    const [showSelector, setShowSelector] = useState(false);

    // Unlink confirmation state
    const [confirmUnlink, setConfirmUnlink] = useState<{
        isOpen: boolean;
        unitId: string | null;
        unitTitle: string;
    }>({
        isOpen: false,
        unitId: null,
        unitTitle: ''
    });

    const fetchUnits = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('properties')
            .select('*')
            .eq('parent_id', propertyId)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setUnits(data);
        }
        setIsLoading(false);
    };

    const fetchAvailableUnits = async () => {
        setIsLinking(true);
        const { data, error } = await supabase
            .from('properties')
            .select('id, title, slug, images, type')
            .is('parent_id', null)
            .eq('is_multi_unit', false)
            .neq('id', propertyId) // Avoid linking to itself if it's somehow misconfigured
            .order('created_at', { ascending: false });

        if (!error && data) {
            setAvailableUnits(data);
        }
        setIsLinking(false);
    };

    useEffect(() => {
        if (propertyId) {
            fetchUnits();
        }
    }, [propertyId]);

    const handleLink = async (unitId: string) => {
        const { error } = await supabase
            .from('properties')
            .update({ parent_id: propertyId })
            .eq('id', unitId);

        if (!error) {
            fetchUnits();
            // Refetch available units to remove the one we just linked
            fetchAvailableUnits();
            // Don't close the selector as requested by user
            // setShowSelector(false);
        }
    };

    const handleUnlink = async (unitId: string) => {
        const { error } = await supabase
            .from('properties')
            .update({ parent_id: null })
            .eq('id', unitId);

        if (!error) {
            fetchUnits();
            setConfirmUnlink(prev => ({ ...prev, isOpen: false }));
        }
    };

    const getLocalizedStr = (val: any) => {
        if (!val) return t('hierarchy.untitled');
        if (typeof val === 'string') return val;
        return val[locale] || val['en'] || val['pt'] || Object.values(val)[0] || t('hierarchy.untitled');
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-[#a3a3a3] dark:text-admin-dark-text-secondary transition-colors">
                <Loader2 className="size-8 animate-spin mb-4" />
                <p>{t('hierarchy.loading')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Confirmation Modal */}
            <StatusModal
                isOpen={confirmUnlink.isOpen}
                onClose={() => setConfirmUnlink(prev => ({ ...prev, isOpen: false }))}
                type="warning"
                title={t('hierarchy.unlinkTitle')}
                message={t('hierarchy.unlinkConfirm', { title: confirmUnlink.unitTitle })}
                actionLabel={t('hierarchy.unlinkAction')}
                onAction={() => confirmUnlink.unitId && handleUnlink(confirmUnlink.unitId)}
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#f5f5f5] dark:border-admin-dark-border gap-4 transition-colors">
                <div>
                    <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary">{t('hierarchy.buildingUnits')}</h3>
                    <p className="text-sm text-[#a3a3a3] dark:text-admin-dark-text-secondary">{t('hierarchy.manageDesc')}</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowSelector(true);
                            fetchAvailableUnits();
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-admin-dark-surface border border-[#eaeaea] dark:border-admin-dark-border text-[#171717] dark:text-admin-dark-text-primary rounded-lg text-sm font-bold hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg transition-all"
                    >
                        <Plus className="size-4" />
                        {t('hierarchy.linkExisting')}
                    </button>
                    <Link
                        href={`/admin/properties/new?parent_id=${propertyId}`}
                        className="flex items-center gap-2 px-4 py-2 bg-[#171717] dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold hover:bg-black dark:hover:bg-gray-200 transition-all shadow-sm"
                    >
                        <Plus className="size-4" />
                        {t('hierarchy.createNew')}
                    </Link>
                </div>
            </div>

            {/* Link Existing Unit Selector */}
            {showSelector && (
                <div className="p-6 bg-[#fafafa] dark:bg-admin-dark-bg rounded-2xl border border-[#eaeaea] dark:border-admin-dark-border animate-in slide-in-from-top-4 duration-300 transition-colors">
                    <div className="flex items-center justify-between mb-6">
                        <h4 className="font-bold text-[#171717] dark:text-admin-dark-text-primary">{t('hierarchy.selectUnit')}</h4>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowSelector(false);
                            }}
                            className="text-xs font-bold text-[#a3a3a3] dark:text-admin-dark-text-secondary hover:text-[#171717] dark:hover:text-white uppercase tracking-wider transition-colors"
                        >
                            {t('hierarchy.cancel')}
                        </button>
                    </div>

                    {isLinking ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="size-6 animate-spin text-[#a3a3a3] dark:text-admin-dark-text-secondary" />
                        </div>
                    ) : availableUnits.length === 0 ? (
                        <p className="text-center py-10 text-sm text-[#a3a3a3] dark:text-admin-dark-text-secondary">{t('hierarchy.noOrphaned')}</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {availableUnits.map(unit => (
                                <button
                                    key={unit.id}
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleLink(unit.id);
                                    }}
                                    className="flex items-center gap-3 p-3 bg-white dark:bg-admin-dark-surface border border-[#f0f0f0] dark:border-admin-dark-border rounded-xl hover:border-[#171717] dark:hover:border-white transition-all text-left group"
                                >
                                    <div className="size-10 rounded bg-[#f5f5f5] dark:bg-admin-dark-bg overflow-hidden flex-shrink-0 relative">
                                        {unit.images?.[0] && (
                                            <Image src={unit.images[0].url} alt="" fill className="object-cover" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-[#171717] dark:text-admin-dark-text-primary truncate">{getLocalizedStr(unit.title)}</p>
                                        <p className="text-[10px] text-[#a3a3a3] dark:text-admin-dark-text-secondary uppercase tracking-wider">{unit.type}</p>
                                    </div>
                                    <Plus className="size-4 text-[#a3a3a3] dark:text-admin-dark-text-secondary group-hover:text-[#171717] dark:group-hover:text-white transition-colors" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {units.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-[#fafafa] dark:bg-admin-dark-bg rounded-2xl border-2 border-dashed border-[#eaeaea] dark:border-admin-dark-border transition-colors">
                    <div className="size-16 rounded-full bg-white dark:bg-admin-dark-surface flex items-center justify-center shadow-sm mb-4 border border-transparent dark:border-admin-dark-border">
                        <Home className="size-8 text-[#a3a3a3] dark:text-admin-dark-text-secondary" />
                    </div>
                    <h4 className="text-[#171717] dark:text-admin-dark-text-primary font-bold">{t('hierarchy.noUnits')}</h4>
                    <p className="text-[#a3a3a3] dark:text-admin-dark-text-secondary text-sm max-w-xs text-center mt-1">
                        {t('hierarchy.noUnitsDesc')}
                    </p>
                    <div className="flex gap-4 mt-6">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowSelector(true);
                                fetchAvailableUnits();
                            }}
                            className="text-[#171717] dark:text-admin-dark-text-primary font-bold text-sm hover:underline"
                        >
                            {t('hierarchy.linkExistingArrow')}
                        </button>
                        <Link
                            href={`/admin/properties/new?parent_id=${propertyId}`}
                            className="text-[#171717] dark:text-admin-dark-text-primary font-bold text-sm hover:underline"
                        >
                            {t('hierarchy.createNewArrow')}
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {units.map((unit) => (
                        <div key={unit.id} className="group p-4 bg-[#fafafa] dark:bg-admin-dark-bg rounded-xl border border-[#f5f5f5] dark:border-admin-dark-border hover:border-[#171717] dark:hover:border-white transition-all flex items-center gap-4">
                            <div className="size-16 rounded-lg overflow-hidden relative flex-shrink-0 bg-[#f0f0f0] dark:bg-admin-dark-surface">
                                {unit.images && unit.images[0] ? (
                                    <Image
                                        src={unit.images[0].url}
                                        alt={getLocalizedStr(unit.title)}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Home className="size-6 text-[#d4d4d4] dark:text-admin-dark-text-secondary" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-[#171717] dark:text-admin-dark-text-primary truncate">{getLocalizedStr(unit.title)}</h4>
                                <p className="text-xs text-[#a3a3a3] dark:text-admin-dark-text-secondary truncate">{unit.slug}</p>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${unit.is_active ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-admin-dark-surface text-gray-500 dark:text-admin-dark-text-secondary'}`}>
                                        {unit.is_active ? t('hierarchy.public') : t('hierarchy.hidden')}
                                    </span>
                                    <span className="text-[10px] text-[#a3a3a3] dark:text-admin-dark-text-secondary font-bold uppercase">{unit.type}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setConfirmUnlink({
                                            isOpen: true,
                                            unitId: unit.id,
                                            unitTitle: getLocalizedStr(unit.title)
                                        });
                                    }}
                                    className="p-2 bg-white dark:bg-admin-dark-surface border border-red-100 dark:border-red-500/10 text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shadow-sm"
                                    title={t('hierarchy.unlinkTooltip')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                                <Link
                                    href={`/admin/properties/${unit.id}`}
                                    className="p-2 bg-white dark:bg-admin-dark-surface border border-[#eaeaea] dark:border-admin-dark-border rounded-lg text-[#171717] dark:text-admin-dark-text-primary hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg transition-colors shadow-sm"
                                    title={t('hierarchy.editTooltip')}
                                >
                                    <Eye className="size-4" />
                                </Link>
                                <a
                                    href={`/${locale}/properties/${unit.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-white dark:bg-admin-dark-surface border border-[#eaeaea] dark:border-admin-dark-border rounded-lg text-[#171717] dark:text-admin-dark-text-primary hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg transition-colors shadow-sm"
                                    title={t('hierarchy.viewTooltip')}
                                >
                                    <ExternalLink className="size-4" />
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
