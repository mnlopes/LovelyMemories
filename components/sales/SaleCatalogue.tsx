'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter, Link } from '@/i18n/routing';
import { applyFilters, filtersToQuery, parseFilters, type CatalogueFilters, type CatalogueSort } from '@/lib/sales/filters';
import { formatEuro } from '@/lib/sales/format';
import { SALE_TYPES, type SaleCardListing, type SaleType } from '@/lib/sales/types';
import { SaleCard } from './SaleCard';

const fieldLabel = 'text-[10px] font-bold uppercase tracking-[0.2em] text-[#6b7280]';
const fieldSelect = 'w-full border-0 bg-transparent p-0 text-base font-semibold text-[#192537] focus:outline-none md:text-[15px]';
const fieldLabelWrap = 'focus-within:ring-2 focus-within:ring-[#b09e80]';
const PRICE_STEPS = [250000, 500000, 1000000];

const TYPE_KEYS: Record<SaleType, { tab: string; option: string }> = {
    apartment: { tab: 'tabApartment', option: 'typeApartment' },
    house: { tab: 'tabHouse', option: 'typeHouse' },
    building: { tab: 'tabBuilding', option: 'typeBuilding' },
    land: { tab: 'tabLand', option: 'typeLand' },
};

export function SaleCatalogue({
    listings,
    initialFilters,
    locale,
    today,
}: {
    listings: SaleCardListing[];
    initialFilters: CatalogueFilters;
    locale: string;
    today: string;
}) {
    const t = useTranslations('Sales');
    const router = useRouter();
    const pathname = usePathname();
    // The URL is the single source of truth (menu links, back/forward and filter changes all go through it).
    // Until the client has the params, the server-parsed filters keep the first render identical to the HTML.
    const searchParams = useSearchParams();
    const filters: CatalogueFilters = searchParams ? parseFilters(Object.fromEntries(searchParams)) : initialFilters;

    const cities = useMemo(
        () => Array.from(new Set(listings.map((l) => l.city).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
        [listings],
    );
    const counts = useMemo(() => {
        const c: Record<string, number> = {};
        for (const l of listings) c[l.type] = (c[l.type] ?? 0) + 1;
        return c;
    }, [listings]);
    const visible = useMemo(() => applyFilters(listings, filters), [listings, filters]);

    const priceOptions = filters.maxPrice && !PRICE_STEPS.includes(filters.maxPrice)
        ? [...PRICE_STEPS, filters.maxPrice].sort((a, b) => a - b)
        : PRICE_STEPS;

    function update(patch: Partial<CatalogueFilters>) {
        const next = { ...filters, ...patch };
        const q = filtersToQuery(next);
        router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    }

    const hasFilters = !!(filters.type || filters.city || filters.minBedrooms || filters.maxPrice);
    const clear = () => update({ type: undefined, city: undefined, minBedrooms: undefined, maxPrice: undefined });

    const tabs: { id: 'all' | SaleType; label: string; count: number }[] = [
        { id: 'all', label: t('tabAll'), count: listings.length },
        ...SALE_TYPES.filter((ty) => ty !== 'land' || (counts.land ?? 0) > 0).map((ty) => ({
            id: ty,
            label: t(TYPE_KEYS[ty].tab),
            count: counts[ty] ?? 0,
        })),
    ];

    return (
        <div className="bg-[#f8f9fa] text-[#192537]">
            <section className="relative flex min-h-[460px] items-end overflow-hidden bg-[#0a1128]">
                <Image src="/legacy/home/images/hero-image.png" alt="" fill priority sizes="100vw" className="object-cover" />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#0a1128]/95 via-[#0a1128]/55 to-[#0a1128]/15" />
                <div className="relative mx-auto flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-10 pt-36 lg:px-6 lg:pb-12">
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#b09e80]">{t('eyebrow')}</p>
                    <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-white md:text-[56px]">{t('title')}</h1>
                    <p className="max-w-[640px] text-base leading-relaxed text-white/85 md:text-lg">{t('subtitle')}</p>
                    <form
                        onSubmit={(e) => e.preventDefault()}
                        className="mt-3 grid grid-cols-2 gap-1 rounded-[20px] bg-white p-2 shadow-[0_20px_50px_rgba(0,0,0,0.25)] lg:flex lg:items-stretch"
                    >
                        <label className={`col-span-2 flex flex-col gap-1 rounded-xl px-4 py-2.5 lg:flex-1 lg:px-5 ${fieldLabelWrap}`}>
                            <span className={fieldLabel}>{t('location')}</span>
                            <select className={fieldSelect} value={filters.city ?? ''} onChange={(e) => update({ city: e.target.value || undefined })}>
                                <option value="">{t('allLocations')}</option>
                                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                                {filters.city && !cities.includes(filters.city) && <option value={filters.city}>{filters.city}</option>}
                            </select>
                        </label>
                        <label className={`flex flex-col gap-1 rounded-xl px-4 py-2.5 lg:flex-1 lg:border-l lg:border-[#eceef1] lg:px-5 ${fieldLabelWrap}`}>
                            <span className={fieldLabel}>{t('type')}</span>
                            <select className={fieldSelect} value={filters.type ?? ''} onChange={(e) => update({ type: (e.target.value || undefined) as SaleType | undefined })}>
                                <option value="">{t('anyType')}</option>
                                {SALE_TYPES.filter((ty) => ty !== 'land' || (counts.land ?? 0) > 0).map((ty) => (
                                    <option key={ty} value={ty}>{t(TYPE_KEYS[ty].option)}</option>
                                ))}
                            </select>
                        </label>
                        <label className={`flex flex-col gap-1 rounded-xl px-4 py-2.5 lg:flex-1 lg:border-l lg:border-[#eceef1] lg:px-5 ${fieldLabelWrap}`}>
                            <span className={fieldLabel}>{t('bedroomsFilter')}</span>
                            <select className={fieldSelect} value={filters.minBedrooms ?? ''} onChange={(e) => update({ minBedrooms: e.target.value ? Number(e.target.value) : undefined })}>
                                <option value="">{t('anyBedrooms')}</option>
                                {[1, 2, 3].map((n) => <option key={n} value={n}>{n}+</option>)}
                            </select>
                        </label>
                        <label className={`col-span-2 flex flex-col gap-1 rounded-xl px-4 py-2.5 lg:flex-1 lg:border-l lg:border-[#eceef1] lg:px-5 ${fieldLabelWrap}`}>
                            <span className={fieldLabel}>{t('maxPrice')}</span>
                            <select className={fieldSelect} value={filters.maxPrice ?? ''} onChange={(e) => update({ maxPrice: e.target.value ? Number(e.target.value) : undefined })}>
                                <option value="">{t('noLimit')}</option>
                                {priceOptions.map((p) => <option key={p} value={p}>{formatEuro(p, locale)}</option>)}
                            </select>
                        </label>
                    </form>
                </div>
            </section>

            <section className="bg-[#f8f9fa] px-4 pb-16 pt-10 lg:px-6 lg:pb-20 lg:pt-14">
                <div className="mx-auto flex max-w-[1280px] flex-col gap-8 lg:gap-10">
                    <div className="flex flex-col gap-4 border-b border-[#e9ebee] md:flex-row md:items-end md:justify-between">
                        <div className="-mx-4 flex gap-8 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:gap-10 md:px-0">
                            {tabs.map((tab) => {
                                const active = (filters.type ?? 'all') === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        aria-pressed={active}
                                        onClick={() => update({ type: tab.id === 'all' ? undefined : tab.id })}
                                        className="relative flex min-h-11 shrink-0 items-center gap-2.5 pb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b09e80] md:pb-0"
                                    >
                                        <span className={`text-[11px] font-bold uppercase tracking-[0.3em] ${active ? 'text-[#192537]' : 'text-[#6b7280] hover:text-[#7a6a4d]'}`}>{tab.label}</span>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? 'bg-[#192537] text-white' : 'bg-[#eef0f3] text-[#4b5563]'}`}>{tab.count}</span>
                                        {active && <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-0.5 bg-[#192537]" />}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pb-3">
                            <p className="text-[13px] text-[#4b5563]" aria-live="polite">
                                {t('showing', { count: visible.length })}
                            </p>
                            <label className="flex items-center gap-2 whitespace-nowrap text-[13px] text-[#4b5563]">
                                <span className="sr-only sm:not-sr-only">{t('sortBy')}</span>
                                <select
                                    className="rounded-full border border-[#dfe2e6] bg-white px-3.5 py-2 text-base font-semibold text-[#192537] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b09e80] md:text-[13px]"
                                    value={filters.sort}
                                    onChange={(e) => update({ sort: e.target.value as CatalogueSort })}
                                >
                                    <option value="newest">{t('sortNewest')}</option>
                                    <option value="price_asc">{t('sortPriceAsc')}</option>
                                    <option value="price_desc">{t('sortPriceDesc')}</option>
                                </select>
                            </label>
                        </div>
                    </div>

                    {visible.length > 0 ? (
                        <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                            {visible.map((l) => <SaleCard key={l.id} listing={l} locale={locale} today={today} />)}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[#dfe2e6] px-6 py-16 text-center">
                            <h2 className="text-2xl font-bold text-[#192537]">{listings.length === 0 ? t('emptyNoneTitle') : t('emptyTitle')}</h2>
                            <p className="max-w-[480px] text-[#4b5563]">{listings.length === 0 ? t('emptyNoneText') : t('emptyText')}</p>
                            {listings.length > 0 && hasFilters && (
                                <button
                                    type="button"
                                    onClick={clear}
                                    className="flex min-h-12 items-center justify-center rounded-full bg-[#192537] px-7 text-xs font-bold uppercase tracking-[0.18em] text-white hover:bg-[#b09e80] hover:text-[#192537] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b09e80] focus-visible:ring-offset-2"
                                >
                                    {t('clearFilters')}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </section>

            <section className="bg-[#f8f9fa] px-4 pb-20 lg:px-6">
                <div className="mx-auto flex max-w-[1280px] flex-col gap-8 rounded-3xl bg-[#192537] p-8 md:p-12 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex max-w-[640px] flex-col gap-3">
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#b09e80]">{t('sellEyebrow')}</p>
                        <h2 className="text-[28px] font-bold leading-tight text-white md:text-[34px]">{t('sellTitle')}</h2>
                        <p className="text-base leading-relaxed text-white/80">{t('sellText')}</p>
                    </div>
                    <Link href="/contact" className="flex min-h-[50px] items-center justify-center rounded-full bg-[#b09e80] px-7 text-xs font-extrabold uppercase tracking-[0.18em] text-[#192537]">
                        {t('sellCta')}
                    </Link>
                </div>
            </section>
        </div>
    );
}
