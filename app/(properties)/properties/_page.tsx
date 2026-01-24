import { getLegacyBody } from '@/lib/legacy';

export const metadata = {
    title: 'Properties - Lovely Memories',
};

export default function PropertiesPage() {
    const content = getLegacyBody('properties');

    return (
        <div
            className="legacy-content-wrapper"
            dangerouslySetInnerHTML={{ __html: content }}
            suppressHydrationWarning={true}
        />
    );
}
