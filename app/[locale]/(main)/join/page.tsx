import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/seo';
import { OwnerHero } from '@/components/OwnerHero';
import { OwnerStats } from '@/components/OwnerStats';
import { OwnerFeatures } from '@/components/OwnerFeatures';
import { OwnerServices } from '@/components/OwnerServices';
import { OwnerExperience } from '@/components/OwnerExperience';
import { OwnerPricing } from '@/components/OwnerPricing';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'PageMeta' });
    return buildPageMetadata({
        locale,
        path: 'join',
        title: t('ownersTitle'),
        description: t('ownersDesc'),
    });
}

export default async function OwnerPage() {
    return (
        <main className="main-content-wrap">
            <div className="single-page single-owner">
                <OwnerHero />
                <OwnerStats />
                <OwnerServices />
                <OwnerFeatures />
                <OwnerExperience />
                <OwnerPricing />
            </div>
        </main>
    );
}
