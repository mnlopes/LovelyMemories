import ContactContent from '@/components/contact/ContactContent';
import { Metadata } from "next";
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
    const t = await getTranslations({ locale, namespace: 'Contact' });

    return {
        title: t('metadataTitle'),
        description: t('metadataDesc'),
    };
}

export default function ContactPage() {
    return <ContactContent />;
}
