import type { ReactNode } from 'react';
import { ArrowLeft, Check, FileText, MapPin, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { PropertyGallery } from '@/components/property-details/PropertyGallery';
import { parseDateLocal } from '@/lib/utils';
import { daysListed, formatEuro, localized, pricePerM2 } from '@/lib/sales/format';
import type { PerformanceSnapshot } from '@/lib/sales/performance';
import { saleImageAlt } from '@/lib/sales/seo';
import type { SaleCardListing, SaleCondition, SaleListing, SaleStatus, SaleType } from '@/lib/sales/types';
import { SaleAreaMap } from './SaleAreaMap';
import { EnergyPill } from './EnergyPill';
import { SaleCard } from './SaleCard';
import { SaleDescription } from './SaleDescription';
import { SaleContactForm } from './SaleContactForm';
import { SaleMobileBar } from './SaleMobileBar';
import { SalePerformance } from './SalePerformance';
import { SaleShareButton } from './SaleShareButton';

const STATUS_KEY: Record<SaleStatus, string> = {
    available: 'statusAvailable',
    reserved: 'badgeReserved',
    under_offer: 'badgeUnderOffer',
    sold: 'badgeSold',
};
const TYPE_KEY: Record<SaleType, string> = {
    apartment: 'typeApartment',
    house: 'typeHouse',
    building: 'typeBuilding',
    land: 'typeLand',
};
const CONDITION_KEY: Record<SaleCondition, string> = {
    new: 'conditionNew',
    renovated: 'conditionRenovated',
    good: 'conditionGood',
    to_renovate: 'conditionToRenovate',
};

/** "October 2026" in the page language. `iso` is a calendar day (YYYY-MM-DD). */
function monthYear(iso: string, locale: string, dayOffset = 0): string {
    const d = parseDateLocal(iso) ?? new Date();
    d.setDate(d.getDate() + dayOffset);
    return new Intl.DateTimeFormat(locale === 'pt' ? 'pt-PT' : 'en-GB', { month: 'long', year: 'numeric' }).format(d);
}

function paragraphs(text: string): string[] {
    return text
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);
}

export function SaleListingDetails({
    listing,
    locale,
    today,
    amiLicense,
    whatsapp,
    performance,
    similar,
    draft,
}: {
    listing: SaleListing;
    locale: 'en' | 'pt';
    today: string;
    amiLicense: string | null;
    whatsapp: string | null;
    performance: PerformanceSnapshot | null;
    similar: SaleCardListing[];
    draft: boolean;
}) {
    const t = useTranslations('Sales');
    const sold = listing.status === 'sold';
    const title = localized(listing.title, locale);
    const subtitle = localized(listing.subtitle, locale);
    const description = paragraphs(localized(listing.description, locale));
    const features = listing.features.map((f) => localized(f, locale)).filter(Boolean);
    const onRequest = listing.price_on_request || listing.price === null;
    const perM2 = pricePerM2(listing);
    const listedDays = daysListed(listing.published_at, today);
    const priceText = sold ? t('badgeSold') : onRequest ? t('priceOnRequest') : formatEuro(listing.price!, locale);

    // Main photo first, then the editor's order.
    const photos = [...listing.images].sort((a, b) => Number(b.is_main) - Number(a.is_main) || a.order - b.order);
    const place = [listing.street, listing.area_label, listing.city].filter(Boolean).join(', ');
    const caption = [listing.typology, listing.gross_area ? `${listing.gross_area} m²` : null, listing.city]
        .filter(Boolean)
        .join(' · ');

    const energy =
        listing.energy_class === null ? null : listing.energy_class === 'exempt' ? t('energyExempt') : listing.energy_class;

    const yes = t('yes');
    const facts: [string, ReactNode][] = [];
    const addFact = (label: string, value: ReactNode | null | undefined) => {
        if (value) facts.push([label, value]);
    };
    // As in the approved design ("T1 house"): one box with the type and the typology together.
    const typeName = t(TYPE_KEY[listing.type]);
    addFact(
        listing.typology ? t('factTypology') : t('factType'),
        listing.typology
            ? t('typologyAndType', { typology: listing.typology, type: locale === 'en' ? typeName.toLowerCase() : typeName })
            : typeName,
    );
    addFact(t('factGrossArea'), listing.gross_area ? `${listing.gross_area} m²` : null);
    addFact(t('factUsefulArea'), listing.useful_area ? `${listing.useful_area} m²` : null);
    addFact(t('factPlot'), listing.plot_area ? `${listing.plot_area} m²` : null);
    addFact(t('factBedrooms'), listing.bedrooms !== null ? String(listing.bedrooms) : null);
    addFact(t('factBathrooms'), listing.bathrooms !== null ? String(listing.bathrooms) : null);
    // Same coloured pill as on the catalogue cards.
    addFact(t('factEnergy'), listing.energy_class && energy ? <EnergyPill energy={listing.energy_class} label={energy} size="md" /> : null);
    addFact(t('factCondition'), listing.condition ? t(CONDITION_KEY[listing.condition]) : null);
    addFact(t('factRenovated'), listing.year_renovated ? String(listing.year_renovated) : null);
    addFact(t('factFurnished'), listing.furnished === null ? null : listing.furnished ? yes : t('no'));

    const waDigits = (whatsapp ?? '').replace(/\D/g, '');
    const whatsappUrl = waDigits
        ? `https://wa.me/${waDigits}?text=${encodeURIComponent(t('whatsappMessage', { title, reference: listing.reference }))}`
        : null;

    const showPerformance = !sold && performance !== null && performance.eligible === true;
    const statusLabel = t(STATUS_KEY[listing.status]);
    const statusGood = listing.status === 'available';

    const hasLocation = listing.lat !== null && listing.lng !== null;
    const nearby = listing.nearby.filter((n) => localized(n.name, locale));

    return (
        <div className="min-h-screen bg-white text-[#192537]">
            <main className="mx-auto flex max-w-[1280px] flex-col gap-7 px-4 pb-16 pt-24 lg:px-6 lg:pb-20 lg:pt-28">
                {draft && (
                    <div role="status" className="rounded-xl bg-[#b45309] px-4 py-2.5 text-center text-sm font-bold text-white">
                        {t('draftBanner')}
                    </div>
                )}
                <Link
                    href="/for-sale"
                    className="inline-flex items-center gap-2 self-start text-xs font-bold uppercase tracking-[0.18em] text-[#7a6a4d]"
                >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    {t('backToCatalogue')}
                </Link>

                {photos.length > 0 && (
                    <PropertyGallery
                        layout="mosaic"
                        images={photos.map((p) => p.url)}
                        title={title}
                        imageAlt={saleImageAlt(listing, locale, 0)}
                        caption={caption}
                        swipeHint={photos.length > 1 ? t('swipeHint') : undefined}
                        extraAction={
                            listing.floor_plan_url ? (
                                <a
                                    href={listing.floor_plan_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-[13px] font-semibold text-[#192537] shadow-[0_6px_20px_rgba(0,0,0,0.18)] transition-colors hover:bg-[#f8f9fa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b09e80]"
                                >
                                    <FileText className="size-4" aria-hidden="true" />
                                    {t('floorPlan')}
                                </a>
                            ) : undefined
                        }
                    />
                )}

                <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
                    <div className="flex min-w-0 flex-1 flex-col gap-10">
                        <div className="flex flex-col gap-3.5">
                            <nav aria-label={t('breadcrumb')} className="flex flex-wrap items-center gap-2 text-[13px] text-[#6b7280]">
                                <Link href="/" className="text-[#4b5563]">{t('breadcrumbHome')}</Link>
                                <span aria-hidden="true">›</span>
                                <Link href="/for-sale" className="text-[#4b5563]">{t('title')}</Link>
                                <span aria-hidden="true">›</span>
                                <span className="font-semibold text-[#192537]">{listing.city}</span>
                            </nav>
                            <div className="flex flex-wrap gap-2">
                                <span className="rounded-full bg-[#192537] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white">
                                    {listing.status === 'available' ? t('forSale') : statusLabel}
                                </span>
                                {showPerformance && (
                                    // Same dark pill as on the catalogue card photo.
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#4a5568] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                                        <TrendingUp className="size-3" aria-hidden="true" />
                                        {t('badgeIncome')}
                                    </span>
                                )}
                                <span className="rounded-full border border-[#d6d9de] px-3 py-1 text-[11px] font-semibold text-[#4b5563]">
                                    {t('refLabel', { reference: listing.reference })}
                                </span>
                            </div>
                            <h1 className="text-[34px] font-bold leading-[1.1] tracking-tight text-[#192537] md:text-5xl">{title}</h1>
                            {subtitle && <p className="text-lg leading-snug text-[#4b5563] md:text-xl">{subtitle}</p>}
                            {place && (
                                <p className="flex items-center gap-2 text-sm text-[#6b7280]">
                                    <MapPin className="size-4 text-[#b09e80]" aria-hidden="true" />
                                    {place}
                                </p>
                            )}
                        </div>

                        {facts.length > 0 && (
                            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {facts.map(([k, v]) => (
                                    <div key={k} className="flex flex-col gap-1.5 rounded-2xl border border-[#eceef1] bg-white p-4">
                                        <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6b7280]">{k}</dt>
                                        <dd className="text-[17px] font-bold text-[#192537]">{v}</dd>
                                    </div>
                                ))}
                            </dl>
                        )}

                        {description.length > 0 && (
                            <section className="flex flex-col gap-3.5">
                                <h2 className="text-2xl font-bold text-[#192537]">{t('aboutTitle')}</h2>
                                <SaleDescription paragraphs={description} readMore={t('readMore')} readLess={t('readLess')} />
                            </section>
                        )}

                        {features.length > 0 && (
                            <section className="flex flex-col gap-4">
                                <h2 className="text-2xl font-bold text-[#192537]">{t('featuresTitle')}</h2>
                                <ul className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
                                    {features.map((f, i) => (
                                        <li key={i} className="flex items-center gap-3 text-[15px] text-[#374151]">
                                            <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-[#f3efe6]">
                                                <Check className="size-3.5 text-[#7a6a4d]" strokeWidth={3} aria-hidden="true" />
                                            </span>
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {showPerformance && (
                            <SalePerformance
                                snapshot={performance}
                                locale={locale}
                                alLicense={listing.al_license}
                                endMonth={monthYear(performance.windowEnd, locale, -1)}
                                startMonth={monthYear(performance.windowStart, locale)}
                            />
                        )}

                        {(hasLocation || nearby.length > 0) && (
                            <section className="flex flex-col gap-4">
                                <h2 className="text-2xl font-bold text-[#192537]">{t('locationTitle')}</h2>
                                {hasLocation && (
                                    <SaleAreaMap
                                        lat={listing.lat}
                                        lng={listing.lng}
                                        label={t('mapLabel', { place: [listing.area_label, listing.city].filter(Boolean).join(', ') })}
                                    />
                                )}
                                {nearby.length > 0 && (
                                    <ul className="grid gap-3 sm:grid-cols-3">
                                        {nearby.map((n, i) => (
                                            <li key={i} className="flex flex-col gap-1 rounded-2xl border border-[#eceef1] bg-white px-4 py-3.5">
                                                <span className="text-sm font-semibold text-[#192537]">{localized(n.name, locale)}</span>
                                                {localized(n.distance, locale) && (
                                                    <span className="text-[13px] text-[#6b7280]">{localized(n.distance, locale)}</span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        )}

                        {(listing.floor_plan_url || energy) && (
                        <section className="flex flex-col gap-3.5">
                            <h2 className="text-2xl font-bold text-[#192537]">{t('documentsTitle')}</h2>
                            {listing.floor_plan_url && (
                                <div className="flex flex-wrap gap-3">
                                    <a
                                        href={listing.floor_plan_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex min-h-12 items-center gap-2.5 rounded-2xl border border-[#e3e6ea] bg-white px-4 text-sm font-semibold text-[#192537]"
                                    >
                                        <FileText className="size-[18px] text-[#7a6a4d]" aria-hidden="true" />
                                        {t('floorPlanPdf')}
                                    </a>
                                </div>
                            )}
                            {energy && <p className="text-sm text-[#6b7280]">{t('energyOnRequest')}</p>}
                        </section>
                        )}
                    </div>

                    {/* On lg+ the contact column follows the scroll, below the fixed header. On a short screen,
                        where it is taller than the space left, it scrolls on its own so the button stays reachable. */}
                    <aside
                        id="contact"
                        className="flex w-full scroll-mt-24 flex-col gap-4 lg:sticky lg:top-[112px] lg:max-h-[calc(100vh-128px)] lg:w-[380px] lg:shrink-0 lg:overflow-y-auto lg:overscroll-contain lg:pb-1 lg:[scrollbar-width:thin]"
                    >
                        <div className="flex flex-col gap-5 rounded-[20px] border border-[#eceef1] bg-white p-6 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.14)] md:p-7">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6b7280]">{t('askingPrice')}</span>
                                    <span className="text-[38px] font-bold leading-[1.1] tracking-tight text-[#192537]">{priceText}</span>
                                    {!sold && !onRequest && perM2 !== null && (
                                        <span className="text-[13px] text-[#6b7280]">{formatEuro(perM2, locale)}/m²</span>
                                    )}
                                    {!sold && listing.negotiable && !onRequest && (
                                        <span className="text-[13px] text-[#6b7280]">{t('negotiable')}</span>
                                    )}
                                </div>
                                <SaleShareButton title={title} />
                            </div>
                            <p className="flex items-center gap-2 text-[13px] text-[#374151]">
                                <span aria-hidden="true" className={`size-2 rounded-full ${statusGood ? 'bg-[#2d8653]' : 'bg-[#9ca3af]'}`} />
                                <strong className={statusGood ? 'text-[#1d6b40]' : 'text-[#4b5563]'}>{statusLabel}</strong>
                                {listedDays !== null && (
                                    <>
                                        <span aria-hidden="true">·</span>
                                        {t('listedDaysAgo', { count: Math.max(0, listedDays) })}
                                    </>
                                )}
                            </p>
                            <SaleContactForm
                                listingId={listing.id}
                                title={title}
                                reference={listing.reference}
                                sold={sold}
                                locale={locale}
                                whatsappUrl={whatsappUrl}
                            />
                        </div>
                        {amiLicense && (
                            <div className="flex items-center gap-4 rounded-[20px] border border-[#eceef1] bg-white px-6 py-5">
                                <span
                                    aria-hidden="true"
                                    className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-[#192537] text-base font-extrabold tracking-wide text-[#b09e80]"
                                >
                                    LM
                                </span>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[15px] font-bold text-[#192537]">{t('amiTitle')}</span>
                                    <span className="text-[13px] text-[#4b5563]">{t('amiSubtitle')}</span>
                                    <span className="text-xs text-[#6b7280]">{t('amiLicence', { number: amiLicense })}</span>
                                </div>
                            </div>
                        )}
                    </aside>
                </div>

                {similar.length > 0 && (
                    <section className="flex flex-col gap-5 border-t border-[#e9ebee] pt-8">
                        <div className="flex items-end justify-between gap-3">
                            <h2 className="text-2xl font-bold text-[#192537]">{t('similarTitle')}</h2>
                            <Link href="/for-sale" className="text-xs font-bold uppercase tracking-[0.18em] text-[#7a6a4d]">
                                {t('seeAll')}
                            </Link>
                        </div>
                        <div className="grid gap-6 md:grid-cols-3">
                            {similar.map((s) => (
                                <SaleCard key={s.id} listing={s} locale={locale} today={today} />
                            ))}
                        </div>
                    </section>
                )}
            </main>

            <SaleMobileBar
                priceText={priceText}
                statusText={statusLabel}
                statusTone={statusGood ? 'good' : 'neutral'}
                whatsappUrl={whatsappUrl}
            />
        </div>
    );
}
