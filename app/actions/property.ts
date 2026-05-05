"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { PropertyFormData, propertySchema } from "@/components/admin/properties/PropertyFormSchema";
import { logActivity } from "./audit";

/**
 * Creates or updates a property in the database.
 * Handles JSONB translations, images, rooms, and architectural hierarchy.
 */
export async function upsertProperty(data: PropertyFormData) {
    // 0. Role Check (Must be at least editor)
    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const serverSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    )
                },
            },
        }
    );

    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await serverSupabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || (profile.role !== 'super_admin' && profile.role !== 'admin' && profile.role !== 'editor')) {
        throw new Error('Not authorized to modify properties');
    }

    // 1. Validate data against schema
    const validation = propertySchema.safeParse(data);
    if (!validation.success) {
        console.error("Validation Error:", validation.error.format());
        return {
            success: false,
            error: "Form validation failed. Please check all tabs for errors."
        };
    }

    const validatedData = validation.data;

    // 2. Prepare payload for Supabase
    const payload = {
        title: validatedData.title,
        subtitle: validatedData.subtitle,
        description: validatedData.description,
        highlights_intro: validatedData.highlights_intro,
        slug: validatedData.slug,
        owner_id: validatedData.owner_id || null,

        // Hierarchy
        parent_id: validatedData.parent_id || null,
        is_multi_unit: validatedData.is_multi_unit,

        // Location
        address: validatedData.address,
        city: validatedData.city,
        lat: validatedData.lat,
        lng: validatedData.lng,
        nearby_places: validatedData.nearby_places,

        // Media & Highlights
        images: validatedData.images,
        highlights: validatedData.highlights,
        rooms: validatedData.rooms,
        floor_plan_url: validatedData.floor_plan_url,

        // Details
        max_guests: validatedData.max_guests,
        max_infants: validatedData.max_infants,
        bedrooms: validatedData.bedrooms,
        beds: validatedData.beds,
        bathrooms: validatedData.bathrooms,
        area: validatedData.area,

        // Pricing
        price_per_night: validatedData.price_per_night,
        original_price: validatedData.original_price,

        // Flags
        status: validatedData.status,
        is_active: validatedData.status === 'active',
        type: validatedData.type,

        // New Fields
        amenities: validatedData.amenities,
        vip_services: validatedData.vip_services,
        home_truths: validatedData.home_truths,
        house_rules: validatedData.house_rules,
        check_in: validatedData.check_in,
        cancellation: validatedData.cancellation,
        bed_sizes: validatedData.bed_sizes,
        baby_equipment: validatedData.baby_equipment,
        parking: validatedData.parking,

        // Concierge Settings
        has_breakfast: validatedData.has_breakfast,
        breakfast_price: validatedData.breakfast_price,
        has_transfer: validatedData.has_transfer,
        transfer_price: validatedData.transfer_price,

        // iCal Settings
        ical_import_urls: validatedData.ical_import_urls,
        airbnb_listing_name: validatedData.airbnb_listing_name,
    };

    try {
        const { getSupabaseAdmin } = await import('@/lib/supabase');
        const adminSupabase = await getSupabaseAdmin();

        let previousData: any = null;
        if (validatedData.id) {
            const { data: current } = await adminSupabase
                .from('properties')
                .select('*')
                .eq('id', validatedData.id)
                .single();
            previousData = current;
        }

        let query;
        if (validatedData.id) {
            query = adminSupabase
                .from('properties')
                .update(payload)
                .eq('id', validatedData.id);
        } else {
            query = adminSupabase
                .from('properties')
                .insert([payload]);
        }

        const { data: record, error } = await query.select('id, slug, title, price_per_night').single();

        if (error) {
            console.error("Supabase Error:", error);
            return { success: false, error: `Database error: ${error.message}` };
        }

        const { error: pricingError } = await adminSupabase
            .from('pricing_rules')
            .upsert({
                property_id: record.id,
                base_price_per_night: record.price_per_night,
                min_nights: validatedData.min_nights,
                cleaning_fee: validatedData.cleaning_fee,
                weekly_discount_percent: validatedData.weekly_discount_percent,
                monthly_discount_percent: validatedData.monthly_discount_percent,
                city_tax_per_night: validatedData.city_tax_per_night,
                updated_at: new Date().toISOString()
            }, { onConflict: 'property_id' });

        if (pricingError) {
            return { success: false, error: `Property saved, but pricing rules failed: ${pricingError.message}` };
        }

        const getEnStr = (val: any): string => {
            if (typeof val === 'string') return val;
            if (val && typeof val === 'object' && typeof val.en === 'string') return val.en;
            return '';
        };

        const changes: Record<string, any> = {};

        if (validatedData.id && previousData) {
            if (payload.status !== previousData.status)
                changes.status = { from: previousData.status, to: payload.status };

            const newTitleEn = getEnStr(payload.title);
            const oldTitleEn = getEnStr(previousData.title);
            if (newTitleEn !== oldTitleEn)
                changes.title = { from: oldTitleEn, to: newTitleEn };

            if (payload.price_per_night !== previousData.price_per_night)
                changes.price = { from: previousData.price_per_night, to: payload.price_per_night };

            if (payload.slug !== previousData.slug)
                changes.slug = { from: previousData.slug, to: payload.slug };

            if (payload.owner_id !== previousData.owner_id)
                changes.owner = { from: previousData.owner_id || 'None', to: payload.owner_id || 'None' };

            const newDescEn = getEnStr(payload.description);
            const oldDescEn = getEnStr(previousData.description);

            if (newDescEn !== oldDescEn && (newDescEn || oldDescEn)) {
                changes.description = { from: 'Modified', to: 'Modified' };
            }

            ['max_guests', 'max_infants', 'bedrooms', 'beds', 'bathrooms', 'area', 'breakfast_price', 'transfer_price'].forEach(field => {
                if (payload[field as keyof typeof payload] !== previousData[field]) {
                    changes[field] = { from: previousData[field], to: payload[field as keyof typeof payload] };
                }
            });
        } else {
            changes.title = getEnStr(validatedData.title) || 'Untitled';
            changes.status = validatedData.status;
            changes.slug = validatedData.slug;
        }

        await logActivity(
            user.id,
            validatedData.id ? 'UPDATE' : 'CREATE',
            'PROPERTY',
            record?.id,
            {
                changes: Object.keys(changes).length > 0 ? changes : { note: 'Minor updates' },
                slug: validatedData.slug
            }
        );

        revalidatePath("/admin/properties");
        if (record?.id) {
            revalidatePath(`/admin/properties/${record.id}`);
        }
        if (record?.slug) {
            revalidatePath(`/${record.slug}`);
        }

        return {
            success: true,
            id: record?.id,
            slug: record?.slug,
            message: validatedData.id ? "Property updated successfully!" : "Property created successfully!"
        };

    } catch (err: any) {
        console.error("Unexpected Error:", err);
        return { success: false, error: "An unexpected error occurred. Please try again." };
    }
}

export async function updatePropertyStatus(id: string, newStatus: string) {
    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const serverSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    )
                },
            },
        }
    );

    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: previousData } = await serverSupabase
        .from('properties')
        .select('status, is_active, slug, title, price_per_night, is_multi_unit')
        .eq('id', id)
        .single();

    if (!previousData) return { success: false, error: 'Property not found' };

    if (!previousData.is_multi_unit && newStatus === 'active' && (!previousData.price_per_night || previousData.price_per_night <= 0)) {
        return {
            success: false,
            error: 'Cannot activate property with price 0€. Please set a price per night first in the Pricing tab.'
        };
    }

    const { error } = await serverSupabase
        .from('properties')
        .update({
            status: newStatus,
            is_active: newStatus === 'active'
        })
        .eq('id', id);

    if (error) return { success: false, error: error.message };

    await logActivity(
        user.id,
        'STATUS_CHANGE',
        'PROPERTY',
        id,
        {
            slug: previousData.slug,
            title: previousData.title?.en || 'Untitled',
            changes: { status: { from: previousData.status, to: newStatus } }
        }
    );

    revalidatePath("/admin/properties");
    revalidatePath(`/${previousData.slug}`);

    return { success: true };
}

export async function deleteProperty(id: string) {
    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const serverSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    )
                },
            },
        }
    );

    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await serverSupabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || (profile.role !== 'super_admin' && profile.role !== 'admin')) {
        return { success: false, error: 'Not authorized to delete' };
    }

    const { data: property } = await serverSupabase
        .from('properties')
        .select('slug, title')
        .eq('id', id)
        .single();

    const { error } = await serverSupabase
        .from('properties')
        .delete()
        .eq('id', id);

    if (error) return { success: false, error: error.message, code: error.code };

    await logActivity(
        user.id,
        'DELETE',
        'PROPERTY',
        id,
        {
            slug: property?.slug,
            title: property?.title?.en || 'Untitled',
            note: 'Property deleted permanently'
        },
        'WARNING'
    );

    revalidatePath("/admin/properties");
    return { success: true };
}

export async function assignPropertiesToOwner(ownerId: string, propertyIds: string[]) {
    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const serverSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    )
                },
            },
        }
    );

    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await serverSupabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || (profile.role !== 'super_admin' && profile.role !== 'admin')) {
        return { success: false, error: 'Not authorized' };
    }

    const { error } = await serverSupabase
        .from('properties')
        .update({ owner_id: ownerId })
        .in('id', propertyIds);

    if (error) return { success: false, error: error.message };

    await logActivity(
        user.id,
        'UPDATE',
        'PROPERTY',
        'BULK_ASSIGN',
        { owner_id: ownerId, property_ids_count: propertyIds.length }
    );

    revalidatePath('/admin/owners');
    return { success: true };
}

export async function removePropertyFromOwner(propertyId: string) {
    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const serverSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    )
                },
            },
        }
    );

    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await serverSupabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || (profile.role !== 'super_admin' && profile.role !== 'admin')) {
        return { success: false, error: 'Not authorized' };
    }

    const { error } = await serverSupabase
        .from('properties')
        .update({ owner_id: null })
        .eq('id', propertyId);

    if (error) return { success: false, error: error.message };

    await logActivity(
        user.id,
        'UPDATE',
        'PROPERTY',
        propertyId,
        { action: 'REMOVE_OWNER' }
    );

    revalidatePath('/admin/owners');
    return { success: true };
}

export async function getAvailableProperties(currentOwnerId?: string) {
    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const serverSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    )
                },
            },
        }
    );

    let query = serverSupabase
        .from('properties')
        .select('id, title, slug, address, city, owner_id, images, status, is_active, is_multi_unit')
        .is('owner_id', null)
        .or('is_multi_unit.eq.false,is_multi_unit.is.null');

    const { data, error } = await query.order('title', { ascending: true });

    if (error) throw error;
    return data;
}

export async function getPropertiesOptions() {
    const { getSupabaseAdmin } = await import('@/lib/supabase');
    const adminSupabase = await getSupabaseAdmin();

    const { data, error } = await adminSupabase
        .from('properties')
        .select('id, title, is_multi_unit, airbnb_listing_name')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching property options:', error);
        return [];
    }

    // Filter properties (not buildings) in JS to handle potential nulls/undefined better
    // Buildings have is_multi_unit = true. Properties have it false or null.
    const filtered = (data || []).filter(p => p.is_multi_unit !== true);
    
    // Sort by name in JS since it's a JSONB field
    return filtered.sort((a: any, b: any) => {
        const nameA = a.title?.pt || a.title?.en || "";
        const nameB = b.title?.pt || b.title?.en || "";
        return nameA.localeCompare(nameB);
    });
}
