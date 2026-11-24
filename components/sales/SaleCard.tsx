import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Bath, BedDouble, Home, MapPin, Maximize, TrendingUp } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { formatEuro, isNewListing, localized, pricePerM2 } from '@/lib/sales/format';
import { saleImageAlt } from '@/lib/sales/seo';
import type { SaleCardListing } from '@/lib/sales/types';
import { EnergyPill } from './EnergyPill';

const badge = 'rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em]';

/** "Income-generating" pill on the card photo (the listing page uses the same look on white). */
const incomeBadgeClass =
    'inline-flex items-center gap-1.5 rounded-full border border-white/35 bg-[#192537]/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur';

/**
 * Takes the slim card shape (`toSaleCard`), never a whole listing: in the catalogue it renders on the client.
 *
 * A home that is no longer simply available shows its state in a band across the top of the photo (brand
 * gold for reserved / under offer, navy for sold). The price stays visible while reserved or under offer;
 * a sold home shows "Sold" instead of the price.
 */
export function SaleCard({ listing, locale, today }: { listing: SaleCardListing; locale: string; today: string }) {
    const t = useTranslations('Sales');
    const sold = listing.status === 'sold';
    // "New" only matters while the home can still be bought.
    const showNew = listing.status === 'available' && isNewListing(listing.published_at, today);
    const statusLabel =
        listing.status === 'reserved'
            ? t('badgeReserved')
            : listing.status === 'under_offer'
              ? t('badgeUnderOffer')
              : sold
                ? t('badgeSold')
                : null;
    const statusBand = statusLabel !== null;
    const energy = listing.energy_class;
    const energyText = energy === 'exempt' ? t('energyExempt') : energy;
    const image = listing.mainImage;
    const title = localized(listing.title, locale);
    const subtitle = localized(listing.subtitle, locale);
    const onRequest = listing.price_on_request || listing.price === null;
    const perM2 = pricePerM2(listing);
    const place = listing.street || listing.area_label;
    const area = listing.gross_area;

    return (
        <article className="flex flex-col overflow-hidden rounded-2xl border border-[#eef0f2] bg-white shadow-[0_10px_40px_-15px_rgba(0,0,0,0.12)] transition-transform duration-500 hover:-translate-y-1">
            <div className="relative aspect-[4/3] overflow-hidden bg-[#e5e7eb]">
                {image ? (
                    <Image
                        src={image}
                        alt={saleImageAlt(listing, locale, 0)}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 420px"
                        className={`object-cover ${sold ? 'grayscale brightness-90' : ''}`}
                    />
                ) : (
                    <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center bg-[#e5e7eb] text-[#9ca3af]">
                        <Home className="size-12" />
                    </div>
                )}
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                {statusBand && (
                    <div
                        className={`absolute inset-x-0 top-0 z-10 flex h-8 items-center justify-center text-[11px] font-extrabold uppercase tracking-[0.24em] ${
                            sold ? 'bg-[#192537] text-white' : 'bg-[#b09e80] text-[#192537]'
                        }`}
                    >
                        {statusLabel}
                    </div>
                )}
                <div className={`absolute inset-x-4 flex items-start justify-between gap-2 ${statusBand ? 'top-11' : 'top-4'}`}>
                    <div className="flex flex-wrap gap-1.5">
                        {showNew && <span className={`${badge} bg-[#b09e80] text-[#192537]`}>{t('badgeNew')}</span>}
                    </div>
                    {listing.incomeBadge && (
                        <span className={incomeBadgeClass}>
                            <TrendingUp className="size-3.5" aria-hidden="true" />
                            {t('badgeIncome')}
                        </span>
                    )}
                </div>
                <div className="absolute inset-x-0 bottom-0 px-6 py-5 text-center">
                    <h2 className="text-[22px] font-bold leading-tight text-white">{title}</h2>
                    {subtitle && <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/90">{subtitle}</p>}
                </div>
            </div>
            <div className="flex flex-1 flex-col gap-4 px-6 pb-6 pt-4">
                <div className="flex items-center justify-between gap-3 border-b border-[#f1f2f4] pb-3.5">
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#192537]">
                        <MapPin className="size-3.5 text-[#b09e80]" aria-hidden="true" />
                        {listing.city}
                    </span>
                    {place && <span className="truncate text-xs text-[#6b7280]">{place}</span>}
                </div>
                <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col">
                        <span className={`text-[26px] font-bold tracking-tight ${sold ? 'text-[#6b7280]' : 'text-[#192537]'}`}>
                            {sold ? t('badgeSold') : onRequest ? t('priceOnRequest') : formatEuro(listing.price!, locale)}
                        </span>
                        {!sold && !onRequest && perM2 !== null && (
                            <span className="text-xs text-[#6b7280]">{formatEuro(perM2, locale)}/m²</span>
                        )}
                    </div>
                    {energy && energyText && (
                        <EnergyPill energy={energy} label={t('energy', { value: energyText })} />
                    )}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px] text-[#374151]">
                    {listing.typology && (
                        <span className="flex items-center gap-2">
                            <Home className="size-4 text-[#b09e80]" aria-hidden="true" />
                            <strong className="text-[#192537]">{listing.typology}</strong>
                        </span>
                    )}
                    {area !== null && area > 0 && (
                        <span className="flex items-center gap-2">
                            <Maximize className="size-4 text-[#b09e80]" aria-hidden="true" />
                            <strong className="text-[#192537]">{area} m²</strong>
                        </span>
                    )}
                    {listing.bedrooms !== null && (
                        <span className="flex items-center gap-2">
                            <BedDouble className="size-4 text-[#b09e80]" aria-hidden="true" />
                            {t('bedrooms', { count: listing.bedrooms })}
                        </span>
                    )}
                    {listing.bathrooms !== null && (
                        <span className="flex items-center gap-2">
                            <Bath className="size-4 text-[#b09e80]" aria-hidden="true" />
                            {t('bathrooms', { count: listing.bathrooms })}
                        </span>
                    )}
                </div>
                <Link
                    href={`/for-sale/${listing.slug}`}
                    className="mt-auto flex min-h-12 items-center justify-center rounded-full bg-[#192537] text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors duration-500 ease-out hover:bg-[#b09e80] hover:text-[#192537]"
                >
                    {t('viewProperty')}
                    <span className="sr-only"> — {title}</span>
                </Link>
            </div>
        </article>
    );
}
