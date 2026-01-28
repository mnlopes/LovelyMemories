import { ConciergeHero } from "@/components/ConciergeHero";
import { ConciergeIntro } from "@/components/ConciergeIntro";
import { Concierge } from "@/components/Concierge";
import { PropertyOwnerSection } from "@/components/PropertyOwnerSection";

export default function ConciergePage() {
    return (
        <main className="relative pt-20">
            <ConciergeHero />
            <ConciergeIntro />
            <Concierge />
            <PropertyOwnerSection />
        </main>
    );
}
