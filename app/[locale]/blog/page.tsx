import { getLegacyBody } from '@/lib/legacy';

export const metadata = {
    title: 'Blog - Lovely Memories',
};

export default function BlogPage() {
    const content = getLegacyBody('blog');

    return (
        <div
            className="legacy-content-wrapper"
            dangerouslySetInnerHTML={{ __html: content }}
            suppressHydrationWarning={true}
        />
    );
}
