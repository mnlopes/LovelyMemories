import { guardRoles } from "@/lib/admin-guard";

export default async function Beds24Layout(props: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await props.params;
    await guardRoles(["admin", "super_admin"], locale);
    return <>{props.children}</>;
}
