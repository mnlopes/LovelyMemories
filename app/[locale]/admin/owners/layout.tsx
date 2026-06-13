import { guardModule } from "@/lib/admin-guard";

export default async function OwnersGuardLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    await guardModule("owners", locale);
    return <>{children}</>;
}
