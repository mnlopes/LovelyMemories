import { guardModule } from "@/lib/admin-guard";

export default async function ReservationsGuardLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    await guardModule("bookings", locale);
    return <>{children}</>;
}
