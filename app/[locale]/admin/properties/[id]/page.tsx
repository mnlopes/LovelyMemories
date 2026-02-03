
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import PropertyEditorForm from "@/components/admin/properties/PropertyEditorForm";

export default async function PropertyEditorPage({
    params,
    searchParams
}: {
    params: Promise<{ id: string }>,
    searchParams: Promise<{ mode?: string, parent_id?: string }>
}) {
    const { id } = await params;
    const { mode, parent_id } = await searchParams;
    const isNew = id === 'new';
    let propertyData: any = null;

    if (isNew && parent_id) {
        propertyData = {
            parent_id: parent_id,
            is_multi_unit: false
        };
    }

    if (!isNew) {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                },
            }
        );

        const { data, error } = await supabase
            .from('properties')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            console.error("Error fetching property:", error);
            // If it's a GUID format but not found, 404. 
            // If it's "config" or strictly 'new', we handled that.
            if (id !== 'new') return notFound();
        }

        propertyData = data;
    }

    return (
        <PropertyEditorForm
            isEditing={!isNew}
            initialData={propertyData || undefined}
            mode={mode as 'building' | undefined}
        />
    );
}
