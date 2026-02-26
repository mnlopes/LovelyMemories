import { HomeHeroV6 } from "@/components/HomeHeroV6";
import { HomeFeaturedProperties } from "@/components/HomeFeaturedProperties";
import { ConciergeServices } from "@/components/ConciergeServices";
import { PropertyOwnerSection } from "@/components/PropertyOwnerSection";
import { HomeAbout } from "@/components/HomeAbout";

export default function HomeV6() {
    return (
        <main className="relative">
            <HomeHeroV6 />
            <HomeFeaturedProperties />
            <ConciergeServices />
            <PropertyOwnerSection />
            <HomeAbout />
        </main>
    );
}
