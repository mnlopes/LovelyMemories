"use client";

import { Check, X, Clock, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations, useLocale } from "next-intl";
import { format, parse } from "date-fns";
import { enUS, pt } from "date-fns/locale";

interface BookingPoliciesSectionProps {
    policies: {
        houseRules: {
            childrenAllowed: boolean;
            infantsAllowed: boolean;
            petsAllowed: boolean;
            partiesAllowed: boolean;
            smokingAllowed: boolean;
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
            label: t('rules.children'),
            allowed: policies.houseRules.childrenAllowed,
            sublabel: t('ageRanges.children')
        },
        {
            label: t('rules.infants'),
            allowed: policies.houseRules.infantsAllowed,
            sublabel: t('ageRanges.infants')
        },
        { label: t('rules.pets'), allowed: policies.houseRules.petsAllowed },
        { label: t('rules.parties'), allowed: policies.houseRules.partiesAllowed },
        { label: t('rules.smoking'), allowed: policies.houseRules.smokingAllowed },
    ];

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



                {/* Cancellation Policy */}
                <div className="space-y-8">
                    <h3 className="font-medium text-xs uppercase tracking-widest text-[#B08D4A] mb-6">
                        {t('cancellationPolicy')}
                    </h3>
                    <div className="flex gap-5">
                        <div className="flex flex-col items-center justify-center w-12 h-12 bg-[#FCF5F5] text-[#854040] rounded-lg shrink-0 border border-[#E8D0D0]">
                            <span className="text-[10px] font-bold uppercase leading-none mt-1">
                                {policies.cancellation.deadline.includes('days')
                                    ? policies.cancellation.deadline.split(' ')[0]
                                    : format(parse(policies.cancellation.deadline, 'd MMM', new Date()), 'MMM', { locale: dateLocale })}
                            </span>
                            <span className="text-lg font-bold leading-none text-[#854040]">
                                {policies.cancellation.deadline.includes('days')
                                    ? 'D'
                                    : format(parse(policies.cancellation.deadline, 'd MMM', new Date()), 'd')}
                            </span>
                        </div>
                        <div className="space-y-3 text-left">
                            <p className="text-sm font-medium text-navy-950 leading-relaxed">
                                {t('cancellationTemplate', {
                                    date: (policies.cancellation.deadline.includes('days') || policies.cancellation.deadline === 'None')
                                        ? policies.cancellation.deadline
                                        : format(parse(policies.cancellation.deadline, 'd MMM', new Date()), 'd MMM', { locale: dateLocale }),
                                    percent: "50%"
                                })}
                            </p>
                            <div className="flex gap-2 items-start text-xs text-navy-900/50">
                                <Ban className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                <span>{t('refundEligibilityTemplate', { days: 7 })}</span>
                            </div>
                            <button className="text-xs font-bold text-[#B08D4A] uppercase tracking-wider border-b border-[#B08D4A] pb-0.5 hover:text-[#9A7B3E] hover:border-[#9A7B3E] transition-colors">
                                {t('viewFullTerms')}
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
}
