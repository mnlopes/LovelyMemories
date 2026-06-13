"use server";

import { z } from "zod";
import { supabase, getSupabaseAdmin } from "@/lib/supabase";
import { getPropertyBySlug } from "@/lib/services";

// Schema for reservation validation
const ReservationSchema = z.object({
    // Contact Info
    fullName: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
    email: z.string().email("Endereço de email inválido"),
    phone: z.string().min(9, "Número de telefone inválido"),
    extraGuestNames: z.array(z.string().min(3, "Nome do hóspede inválido")).optional(),

    // Property Info
    propertySlug: z.string(),
    checkIn: z.string(),
    checkOut: z.string(),
    adults: z.number().int().min(1),
    children: z.number().int().min(0),
    infants: z.number().int().min(0),

    // Travel Details
    arrivalTime: z.string().nullish().or(z.literal("")),
    couponCode: z.string().nullish().or(z.literal("")),
    couponDiscount: z.number().min(0).optional(),

    // Security / Honeypot
    website: z.string().nullish().or(z.literal("")),
    bookingCode: z.string().nullish().or(z.literal("")),
    sessionId: z.string().optional(),

    // Payment / Total
    totalPrice: z.number().min(0),
    basePrice: z.number().min(0),
    cleaningFee: z.number().min(0),
    discountAmount: z.number().min(0).optional(),
    breakfastTotal: z.number().min(0),
    transferTotal: z.number().min(0),
    transferType: z.enum(['one_way', 'round_trip']).nullish(),
    cityTaxTotal: z.number().min(0).optional(),
    paymentMethod: z.string().min(1, "Método de pagamento obrigatório"),

    // Billing Toggle
    isBillingActive: z.boolean().optional().default(false),

    // Billing Address (Required if isBillingActive is true)
    address: z.string().nullish().or(z.literal("")),
    city: z.string().nullish().or(z.literal("")),
    zip: z.string().nullish().or(z.literal("")),
    country: z.string().nullish().or(z.literal("")),
    vat: z.string().nullish().or(z.literal("")),
    locale: z.string().optional().default('pt'),
}).refine((data) => {
    // If billing is active, check required core fields
    if (data.isBillingActive) {
        return !!(data.address && data.city && data.zip && data.country);
    }
    return true;
}, {
    message: "Todos os campos de faturação são obrigatórios quando a faturação está ativa.",
    path: ["address"]
});

export type ReservationData = z.infer<typeof ReservationSchema>;

export async function processReservation(data: ReservationData) {
    // 1. Basic Schema Validation
    const result = ReservationSchema.safeParse(data);

    if (!result.success) {
        const errorMsg = result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
        return { success: false, error: `Dados inválidos: ${errorMsg}`, warning: undefined, ref: undefined };
    }

    // 2. Extra Security: Check Honeypot
    if (data.website) {
        // Bot detected
        return { success: false, error: "Bot activity detected.", warning: undefined, ref: undefined };
    }

    // 2.1 SECURITY: Payment bypass protection.
    // This server action creates ONLY unpaid wire-transfer reservations (status 'pending').
    // Card payments MUST go through the Stripe-verified flow
    // (createPaymentIntent -> Stripe -> webhook / confirmStripePaymentIntent).
    // Without this guard, anyone could call this public server action with
    // paymentMethod !== 'wire' to obtain a "confirmed" reservation without paying.
    if (data.paymentMethod !== 'wire') {
        return {
            success: false,
            error: "errorInvalidPaymentMethod",
            warning: undefined,
            ref: undefined
        };
    }

    // 2.5 Extra Security: Date Sequence & Past Date Protection
    const dateIn = new Date(data.checkIn);
    const dateOut = new Date(data.checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateIn < today) {
        return { success: false, error: "A data de check-in não pode ser no passado.", warning: undefined, ref: undefined };
    }

    if (dateOut <= dateIn) {
        return { success: false, error: "A data de check-out deve ser após a data de check-in.", warning: undefined, ref: undefined };
    }

    // 3. Extra Security: Verify Property Existence & Capacity
    const property = await getPropertyBySlug(data.propertySlug);
    if (!property) {
        return { success: false, error: "Propriedade inválida selecionada.", warning: undefined, ref: undefined };
    }

    const totalOccupants = data.adults + data.children;
    if (totalOccupants > property.guests) {
        return { success: false, error: "errorCapacityExceeded", warning: undefined, ref: undefined };
    }

    // 4. Extra Security: Integrated Availability & Pricing Engine
    // Verificação de Disponibilidade (Bloqueios, Reservas e Meia-Noite)
    const { verifyAvailability, calculateReservationPrice } = await import("@/lib/pricing");
    const availability = await verifyAvailability(property.id, dateIn, dateOut, data.sessionId);

    if (!availability.available) {
        return { success: false, error: availability.error || "Datas indisponíveis.", warning: undefined, ref: undefined };
    }

    // Cálculo Seguro de Preços (Server-side)
    const pricing = await calculateReservationPrice({
        propertyId: property.id,
        checkIn: dateIn,
        checkOut: dateOut,
        adults: data.adults,
        children: data.children
    });

    if ('error' in pricing) {
        return { success: false, error: pricing.error, warning: undefined, ref: undefined };
    }

    // 5. Generate Reference ID
    const referenceId = data.bookingCode
        ? `LM-${data.bookingCode.toUpperCase()}`
        : `LM-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Determine initial status based on payment method
    const status = data.paymentMethod === 'wire' ? 'pending' : 'confirmed';

    // Cálculo Seguro de Preços Final (Estadia + Limpeza + Extras)
    // pricing.totalPrice já inclui (base - desconto + limpeza + city_tax)
    const FINAL_TOTAL = pricing.totalPrice + data.breakfastTotal + data.transferTotal;

    return await finalizeBooking({
        data,
        propertyId: property.id,
        referenceId,
        status,
        finalTotal: FINAL_TOTAL,
        pricingReport: {
            basePrice: pricing.basePrice,
            cleaningFee: pricing.cleaningFee,
            discountAmount: pricing.discountAmount,
            cityTaxTotal: pricing.cityTaxTotal
        }
    });
}

/**
 * Core logic to save a reservation, log activity, and send emails.
 * This is called by processReservation (Wire Transfer) and the Stripe Webhook.
 */
export async function finalizeBooking({
    data,
    propertyId,
    referenceId,
    status,
    finalTotal,
    pricingReport
}: {
    data: ReservationData;
    propertyId: string;
    referenceId: string;
    status: string;
    finalTotal: number;
    pricingReport: {
        basePrice: number;
        cleaningFee: number;
        discountAmount: number;
        cityTaxTotal: number;
    };
}) {
    // 6. Save to Supabase (using Admin Client to bypass RLS for guest insertions)
    const reservationData: any = {
        property_id: propertyId,
        check_in: data.checkIn,
        check_out: data.checkOut,
        adults: data.adults,
        children: data.children,
        infants: data.infants,
        total_price: finalTotal,
        status: status,
        payment_method: data.paymentMethod,
        reference_id: referenceId,
        guest_name: data.fullName,
        guest_email: data.email,
        guest_phone: data.phone,
        arrival_time: data.arrivalTime,
        coupon_code: data.couponCode,
        coupon_discount_amount: data.couponDiscount || 0,
        base_price: pricingReport.basePrice,
        cleaning_fee: pricingReport.cleaningFee,
        discount_amount: pricingReport.discountAmount,
        city_tax_total: pricingReport.cityTaxTotal,
        breakfast_total: data.breakfastTotal,
        transfer_total: data.transferTotal,
        transfer_type: data.transferType,
        billing_address: data.address,
        billing_city: data.city,
        billing_zip: data.zip,
        billing_country: data.country,
        billing_vat: data.vat,
        locale: data.locale || 'pt',
        extra_guests: data.extraGuestNames || []
    };

    const adminSupabase = await getSupabaseAdmin();

    // Prevent Duplicates from concurrent Webhooks & Client requests
    const { data: existing } = await adminSupabase
        .from('reservations')
        .select('id')
        .eq('reference_id', referenceId)
        .single();
    if (existing) {
        console.log(`Duplicate insertion caught for reference: ${referenceId}`);
        return { success: true, ref: referenceId, warning: "Reservation already exists." };
    }

    const { data: insertedRes, error: dbError } = await adminSupabase
        .from('reservations')
        .insert(reservationData)
        .select('id')
        .single();

    if (dbError) {
        console.error('CRITICAL: Database Error saving reservation:', JSON.stringify(dbError, null, 2));
        // Unique violation on reference_id: a concurrent finalize (webhook + manual confirm)
        // already created this reservation. Treat as a benign duplicate, not an error.
        if (dbError.code === '23505') {
            console.log(`Duplicate insertion caught via unique constraint for reference: ${referenceId}`);
            return { success: true, ref: referenceId, warning: "Reservation already exists." };
        }
        if (dbError.code === '42703') {
            return {
                success: false,
                error: "Erro de sistema: A base de dados precisa de ser sincronizada (Colunas em falta).",
                warning: undefined,
                ref: undefined
            };
        }
        return { success: false, error: "Não foi possível guardar a reserva na base de dados.", warning: undefined, ref: undefined };
    }

    console.log("Secure reservation finalized for:", data.fullName, "Ref:", referenceId);

    // 7. Log Activity
    try {
        const { logActivity } = await import("./audit");
        if (insertedRes) {
            await logActivity(
                null, 
                'CREATE',
                'RESERVATION',
                insertedRes.id,
                {
                    title: `Nova reserva: ${data.fullName}`,
                    guest_name: data.fullName,
                    email: data.email,
                    property: data.propertySlug,
                    ref: referenceId
                }
            );
        }
    } catch (logErr) {
        console.error("Failed to audit log new reservation:", logErr);
    }

    // 8. Trigger Email Notifications
    let warning: string | undefined;
    try {
        const { sendEmail } = await import("@/lib/email");
        const { bookingAdminEmail, bookingGuestConfirmationEmail, bookingGuestPaidEmail } = await import("@/lib/email-templates");

        const property = await getPropertyBySlug(data.propertySlug);

        const emailData = {
            ...reservationData,
            property_slug: data.propertySlug,
            property_title: property ? (typeof property.title === 'string' ? property.title : property.title.pt || property.title.en) : data.propertySlug,
            reference_id: referenceId,
            guest_name: data.fullName,
            guest_email: data.email,
            guest_phone: data.phone,
            base_price: pricingReport.basePrice,
            cleaning_fee: pricingReport.cleaningFee,
            breakfast_total: data.breakfastTotal || 0,
            transfer_total: data.transferTotal || 0,
            billing_address: data.address,
            billing_city: data.city,
            billing_zip: data.zip,
            billing_country: data.country,
            billing_vat: data.vat,
            coupon_code: data.couponCode,
            coupon_discount_amount: data.couponDiscount || 0
        };

        // Notify Admin
        await sendEmail({
            to: "info@lovelymemories.pt",
            subject: `✨ NOVA RESERVA: [Ref: ${referenceId}] - ${data.propertySlug}`,
            html: bookingAdminEmail(emailData),
            replyTo: data.email
        });

        // Determine which email to send to Guest
        const guestHtml = data.paymentMethod === 'card' 
            ? bookingGuestPaidEmail(emailData, data.locale) 
            : bookingGuestConfirmationEmail(emailData, data.locale);

        // Confirm to Guest
        const isEn = data.locale === 'en';
        await sendEmail({
            to: data.email,
            subject: isEn 
                ? `Lovely Memories | Booking Confirmation [Ref: ${referenceId}]`
                : `Lovely Memories | Confirmação de Reserva [Ref: ${referenceId}]`,
            html: guestHtml
        });
    } catch (emailErr) {
        console.error("Non-critical error sending reservation emails:", emailErr);
        warning = "Reservation saved but notification emails failed to send.";
    }

    return {
        success: true,
        ref: referenceId,
        warning
    };
}

/**
 * Delete a reservation (Super Admin and Admin only)
 */
export async function deleteReservation(id: string) {
    // 1. Authenticate and check role
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
        throw new Error('Not authorized to delete reservations');
    }

    // 2. Perform deletion
    const adminSupabase = await getSupabaseAdmin();
    const { error } = await adminSupabase
        .from('reservations')
        .delete()
        .eq('id', id);

    if (error) {
        console.error("Error deleting reservation:", error);
        throw error;
    }

    // 3. Log Activity
    const { logActivity } = await import("./audit");
    await logActivity(
        user.id,
        'DELETE',
        'RESERVATION',
        id,
        { id }
    );

    return { success: true };
}
