import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getPropertyBySlug } from '@/lib/services';
import type { ReservationData } from '@/app/actions/reservation';
import { findStayConflict, REVIEW_STATUS, OVERLAP_ERROR_CODE, type StayConflict } from '@/lib/booking-conflict';

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

    // The same booking, already saved by the other path (Stripe webhook + browser confirm).
    // inReview tells the browser which success message to show.
    const alreadySaved = async () => {
        const { data: row } = await adminSupabase
            .from('reservations')
            .select('id, status')
            .eq('reference_id', referenceId)
            .maybeSingle();
        return row ? { success: true, ref: referenceId, warning: "Reservation already exists.", inReview: row.status === REVIEW_STATUS } : null;
    };

    // Prevent Duplicates from concurrent Webhooks & Client requests
    const duplicate = await alreadySaved();
    if (duplicate) {
        console.log(`Duplicate insertion caught for reference: ${referenceId}`);
        return duplicate;
    }

    // L-3: last availability check right before saving (see lib/booking-conflict.ts).
    // Wire transfers are not paid yet, so a conflict simply refuses the booking. Stripe
    // payments are already taken: the reservation is saved as REVIEW_STATUS instead, the team
    // is alerted and the guest is told the dates are being confirmed. Never lose a payment.
    const isPaid = data.paymentMethod !== 'wire';
    let conflict: StayConflict | null = null;
    try {
        conflict = await findStayConflict(adminSupabase, propertyId, data.checkIn, data.checkOut);
    } catch (checkErr) {
        console.error('finalizeBooking: final availability check failed:', checkErr);
        // Unpaid: refuse. Paid: carry on, the database rule still refuses an overlap.
        if (!isPaid) return { success: false, error: "errorGeneric", warning: undefined, ref: undefined };
    }
    if (conflict && !isPaid) {
        return { success: false, error: "errorAlreadyBooked", warning: undefined, ref: undefined };
    }
    if (conflict) {
        console.error(`finalizeBooking: paid booking ${referenceId} overlaps ${conflict.kind} ${conflict.id}; saved for review.`);
        reservationData.status = REVIEW_STATUS;
    }

    const insertReservation = () => adminSupabase
        .from('reservations')
        .insert(reservationData)
        .select('id')
        .single();

    let { data: insertedRes, error: dbError } = await insertReservation();

    // Database rule reservations_no_overlap: another active reservation was saved for these
    // dates between the check above and this insert.
    if (dbError?.code === OVERLAP_ERROR_CODE) {
        const same = await alreadySaved();
        if (same) return same; // our own booking, saved by the other Stripe path
        if (!isPaid) {
            return { success: false, error: "errorAlreadyBooked", warning: undefined, ref: undefined };
        }
        console.error(`finalizeBooking: paid booking ${referenceId} hit reservations_no_overlap; saved for review.`);
        reservationData.status = REVIEW_STATUS;
        conflict = conflict ?? { kind: 'reservation', id: '', checkIn: data.checkIn, checkOut: data.checkOut, label: null };
        ({ data: insertedRes, error: dbError } = await insertReservation());
    }

    if (dbError) {
        console.error('CRITICAL: Database Error saving reservation:', JSON.stringify(dbError, null, 2));
        // Unique violation on reference_id: a concurrent finalize (webhook + manual confirm)
        // already created this reservation. Treat as a benign duplicate, not an error.
        if (dbError.code === '23505') {
            console.log(`Duplicate insertion caught via unique constraint for reference: ${referenceId}`);
            return (await alreadySaved()) ?? { success: true, ref: referenceId, warning: "Reservation already exists." };
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
                    title: conflict
                        ? `Reserva paga EM REVISÃO (datas ocupadas): ${data.fullName}`
                        : `Nova reserva: ${data.fullName}`,
                    guest_name: data.fullName,
                    email: data.email,
                    property: data.propertySlug,
                    ref: referenceId,
                    ...(conflict ? { conflict_with: `${conflict.kind} ${conflict.label ?? conflict.id}` } : {})
                },
                conflict ? 'WARNING' : 'INFO'
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

        const isEn = data.locale === 'en';

        if (conflict) {
            // L-3: paid, but the dates are taken. Alert the team; tell the guest the payment
            // arrived and the dates are being confirmed (never "booking confirmed").
            const { bookingReviewAdminEmail, bookingGuestReviewEmail } = await import("@/lib/email-templates");
            await sendEmail({
                to: "info@lovelymemories.pt",
                subject: `⚠️ CONFLITO: reserva paga em datas ocupadas [Ref: ${referenceId}] - ${data.propertySlug}`,
                html: bookingReviewAdminEmail(emailData, conflict),
                replyTo: data.email
            });
            await sendEmail({
                to: data.email,
                subject: isEn
                    ? `Lovely Memories | Payment received [Ref: ${referenceId}]`
                    : `Lovely Memories | Pagamento recebido [Ref: ${referenceId}]`,
                html: bookingGuestReviewEmail(emailData, data.locale)
            });
            return { success: true, ref: referenceId, warning: undefined, inReview: true };
        }

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
        warning,
        inReview: !!conflict
    };
}
