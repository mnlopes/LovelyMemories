'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import {
    ArrowDownWideNarrow, ArrowUpNarrowWide, Building, Building2, Clock, Euro, Globe, Home, Infinity as InfinityIcon,
    LayoutGrid, MapPin, Trees,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter, Link } from '@/i18n/routing';
import { applyFilters, filtersToQuery, parseFilters, type CatalogueFilters, type CatalogueSort } from '@/lib/sales/filters';
import { formatEuro } from '@/lib/sales/format';
import { SALE_TYPES, type SaleCardListing, type SaleType } from '@/lib/sales/types';
import { SaleCard } from './SaleCard';
import { SaleFilterMenu, type FilterOption } from './SaleFilterMenu';

const PRICE_STEPS = [250000, 500000, 1000000];
const BEDROOM_STEPS = [1, 2, 3, 4];
const iconClass = 'h-[18px] w-[18px]';

const TYPE_KEYS: Record<SaleType, { tab: string; option: string; icon: typeof Building2 }> = {
    apartment: { tab: 'tabApartment', option: 'typeApartment', icon: Building2 },
    house: { tab: 'tabHouse', option: 'typeHouse', icon: Home },
    building: { tab: 'tabBuilding', option: 'typeBuilding', icon: Building },
    land: { tab: 'tabLand', option: 'typeLand', icon: Trees },
};

const SORT_LABELS: Record<CatalogueSort, { long: string; short: string; icon: typeof Clock }> = {
    newest: { long: 'sortNewest', short: 'sortNewest', icon: Clock },
    price_asc: { long: 'sortPriceAsc', short: 'sortPriceAscShort', icon: ArrowUpNarrowWide },
    price_desc: { long: 'sortPriceDesc', short: 'sortPriceDescShort', icon: ArrowDownWideNarrow },
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
    const cityCounts = useMemo(() => {
        const c: Record<string, number> = {};
        for (const l of listings) if (l.city) c[l.city] = (c[l.city] ?? 0) + 1;
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

    const shownTypes = SALE_TYPES.filter((ty) => ty !== 'land' || (counts.land ?? 0) > 0);

    const cityOptions: FilterOption[] = [
        { value: '', label: t('allLocations'), icon: <Globe className={iconClass} /> },
        ...[...cities, ...(filters.city && !cities.includes(filters.city) ? [filters.city] : [])].map((c) => ({
            value: c,
            label: c,
            sublabel: t('filterCount', { count: cityCounts[c] ?? 0 }),
            icon: <MapPin className={iconClass} />,
        })),
    ];
    const typeOptions: FilterOption[] = [
        { value: '', label: t('anyType'), icon: <LayoutGrid className={iconClass} /> },
        ...shownTypes.map((ty) => {
            const Icon = TYPE_KEYS[ty].icon;
            return { value: ty, label: t(TYPE_KEYS[ty].option), sublabel: t('filterCount', { count: counts[ty] ?? 0 }), icon: <Icon className={iconClass} /> };
        }),
    ];
    const bedroomOptions: FilterOption[] = [
        { value: '', label: t('anyBedrooms') },
        ...[...BEDROOM_STEPS, ...(filters.minBedrooms && !BEDROOM_STEPS.includes(filters.minBedrooms) ? [filters.minBedrooms] : [])]
            .sort((a, b) => a - b)
            .map((n) => ({ value: String(n), label: `${n}+` })),
    ];
    const priceOptionsList: FilterOption[] = [
        { value: '', label: t('noLimit'), icon: <InfinityIcon className={iconClass} /> },
        ...priceOptions.map((p) => ({ value: String(p), label: t('filterUpTo', { price: formatEuro(p, locale) }), icon: <Euro className={iconClass} /> })),
    ];
    const sortOptions: FilterOption[] = (Object.keys(SORT_LABELS) as CatalogueSort[]).map((s) => {
        const Icon = SORT_LABELS[s].icon;
        return { value: s, label: t(SORT_LABELS[s].long), icon: <Icon className={iconClass} /> };
    });
    const menuText = { closeLabel: t('filterClose'), clearLabel: t('filterClear') };

    const tabs: { id: 'all' | SaleType; label: string; count: number }[] = [
        { id: 'all', label: t('tabAll'), count: listings.length },
        ...shownTypes.map((ty) => ({
            id: ty,
            label: t(TYPE_KEYS[ty].tab),
            count: counts[ty] ?? 0,
        })),
    ];

    return (
        <div className="bg-[#f8f9fa] text-[#192537]">
            {/* No overflow-hidden here: the filter menus open below the hero */}
            <section className="relative flex min-h-[460px] items-end bg-[#0a1128]">
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
                        <SaleFilterMenu
                            {...menuText}
                            className="col-span-2 lg:flex-1"
                            label={t('location')}
                            title={t('location')}
                            valueLabel={filters.city ?? t('allLocations')}
                            options={cityOptions}
                            value={filters.city ?? ''}
                            onChange={(v) => update({ city: v || undefined })}
                        />
                        <SaleFilterMenu
                            {...menuText}
                            className="lg:flex-1 lg:border-l lg:border-[#eceef1]"
                            label={t('type')}
                            title={t('filterTypeTitle')}
                            valueLabel={filters.type ? t(TYPE_KEYS[filters.type].option) : t('anyType')}
                            options={typeOptions}
                            value={filters.type ?? ''}
                            onChange={(v) => update({ type: (v || undefined) as SaleType | undefined })}
                        />
                        <SaleFilterMenu
                            {...menuText}
                            className="lg:flex-1 lg:border-l lg:border-[#eceef1]"
                            variant="chips"
                            label={t('bedroomsFilter')}
                            title={t('filterBedroomsTitle')}
                            valueLabel={filters.minBedrooms ? `${filters.minBedrooms}+` : t('anyBedrooms')}
                            options={bedroomOptions}
                            value={filters.minBedrooms ? String(filters.minBedrooms) : ''}
                            onChange={(v) => update({ minBedrooms: v ? Number(v) : undefined })}
                        />
                        <SaleFilterMenu
                            {...menuText}
                            className="col-span-2 lg:flex-1 lg:border-l lg:border-[#eceef1]"
                            align="end"
                            label={t('maxPrice')}
                            title={t('maxPrice')}
                            valueLabel={filters.maxPrice ? formatEuro(filters.maxPrice, locale) : t('noLimit')}
                            options={priceOptionsList}
                            value={filters.maxPrice ? String(filters.maxPrice) : ''}
                            onChange={(v) => update({ maxPrice: v ? Number(v) : undefined })}
                        />
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
                            <SaleFilterMenu
                                closeLabel={t('filterClose')}
                                trigger="pill"
                                align="end"
                                label={t('sortBy')}
                                title={t('sortBy')}
                                valueLabel={t(SORT_LABELS[filters.sort].short)}
                                options={sortOptions}
                                value={filters.sort}
                                onChange={(v) => update({ sort: v as CatalogueSort })}
                            />
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
                                    className="flex min-h-12 items-center justify-center rounded-full bg-[#192537] px-7 text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors duration-500 ease-out hover:bg-[#b09e80] hover:text-[#192537] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b09e80] focus-visible:ring-offset-2"
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
