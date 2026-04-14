"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { startOfMonth, subMonths, format, endOfMonth, differenceInDays, subDays } from "date-fns";
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

    // 2. Define Date Ranges
    const today = new Date();
    
    // If year/month provided, adjust reference ranges
    let referenceDate = today;
    if (year) {
        referenceDate = new Date(year, (month || 1) - 1, 1);
    }

    const startOfCurrentMonth = startOfMonth(referenceDate);
    const startOfLastMonth = startOfMonth(subMonths(referenceDate, 1));
    const endOfLastMonth = endOfMonth(subMonths(referenceDate, 1));
    const thirtyDaysAgo = subDays(referenceDate, 30);

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
        .in('status', ['confirmed', 'completed', 'checked-in', 'checked-out']);

    if (year) {
        const yearStart = format(new Date(year, 0, 1), 'yyyy-MM-dd');
        const yearEnd = format(new Date(year + 1, 0, 0), 'yyyy-MM-dd');
        reservationsQuery = reservationsQuery.gte('check_in', yearStart).lte('check_in', yearEnd);
    }

    const { data: reservations, error } = await reservationsQuery;

    if (error) {
        console.error("Error fetching dashboard stats:", error);
        return getEmptyStats();
    }

    // 4. Metrics Calculation
    const monthlyRevenue: Record<string, number> = {};

    // Init relevant months for chart
    for (let i = 11; i >= 0; i--) {
        const d = subMonths(referenceDate, i);
        const key = format(d, 'MMM');
        monthlyRevenue[key] = 0;
    }

    let totalRevenue = 0;
    let currentMonthRevenue = 0;
    let lastMonthRevenue = 0;
    let totalGuests = 0;
    let currentMonthGuests = 0;
    let lastMonthGuests = 0;
    let bookedNightsLast30Days = 0;

    if (reservations) {
        reservations.forEach(res => {
            const checkIn = new Date(res.check_in);
            const checkOut = new Date(res.check_out);
            const amount = Number(res.total_price) || 0;
            const guests = (res.adults || 0) + (res.children || 0) + (res.infants || 0);

            totalRevenue += amount;
            totalGuests += guests;

            // Chart Data
            const monthKey = format(checkIn, 'MMM');
            if (monthlyRevenue.hasOwnProperty(monthKey)) {
                monthlyRevenue[monthKey] += amount;
            }

            // Trends
            if (checkIn >= startOfCurrentMonth && checkIn <= endOfMonth(referenceDate)) {
                currentMonthRevenue += amount;
                currentMonthGuests += guests;
            } else if (checkIn >= startOfLastMonth && checkIn <= endOfLastMonth) {
                lastMonthRevenue += amount;
                lastMonthGuests += guests;
            }

            // Occupancy (Last 30 Days of reference date)
            const rangeStart = checkIn < thirtyDaysAgo ? thirtyDaysAgo : checkIn;
            const rangeEnd = checkOut > referenceDate ? referenceDate : checkOut;
            if (rangeStart < rangeEnd) {
                const days = differenceInDays(rangeEnd, rangeStart);
                if (days > 0) bookedNightsLast30Days += days;
            }
        });
    }

    // Formatting Chart Data
    const revenueData = [];
    for (let i = 11; i >= 0; i--) {
        const d = subMonths(referenceDate, i);
        const key = format(d, 'MMM');
        revenueData.push({
            label: key,
            value: monthlyRevenue[key] || 0,
            date: d.toISOString()
        });
    }

    const revenueTrend = calculateTrend(currentMonthRevenue, lastMonthRevenue);
    const guestsTrend = calculateTrend(currentMonthGuests, lastMonthGuests);
    const totalAvailableNights = activeProperties * 30;
    const avgOccupancy = totalAvailableNights > 0
        ? Math.round((bookedNightsLast30Days / totalAvailableNights) * 100)
        : 0;

    // 5. Paginated Activity (Grouped by Sync)
    const processedActivities: ActivityItem[] = [];
    const batchMap: Record<string, any[]> = {};
    const individualBookings: any[] = [];

    (reservations || []).forEach(res => {
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
            amount: `€${(Number(res.net_amount) || Number(res.total_price) || 0).toLocaleString()}`,
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
        const totalNet = batchRes.reduce((sum, r) => sum + (Number(r.net_amount) || 0), 0);

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
