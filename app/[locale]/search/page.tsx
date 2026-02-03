import { SearchResults } from '@/components/SearchResults';

export const metadata = {
    title: 'Search Results - Lovely Memories',
};

export default function SearchPage() {
    return (
        <main className="pt-20">
            <SearchResults />
        </main>
    );
}
