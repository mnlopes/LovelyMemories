import { getLegacyBody } from '@/lib/legacy';

export default async function BuildingDetailPage() {
    const content = getLegacyBody('building-detail');

    return (
        <div
            className="legacy-content-wrapper"
            dangerouslySetInnerHTML={{ __html: content }}
            suppressHydrationWarning={true}
        />
    );
}
