import { listMemoryProperties } from "@/app/actions/ai-inbox";
import { PropertyMemoryManager } from "@/components/admin/memory/PropertyMemoryManager";

export default async function MemoryPage({
    searchParams,
}: { searchParams: Promise<{ property?: string }> }) {
    const { property } = await searchParams;
    const properties = await listMemoryProperties();
    const initial = property && properties.some((p) => String(p.beds24PropertyId) === property)
        ? Number(property)
        : properties[0]?.beds24PropertyId ?? null;
    return <PropertyMemoryManager properties={properties} initialSelected={initial} />;
}
