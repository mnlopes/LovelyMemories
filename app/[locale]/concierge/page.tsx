import { ConciergeHero } from "@/components/ConciergeHero";
import { ConciergeIntro } from "@/components/ConciergeIntro";
import { ConciergeServices } from "@/components/ConciergeServices";
import { PropertyOwnerSection } from "@/components/PropertyOwnerSection";

import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Concierge - Lovely Memories",
    description: "Concierge services by Lovely Memories.",
};

export default function ConciergePage() {
    return (
        <main className="relative pt-20">
            <ConciergeHero />
            <ConciergeIntro />
            <ConciergeServices />
            <PropertyOwnerSection />
        </main>
    );
}
