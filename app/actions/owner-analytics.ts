"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { startOfMonth, subMonths, format, endOfMonth, differenceInCalendarDays, subDays, addDays, startOfDay, max, min } from "date-fns";
import { ownerRevenue, OWNER_REPORT_STATUSES } from "@/lib/owner-revenue";
import { createClient } from "@supabase/supabase-js";
import { getEffectiveUser } from "./auth-context";

export interface ActivityItem {
    id: string;
    type: 'booking' | 'check-in' | 'maintenance' | 'blocked' | 'import';
    title: string;
    subtitle: string;
    date: string;
    amount?: string;
    payoutAmount?: string;
    metadata?: {
        id?: string;
        guest_name?: string;
        check_in?: string;
        check_out?: string;
        total_price?: number;
        net_amount?: number;
        service_fee?: number;
        cleaning_fee?: number;
        base_price?: number;
        is_airbnb?: boolean;
        batch_id?: string;
        reservations?: any[];
        property_name?: string;
        raw_date?: number;
    };
}

export interface DashboardStats {
    revenueData: { label: string; value: number; date: string }[];
    totalRevenue: number;
    revenueTrend: number;
    totalGuests: number;
    guestsTrend: number;
    avgOccupancy: number;
    occupancyTrend: number;
    activeProperties: number;
    recentActivity: ActivityItem[];
    totalActivityCount: number;
    isMockData?: boolean;
}

export async function getOwnerDashboardStats(filters: { 
    propertyId?: string, 
    year?: number, 
    month?: number,
    page?: number,
    pageSize?: number
} = {}): Promise<DashboardStats> {
    const { propertyId, year, month, page = 1, pageSize = 10 } = filters;
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    )
                },
            },
        }
    );

    const { userId } = await getEffectiveUser();
    if (!userId) return getEmptyStats();

    const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Get Owner Properties (To verify ownership if propertyId is provided)
    let propertyQuery = adminClient
        .from('properties')
        .select('id, title, slug, max_guests')
        .eq('owner_id', userId)
        .eq('is_active', true);

    if (propertyId) {
        propertyQuery = propertyQuery.eq('id', propertyId);
    }

    const { data: properties, error: propErr } = await propertyQuery;
    if (!properties || properties.length === 0) return getEmptyStats();

    const allowedPropertyIds = properties.map(p => p.id);
    const activeProperties = properties.length;

    // 2. Period (L-6). A stay counts in the month of its check-in (owner's choice, 15/11).
    //    - year + month, or a month alone (current year): that month;
    //    - year alone: that year;
    //    - nothing: all time (occupancy: the last 30 days).
    // Months are keyed "yyyy-MM": keying by "MMM" alone used to add up the same month of
    // different years, and the year filter used to measure occupancy in the 30 days BEFORE
    // 1 January (always 0%).
    const today = startOfDay(new Date());
    const periodYear = year ?? (month ? today.getFullYear() : undefined);
    const hasPeriod = periodYear !== undefined;
    const periodStart = hasPeriod ? new Date(periodYear, month ? month - 1 : 0, 1) : undefined;
    const periodEnd = hasPeriod ? (month ? endOfMonth(periodStart!) : new Date(periodYear, 11, 31)) : undefined;
    const ymd = (d: Date) => format(d, 'yyyy-MM-dd');
    const monthKey = (d: Date) => format(d, 'yyyy-MM');
    // Stay dates are plain "yyyy-MM-dd"; read them as local days.
    const day = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

    // Chart: the 12 months ending with the period's last month (or this month). Trend: the
    // chart's last month against the one before.
    const chartEndMonth = startOfMonth(periodEnd ?? today);
    const chartStart = startOfMonth(subMonths(chartEndMonth, 11));
    const trendKey = monthKey(chartEndMonth);
    const previousKey = monthKey(subMonths(chartEndMonth, 1));
    // Occupancy: nights booked inside [occStart, occEnd).
    const occStart = hasPeriod ? periodStart! : subDays(today, 30);
    const occEnd = hasPeriod ? addDays(periodEnd!, 1) : today;

    // 3. Fetch Reservations

    let reservationsQuery = adminClient
        .from('reservations')
        .select(`
            id,
            total_price,
            base_price,
            cleaning_fee,
            service_fee,
            net_amount,
            city_tax_total,
            breakfast_total,
            transfer_total,
            check_in,
            check_out,
            status,
            adults,
            children,
            infants,
            created_at,
            guest_name,
            platform,
            import_batch_id,
            properties (
                title,
                slug
            )
        `)
        .in('property_id', propertyId ? [propertyId] : allowedPropertyIds)
        .in('status', [...OWNER_REPORT_STATUSES]);

    if (hasPeriod) {
        // Everything the chart window and the period need: stays still running at the start of
        // the chart (chartStart <= periodStart) and starting by the end of the period.
        reservationsQuery = reservationsQuery.gt('check_out', ymd(chartStart)).lte('check_in', ymd(periodEnd!));
    }

    const { data: reservations, error } = await reservationsQuery;

    if (error) {
        console.error("Error fetching dashboard stats:", error);
        return getEmptyStats();
    }

    // 4. Metrics Calculation (amounts: ownerRevenue, what the owner earns; see lib/owner-revenue.ts)
    const monthlyRevenue: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) monthlyRevenue[monthKey(subMonths(chartEndMonth, i))] = 0;

    let totalRevenue = 0;
    let currentMonthRevenue = 0;
    let lastMonthRevenue = 0;
    let totalGuests = 0;
    let currentMonthGuests = 0;
    let lastMonthGuests = 0;
    let bookedNights = 0;
    const periodReservations: NonNullable<typeof reservations> = [];
    const inPeriod = (checkIn: string) => !hasPeriod || (checkIn >= ymd(periodStart!) && checkIn <= ymd(periodEnd!));

    (reservations || []).forEach(res => {
        const amount = ownerRevenue(res);
        const guests = (res.adults || 0) + (res.children || 0) + (res.infants || 0);
        const checkInMonth = String(res.check_in).slice(0, 7);

        // Chart and trend: by check-in month.
        if (checkInMonth in monthlyRevenue) monthlyRevenue[checkInMonth] += amount;
        if (checkInMonth === trendKey) {
            currentMonthRevenue += amount;
            currentMonthGuests += guests;
        } else if (checkInMonth === previousKey) {
            lastMonthRevenue += amount;
            lastMonthGuests += guests;
        }

        // Totals and activity: stays checking in during the period (all time without a filter).
        if (inPeriod(res.check_in)) {
            totalRevenue += amount;
            totalGuests += guests;
            periodReservations.push(res);
        }

        // Occupancy: the nights themselves, whatever month the stay started in.
        const from = max([day(res.check_in), occStart]);
        const to = min([day(res.check_out), occEnd]);
        const nights = differenceInCalendarDays(to, from);
        if (nights > 0) bookedNights += nights;
    });

    const revenueData = Object.entries(monthlyRevenue).map(([key, value]) => {
        const d = day(`${key}-01`);
        return { label: format(d, 'MMM'), value, date: d.toISOString() };
    });

    const revenueTrend = calculateTrend(currentMonthRevenue, lastMonthRevenue);
    const guestsTrend = calculateTrend(currentMonthGuests, lastMonthGuests);
    const totalAvailableNights = activeProperties * differenceInCalendarDays(occEnd, occStart);
    const avgOccupancy = totalAvailableNights > 0
        ? Math.round((bookedNights / totalAvailableNights) * 100)
        : 0;

    // 5. Paginated Activity (Grouped by Sync)
    const processedActivities: ActivityItem[] = [];
    const batchMap: Record<string, any[]> = {};
    const individualBookings: any[] = [];

    periodReservations.forEach(res => {
        if (res.import_batch_id) {
            if (!batchMap[res.import_batch_id]) batchMap[res.import_batch_id] = [];
            batchMap[res.import_batch_id].push(res);
        } else {
            individualBookings.push(res);
        }
    });

    // Add individual bookings
    individualBookings.forEach(res => {
        const propTitleRaw = (res.properties as any)?.title;
        const propertyTitle = propTitleRaw?.en || propTitleRaw?.pt || (res.properties as any)?.slug || 'Unknown Property';
        
        processedActivities.push({
            id: res.id,
            type: 'booking',
            title: 'newBooking',
            subtitle: `${res.guest_name || 'Guest'} · ${propertyTitle}`,
            amount: `€${ownerRevenue(res).toLocaleString()}`,
            payoutAmount: undefined, // Simpler view as requested
            date: format(new Date(res.created_at), 'MMM d, HH:mm'),
            metadata: {
                id: res.id,
                guest_name: res.guest_name,
                check_in: res.check_in,
                check_out: res.check_out,
                total_price: res.total_price,
                net_amount: res.net_amount,
                service_fee: res.service_fee,
                cleaning_fee: res.cleaning_fee,
                base_price: res.base_price,
                property_name: propertyTitle,
                raw_date: new Date(res.created_at).getTime()
            }
        });
    });

    // Add grouped syncs
    Object.keys(batchMap).forEach(batchId => {
        const batchRes = batchMap[batchId];
        const latestCreatedAt = new Date(Math.max(...batchRes.map(r => new Date(r.created_at).getTime())));
        const totalNet = batchRes.reduce((sum, r) => sum + ownerRevenue(r), 0);

        processedActivities.push({
            id: batchId,
            type: 'import',
            title: 'airbnbSync',
            subtitle: `${batchRes.length} ${batchRes.length === 1 ? 'reserva' : 'reservas'} importadas`,
            amount: `€${totalNet.toLocaleString()}`,
            date: format(latestCreatedAt, 'MMM d, HH:mm'),
            metadata: {
                batch_id: batchId,
                raw_date: latestCreatedAt.getTime(),
                reservations: batchRes.map(r => {
                    const pTitleRaw = (r.properties as any)?.title;
                    const pName = pTitleRaw?.en || pTitleRaw?.pt || (r.properties as any)?.slug || 'Unknown Property';
                    return {
                        id: r.id,
                        guest_name: r.guest_name,
                        check_in: r.check_in,
                        check_out: r.check_out,
                        total_price: r.total_price,
                        net_amount: r.net_amount,
                        service_fee: r.service_fee,
                        cleaning_fee: r.cleaning_fee,
                        base_price: r.base_price,
                        property_name: pName
                    };
                })
            }
        });
    });

    const totalActivityCount = processedActivities.length;
    const startIdx = (page - 1) * pageSize;
    const paginatedActivity = processedActivities
        .sort((a, b) => (b.metadata?.raw_date || 0) - (a.metadata?.raw_date || 0))
        .slice(startIdx, startIdx + pageSize);

    return {
        revenueData,
        totalRevenue,
        revenueTrend,
        totalGuests,
        guestsTrend,
        avgOccupancy: Math.min(avgOccupancy, 100),
        occupancyTrend: 0, 
        activeProperties,
        recentActivity: paginatedActivity,
        totalActivityCount,
        isMockData: false
    };
}

function calculateTrend(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return parseFloat(((current - previous) / previous * 100).toFixed(1));
}

function getEmptyStats(): DashboardStats {
    return {
        revenueData: [],
        totalRevenue: 0,
        revenueTrend: 0,
        totalGuests: 0,
        guestsTrend: 0,
        avgOccupancy: 0,
        occupancyTrend: 0,
        activeProperties: 0,
        recentActivity: [],
        totalActivityCount: 0
    };
}

function getMockStats(activeProperties: number): DashboardStats {
    const today = new Date();
    const revenueData = [];
    let totalRevenue = 0;

    // Generate realistic curve
    for (let i = 11; i >= 0; i--) {
        const d = subMonths(today, i);
        const baseValue = 3500 + (Math.random() * 2000); // 3.5k - 5.5k
        const seasonality = (i % 6) * 500; // Fake seasonality
        const value = Math.round(baseValue + seasonality);

        revenueData.push({
            label: format(d, 'MMM'),
            value: value,
            date: d.toISOString()
        });
        totalRevenue += value;
    }

    return {
        revenueData,
        totalRevenue,
        revenueTrend: 12.5,
        totalGuests: 1420,
        guestsTrend: 8.4,
        avgOccupancy: 78,
        occupancyTrend: 3.2,
        activeProperties: activeProperties || 2, // Default to 2 if 0 passed
        recentActivity: [],
        totalActivityCount: 0,
        isMockData: true
    };
}
