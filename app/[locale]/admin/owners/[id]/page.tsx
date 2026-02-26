
import { OwnerDetailsClient } from '@/components/admin/owners/OwnerDetailsClient';

export default async function OwnerDetailsPage({ params }: { params: Promise<{ locale: string, id: string }> }) {
    const { locale, id } = await params;

    return <OwnerDetailsClient id={id} locale={locale} />;
}
