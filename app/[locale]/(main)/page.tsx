import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/seo';
import { HomeHero } from '@/components/HomeHero';
import { HomeFeaturedProperties } from '@/components/HomeFeaturedProperties';
import { ConciergeServices } from "@/components/ConciergeServices";
import { PropertyOwnerSection } from '@/components/PropertyOwnerSection';
import { HomeAbout } from '@/components/HomeAbout';
import { getProperties } from '@/lib/services';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'Home' });
    return buildPageMetadata({
        locale,
        path: '',
        title: t('metadataTitle'),
        description: t('metadataDesc'),
    });
}

// SEO-2: 5 random featured properties, chosen on the server so their cards and links are in the
// HTML (and the browser doesn't reshuffle them after hydration).
function pickFeatured<T>(all: T[]): T[] {
    return [...all].sort(() => 0.5 - Math.random()).slice(0, 5);
}

export default async function Home() {
    const featured = pickFeatured((await getProperties()) || []);
    return (
        <main className="relative">
            <HomeHero />
            <HomeFeaturedProperties properties={featured} />
            <ConciergeServices />
            <PropertyOwnerSection />
            <HomeAbout />
        </main>
    );
}
