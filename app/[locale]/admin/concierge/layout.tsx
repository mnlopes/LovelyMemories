import { guardModule } from "@/lib/admin-guard";

export default async function ConciergeGuardLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    await guardModule("concierge", locale);
    return <>{children}</>;
}
