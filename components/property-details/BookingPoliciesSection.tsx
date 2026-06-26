"use client";

import { Check, X, Clock, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations, useLocale } from "next-intl";
import { format, parse, isValid } from "date-fns";
import { enUS, pt } from "date-fns/locale";

// Helper to safely extract string from potential localized object
const getLocalizedStr = (val: any, locale: string = 'en'): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
        const preferred = val[locale] || val['en'] || val['pt'] || Object.values(val)[0];
        return typeof preferred === 'string' ? preferred : String(preferred || '');
    }
    return String(val || '');
};

interface BookingPoliciesSectionProps {
    policies: {
        houseRules: {
            childrenAllowed: boolean;
            infantsAllowed: boolean;
            petsAllowed: boolean;
            partiesAllowed: boolean;
            smokingAllowed: boolean;
            custom?: Array<{
                label: Record<string, string>;
                allowed: boolean;
            }>;
            removed_rules?: string[];
        };
        checkIn: {
            arrivalStart: string;
            departureEnd: string;
        };
        cancellation: {
            text: string;
            refundText: string;
            deadline: string;
        };
    };
}

export function BookingPoliciesSection({ policies }: BookingPoliciesSectionProps) {
    const t = useTranslations('PropertyDetail');
    const locale = useLocale();
    const dateLocale = locale === 'pt' ? pt : enUS;

    const rules = [
        {
            id: 'childrenAllowed',
            label: t(`rules.children.${policies.houseRules.childrenAllowed ? 'yes' : 'no'}`),
            allowed: policies.houseRules.childrenAllowed,
            sublabel: t('ageRanges.children')
        },
        {
            id: 'infantsAllowed',
            label: t(`rules.infants.${policies.houseRules.infantsAllowed ? 'yes' : 'no'}`),
            allowed: policies.houseRules.infantsAllowed,
            sublabel: t('ageRanges.infants')
        },
        { id: 'petsAllowed', label: t(`rules.pets.${policies.houseRules.petsAllowed ? 'yes' : 'no'}`), allowed: policies.houseRules.petsAllowed, sublabel: undefined },
        { id: 'partiesAllowed', label: t(`rules.parties.${policies.houseRules.partiesAllowed ? 'yes' : 'no'}`), allowed: policies.houseRules.partiesAllowed, sublabel: undefined },
        { id: 'smokingAllowed', label: t(`rules.smoking.${policies.houseRules.smokingAllowed ? 'yes' : 'no'}`), allowed: policies.houseRules.smokingAllowed, sublabel: undefined },
        ...(policies.houseRules.custom || []).map(customRule => ({
            id: 'custom',
            label: getLocalizedStr(customRule.label, locale),
            allowed: customRule.allowed,
            sublabel: undefined
        }))
    ].filter(r => !policies.houseRules.removed_rules?.includes(r.id));

    return (
        <section className="py-16 border-t border-[#E1E6EC]">
            <h2 className="text-2xl font-bold text-navy-950 mb-12">{t('bookingPolicies')}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">

                {/* House Rules */}
                <div className="space-y-8">
                    <h3 className="font-medium text-xs uppercase tracking-widest text-[#B08D4A] mb-6">
                        {t('houseRules')}
                    </h3>
                    <ul className="space-y-4">
                        {rules.map((rule, i) => (
                            <li key={i} className={cn(
                                "flex items-start gap-3 text-sm transition-all",
                                rule.allowed
                                    ? "text-navy-900 pl-2"
                                    : "bg-[#FCF5F5] p-3 rounded-lg border border-[#E8D0D0] text-[#854040]"
                            )}>
                                <div className={cn(
                                    "flex items-center justify-center w-5 h-5 rounded-full shrink-0 mt-0.5",
                                    rule.allowed ? "bg-[#B08D4A]/10 text-[#B08D4A]" : "bg-[#FCF5F5] text-[#854040]"
                                )}>
                                    {rule.allowed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-medium">
                                        {rule.label}
                                    </span>
                                    {rule.sublabel && rule.allowed && (
                                        <span className="text-xs text-navy-900/60 mt-0.5">{rule.sublabel}</span>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>



                <div className="space-y-8">
                    <h3 className="font-medium text-xs uppercase tracking-widest text-[#B08D4A] mb-6">
                        {t('cancellationPolicy')}
                    </h3>
                    {(() => {
                        const deadlineStr = getLocalizedStr(policies.cancellation?.deadline, locale) || '7 days';
                        const deadlineEn = getLocalizedStr(policies.cancellation?.deadline, 'en') || '7 days';
                        const isRelative = deadlineEn.toLowerCase().includes('day');
                        const isNone = deadlineEn.toLowerCase() === 'none';

                        const parsedDate = !isRelative && !isNone ? parse(deadlineStr, 'd MMM', new Date()) : undefined;
                        const isDateValid = parsedDate && isValid(parsedDate);

                        return (
                            <div className="flex gap-5">
                                <div className="flex flex-col items-center justify-center w-12 h-12 bg-[#FCF5F5] text-[#854040] rounded-lg shrink-0 border border-[#E8D0D0]">
                                    <span className="text-[9px] font-bold uppercase leading-none mt-1 tracking-wide">
                                        {isRelative
                                            ? (deadlineStr.split(' ')[1]?.substring(0, 4).toUpperCase() || (locale === 'pt' ? 'DIAS' : 'DAYS'))
                                            : isDateValid ? format(parsedDate!, 'MMM', { locale: dateLocale }) : '—'}
                                    </span>
                                    <span className="text-xl font-black leading-none text-[#854040]">
                                        {isRelative
                                            ? (deadlineStr.split(' ')[0] || '7')
                                            : isDateValid ? format(parsedDate!, 'd') : '!'}
                                    </span>
                                </div>
                                <div className="space-y-3 text-left">
                                    <div className="flex flex-col">
                                        <span className="text-base font-bold text-navy-950">
                                            {getLocalizedStr(policies.cancellation?.text, locale) || t('cancellationPolicy')}
                                        </span>
                                        <p className="text-sm font-medium text-navy-900/80 mt-1 leading-relaxed">
                                            {getLocalizedStr(policies.cancellation?.refundText, locale) || '50% refund'}
                                        </p>
                                </div>
                                    <button className="text-xs font-bold text-[#B08D4A] uppercase tracking-wider border-b border-[#B08D4A] pb-0.5 hover:text-[#9A7B3E] hover:border-[#9A7B3E] transition-colors mt-2">
                                        {t('viewFullTerms')}
                                    </button>
                                </div>
                            </div>
                        );
                    })()}
                </div>

            </div>
        </section>
    );
}
