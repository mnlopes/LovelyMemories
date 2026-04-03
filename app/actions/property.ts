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
    // Note: We use dynamic JSONB fields for title, subtitle, and description
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
    };

    try {
        // 0.5 Fetch existing data for Diffing (if update)
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
            // UPDATE
            query = adminSupabase
                .from('properties')
                .update(payload)
                .eq('id', validatedData.id);
        } else {
            // INSERT
            query = adminSupabase
                .from('properties')
                .insert([payload]);
        }

        const { data: record, error } = await query.select('id, slug, title, price_per_night').single();

        if (error) {
            console.error("Supabase Error:", error);
            return {
                success: false,
                error: `Database error: ${error.message}`
            };
        }

        // 2.5 Upsert Pricing Rules
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
            console.error("Pricing Rules Error:", pricingError);
            return {
                success: false,
                error: `Property saved, but pricing rules failed: ${pricingError.message}`
            };
        }

        const getEnStr = (val: any): string => {
            if (typeof val === 'string') return val;
            if (val && typeof val === 'object' && typeof val.en === 'string') return val.en;
            return '';
        };

        // 3. Log Activity with Diff
        const changes: Record<string, any> = {};

        if (validatedData.id && previousData) {
            // Compare key fields
            if (payload.status !== previousData.status)
                changes.status = { from: previousData.status, to: payload.status };

            // Compare Titles (deep compare or just EN)
            const newTitleEn = getEnStr(payload.title);
            const oldTitleEn = getEnStr(previousData.title);
            if (newTitleEn !== oldTitleEn)
                changes.title = { from: oldTitleEn, to: newTitleEn };

            // Compare Price
            if (payload.price_per_night !== previousData.price_per_night)
                changes.price = { from: previousData.price_per_night, to: payload.price_per_night };

            // Compare Slug
            // Compare Slug
            if (payload.slug !== previousData.slug)
                changes.slug = { from: previousData.slug, to: payload.slug };

            // Compare Owner
            if (payload.owner_id !== previousData.owner_id) {
                changes.owner = { from: previousData.owner_id || 'None', to: payload.owner_id || 'None' };
            }

            // Compare Description (EN) - optional check
            const newDescEn = getEnStr(payload.description);
            const oldDescEn = getEnStr(previousData.description);

            if (newDescEn !== oldDescEn && (newDescEn || oldDescEn)) {
                // Smart Diff Logic: Remove common prefix and suffix
                const getSmartDiff = (oldS: string, newS: string, context = 15) => {
                    if (!oldS) return { from: 'Empty', to: newS };
                    if (!newS) return { from: oldS, to: 'Empty' };

                    let start = 0;
                    while (start < oldS.length && start < newS.length && oldS[start] === newS[start]) start++;

                    let endOld = oldS.length - 1;
                    let endNew = newS.length - 1;

                    // Don't go past start
                    while (endOld >= start && endNew >= start && oldS[endOld] === newS[endNew]) {
                        endOld--;
                        endNew--;
                    }

                    // Extract the changed segment
                    const diffOld = oldS.substring(start, endOld + 1);
                    const diffNew = newS.substring(start, endNew + 1);

                    // Simple truncator for display
                    const limit = (s: string) => s.length > 50 ? s.substring(0, 40) + '...' : s;

                    // Add context
                    const prefix = oldS.substring(Math.max(0, start - context), start);
                    const suffix = oldS.substring(endOld + 1, Math.min(oldS.length, endOld + 1 + context));

                    return {
                        from: (start > 0 ? "..." : "") + prefix + limit(diffOld) + suffix + (endOld + 1 + context < oldS.length ? "..." : ""),
                        to: (start > 0 ? "..." : "") + prefix + limit(diffNew) + suffix + (endNew + 1 + context < newS.length ? "..." : "")
                    };
                };

                changes.description = getSmartDiff(oldDescEn, newDescEn);
            }

            // Compare Numeric Fields
            ['max_guests', 'bedrooms', 'beds', 'bathrooms', 'area', 'breakfast_price', 'transfer_price'].forEach(field => {
                if (payload[field as keyof typeof payload] !== previousData[field]) {
                    changes[field] = { from: previousData[field], to: payload[field as keyof typeof payload] };
                }
            });

            // Compare Boolean Fields
            ['has_breakfast', 'has_transfer'].forEach(field => {
                if (payload[field as keyof typeof payload] !== previousData[field]) {
                    changes[field] = { from: previousData[field], to: payload[field as keyof typeof payload] };
                }
            });

            // Compare Arrays (Amenities, etc)
            ['amenities', 'vip_services', 'home_truths'].forEach(field => {
                const oldVal = previousData[field];
                const newVal = payload[field as keyof typeof payload];

                // Ensure we are dealing with arrays
                if (Array.isArray(oldVal) && Array.isArray(newVal)) {
                    // deeply compare with JSON stringify for simplicity
                    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                        // For logging, we just want to know if items were added/removed
                        // Note: .includes on objects only works by reference, so we use stringify for small sets
                        const added = newVal.filter(x => !oldVal.some(y => JSON.stringify(x) === JSON.stringify(y)));
                        const removed = oldVal.filter(x => !newVal.some(y => JSON.stringify(x) === JSON.stringify(y)));

                        let diffText = '';
                        if (added.length > 0) diffText += `+${added.length} added `;
                        if (removed.length > 0) diffText += `-${removed.length} removed`;
                        if (!diffText) diffText = 'Modified';

                        changes[field] = {
                            from: `${oldVal.length} items`,
                            to: `${newVal.length} items (${diffText})`
                        };
                    }
                }
            });

            // Compare house_rules (Object)
            if (JSON.stringify(payload.house_rules) !== JSON.stringify(previousData.house_rules)) {
                changes.house_rules = { from: 'Updated', to: 'Updated' };
            }

            // Compare original price
            if (payload.original_price !== previousData.original_price) {
                changes.original_price = { from: previousData.original_price, to: payload.original_price };
            }

        } else {
            // New creation
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

        // 4. Revalidate paths to show fresh data
        revalidatePath("/admin/properties");
        if (record?.id) {
            revalidatePath(`/admin/properties/${record.id}`);
            // Also revalidate the localized versions if possible
            revalidatePath(`/pt/admin/properties/${record.id}`);
            revalidatePath(`/en/admin/properties/${record.id}`);
        }

        if (record?.slug) {
            revalidatePath(`/${record.slug}`);
            revalidatePath(`/en/properties/${record.slug}`); // Force en check
            revalidatePath(`/pt/properties/${record.slug}`); // Force pt check
        }

        return {
            success: true,
            id: record?.id,
            slug: record?.slug,
            message: validatedData.id ? "Property updated successfully!" : "Property created successfully!"
        };

    } catch (err: any) {
        console.error("Unexpected Error:", err);
        return {
            success: false,
            error: "An unexpected error occurred. Please try again."
        };
    }
}

/**
 * Updates the status of a property (Active, Hidden, Coming Soon).
 * Logs the activity.
 */
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

    // Fetch existing for diff
    const { data: previousData } = await serverSupabase
        .from('properties')
        .select('status, is_active, slug, title')
        .eq('id', id)
        .single();

    if (!previousData) return { success: false, error: 'Property not found' };

    const { error } = await serverSupabase
        .from('properties')
        .update({
            status: newStatus,
            is_active: newStatus === 'active'
        })
        .eq('id', id);

    if (error) {
        return { success: false, error: error.message };
    }

    // Log Activity
    await logActivity(
        user.id,
        'STATUS_CHANGE',
        'PROPERTY',
        id,
        {
            slug: previousData.slug,
            title: previousData.title?.en || 'Untitled',
            changes: {
                status: { from: previousData.status, to: newStatus }
            }
        }
    );

    revalidatePath("/admin/properties");
    revalidatePath(`/${previousData.slug}`);

    return { success: true };
}

/**
 * Deletes a property.
 * Logs the activity.
 */
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

    // Role check
    const { data: profile } = await serverSupabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || (profile.role !== 'super_admin' && profile.role !== 'admin')) {
        return { success: false, error: 'Not authorized to delete' };
    }

    // Fetch info before delete for log
    const { data: property } = await serverSupabase
        .from('properties')
        .select('slug, title')
        .eq('id', id)
        .single();

    const { error } = await serverSupabase
        .from('properties')
        .delete()
        .eq('id', id);

    if (error) {
        return { success: false, error: error.message, code: error.code }; // Pass code for handling FK constraints
    }

    // Log Activity
    await logActivity(
        user.id,
        'DELETE',
        'PROPERTY',
        id, // ID might remain in log even if record deleted
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

/**
 * Assign multiple properties to an owner
 */
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

    // Log activity
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

/**
 * Remove a property from an owner
 */
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

/**
 * Fetch properties that are not assigned to any owner (or assigned to this owner)
 */
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
        .select('id, title, slug, address, city, owner_id, images, status, is_active')
        .is('owner_id', null);

    // If currentOwnerId is provided, also include properties owned by them (so they show up in list as "already assigned" or just to be safe)
    // Actually for a "Assign New" dropdown we usually want only unassigned.
    // Let's stick to unassigned for now. 

    const { data, error } = await query.order('title', { ascending: true });

    if (error) throw error;
    return data;
}
