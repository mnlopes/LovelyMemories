import { getLegacyBody } from '@/lib/legacy';

export const metadata = {
    title: 'About Us - Lovely Memories',
};

export default function AboutUsPage() {
    const content = getLegacyBody('about-us');

    return (
        <div
            className="legacy-content-wrapper"
            dangerouslySetInnerHTML={{ __html: content }}
        />
    );
}
