import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/seo';
import { PropertiesGrid } from '@/components/PropertiesGrid';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'PageMeta' });
    return buildPageMetadata({
        locale,
        path: 'properties',
        title: t('propertiesTitle'),
        description: t('propertiesDesc'),
    });
}

export default function PropertiesPage() {
    return (
        <main className="pt-20">
            <PropertiesGrid />
        </main>
    );
}
