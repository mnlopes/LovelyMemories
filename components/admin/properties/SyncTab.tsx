import { useFormContext } from "react-hook-form";
import { Link, Copy, Check, FileUp } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import IcalFeedsManager from "./IcalFeedsManager";

interface SyncTabProps {
    propertyId?: string;
}

export default function SyncTab({ propertyId }: SyncTabProps) {
    const { register } = useFormContext();
    const t = useTranslations('PropertyEditor');
    const [copied, setCopied] = useState(false);

    // Handle Copy logic
    const exportUrl = propertyId ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/ical/${propertyId}.ics` : '';

    const handleCopy = () => {
        if (!exportUrl) return;
        navigator.clipboard.writeText(exportUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-3xl space-y-12">
            <div>
                <h3 className="text-xl font-bold text-[#171717] dark:text-admin-dark-text-primary mb-2">
                    {t('sync.title')}
                </h3>
                <p className="text-sm text-[#a3a3a3] mb-8">
                    {t('sync.description')}
                </p>

                {/* EXPORT TO AIRBNB */}
                <div className="mb-10 p-6 bg-[#fafafa] dark:bg-admin-dark-bg rounded-2xl border border-[#eaeaea] dark:border-admin-dark-border">
                    <h4 className="font-bold text-[#171717] dark:text-admin-dark-text-primary mb-2 flex items-center gap-2">
                        <Link className="size-4 text-emerald-500" />
                        {t('sync.exportTitle')}
                    </h4>
                    <p className="text-sm text-[#a3a3a3] mb-4">
                        {t('sync.exportDesc')}
                    </p>
                    
                    {propertyId ? (
                        <div className="flex items-center gap-3">
                            <input 
                                readOnly 
                                value={exportUrl} 
                                className="flex-1 bg-white dark:bg-admin-dark-surface border border-[#eaeaea] dark:border-admin-dark-border p-3 rounded-xl text-sm text-[#171717] dark:text-white outline-none cursor-text select-all"
                            />
                            <button
                                type="button"
                                onClick={handleCopy}
                                className="shrink-0 flex items-center gap-2 px-5 py-3 bg-[#171717] dark:bg-white text-white dark:text-black font-bold text-sm rounded-xl hover:bg-black dark:hover:bg-gray-100 transition-colors"
                            >
                                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                                {copied ? t('sync.copied') : t('sync.copy')}
                            </button>
                        </div>
                    ) : (
                        <div className="p-4 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-xl text-sm font-medium border border-amber-200 dark:border-amber-500/30">
                            {t('sync.saveFirst')}
                        </div>
                    )}
                </div>

                {/* IMPORT FROM AIRBNB */}
                <div className="p-6 bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#eaeaea] dark:border-admin-dark-border">
                    <h4 className="font-bold text-[#171717] dark:text-admin-dark-text-primary mb-2 flex items-center gap-2">
                        <Link className="size-4 text-blue-500" />
                        {t('sync.importTitle')}
                    </h4>
                    <p className="text-sm text-[#a3a3a3] mb-6">
                        {t('sync.importDesc')}
                    </p>

                    {propertyId ? (
                        <IcalFeedsManager propertyId={propertyId} />
                    ) : (
                        <div className="p-4 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-xl text-sm font-medium border border-amber-200 dark:border-amber-500/30">
                            {t('sync.saveFirst')}
                        </div>
                    )}
                </div>

                {/* CSV IMPORT MAPPING */}
                <div className="p-6 bg-white dark:bg-admin-dark-surface rounded-2xl border border-[#eaeaea] dark:border-admin-dark-border mt-8">
                    <h4 className="font-bold text-[#171717] dark:text-admin-dark-text-primary mb-2 flex items-center gap-2">
                        <FileUp className="size-4 text-purple-500" />
                        {t('sync.csvMappingTitle')}
                    </h4>
                    <p className="text-sm text-[#a3a3a3] mb-6">
                        {t('sync.csvMappingDesc')}
                    </p>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-admin-text-secondary uppercase tracking-wider block">{t('sync.airbnbListingName')}</label>
                        <input
                            {...register(`airbnb_listing_name`)}
                            placeholder="Ex: Historic Downtown Apt"
                            className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#eaeaea] dark:border-admin-dark-border p-3 rounded-xl text-sm text-[#171717] dark:text-white outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-mono"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
