import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/seo';
import { HomeHero } from '@/components/HomeHero';
import { HomeFeaturedProperties } from '@/components/HomeFeaturedProperties';
import { ConciergeServices } from "@/components/ConciergeServices";
import { PropertyOwnerSection } from '@/components/PropertyOwnerSection';
import { HomeAbout } from '@/components/HomeAbout';

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

export default function Home() {
    return (
        <main className="relative">
            <HomeHero />
            <HomeFeaturedProperties />
            <ConciergeServices />
            <PropertyOwnerSection />
            <HomeAbout />
        </main>
    );
}
