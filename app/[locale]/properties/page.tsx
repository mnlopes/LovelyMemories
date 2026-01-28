import { PropertiesGrid } from '@/components/PropertiesGrid';

export const metadata = {
    title: 'Properties - Lovely Memories',
};

export default function PropertiesPage() {
    return (
        <main className="pt-20">
            <PropertiesGrid />
        </main>
    );
}
