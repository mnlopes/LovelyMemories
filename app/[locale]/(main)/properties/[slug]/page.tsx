import { PropertyDetails } from "@/components/PropertyDetails";
import { getPropertyBySlug, getConciergeServices } from "@/lib/services";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "@/lib/seo";
import { Metadata } from "next";
import { cache } from "react";
import { getTranslations } from "next-intl/server";

// generateMetadata and the page need the same row: one database request per page view.
const loadProperty = cache((slug: string) => getPropertyBySlug(slug));

type Props = {
    params: Promise<{ locale: string; slug: string }>;
};

// Localized values coming from the DB are { en, pt, he } objects; legacy/static
// ones can still be plain strings.
function loc(val: unknown, locale: string): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    const obj = val as Record<string, string>;
    return obj[locale] || obj.en || obj.pt || '';
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale, slug } = await params;
    // Read from the DB (not the static PROPERTIES list): backoffice-created
    // properties were getting "Property Not Found" as their indexed title.
    const property = await loadProperty(slug);

    if (!property) {
        // Brand suffix is added by the root layout's title template.
        return {
            title: "Property Not Found",
            robots: { index: false, follow: false },
        };
    }

    const title = loc(property.title, locale);
    const subtitle = loc(property.subtitle, locale);
    const city = property.location?.city || '';
    // Localized (the closing sentence used to be English on the pt pages too).
    const t = await getTranslations({ locale, namespace: 'PageMeta' });
    const description = subtitle
        ? `${subtitle}${city ? ` — ${city}, Portugal` : ''}. ${t('propertyBookDirect')}`
        : city ? t('propertyFallback', { city }) : t('propertyFallbackNoCity');

    // buildPageMetadata gives us the canonical URL + hreflang alternates + OG base;
    // we then swap the generic social image for the property's own photo.
    const metadata = buildPageMetadata({
        locale,
        path: `properties/${slug}`,
        title: subtitle ? `${title} — ${subtitle}` : title,
        description,
    });

    if (property.image) {
        metadata.openGraph = { ...metadata.openGraph, images: [property.image] };
    }

    return metadata;
}

export default async function PropertyDetailPage({ params }: Props) {
    const { slug } = await params;
    // SEO-1: load on the server so the HTML carries the content, and answer a real 404 for a
    // slug that doesn't exist (it used to be 200 + noindex, a soft 404).
    const [property, conciergeServices] = await Promise.all([
        loadProperty(slug),
        getConciergeServices(),
    ]);
    if (!property) notFound();
    return <PropertyDetails initialProperty={property} initialConciergeServices={conciergeServices || []} />;
}
