import { getLegacyBody } from '@/lib/legacy';

export default async function ConciergePage() {
    const content = getLegacyBody('concierge');

    return (
        <div
            className="legacy-content-wrapper"
            dangerouslySetInnerHTML={{ __html: content }}
            suppressHydrationWarning={true}
        />
    );
}
