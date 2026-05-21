import { useFormContext, useFieldArray } from "react-hook-form";
import { Plus, Trash2, Link, Copy, Check, FileUp } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface SyncTabProps {
    propertyId?: string;
}

export default function SyncTab({ propertyId }: SyncTabProps) {
    const { register, control, watch } = useFormContext();
    const t = useTranslations('PropertyEditor');
    const [copied, setCopied] = useState(false);

    // Provide a valid default field array implementation for ical urls
    const { fields, append, remove } = useFieldArray({
        control,
        name: "ical_import_urls" as any, // assuming type any for unmapped form type
    });

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

                    <div className="space-y-4">
                        {fields.map((field, index) => (
                            <div key={field.id} className="flex items-start gap-3">
                                <div className="flex-1">
                                    <input
                                        {...register(`ical_import_urls.${index}` as any)}
                                        placeholder="https://www.airbnb.pt/calendar/ical/... ou https://ical.booking.com/v1/export/..."
                                        className="w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#eaeaea] dark:border-admin-dark-border p-3 rounded-xl text-sm text-[#171717] dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => remove(index)}
                                    className="p-3 text-[#a3a3a3] hover:text-red-500 bg-[#fafafa] dark:bg-admin-dark-bg border border-[#eaeaea] dark:border-admin-dark-border hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-200 transition-colors rounded-xl shrink-0"
                                >
                                    <Trash2 className="size-4" />
                                </button>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={() => append("")}
                            className="flex items-center gap-2 px-5 py-3 text-sm font-bold text-[#171717] dark:text-admin-dark-text-primary bg-white dark:bg-admin-dark-surface border border-[#eaeaea] dark:border-admin-dark-border hover:bg-[#fafafa] dark:hover:bg-admin-dark-bg rounded-xl transition-colors"
                        >
                            <Plus className="size-4" />
                            {t('sync.addIcal')}
                        </button>
                    </div>
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
