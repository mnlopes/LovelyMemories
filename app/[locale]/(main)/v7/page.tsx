import { HomeHeroV7 } from "@/components/HomeHeroV7";
import { HomeFeaturedProperties } from "@/components/HomeFeaturedProperties";
import { ConciergeServices } from "@/components/ConciergeServices";
import { PropertyOwnerSection } from "@/components/PropertyOwnerSection";
import { HomeAbout } from "@/components/HomeAbout";

export default function HomeV7() {
    return (
        <main className="relative">
            <HomeHeroV7 />
            <HomeFeaturedProperties />
            <ConciergeServices />
            <PropertyOwnerSection />
            <HomeAbout />
        </main>
    );
}
