import { redirect } from "next/navigation";
import { getCurrentUserRole } from "@/app/actions/user";
import { checkPermission } from "@/app/actions/permissions";

export default async function ContentGuardLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    // Mirrors the sidebar: content is available to super_admin/admin, or via explicit
    // role_permissions for other roles.
    const role = await getCurrentUserRole();
    if (role !== "super_admin" && role !== "admin") {
        const allowed = await checkPermission("content", "can_view");
        if (!allowed) redirect(`/${locale}/admin/properties`);
    }
    return <>{children}</>;
}
