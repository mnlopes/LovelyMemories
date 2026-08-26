import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import ical from 'ical-generator';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ propertyId: string }> }
) {
    try {
        let { propertyId } = await params;
        if (!propertyId) {
            return new NextResponse('Property ID is required', { status: 400 });
        }

        // Support .ics extension in URL as recommended by Airbnb
        propertyId = propertyId.replace(/\.ics$/, '');

        const supabaseAdmin = await getSupabaseAdmin();

        // Fetch Property Info
        const { data: property, error: propError } = await supabaseAdmin
            .from('properties')
            .select('id, title')
            .eq('id', propertyId)
            .single();

        if (propError || !property) {
            return new NextResponse('Property not found', { status: 404 });
        }

        // Get readable title
        const titleRaw = property.title;
        const calName = typeof titleRaw === 'object' 
            ? (titleRaw.en || titleRaw.pt || property.id) 
            : (titleRaw || property.id);

        // Initialize iCal Generator
        const calendar = ical({ name: `LovelyMemories - ${calName}` });

        // 1. Fetch Confirmed Reservations for this property
        const { data: reservations, error: resError } = await supabaseAdmin
            .from('reservations')
            .select('id, check_in, check_out, guest_name')
            .eq('property_id', propertyId)
            .in('status', ['confirmed', 'pending']);

        if (!resError && reservations) {
            reservations.forEach(res => {
                calendar.createEvent({
                    start: new Date(res.check_in),
                    end: new Date(res.check_out),
                    allDay: true,
                    summary: 'Reserved',
                    description: 'LovelyMemories Reservation',
                    id: `reservation-${res.id}`
                });
            });
        }

        // 2. Fetch Blocked Dates for this property
        const { data: blockedDates, error: bloError } = await supabaseAdmin
            .from('blocked_dates')
            .select('id, start_date, end_date, reason, external_id, source')
            .eq('property_id', propertyId);

        if (!bloError && blockedDates) {
            // Only export what ORIGINATES here: direct reservations (above) and manual
            // blocks. Blocks imported from a channel are skipped — re-exporting them sent
            // Airbnb its own events back, UIDs included (`…@airbnb.com`), which Airbnb then
            // re-exports under a fresh UID; our next import stores that as a NEW block for
            // the same dates, and the pair keeps breeding rows on every cycle.
            //
            // Filtering in JS (not in the query) because `source NOT IN (…)` drops rows with
            // a NULL source, and a NULL there means a manual block — the exact thing we must
            // keep exporting. Manual blocks default to 'system' (20260401184235_add_ical_support).
            //
            // NOTE: this also means a Booking.com block never reaches Airbnb through this
            // feed. Harmless today — every property has exactly one feed, from Airbnb — but
            // the day a second channel is connected, this must become per-channel (exclude
            // only the requesting channel's own source) or the two channels will overbook.
            const IMPORTED_SOURCES = ['airbnb_booking', 'booking_com'];
            const ownBlocks = blockedDates.filter(bd => !IMPORTED_SOURCES.includes(bd.source));

            ownBlocks.forEach(bd => {
                calendar.createEvent({
                    start: new Date(bd.start_date),
                    end: new Date(bd.end_date),
                    allDay: true,
                    summary: 'Blocked',
                    description: bd.reason || 'Blocked',
                    id: bd.external_id || `block-${bd.id}`
                });
            });
        }

        // Return the raw iCal text content
        return new NextResponse(calendar.toString(), {
            status: 200,
            headers: {
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition': `attachment; filename="calendar-${propertyId}.ics"`,
            },
        });
    } catch (e: any) {
        console.error('Error generating iCal:', e.message);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
