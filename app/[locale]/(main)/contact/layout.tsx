import type { Metadata } from "next";
import "@/app/globals.css";
import "@/app/overrides.css";

export const metadata: Metadata = {
    title: "Contact - Lovely Memories",
    description: "Get in touch with Lovely Memories.",
};

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
