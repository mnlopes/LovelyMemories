import { HomeHeroV4 } from "@/components/HomeHeroV4";
import { HomeFeaturedProperties } from "@/components/HomeFeaturedProperties";
import { ConciergeServices } from "@/components/ConciergeServices";
import { PropertyOwnerSection } from "@/components/PropertyOwnerSection";
import { HomeAbout } from "@/components/HomeAbout";

export default function HomeV4() {
    return (
        <main className="relative">
            <HomeHeroV4 />
            <HomeFeaturedProperties />
            <ConciergeServices />
            <PropertyOwnerSection />
            <HomeAbout />
        </main>
    );
}
