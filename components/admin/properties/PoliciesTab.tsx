"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Plus, Trash2, Clock, Info, ShieldCheck, Ban, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { PropertyFormData } from "./PropertyFormSchema";
import { useState } from "react";

interface PoliciesTabProps {
    activeLang: string;
    dir: 'ltr' | 'rtl';
}

const RULE_TRANSLATIONS: Record<string, Record<string, string>> = {
    'childrenAllowed': {
        en: "Children Allowed",
        pt: "Apto para Crianças",
        he: "ילדים מורשים"
    },
    'infantsAllowed': {
        en: "Infants Allowed",
        pt: "Apto para Bebés",
        he: "תינוקות מורשים"
    },
    'petsAllowed': {
        en: "Pets Allowed",
        pt: "Animais Permitidos",
        he: "חיות מחמד מורשות"
    },
    'partiesAllowed': {
        en: "Parties/Events Allowed",
        pt: "Festas/Eventos Permitidos",
        he: "מסיבות/אירועים מורשים"
    },
    'smokingAllowed': {
        en: "Smoking Allowed",
        pt: "Permitido Fumar",
        he: "עישון מותר"
    }
};

export default function PoliciesTab({ activeLang, dir }: PoliciesTabProps) {
    const t = useTranslations('PropertyEditor');
    const { control, register, watch, getValues, setValue } = useFormContext<PropertyFormData>();

    // House Rules: Custom
    const { fields: customFields, append: appendCustom, remove: removeCustom } = useFieldArray({
        control,
        name: "house_rules.custom" as any,
    });

    const removedRules = watch("house_rules.removed_rules") || [];

    const removeStandardRule = (fieldName: string) => {
        const current = getValues("house_rules.removed_rules") || [];
        if (!current.includes(fieldName)) {
            setValue("house_rules.removed_rules", [...current, fieldName], { shouldDirty: true });
        }
    };

    const standardRules = [
        { id: 'childrenAllowed', label: `${RULE_TRANSLATIONS['childrenAllowed']?.[activeLang] || 'Children Allowed'} (${activeLang.toUpperCase()})`, name: "house_rules.childrenAllowed" },
        { id: 'infantsAllowed', label: `${RULE_TRANSLATIONS['infantsAllowed']?.[activeLang] || 'Infants Allowed'} (${activeLang.toUpperCase()})`, name: "house_rules.infantsAllowed" },
        { id: 'petsAllowed', label: `${RULE_TRANSLATIONS['petsAllowed']?.[activeLang] || 'Pets Allowed'} (${activeLang.toUpperCase()})`, name: "house_rules.petsAllowed" },
        { id: 'partiesAllowed', label: `${RULE_TRANSLATIONS['partiesAllowed']?.[activeLang] || 'Parties/Events Allowed'} (${activeLang.toUpperCase()})`, name: "house_rules.partiesAllowed" },
        { id: 'smokingAllowed', label: `${RULE_TRANSLATIONS['smokingAllowed']?.[activeLang] || 'Smoking Allowed'} (${activeLang.toUpperCase()})`, name: "house_rules.smokingAllowed" },
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Left Column: Rules & Times */}
            <div className="space-y-8">
                {/* House Rules Section */}
                <div className="bg-white dark:bg-admin-dark-surface rounded-[32px] border border-[#eaeaea] dark:border-admin-dark-border p-8 shadow-sm space-y-6 transition-colors">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-2xl bg-[#fafafa] dark:bg-admin-dark-bg flex items-center justify-center text-[#171717] dark:text-admin-dark-text-primary border border-[#f5f5f5] dark:border-admin-dark-border">
                                <ShieldCheck className="size-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary">{t('policies.houseRules')}</h3>
                                <p className="text-xs text-[#a3a3a3] dark:text-admin-dark-text-secondary uppercase tracking-wider font-bold">{t('policies.whatIsAllowed')}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => appendCustom({ label: { en: "", pt: "", he: "" }, allowed: true })}
                            className="p-2 bg-[#171717] dark:bg-white text-white dark:text-black rounded-lg hover:bg-black dark:hover:bg-gray-200 transition-all shadow-sm"
                        >
                            <Plus className="size-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {standardRules.filter(r => !removedRules.includes(r.id)).map(rule => (
                            <RuleToggle
                                key={rule.id}
                                label={rule.label}
                                name={rule.name}
                                register={register}
                                watch={watch}
                                onRemove={() => removeStandardRule(rule.id)}
                            />
                        ))}

                        {/* Custom Rules */}
                        {customFields.map((field, index) => (
                            <DynamicRuleToggle
                                key={field.id}
                                index={index}
                                activeLang={activeLang}
                                dir={dir}
                                register={register}
                                watch={watch}
                                onRemove={() => removeCustom(index)}
                                placeholder={t('policies.newRule')}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Column: Cancellation */}
            <div className="space-y-8">
                {/* Cancellation Policy */}
                <div className="bg-white dark:bg-admin-dark-surface rounded-[32px] border border-[#eaeaea] dark:border-admin-dark-border p-8 shadow-sm space-y-6 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-2xl bg-[#fafafa] dark:bg-admin-dark-bg flex items-center justify-center text-[#171717] dark:text-admin-dark-text-primary border border-[#f5f5f5] dark:border-admin-dark-border">
                            <Ban className="size-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-[#171717] dark:text-admin-dark-text-primary">{t('policies.cancellation')}</h3>
                            <p className="text-xs text-[#a3a3a3] dark:text-admin-dark-text-secondary uppercase tracking-wider font-bold">{t('policies.refundPolicy', { lang: activeLang.toUpperCase() })}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-[#a3a3a3] dark:text-admin-dark-text-secondary uppercase tracking-wider">
                                {t('policies.policyTitle')} ({activeLang.toUpperCase()})
                            </label>
                            <input
                                key={`cancel-text-${activeLang}`}
                                {...register(`cancellation.text.${activeLang}` as any)}
                                dir={dir}
                                placeholder="e.g. Moderate"
                                className={`w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-3 text-[#171717] dark:text-admin-dark-text-primary text-sm focus:border-[#171717] dark:focus:border-white outline-none transition-all ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-[#a3a3a3] dark:text-admin-dark-text-secondary uppercase tracking-wider">
                                    {t('policies.refundDetails')} ({activeLang.toUpperCase()})
                                </label>
                                <input
                                    key={`cancel-refund-${activeLang}`}
                                    {...register(`cancellation.refundText.${activeLang}` as any)}
                                    dir={dir}
                                    placeholder="e.g. 50% refund"
                                    className={`w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-3 text-[#171717] dark:text-admin-dark-text-primary text-sm focus:border-[#171717] dark:focus:border-white outline-none transition-all ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-[#a3a3a3] dark:text-admin-dark-text-secondary uppercase tracking-wider">
                                    {t('policies.deadline')} ({activeLang.toUpperCase()})
                                </label>
                                <input
                                    key={`cancel-deadline-${activeLang}`}
                                    {...register(`cancellation.deadline.${activeLang}` as any)}
                                    dir={dir}
                                    placeholder="e.g. 7 days"
                                    className={`w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-3 text-[#171717] dark:text-admin-dark-text-primary text-sm focus:border-[#171717] dark:focus:border-white outline-none transition-all ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function RuleToggle({ label, name, register, watch, onRemove }: { label: string, name: any, register: any, watch: any, onRemove: () => void }) {
    const value = watch(name);
    return (
        <div className="relative group">
            <button
                type="button"
                onClick={onRemove}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10"
            >
                <Trash2 className="size-3" />
            </button>
            <label className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${value ? 'bg-[#171717]/[0.02] dark:bg-[#B08D4A]/5 border-[#171717] dark:border-[#B08D4A] text-[#171717] dark:text-[#B08D4A]' : 'bg-white dark:bg-admin-dark-surface border-[#eaeaea] dark:border-admin-dark-border text-[#a3a3a3]'}`}>
                <div className="flex items-center gap-3">
                    {value ? <CheckCircle2 className="size-4 text-[#171717] dark:text-[#B08D4A]" /> : <XCircle className="size-4 opacity-20" />}
                    <span className="text-sm font-bold">{label}</span>
                </div>
                <input type="checkbox" {...register(name)} className="hidden" />
                <div className={`w-10 h-6 rounded-full relative transition-all ${value ? 'bg-[#171717] dark:bg-[#B08D4A]' : 'bg-[#f5f5f5] dark:bg-admin-dark-bg'}`}>
                    <div className={`absolute top-1 size-4 rounded-full bg-white dark:bg-admin-dark-surface shadow-sm transition-all ${value ? 'left-5' : 'left-1'}`} />
                </div>
            </label>
        </div>
    );
}

function DynamicRuleToggle({ index, activeLang, dir, register, watch, onRemove, placeholder }: { index: number, activeLang: string, dir: string, register: any, watch: any, onRemove: () => void, placeholder: string }) {
    const name = `house_rules.custom.${index}.allowed`;
    const value = watch(name);
    return (
        <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all relative group ${value ? 'bg-[#171717]/[0.02] dark:bg-[#B08D4A]/5 border-[#171717] dark:border-[#B08D4A] text-[#171717] dark:text-[#B08D4A]' : 'bg-white dark:bg-admin-dark-surface border-[#eaeaea] dark:border-admin-dark-border text-[#a3a3a3]'}`}>
            <button
                type="button"
                onClick={onRemove}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10"
            >
                <Trash2 className="size-3" />
            </button>
            <div className="flex items-center gap-3 flex-1">
                {value ? <CheckCircle2 className="size-4 text-[#171717] dark:text-[#B08D4A]" /> : <XCircle className="size-4 opacity-20" />}
                <input
                    key={`custom-rule-${index}-${activeLang}`}
                    {...register(`house_rules.custom.${index}.label.${activeLang}` as any)}
                    dir={dir}
                    placeholder={`${placeholder} (${activeLang.toUpperCase()})`}
                    className="bg-transparent border-none p-0 text-sm font-bold focus:ring-0 outline-none w-full placeholder:text-[#a3a3a3] dark:placeholder:text-admin-dark-text-secondary"
                />
            </div>
            <div className="flex items-center ml-4">
                <input type="checkbox" {...register(name)} className="hidden" id={`custom-${index}`} />
                <label htmlFor={`custom-${index}`} className={`w-10 h-6 rounded-full relative transition-all cursor-pointer ${value ? 'bg-[#171717] dark:bg-[#B08D4A]' : 'bg-[#f5f5f5] dark:bg-admin-dark-bg'}`}>
                    <div className={`absolute top-1 size-4 rounded-full bg-white dark:bg-admin-dark-surface shadow-sm transition-all ${value ? 'left-5' : 'left-1'}`} />
                </label>
            </div>
        </div>
    );
}
