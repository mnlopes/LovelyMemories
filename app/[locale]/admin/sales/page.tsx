import { getTranslations } from "next-intl/server";
import { getSalesContactSettings, listSaleListings, type SalesContactSettings } from "@/app/actions/sales";
import { checkPermission } from "@/app/actions/permissions";
import SaleListingsTable, { type SaleListRow } from "@/components/admin/sales/SaleListingsTable";

export const dynamic = "force-dynamic";

export default async function AdminSalesPage() {
    const t = await getTranslations("AdminSales");

    let rows: SaleListRow[];
    let canEdit = false;
    let contacts: SalesContactSettings | null = null;
    try {
        const [listings, edit, contactSettings] = await Promise.all([
            listSaleListings(),
            checkPermission("sales", "can_edit"),
            getSalesContactSettings(),
        ]);
        canEdit = edit;
        contacts = contactSettings;
        // Only what the list shows: private columns never reach the browser.
        rows = listings.map((l) => ({
            id: l.id,
            reference: l.reference,
            title: l.title,
            subtitle: l.subtitle,
            city: l.city,
            price: l.price,
            price_on_request: l.price_on_request,
            status: l.status,
            published: l.published,
            updated_at: l.updated_at,
            thumb: (l.images?.find((i) => i.is_main) ?? l.images?.[0])?.url ?? null,
        }));
    } catch {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-300">
                {t("loadFailed")}
            </div>
        );
    }

    return <SaleListingsTable rows={rows} canEdit={canEdit} contacts={contacts} />;
}
