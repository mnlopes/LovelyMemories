import React from 'react';
import { getBuildingWithUnits } from '@/lib/services';
import { notFound } from 'next/navigation';
import BuildingUnitsPage from '@/components/BuildingUnitsPage';
import { buildPageMetadata, clampDescription } from '@/lib/seo';
import { buildingSeo } from '@/lib/property-seo';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { cache } from 'react';

// generateMetadata and the page need the same rows: one round of queries per view.
const loadBuilding = cache((slug: string) => getBuildingWithUnits(slug));

export async function generateMetadata({ params }: { params: Promise<{ locale: string, slug: string }> }): Promise<Metadata> {
    const { locale, slug } = await params;
    const data = await loadBuilding(slug);

    if (!data?.building) {
        return { title: 'Building Not Found', robots: { index: false, follow: false } };
    }

    // Each building gets its own title and description (they all shared one before):
    // "Belomonte, Ribeira — 3 Luxury Apartments in Porto". See lib/property-seo.ts.
    const seo = buildingSeo(data.building, data.units, locale);
    const t = await getTranslations({ locale, namespace: 'PageMeta' });

    const metadata = buildPageMetadata({
        locale,
        path: `buildings/${slug}`,
        title: seo.title,
        description: clampDescription(`${seo.description} ${t('propertyBookDirect')}`, 160),
    });
    if (data.building.image) {
        metadata.openGraph = { ...metadata.openGraph, images: [data.building.image] };
    }
    return metadata;
}

// For Next.js 15, params are a Promise
export default function Page({ params }: { params: Promise<{ locale: string, slug: string }> }) {
    const { slug } = React.use(params);

    // Using a separate async child component or fetching directly
    return <BuildingPageContent slug={slug} />;
}

async function BuildingPageContent({ slug }: { slug: string }) {
    const data = await loadBuilding(slug);

    if (!data) {
        notFound();
    }

    return <BuildingUnitsPage building={data.building} units={data.units} />;
}
