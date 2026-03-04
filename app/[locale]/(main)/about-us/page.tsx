import { AboutHero } from '@/components/AboutHero';
import { AboutIntro } from '@/components/AboutIntro';
import { AboutStory } from '@/components/AboutStory';
import { AboutSocialWall } from '@/components/AboutSocialWall';
import { AboutForm } from '@/components/AboutForm';

export const metadata = {
    title: 'About Us - Lovely Memories',
};

export default function AboutUsPage() {
    return (
        <main className="main-content-wrap">
            <div className="single-page single-about">
                <AboutHero />
                <AboutIntro />
                <AboutStory />
                <AboutSocialWall />
                <AboutForm />
            </div>
        </main>
    );
}
