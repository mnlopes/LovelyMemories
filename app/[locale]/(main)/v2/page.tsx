import { HomeHeroV2 } from '@/components/HomeHeroV2';
import { HomeFeaturedProperties } from '@/components/HomeFeaturedProperties';
import { ConciergeServices } from "@/components/ConciergeServices";
import { PropertyOwnerSection } from '@/components/PropertyOwnerSection';
import { HomeAbout } from '@/components/HomeAbout';

export default function HomeV2() {
    return (
        <main className="relative">
            <HomeHeroV2 />
            <HomeFeaturedProperties />
            <ConciergeServices />
            <PropertyOwnerSection />
            <HomeAbout />
        </main>
    );
}
