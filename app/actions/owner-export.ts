"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { endOfMonth, format, differenceInDays } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ownerRevenue, OWNER_REPORT_STATUSES } from "@/lib/owner-revenue";
import { getEffectiveUser } from "./auth-context";

/**
 * The stays of one month for the owner's report (audit 2026-11-13, L-7).
 * Each stay is listed once, in the month of its check-in (owner's choice, 15/11): the old
 * overlap query listed a stay crossing two months in full in both (and a check-out on the 1st
 * in the month it had no night in), so adding up the monthly reports counted it twice. Cancelled
 * stays are left out. Dates are plain "yyyy-MM-dd", like the columns.
 */
function fetchMonthReservations(supabase: SupabaseClient, propertyId: string, month: number, year: number) {
    const first = new Date(year, month - 1, 1);
    return supabase
        .from('reservations')
        .select('*')
        .eq('property_id', propertyId)
        .in('status', [...OWNER_REPORT_STATUSES])
        .gte('check_in', format(first, 'yyyy-MM-dd'))
        .lte('check_in', format(endOfMonth(first), 'yyyy-MM-dd'))
        .order('check_in', { ascending: true });
}

export async function exportPropertyMonthlyData(propertyId: string, month: number, year: number, locale: string = 'pt') {
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
    if (!userId) throw new Error("Unauthorized");

    // 1. Verify Ownership
    const { data: property, error: propError } = await supabase
        .from('properties')
        .select('id, title')
        .eq('id', propertyId)
        .eq('owner_id', userId)
        .single();

    if (propError || !property) throw new Error("Property not found or unauthorized");

    // 2. Fetch Reservations for the period (L-7: see fetchMonthReservations)
    const { data: reservations, error: resError } = await fetchMonthReservations(supabase, propertyId, month, year);

    if (resError) throw new Error("Error fetching reservations");

    const headers = locale === 'en' ? [
        "ID",
        "Guest",
        "Check-in",
        "Check-out",
        "Status",
        "Platform",
        "Guests",
        "Nights",
        "Gross (€)",
        "Cleaning (€)",
        "Fees (€)",
        "Net (€)"
    ] : [
        "ID",
        "Hóspede",
        "Check-in",
        "Check-out",
        "Estado",
        "Plataforma",
        "Hóspedes",
        "Noites",
        "Bruto (€)",
        "Limpeza (€)",
        "Taxas (€)",
        "Líquido (€)"
    ];

    const csvRows = [headers.join(';')];

    reservations?.forEach(res => {
        const nights = res.check_in && res.check_out 
            ? differenceInDays(new Date(res.check_out), new Date(res.check_in))
            : 0;

        // Sanitize guest name to avoid splitting columns without using quotes
        const guestName = (res.guest_name || "-").replace(/;/g, ',');
        const id = res.external_confirmation_code || res.id.split('-')[0];

        // Translate status if needed (optional but good)
        let status = res.status || "-";
        if (locale === 'en') {
            if (status === 'confirmada') status = 'Confirmed';
            if (status === 'cancelada') status = 'Cancelled';
            if (status === 'concluída') status = 'Completed';
        }

        const row = [
            `="${id}"`, // Force text for ID to avoid scientific notation
            guestName,
            res.check_in || "-",
            res.check_out || "-",
            status,
            res.platform || "internal",
            (res.adults || 0) + (res.children || 0),
            nights,
            Number(res.total_price || 0).toFixed(2),
            Number(res.cleaning_fee || 0).toFixed(2),
            Number(res.service_fee || 0).toFixed(2),
            ownerRevenue(res).toFixed(2) // L-6: what the owner earns (lib/owner-revenue.ts)
        ];
        csvRows.push(row.join(';'));
    });

    const reportLabel = locale === 'en' ? 'Report' : 'Relatorio';
    const propertyTitle = property.title?.[locale as 'en' | 'pt'] || property.title?.en || property.title?.pt || propertyId;

    return {
        success: true,
        csvContent: csvRows.join('\r\n'),
        filename: `${reportLabel}_${propertyTitle.replace(/\s+/g, '_')}_${year}_${month}.csv`
    };
}

export async function exportPropertyMonthlyDataRaw(propertyId: string, month: number, year: number, locale: string = 'pt') {
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
    if (!userId) throw new Error("Unauthorized");

    // 1. Verify Ownership
    const { data: property, error: propError } = await supabase
        .from('properties')
        .select('id, title')
        .eq('id', propertyId)
        .eq('owner_id', userId)
        .single();

    if (propError || !property) throw new Error("Property not found or unauthorized");

    // 2. Fetch Reservations for the period (L-7: see fetchMonthReservations)
    const { data: reservations, error: resError } = await fetchMonthReservations(supabase, propertyId, month, year);

    if (resError) throw new Error("Error fetching reservations");

    const headers = locale === 'en' ? [
        "ID",
        "Guest",
        "Check-in",
        "Check-out",
        "Status",
        "Platform",
        "Guests",
        "Nights",
        "Gross (€)",
        "Cleaning (€)",
        "Fees (€)",
        "Net (€)"
    ] : [
        "ID",
        "Hóspede",
        "Check-in",
        "Check-out",
        "Estado",
        "Plataforma",
        "Hóspedes",
        "Noites",
        "Bruto (€)",
        "Limpeza (€)",
        "Taxas (€)",
        "Líquido (€)"
    ];

    const rows: (string | number)[][] = [];

    reservations?.forEach(res => {
        const nights = res.check_in && res.check_out 
            ? differenceInDays(new Date(res.check_out), new Date(res.check_in))
            : 0;

        const guestName = res.guest_name || "-";
        const id = res.external_confirmation_code || res.id.split('-')[0];

        let status = res.status || "-";
        if (locale === 'en') {
            if (status === 'confirmada') status = 'Confirmed';
            if (status === 'cancelada') status = 'Cancelled';
            if (status === 'concluída') status = 'Completed';
        }

        const row = [
            id,
            guestName,
            res.check_in || "-",
            res.check_out || "-",
            status,
            res.platform || "internal",
            (res.adults || 0) + (res.children || 0),
            nights,
            Number(res.total_price || 0).toFixed(2),
            Number(res.cleaning_fee || 0).toFixed(2),
            Number(res.service_fee || 0).toFixed(2),
            ownerRevenue(res).toFixed(2) // L-6: what the owner earns (lib/owner-revenue.ts)
        ];
        rows.push(row);
    });

    const reportLabel = locale === 'en' ? 'Report' : 'Relatorio';
    const propertyTitle = property.title?.[locale as 'en' | 'pt'] || property.title?.en || property.title?.pt || propertyId;

    return {
        success: true,
        headers,
        rows,
        propertyName: propertyTitle,
        filename: `${reportLabel}_${propertyTitle.replace(/\s+/g, '_')}_${year}_${month}.pdf`
    };
}
