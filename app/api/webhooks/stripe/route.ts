
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { finalizeBooking, ReservationData } from '@/app/actions/reservation';
import { getPropertyBySlug } from '@/lib/services';
import Stripe from 'stripe';

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event: Stripe.Event;
  const isDev = process.env.NODE_ENV === 'development';

  try {
    if (!sig || !endpointSecret) {
      throw new Error('Missing stripe-signature or endpoint secret');
    }
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook Signature Error: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const metadata = paymentIntent.metadata;

    console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);

    let actualPaymentMethod = 'stripe';
    try {
        if (typeof paymentIntent.payment_method === 'string') {
            const pmData = await stripe.paymentMethods.retrieve(paymentIntent.payment_method);
            actualPaymentMethod = pmData.type; // e.g. 'card', 'link'
        } else if (paymentIntent.payment_method && typeof paymentIntent.payment_method === 'object') {
            actualPaymentMethod = (paymentIntent.payment_method as any).type || 'stripe';
        }
    } catch (pmErr) {
        console.warn("Could not retrieve exact payment method type:", pmErr);
    }

    try {
      // Reconstruct ReservationData from metadata
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
        // Security fields can be empty as we are post-payment
        website: "",
        bookingCode: "",
        locale: metadata.lc || 'pt'
      };

      const property = await getPropertyBySlug(resData.propertySlug);
      if (!property) throw new Error(`Property ${resData.propertySlug} not found in webhook Context`);

      // Finalize the booking in the DB
      const referenceId = `LM-${paymentIntent.id.split('_')[1].toUpperCase().substring(0, 8)}`;

      const result = await finalizeBooking({
        data: resData,
        propertyId: property.id,
        referenceId,
        status: 'confirmed', // Paid via Stripe
        finalTotal: resData.totalPrice + resData.breakfastTotal + resData.transferTotal,
        pricingReport: {
          basePrice: resData.basePrice,
          cleaningFee: resData.cleaningFee,
          discountAmount: resData.discountAmount || 0,
          cityTaxTotal: resData.cityTaxTotal || 0
        }
      });

      if (!result.success) {
        console.error("Failed to finalize booking from webhook:", result.error);
        // We return 500 to let Stripe retry
        return NextResponse.json({ success: false, error: result.error }, { status: 500 });
      }

      console.log("Successfully created reservation from Stripe Webhook for:", resData.fullName);

    } catch (saveErr: any) {
      console.error("Critical error in Stripe Webhook Handler:", saveErr);
      return NextResponse.json({ success: false, error: saveErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
