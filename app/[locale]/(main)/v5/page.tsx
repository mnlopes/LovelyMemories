import { HomeHeroV5 } from "@/components/HomeHeroV5";
import { HomeFeaturedProperties } from "@/components/HomeFeaturedProperties";
import { ConciergeServices } from "@/components/ConciergeServices";
import { PropertyOwnerSection } from "@/components/PropertyOwnerSection";
import { HomeAbout } from "@/components/HomeAbout";

export default function HomeV5() {
    return (
        <main className="relative">
            <HomeHeroV5 />
            <HomeFeaturedProperties />
            <ConciergeServices />
            <PropertyOwnerSection />
            <HomeAbout />
        </main>
    );
}
