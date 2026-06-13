import { guardModule } from "@/lib/admin-guard";

export default async function PropertiesGuardLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    // denyTo = home, to avoid a loop (/admin redirects non-super_admins here).
    await guardModule("properties", locale, `/${locale}`);
    return <>{children}</>;
}
