import { HomeHero } from '@/components/HomeHero';
import { HomeFeaturedProperties } from '@/components/HomeFeaturedProperties';
import { ConciergeServices } from "@/components/ConciergeServices";
import { PropertyOwnerSection } from '@/components/PropertyOwnerSection';
import { HomeAbout } from '@/components/HomeAbout';

export default function Home() {
    return (
        <main className="relative">
            <HomeHero />
            <HomeFeaturedProperties />
            <ConciergeServices />
            <PropertyOwnerSection />
            <HomeAbout />
        </main>
    );
}
