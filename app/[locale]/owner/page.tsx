import { OwnerHero } from '@/components/OwnerHero';
import { OwnerStats } from '@/components/OwnerStats';
import { OwnerFeatures } from '@/components/OwnerFeatures';
import { OwnerServices } from '@/components/OwnerServices';
import { OwnerExperience } from '@/components/OwnerExperience';
import { OwnerPricing } from '@/components/OwnerPricing';

export const metadata = {
    title: 'Property Owners - Lovely Memories',
};

export default async function OwnerPage() {
    return (
        <main className="main-content-wrap">
            <div className="single-page single-owner">
                <OwnerHero />
                <OwnerStats />
                <OwnerServices />
                <OwnerFeatures />
                <OwnerExperience />
                <OwnerPricing />
            </div>
        </main>
    );
}
