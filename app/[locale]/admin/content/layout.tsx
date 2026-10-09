import { redirect } from "next/navigation";
import { checkPermission } from "@/app/actions/permissions";

export default async function ContentGuardLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    // Mirrors the sidebar: content follows the Roles & Permissions matrix ("content" module).
    // super_admin always passes; admin passes by default until the matrix says otherwise.
    const allowed = await checkPermission("content", "can_view");
    if (!allowed) redirect(`/${locale}/admin/properties`);
    return <>{children}</>;
}
