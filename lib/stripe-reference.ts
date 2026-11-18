// Booking reference of a Stripe payment. Pure: used by the webhook, the browser confirmation
// and the confirmation page, which must all agree on it.
//
// S-8 (audit 2026-11-13): until 17/11/2026 the reference was "LM-" + the FIRST 8 characters of
// the PaymentIntent id. Those are a timestamp plus a fixed piece of the account id
// ("3UBRPFED", "3UBR1QED", "3TSFWDED"…), so two payments started in the same second got the
// same reference and finalizeBooking dropped the second one as a "duplicate". The end of the
// id is the random part.

function idBody(paymentIntentId: string): string {
    return (paymentIntentId.split('_')[1] || '').toUpperCase();
}

/** "pi_3UBRPFED…0M4VXWB6" → "LM-0M4VXWB6". */
export function stripeReference(paymentIntentId: string): string {
    const body = idBody(paymentIntentId);
    return body ? `LM-${body.slice(-8)}` : 'LM-PENDING';
}

/** The pre-S-8 reference ("LM-3UBRPFED"), only to recognise bookings saved under it. */
export function legacyStripeReference(paymentIntentId: string): string {
    const body = idBody(paymentIntentId);
    return body ? `LM-${body.slice(0, 8)}` : 'LM-PENDING';
}
