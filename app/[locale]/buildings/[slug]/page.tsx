import React from 'react';
import { getBuildingWithUnits } from '@/lib/services';
import { notFound } from 'next/navigation';
import BuildingUnitsPage from '@/components/BuildingUnitsPage';

// For Next.js 15, params are a Promise
export default function Page({ params }: { params: Promise<{ locale: string, slug: string }> }) {
    const { locale, slug } = React.use(params);

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
