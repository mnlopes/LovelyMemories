"use server";

import { z } from "zod";
import { PROPERTIES } from "@/lib/data";

// Schema for reservation validation
const ReservationSchema = z.object({
    // Contact Info
    fullName: z.string().min(3, "Full name must be at least 3 characters"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(9, "Invalid phone number"),

    // Property Info
    propertySlug: z.string(),
    checkIn: z.string(),
    checkOut: z.string(),
    adults: z.number().int().min(1),
    infants: z.number().int().min(0),

    // Travel Details
    arrivalTime: z.string().optional(),
    specialRequests: z.string().max(500).optional(),

    // Security / Honeypot
    website: z.string().optional(), // Honeypot field should be empty
    bookingCode: z.string().regex(/^[A-Z0-9]+$/i, "Invalid booking code format").optional(),
});

export async function processReservation(data: z.infer<typeof ReservationSchema>) {
    // 1. Basic Schema Validation
    const result = ReservationSchema.safeParse(data);

    if (!result.success) {
        return { success: false, error: "Invalid data submitted." };
    }

    // 2. Extra Security: Check Honeypot
    if (data.website) {
        // Bot detected
        return { success: false, error: "Bot activity detected." };
    }

    // 3. Extra Security: Verify Property Existence & Capacity
    const property = PROPERTIES.find(p => p.slug === data.propertySlug);
    if (!property) {
        return { success: false, error: "Invalid property selected." };
    }

    const totalGuests = data.adults + data.infants;
    if (totalGuests > property.guests) {
        return { success: false, error: `This property only accommodates up to ${property.guests} guests.` };
    }

    // 4. Extra Security: Date Integrity
    const dateIn = new Date(data.checkIn);
    const dateOut = new Date(data.checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(dateIn.getTime()) || isNaN(dateOut.getTime())) {
        return { success: false, error: "Invalid date format." };
    }

    if (dateIn < today) {
        return { success: false, error: "Check-in date cannot be in the past." };
    }

    if (dateOut <= dateIn) {
        return { success: false, error: "Check-out date must be after check-in date." };
    }

    // 5. Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 6. In a real app: 
    // - Save to database (Prisma/Sanity)
    // - Send email via Resend/SendGrid
    // - Process payment via Stripe

    console.log("Secure reservation processed for:", data.fullName, "at", data.propertySlug);

    const referenceId = data.bookingCode
        ? `LM-${data.bookingCode.toUpperCase()}`
        : `LM-${Math.random().toString(36).substring(7).toUpperCase()}`;

    console.log("Secure reservation processed for:", data.fullName, "Ref:", referenceId);

    return {
        success: true,
        ref: referenceId
    };
}
