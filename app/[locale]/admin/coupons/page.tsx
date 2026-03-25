import { CouponManager } from "@/components/admin/coupons/CouponManager";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { checkPermission } from "@/app/actions/permissions";
import { redirect } from "next/navigation";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
    const t = await getTranslations({ locale, namespace: 'AdminCoupons' });
    return {
        title: `Coupons | Lovely Memories Admin`,
    };
}

export default async function AdminCouponsPage({ params: { locale } }: { params: { locale: string } }) {
    const t = await getTranslations({ locale, namespace: 'AdminCoupons' });

    const canView = await checkPermission('coupons', 'can_view');
    if (!canView) {
        redirect(`/${locale}/admin`);
    }

    return (
        <div className="space-y-10 pb-20">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-[#171717] dark:text-admin-dark-text-primary">
                        {t('title')}
                    </h2>
                    <p className="text-[#a3a3a3] mt-2 font-medium">
                        {t('subtitle')}
                    </p>
                </div>
            </div>

            <CouponManager />
        </div>
    );
}
