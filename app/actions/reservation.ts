"use server";

import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getPropertyBySlug } from "@/lib/services";
import { finalizeBooking } from "@/lib/booking-finalize";
import { wireBookingLimitReached, bookingReference } from "@/lib/wire-booking-guards";

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
    // NOTE: breakfastTotal/transferTotal from the client are display-only. processReservation
    // recomputes them server-side (calculateExtrasTotals) before saving; they are only stored
    // as-is when this type is reconstructed from server-authored Stripe metadata.
    breakfastTotal: z.number().min(0),
    transferTotal: z.number().min(0),
    breakfastSelected: z.boolean().optional(),
    breakfastDays: z.number().int().min(0).nullish(),
    transferSelected: z.boolean().optional(),
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

    // 2.6 SECURITY (S-4): limits on unpaid bank-transfer bookings, per email and site-wide.
    // Each booking blocks dates here and on Airbnb/Booking and sends an email, so a script
    // must not be able to repeat it at will. See lib/wire-booking-guards.ts.
    const adminSupabase = await getSupabaseAdmin();
    try {
        const limitHit = await wireBookingLimitReached(adminSupabase, data.email);
        if (limitHit) {
            console.warn(`processReservation refused: bank-transfer booking limit (${limitHit})`);
            return { success: false, error: "errorTooManyBookings", warning: undefined, ref: undefined };
        }
    } catch (limitErr) {
        console.error("processReservation: could not check the booking limits:", limitErr);
        return { success: false, error: "errorGeneric", warning: undefined, ref: undefined };
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
    // SECURITY: usar o cliente service-role. O cliente anon não consegue ler `reservations`
    // (RLS só permite admins/owners), pelo que a verificação via anon via zero reservas
    // existentes e permitia duplicar reservas em datas já ocupadas.
    const { verifyAvailability, calculateReservationPrice, calculateExtrasTotals } = await import("@/lib/pricing");
    const availability = await verifyAvailability(property.id, dateIn, dateOut, data.sessionId, adminSupabase);

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

    // 4.5 SECURITY: Recalcular extras no servidor a partir dos preços da propriedade.
    // Do cliente usamos apenas a SELEÇÃO; os totais enviados nunca entram no valor final.
    // Sessões antigas podem não enviar as flags *Selected — nesse caso inferimos a seleção
    // (não o valor) a partir dos campos legacy.
    const breakfastSelected = data.breakfastSelected ?? (data.breakfastTotal > 0);
    const transferSelected = data.transferSelected ?? (!!data.transferType || data.transferTotal > 0);
    const extras = calculateExtrasTotals(
        property.servicesPrice,
        {
            breakfastSelected,
            breakfastDays: data.breakfastDays,
            transferSelected,
            transferType: data.transferType ?? null,
        },
        { adults: data.adults, children: data.children, infants: data.infants },
        pricing.nights
    );

    // 4.6 SECURITY/CONSISTÊNCIA: revalidar o cupão e recalcular o desconto no servidor
    // (espelha createPaymentIntent — percentage sobre basePrice, fixed é valor fixo).
    // Antes, este fluxo gravava o couponDiscount enviado pelo cliente mas NÃO o aplicava
    // ao total — o hóspede via um desconto no checkout que não existia no valor pedido.
    // Só o código validado é persistido: o trigger tr_track_coupon_usage incrementa
    // coupons.used_count a partir do coupon_code gravado na reserva.
    let couponDiscount = 0;
    let couponCode: string | null = null;
    if (data.couponCode) {
        const { validateCoupon } = await import("./coupons");
        const couponResult = await validateCoupon(data.couponCode);
        if (couponResult.success && couponResult.coupon) {
            const c = couponResult.coupon;
            couponCode = c.code;
            couponDiscount = c.discount_type === 'percentage'
                ? pricing.basePrice * (Number(c.discount_value) / 100)
                : Number(c.discount_value);
        }
    }

    const safeData: ReservationData = {
        ...data,
        breakfastTotal: extras.breakfastTotal,
        transferTotal: extras.transferTotal,
        transferType: transferSelected ? (data.transferType || 'one_way') : null,
        couponCode,
        couponDiscount,
    };

    // 5. Reference ID (S-4): a well-formed checkout code is kept (the guest already saw it in
    // the transfer details), anything else is replaced by a server code.
    const referenceId = bookingReference(data.bookingCode);

    // Determine initial status based on payment method
    const status = data.paymentMethod === 'wire' ? 'pending' : 'confirmed';

    // Cálculo Seguro de Preços Final (Estadia + Limpeza + Extras - Cupão)
    // pricing.totalPrice já inclui (base - desconto + limpeza + city_tax).
    // Floor a 0 como na UI do checkout.
    const FINAL_TOTAL = Math.max(0, pricing.totalPrice + extras.breakfastTotal + extras.transferTotal - couponDiscount);

    return await finalizeBooking({
        data: safeData,
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
    const { logActivity } = await import("@/lib/audit-log");
    await logActivity(
        user.id,
        'DELETE',
        'RESERVATION',
        id,
        { id }
    );

    return { success: true };
}
