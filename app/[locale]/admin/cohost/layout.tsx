import { notFound } from "next/navigation";
import { guardRoles } from "@/lib/admin-guard";
import { isBeds24Enabled } from "@/lib/beds24/client";

export default async function CohostLayout({
    children, params,
}: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    // Co-Host aberto a super_admin + admin (rollout validado 2026-07-17).
    await guardRoles(["super_admin", "admin"], locale);
    // O canal de mensagens é o Beds24. Desligado, o módulo não recebe nem envia:
    // fecha-se no servidor, para a proteção não viver só em esconder o item da sidebar.
    if (!isBeds24Enabled()) notFound();
    return <>{children}</>;
}
