"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { startOfMonth, subMonths, format, endOfMonth, differenceInDays, isWithinInterval, subDays } from "date-fns";
import { createClient } from "@supabase/supabase-js";

export interface ActivityItem {
    id: string;
    type: 'booking' | 'check-in' | 'maintenance' | 'blocked';
    title: string;
    subtitle: string;
    date: string;
    amount?: string;
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return getEmptyStats();

    // 1. Get Owner Properties (To verify ownership if propertyId is provided)
    let propertyQuery = supabase
        .from('properties')
        .select('id, title, slug, max_guests')
        .eq('owner_id', user.id)
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

    const twelveMonthsAgo = startOfMonth(subMonths(referenceDate, 11));
    const startOfCurrentMonth = startOfMonth(referenceDate);
    const startOfLastMonth = startOfMonth(subMonths(referenceDate, 1));
    const endOfLastMonth = endOfMonth(subMonths(referenceDate, 1));
    const thirtyDaysAgo = subDays(referenceDate, 30);

    // 3. Fetch Reservations
    const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let reservationsQuery = adminClient
        .from('reservations')
        .select(`
            id,
            total_price,
            check_in,
            check_out,
            status,
            adults,
            children,
            infants,
            created_at,
            guest_name,
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

    // 5. Paginated Activity
    const sortedActivity = (reservations || [])
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    const totalActivityCount = sortedActivity.length;
    const startIdx = (page - 1) * pageSize;
    const paginatedActivity = sortedActivity.slice(startIdx, startIdx + pageSize).map(res => {
        const propTitleRaw = (res.properties as any)?.title;
        const propertyTitle = propTitleRaw?.en || propTitleRaw?.pt || (res.properties as any)?.slug || 'Unknown Property';

        return {
            id: res.id,
            type: 'booking' as const,
            title: 'newBooking',
            subtitle: `${res.guest_name || 'Guest'} · ${propertyTitle}`,
            amount: res.total_price ? `+ €${Number(res.total_price).toLocaleString()}` : undefined,
            date: format(new Date(res.created_at), 'MMM d, HH:mm')
        };
    });

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
