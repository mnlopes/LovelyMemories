import { getLegacyBody } from '@/lib/legacy';

export default async function OwnerPage() {
    const content = getLegacyBody('owner');

    return (
        <div
            className="legacy-content-wrapper"
            dangerouslySetInnerHTML={{ __html: content }}
            suppressHydrationWarning={true}
        />
    );
}
