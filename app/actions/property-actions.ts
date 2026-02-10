"use server";

import { getUnavailableDates } from "@/lib/pricing";

/**
 * Server action to fetch unavailable dates for a property.
 * Used by the guest-facing BookingCard calendar.
 */
export async function getPropertyAvailabilityDates(propertyId: string) {
    try {
        const dates = await getUnavailableDates(propertyId);
        return { success: true, dates };
    } catch (error) {
        console.error("[getPropertyAvailabilityDates] Error:", error);
        return { success: false, error: "Failed to fetch availability" };
    }
}
