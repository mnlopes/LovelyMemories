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
    totalPrice: z.number().min(0),
    basePrice: z.number().min(0),
    cleaningFee: z.number().min(0),
    discountAmount: z.number().min(0).optional(),
    breakfastTotal: z.number().min(0),
    transferTotal: z.number().min(0),
    transferType: z.enum(['one_way', 'round_trip']).nullish(),
    cityTaxTotal: z.number().min(0).optional(),
    paymentMethod: z.string().min(1, "Método de pagamento obrigatório"),

    // Billing Address (Required if address is provided, otherwise optional)
    address: z.string().nullish().or(z.literal("")),
    city: z.string().nullish().or(z.literal("")),
    zip: z.string().nullish().or(z.literal("")),
    country: z.string().nullish().or(z.literal("")),
    vat: z.string().nullish().or(z.literal("")),
}).refine((data) => {
    // If any billing field is provided (or if we have a flag from frontend), 
    // we require the core billing fields
    const hasBillingInfo = !!(data.address || data.city || data.zip || data.country);
    if (hasBillingInfo) {
        return !!(data.address && data.city && data.zip && data.country);
    }
    return true;
}, {
    message: "Todos os campos de faturação são obrigatórios quando a faturação está ativa.",
    path: ["address"] // Generic path for the refinement error
});

export async function processReservation(data: z.infer<typeof ReservationSchema>) {
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

    // 3. Extra Security: Verify Property Existence & Capacity
    const property = await getPropertyBySlug(data.propertySlug);
    if (!property) {
        return { success: false, error: "Propriedade inválida selecionada.", warning: undefined, ref: undefined };
    }

    const totalGuests = data.adults + data.children + data.infants;
    if (totalGuests > property.guests) {
        return { success: false, error: `Esta propriedade apenas acomoda até ${property.guests} hóspedes.`, warning: undefined, ref: undefined };
    }

    // 4. Extra Security: Integrated Availability & Pricing Engine
    const dateIn = new Date(data.checkIn);
    const dateOut = new Date(data.checkOut);

    // Verificação de Disponibilidade (Bloqueios, Reservas e Meia-Noite)
    const { verifyAvailability, calculateReservationPrice } = await import("@/lib/pricing");
    const availability = await verifyAvailability(property.id, dateIn, dateOut);

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

    // 6. Save to Supabase (using Admin Client to bypass RLS for guest insertions)
    const reservationData: any = {
        property_id: property.id,
        check_in: data.checkIn,
        check_out: data.checkOut,
        adults: data.adults,
        children: data.children,
        infants: data.infants,
        total_price: FINAL_TOTAL,
        status: status,
        payment_method: data.paymentMethod,
        reference_id: referenceId,
        guest_name: data.fullName,
        guest_email: data.email,
        guest_phone: data.phone,
        arrival_time: data.arrivalTime,
        special_requests: data.specialRequests,
        base_price: pricing.basePrice,
        cleaning_fee: pricing.cleaningFee,
        discount_amount: pricing.discountAmount,
        city_tax_total: pricing.cityTaxTotal, // Novo campo para histórico
        breakfast_total: data.breakfastTotal,
        transfer_total: data.transferTotal,
        transfer_type: data.transferType,
        billing_address: data.address,
        billing_city: data.city,
        billing_zip: data.zip,
        billing_country: data.country,
        billing_vat: data.vat
    };

    const adminSupabase = await getSupabaseAdmin();
    const { data: insertedRes, error: dbError } = await adminSupabase
        .from('reservations')
        .insert(reservationData)
        .select('id')
        .single();

    if (dbError) {
        console.error('CRITICAL: Database Error saving reservation:', JSON.stringify(dbError, null, 2));

        // Handle specific "Column Not Found" error to guide the user to sync their DB
        if (dbError.code === '42703') {
            return {
                success: false,
                error: "Erro de sistema: A base de dados precisa de ser sincronizada (Colunas em falta). Por favor, contacte o administrador.",
                warning: undefined,
                ref: undefined
            };
        }

        return { success: false, error: "Não foi possível guardar a reserva na base de dados. Por favor, tente novamente.", warning: undefined, ref: undefined };
    }

    console.log("Secure reservation processed and saved for:", data.fullName, "Ref:", referenceId);

    // 7. Log Activity
    try {
        const { logActivity } = await import("./audit");
        if (insertedRes) {
            await logActivity(
                null, // Actor is Guest (Unknown)
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

    // 7. Trigger Email Notifications (Async - don't block response)
    let warning: string | undefined;
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
