import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Bath, BedDouble, Home, MapPin, Maximize, TrendingUp, Zap } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { formatEuro, isNewListing, localized, pricePerM2 } from '@/lib/sales/format';
import { saleImageAlt } from '@/lib/sales/seo';
import type { SaleCardListing } from '@/lib/sales/types';

const badge = 'rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em]';

/** Takes the slim card shape (`toSaleCard`), never a whole listing: in the catalogue it renders on the client. */
export function SaleCard({ listing, locale, today }: { listing: SaleCardListing; locale: string; today: string }) {
    const t = useTranslations('Sales');
    const sold = listing.status === 'sold';
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
                <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                        {isNewListing(listing.published_at, today) && !sold && (
                            <span className={`${badge} bg-[#b09e80] text-[#192537]`}>{t('badgeNew')}</span>
                        )}
                        {listing.status === 'reserved' && <span className={`${badge} bg-white text-[#192537]`}>{t('badgeReserved')}</span>}
                        {listing.status === 'under_offer' && <span className={`${badge} bg-[#fbf3e2] text-[#6e5218]`}>{t('badgeUnderOffer')}</span>}
                        {sold && <span className={`${badge} bg-[#192537] text-white`}>{t('badgeSold')}</span>}
                    </div>
                    {listing.incomeBadge && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/35 bg-[#192537]/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur">
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
                    <div className="flex flex-col">
                        <span className={`text-[26px] font-bold tracking-tight ${sold ? 'text-[#6b7280]' : 'text-[#192537]'}`}>
                            {sold ? t('badgeSold') : onRequest ? t('priceOnRequest') : formatEuro(listing.price!, locale)}
                        </span>
                        {!sold && !onRequest && perM2 !== null && (
                            <span className="text-xs text-[#6b7280]">{formatEuro(perM2, locale)}/m²</span>
                        )}
                    </div>
                    {listing.energy_class && (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[#e6f4ea] px-2.5 py-1 text-[11px] font-bold text-[#1d6b40]">
                            <Zap className="size-3" aria-hidden="true" />
                            {t('energy', { value: listing.energy_class === 'exempt' ? t('energyExempt') : listing.energy_class })}
                        </span>
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
                    className="mt-auto flex min-h-12 items-center justify-center rounded-full bg-[#192537] text-xs font-bold uppercase tracking-[0.18em] text-white hover:bg-[#b09e80] hover:text-[#192537]"
                >
                    {t('viewProperty')}
                    <span className="sr-only"> — {title}</span>
                </Link>
            </div>
        </article>
    );
}
