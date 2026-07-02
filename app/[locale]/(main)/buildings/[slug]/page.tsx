import React from 'react';
import { getBuildingWithUnits } from '@/lib/services';
import { notFound } from 'next/navigation';
import BuildingUnitsPage from '@/components/BuildingUnitsPage';
import { buildPageMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

// Localized values from the DB are { en, pt, he } objects; legacy ones plain strings.
function loc(val: unknown, locale: string): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    const obj = val as Record<string, string>;
    return obj[locale] || obj.en || obj.pt || '';
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string, slug: string }> }): Promise<Metadata> {
    const { locale, slug } = await params;
    const data = await getBuildingWithUnits(slug);

    if (!data?.building) {
        return { title: 'Building Not Found', robots: { index: false, follow: false } };
    }

    const title = loc(data.building.title, locale);
    const subtitle = loc(data.building.subtitle, locale);
    // locations stores per-language names (name_en/name_pt/name_he); properties may
    // also carry a legacy free-text city column.
    const l = data.building.locations;
    const city = (locale === 'pt' ? l?.name_pt : locale === 'he' ? l?.name_he : l?.name_en)
        || l?.name_en || data.building.city || '';
    const description = subtitle
        ? `${subtitle}${city ? ` — ${city}, Portugal` : ''}. Book directly with Lovely Memories.`
        : `Luxury apartments${city ? ` in ${city}` : ''} — book directly with Lovely Memories.`;

    return buildPageMetadata({
        locale,
        path: `buildings/${slug}`,
        title: subtitle ? `${title} — ${subtitle}` : title,
        description,
    });
}

// For Next.js 15, params are a Promise
export default function Page({ params }: { params: Promise<{ locale: string, slug: string }> }) {
    const { slug } = React.use(params);

    // Using a separate async child component or fetching directly
    return <BuildingPageContent slug={slug} />;
}

async function BuildingPageContent({ slug }: { slug: string }) {
    const data = await getBuildingWithUnits(slug);

    if (!data) {
        notFound();
    }

    return <BuildingUnitsPage building={data.building} units={data.units} />;
}
