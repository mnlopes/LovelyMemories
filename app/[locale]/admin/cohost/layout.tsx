import { guardRoles } from "@/lib/admin-guard";

export default async function CohostLayout({
    children, params,
}: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    // Co-Host aberto a super_admin + admin (rollout validado 2026-07-17).
    await guardRoles(["super_admin", "admin"], locale);
    return <>{children}</>;
}
