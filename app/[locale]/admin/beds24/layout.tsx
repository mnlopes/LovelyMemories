import { guardRoles } from "@/lib/admin-guard";

export default async function Beds24Layout(props: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await props.params;
    // Fase 1 em produção: EXCLUSIVO super_admin (decisão Marcelo 2026-07-13)
    await guardRoles(["super_admin"], locale);
    return <>{props.children}</>;
}
