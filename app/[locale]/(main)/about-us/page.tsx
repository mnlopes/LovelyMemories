import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/seo';
import { getPageSections } from '@/app/actions/cms';
import { AboutHero } from '@/components/AboutHero';
import { AboutIntro } from '@/components/AboutIntro';
import { AboutStory } from '@/components/AboutStory';
import { AboutSocialWall } from '@/components/AboutSocialWall';
import { AboutForm } from '@/components/AboutForm';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'PageMeta' });
    return buildPageMetadata({
        locale,
        path: 'about-us',
        title: t('aboutTitle'),
        description: t('aboutDesc'),
    });
}

export default async function AboutUsPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const sections = await getPageSections('about-us', locale);

    return (
        <main className="main-content-wrap">
            <div className="single-page single-about">
                <AboutHero initialSections={sections} />
                <AboutIntro initialSections={sections} />
                <AboutStory initialSections={sections} />
                <AboutSocialWall />
                <AboutForm />
            </div>
        </main>
    );
}
