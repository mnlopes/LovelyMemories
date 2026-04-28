"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { startOfMonth, endOfMonth, format, differenceInDays } from "date-fns";
import { getEffectiveUser } from "./auth-context";

export async function exportPropertyMonthlyData(propertyId: string, month: number, year: number) {
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

    // 2. Fetch Reservations for the period
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));

    const { data: reservations, error: resError } = await supabase
        .from('reservations')
        .select('*')
        .eq('property_id', propertyId)
        .or(`check_in.gte.${startDate.toISOString()},check_out.lte.${endDate.toISOString()}`)
        .order('check_in', { ascending: true });

    if (resError) throw new Error("Error fetching reservations");

    const headers = [
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

        const row = [
            `="${id}"`, // Force text for ID to avoid scientific notation
            guestName,
            res.check_in || "-",
            res.check_out || "-",
            res.status || "-",
            res.platform || "internal",
            (res.adults || 0) + (res.children || 0),
            nights,
            Number(res.total_price || 0).toFixed(2),
            Number(res.cleaning_fee || 0).toFixed(2),
            Number(res.service_fee || 0).toFixed(2),
            Number(res.net_amount || res.total_price || 0).toFixed(2)
        ];
        csvRows.push(row.join(';'));
    });

    return {
        success: true,
        csvContent: csvRows.join('\r\n'),
        filename: `Reservas_${property.title?.en || property.title?.pt || propertyId}_${year}_${month}.csv`
    };
}
