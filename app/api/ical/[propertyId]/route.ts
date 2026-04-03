import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import ical from 'ical-generator';

export async function GET(
    request: Request,
    { params }: { params: { propertyId: string } }
) {
    try {
        const { propertyId } = params;
        if (!propertyId) {
            return new NextResponse('Property ID is required', { status: 400 });
        }

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
            .select('id, check_in, check_out')
            .eq('property_id', propertyId)
            .eq('status', 'confirmed');

        if (!resError && reservations) {
            reservations.forEach(res => {
                calendar.createEvent({
                    start: new Date(res.check_in),
                    end: new Date(res.check_out),
                    allDay: true,
                    summary: 'Reserved',
                    description: 'LovelyMemories Reservation',
                    uid: `reservation-${res.id}`
                });
            });
        }

        // 2. Fetch Blocked Dates for this property
        const { data: blockedDates, error: bloError } = await supabaseAdmin
            .from('blocked_dates')
            .select('id, start_date, end_date, reason, external_id')
            .eq('property_id', propertyId);

        if (!bloError && blockedDates) {
            blockedDates.forEach(bd => {
                calendar.createEvent({
                    start: new Date(bd.start_date),
                    end: new Date(bd.end_date),
                    allDay: true,
                    summary: 'Blocked',
                    description: bd.reason || 'Blocked',
                    uid: bd.external_id || `block-${bd.id}`
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
