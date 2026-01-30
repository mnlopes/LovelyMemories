import type { Metadata } from "next";
import "@/app/globals.css";
import "@/app/overrides.css";

export const metadata: Metadata = {
    title: "Concierge - Lovely Memories",
    description: "Concierge services by Lovely Memories.",
};

export default function ConciergeLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="bg-white">
            {children}
        </div>
    );
}
