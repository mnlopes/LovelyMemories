"use client";

import { AlertTriangle, Clock } from "lucide-react";
import { useTranslations } from "next-intl";

interface HomeTruthsSectionProps {
    propertyId: string;
    truths: string[];
}

export function HomeTruthsSection({ propertyId, truths, checkIn }: HomeTruthsSectionProps & { checkIn?: { arrivalStart: string, departureEnd: string } }) {
    const t = useTranslations('PropertyDetail');
    const tp = useTranslations('Properties');

    if (!truths || truths.length === 0) return null;

    return (
        <section className="py-5 border-t border-[#E1E6EC]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                {/* Good to Know */}
                <div>
                    <h3 className="text-lg font-medium mb-3 text-navy-950">{t('goodToKnow')}</h3>
                    <div className="space-y-2">
                        {truths.map((truth, index) => (
                            <div
                                key={index}
                                className="flex items-start gap-3 p-3 bg-gray-50/50 rounded-xl border border-transparent"
                            >
                                <div className="w-8 h-8 rounded-full bg-[#B08D4A]/10 flex items-center justify-center flex-shrink-0">
                                    <AlertTriangle className="h-4 w-4 text-[#B08D4A]" />
                                </div>
                                <p className="text-navy-900/70 leading-relaxed pt-1">
                                    {Array.isArray(tp.raw(`${propertyId}.homeTruths`))
                                        ? (tp.raw(`${propertyId}.homeTruths`) as string[])[index]
                                        : truth}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Check-in & Check-out */}
                {checkIn && (
                    <div>
                        <h3 className="text-lg font-medium mb-3 text-navy-950">{t('checkInCheckOut')}</h3>
                        <div className="space-y-4">
                            <div className="flex items-start gap-4 p-3 bg-gray-50/50 rounded-xl border border-transparent">
                                <div className="w-8 h-8 rounded-full bg-[#B08D4A]/10 flex items-center justify-center flex-shrink-0">
                                    <Clock className="w-4 h-4 text-[#B08D4A]" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-navy-950">{t('arrival')}</p>
                                    <p className="text-sm text-navy-900/60 mt-0.5">{t('from')} {checkIn.arrivalStart}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-3 bg-gray-50/50 rounded-xl border border-transparent">
                                <div className="w-8 h-8 rounded-full bg-[#B08D4A]/10 flex items-center justify-center flex-shrink-0">
                                    <Clock className="w-4 h-4 text-[#B08D4A]" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-navy-950">{t('departure')}</p>
                                    <p className="text-sm text-navy-900/60 mt-0.5">{t('before')} {checkIn.departureEnd}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
