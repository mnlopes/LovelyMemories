import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { formatEuro } from '@/lib/sales/format';
import type { PerformanceSnapshot } from '@/lib/sales/performance';

/** Investment snapshot. The caller renders it only for an eligible snapshot. */
export function SalePerformance({
    snapshot,
    locale,
    alLicense,
    endMonth,
    startMonth,
}: {
    snapshot: PerformanceSnapshot;
    locale: string;
    alLicense: string | null;
    /** "October 2026": month of the last day covered (window end minus one day). */
    endMonth: string;
    /** Month of the first covered day, used when there are fewer than 12 months of data. */
    startMonth: string;
}) {
    const t = useTranslations('Sales');
    const pct = (n: number) =>
        new Intl.NumberFormat(locale === 'pt' ? 'pt-PT' : 'en-GB', { style: 'percent', maximumFractionDigits: 1 }).format(n);

    const stats: { key: string; label: string; value: string; accent?: boolean }[] = [
        { key: 'revenue', label: t('perfRevenue'), value: formatEuro(Math.round(snapshot.revenue), locale) },
    ];
    if (snapshot.grossYield !== null) {
        stats.push({ key: 'yield', label: t('perfYield'), value: pct(snapshot.grossYield), accent: true });
    }
    stats.push({ key: 'occupancy', label: t('perfOccupancy'), value: pct(snapshot.occupancy) });

    return (
        <section className="flex flex-col gap-6 rounded-3xl bg-[#192537] p-6 md:p-9">
            <div className="flex flex-col gap-2.5">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#b09e80]">{t('perfEyebrow')}</p>
                <h2 className="text-2xl font-bold leading-snug text-white md:text-[28px]">{t('perfTitle')}</h2>
                <p className="text-sm text-white/75">{snapshot.fullYear ? t('perfSubtitle') : t('perfSubtitleShort', { month: startMonth })}</p>
            </div>
            <div className={`grid grid-cols-1 gap-3 ${stats.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                {stats.map((s) => (
                    <div key={s.key} className="flex flex-col gap-1.5 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">{s.label}</span>
                        <span className={`text-2xl font-bold ${s.accent ? 'text-[#b09e80]' : 'text-white'}`}>{s.value}</span>
                    </div>
                ))}
            </div>
            <p className="text-xs leading-relaxed text-white/65">
                {snapshot.fullYear ? t('perfNote', { month: endMonth }) : t('perfNoteShort', { month: endMonth })}
                {snapshot.grossYield !== null && ` ${t('perfYieldDefinition')}`}
            </p>
            <div className="flex flex-col gap-5 border-t border-white/10 pt-5 md:flex-row md:items-center md:justify-between">
                <ul className="flex flex-col gap-2.5">
                    {alLicense && (
                        <li className="flex items-center gap-2.5 text-sm text-white">
                            <Check className="size-4 shrink-0 text-[#b09e80]" strokeWidth={3} aria-hidden="true" />
                            {t('perfAlLicence', { number: alLicense })}
                        </li>
                    )}
                    <li className="flex items-center gap-2.5 text-sm text-white">
                        <Check className="size-4 shrink-0 text-[#b09e80]" strokeWidth={3} aria-hidden="true" />
                        {t('perfHistory')}
                    </li>
                    <li className="flex items-center gap-2.5 text-sm text-white">
                        <Check className="size-4 shrink-0 text-[#b09e80]" strokeWidth={3} aria-hidden="true" />
                        {t('perfKeep')}
                    </li>
                </ul>
                <Link
                    href="/join"
                    className="flex min-h-12 items-center justify-center rounded-full border border-[#b09e80] px-6 text-xs font-bold uppercase tracking-[0.16em] text-[#b09e80]"
                >
                    {t('perfPlans')}
                </Link>
            </div>
        </section>
    );
}
