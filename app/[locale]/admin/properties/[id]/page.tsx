
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import PropertyEditorForm from "@/components/admin/properties/PropertyEditorForm";
import { PropertyDetailTabs } from "@/components/admin/properties/PropertyDetailTabs";
import { getCurrentUserRole } from "@/app/actions/user";
import { isBeds24Enabled } from "@/lib/beds24/client";

export default async function PropertyEditorPage({
    params,
    searchParams
}: {
    params: Promise<{ id: string; locale: string }>,
    searchParams: Promise<{ mode?: string, parent_id?: string }>
}) {
    const { id, locale } = await params;
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
            .select('*, pricing_rules(*)')
            .eq('id', id)
            .single();

        if (error || !data) {
            console.error("Error fetching property with pricing rules:", error);
            // Fallback: try without pricing rules if the relation fails (e.g. if record missing in pricing_rules)
            const { data: fallbackData } = await supabase
                .from('properties')
                .select('*')
                .eq('id', id)
                .single();

            if (fallbackData) {
                propertyData = fallbackData;
            } else {
                if (id !== 'new') return notFound();
            }
        } else {
            // Flatten pricing rules into the main object for the form
            // Supabase may return it as an array or object depending on relationship inference
            const rulesArray = data.pricing_rules;
            const rules = Array.isArray(rulesArray) ? rulesArray[0] : rulesArray;

            const { pricing_rules: _, ...rest } = data;
            propertyData = {
                ...rest,
                min_nights: rules?.min_nights,
                cleaning_fee: rules?.cleaning_fee,
                weekly_discount_percent: rules?.weekly_discount_percent,
                monthly_discount_percent: rules?.monthly_discount_percent,
                city_tax_per_night: rules?.city_tax_per_night
            };
        }
    }

    const role = await getCurrentUserRole();
    // Lente Beds24/preços no calendário da propriedade: super_admin + admin (leitura only).
    // Cai para false com a integração desligada — o calendário fica só em iCal.
    const canUseBeds24Lens = (role === "super_admin" || role === "admin") && isBeds24Enabled();

    return (
        <PropertyDetailTabs
            propertyId={id}
            locale={locale}
            isNew={isNew}
            canUseBeds24Lens={canUseBeds24Lens}
            overview={
                <PropertyEditorForm
                    isEditing={!isNew}
                    initialData={propertyData || undefined}
                    mode={mode as "building" | undefined}
                />
            }
        />
    );
}
