import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/seo';
import { getPublishedSaleListings } from '@/lib/sales/repo';
import { parseFilters } from '@/lib/sales/filters';
import { toSaleCard, type SaleCardListing } from '@/lib/sales/types';
import { SaleCatalogue } from '@/components/sales/SaleCatalogue';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'PageMeta' });
    // Canonical stays /for-sale even when filters are in the URL.
    return buildPageMetadata({
        locale,
        path: 'for-sale',
        title: t('forSaleTitle'),
        description: t('forSaleDescription'),
    });
}

export default async function ForSalePage({
    params,
    searchParams,
}: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const { locale } = await params;
    const filters = parseFilters(await searchParams);

    // Only the card fields go to the client catalogue (no linked-home id, no AL licence).
    let listings: SaleCardListing[] = [];
    try {
        listings = (await getPublishedSaleListings()).map(toSaleCard);
    } catch {
        console.error('for-sale: could not load listings');
    }

    // published_at is compared by its UTC date part.
    const today = new Date().toISOString().slice(0, 10);

    return <SaleCatalogue listings={listings} initialFilters={filters} locale={locale} today={today} />;
}
