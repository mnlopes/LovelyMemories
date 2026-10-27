import type { Metadata } from "next";
import { MockupBar } from "./_components/MockupBar";

// Client-review mockups for the "homes for sale" feature. Temporary: reachable
// only by direct link (not in the sitemap or any menu) and never indexed.
// Delete this whole folder once the client has picked an option.
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
