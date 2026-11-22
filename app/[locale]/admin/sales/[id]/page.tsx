import { notFound } from "next/navigation";
import { getSaleListing } from "@/app/actions/sales";
import { checkPermission } from "@/app/actions/permissions";
import SaleListingEditor from "@/components/admin/sales/SaleListingEditor";

export const dynamic = "force-dynamic";

export default async function EditSaleListingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const [listing, canEdit] = await Promise.all([getSaleListing(id), checkPermission("sales", "can_edit")]);
    if (!listing) notFound();
    // created_by is never needed by the editor.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { created_by, ...editable } = listing;
    return <SaleListingEditor initial={editable} id={id} canEdit={canEdit} />;
}
