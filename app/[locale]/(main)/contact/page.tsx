import ContactContent from '@/components/contact/ContactContent';
import { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/seo';

// SEO-9: canonical + hreflang like every other marketing page (it had neither). params is a
// Promise in Next 16.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'Contact' });
    return buildPageMetadata({
        locale,
        path: 'contact',
        title: t('metadataTitle'),
        description: t('metadataDesc'),
    });
}

export default function ContactPage() {
    return <ContactContent />;
}
