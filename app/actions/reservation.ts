"use server";

import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { getPropertyBySlug } from "@/lib/services";

// Schema for reservation validation
const ReservationSchema = z.object({
    // Contact Info
    fullName: z.string().min(3, "Full name must be at least 3 characters"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(9, "Invalid phone number"), // Required and min 9 digits

    // Property Info
    propertySlug: z.string(),
    checkIn: z.string(),
    checkOut: z.string(),
    adults: z.number().int().min(1),
    children: z.number().int().min(0),
    infants: z.number().int().min(0),

    // Travel Details
    arrivalTime: z.string().nullish().or(z.literal("")),
    specialRequests: z.string().max(500).nullish().or(z.literal("")),

    // Security / Honeypot
    website: z.string().nullish().or(z.literal("")),
    bookingCode: z.string().nullish().or(z.literal("")),

    // Payment / Total
    totalPrice: z.number().nullish(),
    basePrice: z.number().nullish(),
    cleaningFee: z.number().nullish(),
    breakfastTotal: z.number().nullish(),
    transferTotal: z.number().nullish(),
    paymentMethod: z.string().nullish().or(z.literal("")),

    // Billing Address (Optional)
    address: z.string().nullish().or(z.literal("")),
    city: z.string().nullish().or(z.literal("")),
    zip: z.string().nullish().or(z.literal("")),
    country: z.string().nullish().or(z.literal("")),
    vat: z.string().nullish().or(z.literal("")),
}).passthrough(); // Allow unknown fields for now to prevent breaking on UI state changes

export async function processReservation(data: z.infer<typeof ReservationSchema>) {
    // 1. Basic Schema Validation
    const result = ReservationSchema.safeParse(data);

    if (!result.success) {
        console.error('Validation Error in processReservation:', result.error.format());
        const errorMsg = result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
        return { success: false, error: `Invalid data submitted: ${errorMsg}` };
    }

    // 2. Extra Security: Check Honeypot
    if (data.website) {
        // Bot detected
        return { success: false, error: "Bot activity detected." };
    }

    // 3. Extra Security: Verify Property Existence & Capacity
    const property = await getPropertyBySlug(data.propertySlug);
    if (!property) {
        return { success: false, error: "Invalid property selected." };
    }

    const totalGuests = data.adults + data.children + data.infants;
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

    // 5. Generate Reference ID
    const referenceId = data.bookingCode
        ? `LM-${data.bookingCode.toUpperCase()}`
        : `LM-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // 6. Save to Supabase
    // We try to catch specific missing column errors to provide better guidance
    const reservationData: any = {
        property_id: property.id,
        check_in: data.checkIn,
        check_out: data.checkOut,
        adults: data.adults,
        children: data.children,
        infants: data.infants,
        total_price: data.totalPrice || 0,
        status: 'pending',
        payment_method: data.paymentMethod || 'wire',
        reference_id: referenceId, // Standard name
        // The following might be missing in some DB versions
        guest_name: data.fullName,
        guest_email: data.email,
        guest_phone: data.phone,
        arrival_time: data.arrivalTime,
        special_requests: data.specialRequests
    };

    const { error: dbError } = await supabase
        .from('reservations')
        .insert(reservationData);

    if (dbError) {
        console.error('CRITICAL: Database Error saving reservation:', dbError);

        // Fallback for older schema (missing guest info or different reference name)
        if (dbError.message.includes('column "guest_name" does not exist') ||
            dbError.message.includes('column "reference_id" does not exist')) {

            console.warn('Attempting fallback save with minimal schema...');

            const minimalData: any = {
                property_id: property.id,
                check_in: data.checkIn,
                check_out: data.checkOut,
                adults: data.adults,
                children: data.children,
                infants: data.infants,
                total_price: data.totalPrice || 0,
                status: 'pending',
                payment_method: data.paymentMethod || 'wire',
                reference: referenceId // Try 'reference' instead of 'reference_id'
            };

            const { error: fallbackError } = await supabase
                .from('reservations')
                .insert(minimalData);

            if (!fallbackError) {
                console.log('Fallback reservation saved successfully (Warning: Guest contact info was NOT stored in DB)');
                return {
                    success: true,
                    ref: referenceId,
                    warning: "Reservation saved but contact info was only sent via email (schema update needed)."
                };
            }

            console.error('Fallback also failed:', fallbackError);
        }

        return { success: false, error: "Failed to save reservation to database. Please contact support." };
    }

    console.log("Secure reservation processed and saved for:", data.fullName, "Ref:", referenceId);

    // 7. Trigger Email Notifications (Async - don't block response)
    try {
        const { sendEmail } = await import("@/lib/email");
        const { bookingAdminEmail, bookingGuestConfirmationEmail } = await import("@/lib/email-templates");

        // Helper to get string from potentially localized title
        const getTitleStr = (title: any) => {
            if (!title) return data.propertySlug;
            if (typeof title === 'string') return title;
            return title.pt || title.en || Object.values(title)[0] || data.propertySlug;
        };

        const emailData = {
            ...reservationData,
            property_slug: data.propertySlug,
            property_title: getTitleStr(property.title),
            reference_id: referenceId,
            guest_name: data.fullName,
            guest_email: data.email,
            guest_phone: data.phone,
            // Price Breakdown
            base_price: data.basePrice || 0,
            cleaning_fee: data.cleaningFee || 0,
            breakfast_total: data.breakfastTotal || 0,
            transfer_total: data.transferTotal || 0,
            // Billing Info
            billing_address: data.address,
            billing_city: data.city,
            billing_zip: data.zip,
            billing_country: data.country,
            billing_vat: data.vat
        };

        // Notify Admin
        await sendEmail({
            to: "lovelymemories.office@gmail.com",
            subject: `✨ NOVA RESERVA: [Ref: ${referenceId}] - ${data.propertySlug}`,
            html: bookingAdminEmail(emailData),
            replyTo: data.email
        });

        // Confirm to Guest
        await sendEmail({
            to: data.email,
            subject: `Lovely Memories | Confirmação de Reserva [Ref: ${referenceId}]`,
            html: bookingGuestConfirmationEmail(emailData)
        });

    } catch (emailErr) {
        console.error("Non-critical error sending reservation emails:", emailErr);
        // We don't return error here because the reservation is already saved in DB
    }

    return {
        success: true,
        ref: referenceId
    };
}
