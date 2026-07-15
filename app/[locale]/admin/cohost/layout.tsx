import { guardRoles } from "@/lib/admin-guard";

export default async function CohostLayout({
    children, params,
}: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    // Rollout: super_admin only (como o inbox). Alargar a admin = 1 linha aqui + sidebar.
    await guardRoles(["super_admin"], locale);
    return <>{children}</>;
}
