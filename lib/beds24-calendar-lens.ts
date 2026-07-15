export type Beds24Preview = { bookings: any[]; internalPropertyIds: string[] };

/**
 * Applies the Beds24 "source lens" to a property's calendar data. Pure; no I/O.
 * When `preview` is on, for the linked properties it (a) drops the iCal blocks
 * (airbnb_booking / booking_com) that a Beds24 booking overlaps and (b) drops the
 * is_airbnb site reservations, then appends the rich Beds24 bookings. Pre-connection
 * completed stays that only exist as iCal blocks are kept (no coverage → not dropped),
 * avoiding holes in the calendar.
 *
 * `decorateBooking` is applied to each injected booking (the hub uses it to add
 * property_name from its properties map); defaults to identity.
 */
export function applyBeds24Lens(
    reservations: any[],
    blockedDates: any[],
    preview: Beds24Preview | null,
    decorateBooking: (b: any) => any = (b) => b,
): { reservations: any[]; blockedDates: any[] } {
    if (!preview) return { reservations, blockedDates };

    const previewPropertyIds = new Set(preview.internalPropertyIds);

    const beds24CoversBlock = (b: any): boolean => {
        const bStart = new Date(b.start_date).getTime();
        const bEnd = new Date(b.end_date).getTime();
        return preview.bookings.some((bk) => {
            if (bk.property_id !== b.property_id) return false;
            const kStart = new Date(bk.check_in).getTime();
            const kEnd = new Date(bk.check_out).getTime();
            return kStart < bEnd && kEnd > bStart; // interval overlap
        });
    };

    const nextBlocked = blockedDates.filter(
        (b: any) => !(["airbnb_booking", "booking_com"].includes(b.source) && previewPropertyIds.has(b.property_id) && beds24CoversBlock(b)),
    );

    const nextReservations = [
        ...reservations.filter((r: any) => !(r.is_airbnb && previewPropertyIds.has(r.property_id))),
        ...preview.bookings.map(decorateBooking),
    ];

    return { reservations: nextReservations, blockedDates: nextBlocked };
}
