import type { Metadata } from 'next';
import { SearchResults } from '@/components/SearchResults';

// Internal search results are thin/duplicate — keep them out of the index.
export const metadata: Metadata = {
    title: 'Search Results',
    robots: { index: false, follow: true },
};

export default function SearchPage() {
    return (
        <main className="pt-20">
            <SearchResults />
        </main>
    );
}
