import type { Metadata } from "next";
import { MockupBar } from "./_components/MockupBar";

// Client-review mockups for the "homes for sale" feature. They live on a
// preview branch only and must never be indexed.
export const metadata: Metadata = {
    title: "Homes for sale — proposals",
    robots: { index: false, follow: false, nocache: true },
};

export default function MockupsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[#f8f9fa] text-[#192537]">
            <MockupBar />
            {children}
        </div>
    );
}
