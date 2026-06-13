import { guardRoles } from "@/lib/admin-guard";

export default async function ActivityGuardLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    await guardRoles(["super_admin", "admin"], locale);
    return <>{children}</>;
}
