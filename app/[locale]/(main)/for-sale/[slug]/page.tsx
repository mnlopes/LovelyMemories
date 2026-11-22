import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getTranslations } from 'next-intl/server';
import { getCurrentUserRole } from '@/app/actions/user';
import { PROPERTY_EDITORS } from '@/lib/auth/require-role';
import { buildPageMetadata, SITE_URL } from '@/lib/seo';
import { getPublishedSaleListings, getSaleListingBySlug, getSalePerformance, getSalesContact } from '@/lib/sales/repo';
import { saleJsonLd, saleSeoDescription, saleSeoTitle } from '@/lib/sales/seo';
import { toSaleCard, type SaleListing } from '@/lib/sales/types';
import { SaleListingDetails } from '@/components/sales/SaleListingDetails';

type Props = { params: Promise<{ locale: string; slug: string }> };

/**
 * One load per request, shared by generateMetadata and the page. A published listing is public;
 * a draft is shown only to the team (and never indexed).
 */
const loadListing = cache(async (slug: string): Promise<{ listing: SaleListing; draft: boolean } | null> => {
    const published = await getSaleListingBySlug(slug);
    if (published) return { listing: published, draft: false };

    const role = await getCurrentUserRole();
    if (!role || !(PROPERTY_EDITORS as readonly string[]).includes(role)) return null;
    const draft = await getSaleListingBySlug(slug, { includeDrafts: true });
    return draft ? { listing: draft, draft: !draft.published } : null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale, slug } = await params;
    const found = await loadListing(slug);
    if (!found) {
        const t = await getTranslations({ locale, namespace: 'Sales' });
        return { title: t('notFoundTitle'), robots: { index: false, follow: false } };
    }
    const { listing, draft } = found;

    const metadata = buildPageMetadata({
        locale,
        path: `for-sale/${slug}`,
        title: saleSeoTitle(listing, locale),
        description: saleSeoDescription(listing, locale),
    });

    const main = listing.images.find((i) => i.is_main) ?? listing.images[0];
    if (main) metadata.openGraph = { ...metadata.openGraph, images: [main.url] };
    if (draft) metadata.robots = { index: false, follow: false };
    return metadata;
}

export default async function SaleListingPage({ params }: Props) {
    const { locale: rawLocale, slug } = await params;
    const locale = rawLocale === 'pt' ? 'pt' : 'en';

    const found = await loadListing(slug);
    if (!found) notFound();
    const { listing, draft } = found;

    const [contact, performance, published] = await Promise.all([
        getSalesContact(),
        getSalePerformance(listing),
        getPublishedSaleListings().catch(() => [] as SaleListing[]),
    ]);

    // Up to 3 available homes, the same city first.
    const sameCity = (l: SaleListing) => l.city.trim().toLowerCase() === listing.city.trim().toLowerCase();
    const similar = published
        .filter((l) => l.id !== listing.id && l.status === 'available')
        .sort((a, b) => Number(sameCity(b)) - Number(sameCity(a)))
        .slice(0, 3)
        .map(toSaleCard);

    // published_at is compared by its UTC date part, as in the catalogue.
    const today = new Date().toISOString().slice(0, 10);

    const jsonLd = draft ? null : saleJsonLd(listing, locale, `${SITE_URL}/${locale}/for-sale/${slug}`);

    return (
        <>
            {jsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
                />
            )}
            <SaleListingDetails
                listing={listing}
                locale={locale}
                today={today}
                amiLicense={contact.amiLicense}
                whatsapp={contact.whatsapp}
                performance={performance}
                similar={similar}
                draft={draft}
            />
        </>
    );
}
