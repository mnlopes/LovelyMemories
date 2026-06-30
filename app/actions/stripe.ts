
"use server";

import { stripe } from "@/lib/stripe";
import { calculateReservationPrice, verifyAvailability } from "@/lib/pricing";
import { getPropertyBySlug } from "@/lib/services";
import { z } from "zod";
import type { ReservationData } from "@/app/actions/reservation";
import { validateCoupon } from "@/app/actions/coupons";

// Re-using validation logic for the intent creation
const PaymentIntentSchema = z.object({
  propertySlug: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  adults: z.number().int().min(1),
  children: z.number().int().min(0),
  infants: z.number().int().min(0),
  
  // Extra extras
  // SECURITY: these client-supplied amounts are added to the Stripe charge, so they must
  // never be negative (a negative value would reduce the amount charged). They are still
  // trusted values — ideally they should be recomputed server-side from the property's
  // breakfast/transfer configuration. min(0) blocks the price-reduction attack.
  breakfastTotal: z.number().min(0).default(0),
  transferTotal: z.number().min(0).default(0),
  transferType: z.string().nullish(),
  couponCode: z.string().nullish(),
  couponDiscount: z.number().min(0).default(0),

  // Guest Info (for metadata)
  fullName: z.string(),
  email: z.string().email(),
  phone: z.string(),
  arrivalTime: z.string().nullish(),

  // Billing (optional)
  address: z.string().nullish(),
  city: z.string().nullish(),
  zip: z.string().nullish(),
  country: z.string().nullish(),
  vat: z.string().nullish(),
  isBillingActive: z.boolean().default(false),
  sessionId: z.string(),
  locale: z.string().optional().default('pt'),
});

export async function createPaymentIntent(data: z.infer<typeof PaymentIntentSchema>) {
  try {
    // 1. Validate property
    const property = await getPropertyBySlug(data.propertySlug);
    if (!property) throw new Error("Property not found");

    // 2. Validate availability (including own lock via sessionId)
    const dateIn = new Date(data.checkIn);
    const dateOut = new Date(data.checkOut);
    const availability = await verifyAvailability(property.id, dateIn, dateOut, data.sessionId);
    if (!availability.available) throw new Error(availability.error || "Dates unavailable");

    // 3. Recalculate price server-side (Tamper proof)
    const pricing = await calculateReservationPrice({
      propertyId: property.id,
      checkIn: dateIn,
      checkOut: dateOut,
      adults: data.adults,
      children: data.children
    });

    if ('error' in pricing) throw new Error(pricing.error);

    // Coupon: re-validate against the DB and recompute the discount server-side. We never trust
    // the client-sent couponDiscount for the charge (it could be tampered to lower the amount).
    // Mirrors the checkout UI: percentage applies to basePrice, fixed is a flat amount.
    let couponDiscount = 0;
    if (data.couponCode) {
      const couponResult = await validateCoupon(data.couponCode);
      if (couponResult.success && couponResult.coupon) {
        const c = couponResult.coupon;
        couponDiscount = c.discount_type === 'percentage'
          ? pricing.basePrice * (Number(c.discount_value) / 100)
          : Number(c.discount_value);
      }
    }

    // Final Total (extras included, server-validated coupon applied). Floor at 0 like the UI.
    const totalAmount = Math.max(0, pricing.totalPrice + data.breakfastTotal + data.transferTotal - couponDiscount);

    // Stripe expects amounts in cents for EUR
    const amountInCents = Math.round(totalAmount * 100);

    // 4. Create Payment Intent with metadata
    // We store all reservation info in metadata so the webhook can reconstruct it
    // Human-readable label for the Stripe dashboard "Description" column. title is a
    // multilingual object ({ en, pt, he }), so pick the locale (matches reservation.ts).
    const propertyTitle = typeof property.title === 'string'
      ? property.title
      : (property.title?.[data.locale as 'en' | 'pt'] || property.title?.pt || property.title?.en || data.propertySlug);

    const intent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'eur',
      payment_method_types: ['card', 'link'],
      // receipt_email populates the dashboard "Customer" column (and enables Stripe receipts);
      // description fills the "Description" column instead of the raw pi_... id.
      receipt_email: data.email,
      description: `${propertyTitle} · ${data.checkIn} → ${data.checkOut} · ${data.fullName}`,
      metadata: {
        // Flattened keys to avoid limits and ensure they fit
        fn: data.fullName,
        em: data.email,
        ph: data.phone,
        ps: data.propertySlug,
        ci: data.checkIn,
        co: data.checkOut,
        ad: data.adults.toString(),
        ch: data.children.toString(),
        inf: data.infants.toString(),
        at: data.arrivalTime || "",
        cc: data.couponCode || "",
        cd: couponDiscount.toString(),
        bt: data.breakfastTotal.toString(),
        tt: data.transferTotal.toString(),
        ty: data.transferType || "",
        // Billing
        ba: data.address || "",
        bc: data.city || "",
        bz: data.zip || "",
        bk: data.country || "",
        bv: data.vat || "",
        is_billing: data.isBillingActive ? "true" : "false",
        lc: data.locale || "pt",
        // Total price for reference
        tp: totalAmount.toString(),
        bp: pricing.basePrice.toString(),
        cf: pricing.cleaningFee.toString(),
        da: pricing.discountAmount.toString(),
        ct: pricing.cityTaxTotal.toString(),
      },
    });

    // SECURITY: bind this PaymentIntent to the buyer's browser so that its details
    // (which include guest PII: name, email, phone, billing address, VAT) can only be
    // retrieved by whoever initiated the payment. See getPaymentIntentDetails.
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      cookieStore.set("lm_pi", intent.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 2, // 2 hours
        path: "/",
      });
    } catch (cookieErr) {
      console.warn("Could not set PaymentIntent binding cookie:", cookieErr);
    }

    return {
      success: true,
      clientSecret: intent.client_secret,
      amount: totalAmount
    };

  } catch (error: any) {
    // Full detail stays in the server logs only.
    console.error("Payment Intent Error:", error);

    // Never surface raw Stripe errors to the client: they can include the (masked) API key,
    // request ids and other internal detail. Card declines are the one Stripe error whose
    // message is meant for the buyer, so we let those through.
    const stripeType = typeof error?.type === "string" ? error.type : "";
    if (stripeType.startsWith("Stripe") && stripeType !== "StripeCardError") {
      return { success: false, error: "We couldn't start the payment right now. Please try again in a moment." };
    }

    // Card declines + our own validation errors (property not found, dates unavailable, pricing) pass through.
    return { success: false, error: error?.message || "Unexpected error. Please try again." };
  }
}

/**
 * Confirm and finalize a booking after a successful Stripe payment.
 * This can be used as a manual fallback if webhooks are not configured (common in dev).
 */
export async function confirmStripePaymentIntent(paymentIntentId: string) {
  try {
    console.log("--- Manual Confirmation Start ---");
    console.log("Confirming Intent ID:", paymentIntentId);
    
    // 1. Retrieve current state of payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log("Payment Intent Status:", paymentIntent.status);

    if (paymentIntent.status !== 'succeeded') {
      throw new Error(`Payment intent status is ${paymentIntent.status}. Expected 'succeeded'.`);
    }

    const metadata = paymentIntent.metadata;
    console.log("Extracted Metadata for slug:", metadata.ps);
    
    let actualPaymentMethod = 'stripe';
    try {
        if (typeof paymentIntent.payment_method === 'string') {
            const pmData = await stripe.paymentMethods.retrieve(paymentIntent.payment_method);
            actualPaymentMethod = pmData.type; // e.g. 'card', 'link'
        } else if (paymentIntent.payment_method && typeof paymentIntent.payment_method === 'object') {
            actualPaymentMethod = (paymentIntent.payment_method as any).type || 'stripe';
        }
    } catch (pmErr) {
        console.warn("Could not retrieve exact payment method type in manual confirm:", pmErr);
    }

    // 2. Reconstruct ReservationData (matches webhook logic)
    const { finalizeBooking } = await import("@/app/actions/reservation");
    
    const resData: ReservationData = {
      fullName: metadata.fn,
      email: metadata.em,
      phone: metadata.ph,
      propertySlug: metadata.ps,
      checkIn: metadata.ci,
      checkOut: metadata.co,
      adults: parseInt(metadata.ad),
      children: parseInt(metadata.ch),
      infants: parseInt(metadata.inf),
      arrivalTime: metadata.at || null,
      couponCode: metadata.cc || null,
      couponDiscount: parseFloat(metadata.cd || '0'),
      breakfastTotal: parseFloat(metadata.bt || '0'),
      transferTotal: parseFloat(metadata.tt || '0'),
      transferType: (metadata.ty as any) || null,
      totalPrice: parseFloat(metadata.tp),
      basePrice: parseFloat(metadata.bp),
      cleaningFee: parseFloat(metadata.cf),
      discountAmount: parseFloat(metadata.da || '0'),
      cityTaxTotal: parseFloat(metadata.ct || '0'),
      paymentMethod: actualPaymentMethod,
      isBillingActive: metadata.is_billing === 'true',
      address: metadata.ba || null,
      city: metadata.bc || null,
      zip: metadata.bz || null,
      country: metadata.bk || null,
      vat: metadata.bv || null,
      website: "",
      bookingCode: "",
      locale: metadata.lc || 'pt'
    };

    const property = await getPropertyBySlug(resData.propertySlug);
    if (!property) throw new Error(`Property ${resData.propertySlug} not found`);

    const referenceId = `LM-${paymentIntentId.split('_')[1].toUpperCase().substring(0, 8)}`;

    console.log("Triggering finalizeBooking with Ref:", referenceId);
    const result = await finalizeBooking({
      data: resData,
      propertyId: property.id,
      referenceId,
      status: 'confirmed',
      finalTotal: resData.totalPrice + resData.breakfastTotal + resData.transferTotal,
      pricingReport: {
        basePrice: resData.basePrice,
        cleaningFee: resData.cleaningFee,
        discountAmount: resData.discountAmount || 0,
        cityTaxTotal: resData.cityTaxTotal || 0
      }
    });

    console.log("finalizeBooking Result:", result.success ? "SUCCESS" : "FAILED", result.error || "");
    return result;

  } catch (error: any) {
    console.error("Manual Payment Confirmation Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getPaymentIntentDetails(paymentIntentId: string) {
    try {
        // SECURITY: this returns guest PII (name, email, phone, billing, VAT) from the
        // PaymentIntent metadata. Only the browser that created the PaymentIntent (and thus
        // holds the httpOnly binding cookie set in createPaymentIntent) may read it. This
        // prevents anyone holding/guessing a pi_... id from harvesting the guest's data.
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const boundPi = cookieStore.get("lm_pi")?.value;
        if (!boundPi || boundPi !== paymentIntentId) {
            return { success: false, error: "Not authorized" };
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        let actualPaymentMethod = 'stripe';
        if (typeof paymentIntent.payment_method === 'string') {
            const pmData = await stripe.paymentMethods.retrieve(paymentIntent.payment_method);
            actualPaymentMethod = pmData.type;
        } else if (paymentIntent.payment_method && typeof paymentIntent.payment_method === 'object') {
            actualPaymentMethod = (paymentIntent.payment_method as any).type || 'stripe';
        }

        const property = await getPropertyBySlug(paymentIntent.metadata.ps);

        return {
            success: true,
            metadata: paymentIntent.metadata,
            amount: paymentIntent.amount,
            status: paymentIntent.status,
            paymentMethod: actualPaymentMethod,
            property: property
        };
    } catch(err: any) {
        return { success: false, error: err.message };
    }
}
