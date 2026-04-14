import { OwnerDetailsClient } from '@/components/admin/owners/OwnerDetailsClient';
import { getCurrentUserRole } from '@/app/actions/user';

export default async function OwnerDetailsPage({ params }: { params: Promise<{ locale: string, id: string }> }) {
    const { locale, id } = await params;
    const currentUserRole = await getCurrentUserRole();

    return <OwnerDetailsClient id={id} locale={locale} currentUserRole={currentUserRole} />;
}
