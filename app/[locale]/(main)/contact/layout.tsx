import "@/app/globals.css";
import "@/app/overrides.css";

// Metadata lives in page.tsx (localized, with canonical and hreflang).

export default function ContactLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="min-h-screen bg-white">
            {children}
        </div>
    );
}
