import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { HomeHero } from '@/components/HomeHero';
import { HomeFeaturedProperties } from '@/components/HomeFeaturedProperties';
import { ConciergeServices } from "@/components/ConciergeServices";
import { PropertyOwnerSection } from '@/components/PropertyOwnerSection';
import { HomeAbout } from '@/components/HomeAbout';

const SITE_URL = 'https://lovelymemories.pt';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'Home' });

    // hreflang map for the homepage of each locale.
    const languages: Record<string, string> = {};
    for (const l of routing.locales) languages[l] = `${SITE_URL}/${l}`;
    languages['x-default'] = `${SITE_URL}/${routing.defaultLocale}`;

    const ogLocale = ({ en: 'en_US', pt: 'pt_PT', he: 'he_IL' } as const)[
        locale as 'en' | 'pt' | 'he'
    ] ?? 'en_US';

    return {
        title: t('metadataTitle'),
        description: t('metadataDesc'),
        alternates: {
            canonical: `${SITE_URL}/${locale}`,
            languages,
        },
        // A page-level openGraph fully replaces the layout's, so it must be complete
        // (including the social image) for the home preview to render correctly.
        openGraph: {
            type: 'website',
            siteName: 'Lovely Memories',
            locale: ogLocale,
            title: `Lovely Memories — ${t('metadataTitle')}`,
            description: t('metadataDesc'),
            url: `${SITE_URL}/${locale}`,
            images: ['/opengraph-image.png'],
        },
    };
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
