import { guardRoles } from "@/lib/admin-guard";

export default async function MemoryGuardLayout({
    children, params,
}: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    await guardRoles(["super_admin"], locale);
    return <>{children}</>;
}
