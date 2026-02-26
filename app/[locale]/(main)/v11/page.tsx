import { HomeHeroV11 } from "@/components/HomeHeroV11";
import { HomeFeaturedProperties } from "@/components/HomeFeaturedProperties";
import { ConciergeServices } from "@/components/ConciergeServices";
import { PropertyOwnerSection } from "@/components/PropertyOwnerSection";
import { HomeAbout } from "@/components/HomeAbout";

export default function HomeV11() {
    return (
        <main className="relative">
            <HomeHeroV11 />
            <HomeFeaturedProperties />
            <ConciergeServices />
            <PropertyOwnerSection />
            <HomeAbout />
        </main>
    );
}
