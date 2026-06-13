import { guardModule } from "@/lib/admin-guard";

export default async function UsersGuardLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    await guardModule("team", locale);
    return <>{children}</>;
}
