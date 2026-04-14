
"use server";

import { stripe } from "@/lib/stripe";
import { calculateReservationPrice, verifyAvailability } from "@/lib/pricing";
import { getPropertyBySlug } from "@/lib/services";
import { z } from "zod";
import type { ReservationData } from "@/app/actions/reservation";

// Re-using validation logic for the intent creation
const PaymentIntentSchema = z.object({
  propertySlug: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  adults: z.number().int().min(1),
  children: z.number().int().min(0),
  infants: z.number().int().min(0),
  
  // Extra extras
  breakfastTotal: z.number().default(0),
  transferTotal: z.number().default(0),
  transferType: z.string().nullish(),
  couponCode: z.string().nullish(),
  couponDiscount: z.number().default(0),

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
});

export async function createPaymentIntent(data: z.infer<typeof PaymentIntentSchema>) {
  try {
    // 1. Validate property
    const property = await getPropertyBySlug(data.propertySlug);
    if (!property) throw new Error("Property not found");

    // 2. Validate availability
    const dateIn = new Date(data.checkIn);
    const dateOut = new Date(data.checkOut);
    const availability = await verifyAvailability(property.id, dateIn, dateOut);
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

    // Final Total (including extras)
    const totalAmount = pricing.totalPrice + data.breakfastTotal + data.transferTotal;
    
    // Stripe expects amounts in cents for EUR
    const amountInCents = Math.round(totalAmount * 100);

    // 4. Create Payment Intent with metadata
    // We store all reservation info in metadata so the webhook can reconstruct it
    const intent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'eur',
      payment_method_types: ['card', 'klarna', 'link'],
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
        cd: data.couponDiscount.toString(),
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
        // Total price for reference
        tp: totalAmount.toString(),
        bp: pricing.basePrice.toString(),
        cf: pricing.cleaningFee.toString(),
        da: pricing.discountAmount.toString(),
        ct: pricing.cityTaxTotal.toString(),
      },
    });

    return { 
      success: true, 
      clientSecret: intent.client_secret,
      amount: totalAmount 
    };

  } catch (error: any) {
    console.error("Payment Intent Error:", error);
    return { success: false, error: error.message };
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
            actualPaymentMethod = pmData.type; // e.g. 'card', 'klarna'
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
      bookingCode: ""
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
