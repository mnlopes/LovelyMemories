import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/seo';

// SEO-9: the page itself is a client component (no metadata of its own), so its title,
// description, canonical and hreflang come from this layout.
export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'PageMeta' });
    return buildPageMetadata({
        locale,
        path: 'privacy-policy',
        title: t('privacyTitle'),
        description: t('privacyDesc'),
    });
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
