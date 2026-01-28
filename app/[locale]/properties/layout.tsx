import "@/app/globals.css";
import "@/app/overrides.css";

export default async function PropertiesLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    // Ensure params is awaited before access
    const { locale } = await params;

    return (
        <div className="properties-layout">
            {children}
        </div>
    );
}
