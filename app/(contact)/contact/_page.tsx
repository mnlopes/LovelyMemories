import { getLegacyBody } from '@/lib/legacy';

export default async function ContactPage() {
    const content = getLegacyBody('contact');

    return (
        <div
            className="legacy-content-wrapper"
            dangerouslySetInnerHTML={{ __html: content }}
            suppressHydrationWarning={true}
        />
    );
}
