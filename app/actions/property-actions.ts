"use server";

import { getUnavailableDates, verifyAvailability } from "@/lib/pricing";
import { cookies } from "next/headers";

/**
 * Server action to fetch unavailable dates for a property.
 * Used by the guest-facing BookingCard calendar.
 */
export async function getPropertyAvailabilityDates(propertyId: string) {
    try {
        const cookieStore = await cookies();
        const sessionId = cookieStore.get('booking_session_id')?.value;
        const dates = await getUnavailableDates(propertyId, sessionId);
        return { success: true, dates };
    } catch (error) {
        console.error("[getPropertyAvailabilityDates] Error:", error);
        return { success: false, error: "Failed to fetch availability" };
    }
}

/**
 * Server action to validate availability for a specific date range and guest count.
 * Automatically handles session-aware date locks.
 */
export async function validatePropertyAvailability(propertyId: string, from: Date, to: Date, guests: number = 1) {
    try {
        const cookieStore = await cookies();
        const sessionId = cookieStore.get('booking_session_id')?.value;
        
        const { createServerClient } = await import('@supabase/ssr');
        const supabase = createServerClient(
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

        // 1. Check guest capacity
        const { data: property } = await supabase
            .from('properties')
            .select('max_guests')
            .eq('id', propertyId)
            .single();

        if (property) {
            const maxGuestsVal = typeof property.max_guests === 'object' ?
                (property.max_guests.en || property.max_guests.pt || 0) :
                property.max_guests;
            
            if (guests > (parseInt(String(maxGuestsVal)) || 0)) {
                return { available: false, error: 'errorMaxGuests' };
            }
        }

        // 2. Check availability including locks for other sessions
        const result = await verifyAvailability(propertyId, from, to, sessionId);
        return result;
    } catch (error) {
        console.error("[validatePropertyAvailability] Error:", error);
        return { available: false, error: "Failed to validate availability" };
    }
}
