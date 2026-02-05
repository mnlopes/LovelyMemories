import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
    title: "Owner - Lovely Memories",
    description: "Owner portal for Lovely Memories.",
};

export default function OwnerLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <main>
            {children}
        </main>
    );
}
