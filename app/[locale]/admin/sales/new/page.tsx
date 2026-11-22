import { checkPermission } from "@/app/actions/permissions";
import SaleListingEditor from "@/components/admin/sales/SaleListingEditor";

// A fresh id per visit: never prerender this page.
export const dynamic = "force-dynamic";

export default async function NewSaleListingPage() {
    const canEdit = await checkPermission("sales", "can_edit");
    return <SaleListingEditor initial={null} id={crypto.randomUUID()} canEdit={canEdit} />;
}
