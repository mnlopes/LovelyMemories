import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getPropertyBySlug } from '@/lib/services';
import type { ReservationData } from '@/app/actions/reservation';

// Lives here, not in app/actions/reservation.ts: every export of a "use server" file becomes a
// public endpoint once a client component imports that file (the checkout imports
// processReservation). finalizeBooking trusts its arguments (status, price, dates) and writes
// with the service role, so as an endpoint it let anyone create a "confirmed" reservation
// without paying and send the confirmation emails (audit 2026-11-13, S-4). Only server code
// may call it: processReservation after its checks, and the Stripe flows after Stripe confirms
// the payment.

/**
 * Core logic to save a reservation, log activity, and send emails.
 * Called by processReservation (wire transfer), the Stripe webhook and confirmStripePaymentIntent.
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
        const { logActivity } = await import("@/lib/audit-log");
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

        // Determine which email to send to Guest.
        // Only wire transfers are unpaid here (processReservation accepts nothing else).
        // Stripe payments arrive as the Stripe type ('card', 'link', or 'stripe' when the
        // lookup fails): all of them are already paid and must get the "paid" email,
        // never the bank-transfer instructions.
        const guestHtml = data.paymentMethod !== 'wire'
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
