"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { PropertyFormData, propertySchema } from "@/components/admin/properties/PropertyFormSchema";

/**
 * Creates or updates a property in the database.
 * Handles JSONB translations, images, rooms, and architectural hierarchy.
 */
export async function upsertProperty(data: PropertyFormData) {
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
    };

    try {
        let query;
        if (validatedData.id) {
            // UPDATE
            query = supabase
                .from('properties')
                .update(payload)
                .eq('id', validatedData.id);
        } else {
            // INSERT
            query = supabase
                .from('properties')
                .insert([payload]);
        }

        const { data: record, error } = await query.select('id, slug').single();

        if (error) {
            console.error("Supabase Error:", error);
            return {
                success: false,
                error: `Database error: ${error.message}`
            };
        }

        // 3. Revalidate paths to show fresh data
        revalidatePath("/admin/properties");
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
        return {
            success: false,
            error: "An unexpected error occurred. Please try again."
        };
    }
}
