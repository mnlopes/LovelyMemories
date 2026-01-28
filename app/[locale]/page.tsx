import { GuestSelectorWrapper } from '@/components/GuestSelectorWrapper';
import { DateSelectorWrapper } from '@/components/DateSelectorWrapper';
import { PropertyOwnerSection } from '@/components/PropertyOwnerSection';
import { Concierge } from '@/components/Concierge';
import { HomeAbout } from '@/components/HomeAbout';
import { HomeHero } from '@/components/HomeHero';
import { HomeFeaturedProperties } from '@/components/HomeFeaturedProperties';

export default function Home() {
    return (
        <main className="relative">
            <div className="main-content-wrap">
                <div className="single-page single-home">
                    {/* React Hero Section (Includes Booking Bar) */}
                    <HomeHero />

                    {/* React Featured Properties */}
                    <HomeFeaturedProperties />

                    {/* Componente Concierge React Funcional (In-Place) */}
                    <Concierge />

                    {/* React Owner Section */}
                    <PropertyOwnerSection />

                    {/* React About Section */}
                    <HomeAbout />
                </div>
            </div>

            {/* Componentes Cliente para Interatividade Híbrida */}
            <GuestSelectorWrapper />
            <DateSelectorWrapper />
        </main>
    );
}
