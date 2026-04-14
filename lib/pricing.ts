
import { supabase } from './supabase';
import { differenceInDays, startOfDay, isWithinInterval, parseISO, subDays, addDays, format, subMinutes } from 'date-fns';
import { DateRange } from 'react-day-picker';

export interface PricingBreakdown {
    basePrice: number;
    cleaningFee: number;
    discountAmount: number;
    discountPercent: number;
    cityTaxTotal: number;
    totalPrice: number;
    nights: number;
}

export interface CalculatePriceParams {
    propertyId: string;
    checkIn: Date;
    checkOut: Date;
    adults: number;
    children: number;
}

/**
 * Calcula o custo total de uma reserva com base nas regras da propriedade.
 * Esta função deve ser usada tanto no frontend (exibição) quanto no backend (verificação).
 */
export async function calculateReservationPrice({
    propertyId,
    checkIn,
    checkOut,
    adults = 0,
    children = 0
}: CalculatePriceParams): Promise<PricingBreakdown | { error: string }> {
    // 1. Calcular número de noites
    const nights = differenceInDays(startOfDay(checkOut), startOfDay(checkIn));
    if (nights <= 0) {
        return { error: 'errorCheckoutAfterCheckin' };
    }

    // 2. Procurar regras de preço da propriedade
    const { data: rules, error: rulesError } = await supabase
        .from('pricing_rules')
        .select('*')
        .eq('property_id', propertyId)
        .single();

    if (rulesError || !rules) {
        return { error: 'errorPricingRulesNotFound' };
    }

    // Validar noites mínimas
    if (nights < rules.min_nights) {
        return { error: 'errorMinNights' }; // We'll handle the count in the UI or via more complex translation
    }

    // 3. Procurar preços customizados para o período
    const { data: customPrices } = await supabase
        .from('custom_pricing')
        .select('*')
        .eq('property_id', propertyId)
        .gte('end_date', format(checkIn, 'yyyy-MM-dd'))
        .lte('start_date', format(checkOut, 'yyyy-MM-dd'));

    // 4. Calcular o custo das noites (considerando overrides)
    let totalBasePrice = 0;
    const currentDate = new Date(checkIn);

    for (let i = 0; i < nights; i++) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');

        // Verificar se existe um preço customizado para esta noite
        const custom = customPrices?.find(cp =>
            dateStr >= cp.start_date && dateStr < cp.end_date
        );

        totalBasePrice += custom ? Number(custom.price_per_night) : Number(rules.base_price_per_night);

        currentDate.setDate(currentDate.getDate() + 1);
    }

    // 5. Aplicar descontos standard
    let discountPercent = 0;
    if (nights >= 28) {
        discountPercent = Number(rules.monthly_discount_percent);
    } else if (nights >= 7) {
        discountPercent = Number(rules.weekly_discount_percent);
    }

    const discountAmount = totalBasePrice * (discountPercent / 100);
    const priceAfterDiscount = totalBasePrice - discountAmount;

    // 6. Calcular Taxa de Cidade (Tourist Tax)
    // Regra comum em Portugal: Máximo de 7 noites por pessoa, apenas adultos e crianças (bebé costumam estar isentos)
    const cityTaxPerNight = Number(rules.city_tax_per_night ?? 2.00);
    const taxableGuests = adults + children;
    const taxableNights = Math.min(nights, 7);
    const cityTaxTotal = cityTaxPerNight * taxableGuests * taxableNights;

    // 7. Somar taxa de limpeza e taxa de cidade
    const cleaningFee = Number(rules.cleaning_fee);
    const totalPrice = priceAfterDiscount + cleaningFee + cityTaxTotal;

    return {
        basePrice: totalBasePrice,
        cleaningFee,
        discountAmount,
        discountPercent,
        cityTaxTotal,
        totalPrice: Math.round(totalPrice * 100) / 100,
        nights
    };
}

/**
 * Verifica se as datas selecionadas estão disponíveis (reservas + bloqueios + regra da meia-noite + locks ativos).
 */
export async function verifyAvailability(propertyId: string, checkIn: Date, checkOut: Date, sessionId?: string) {
    // 1. Regra da Meia-Noite (Não permitir para o próprio dia)
    const today = startOfDay(new Date());
    if (startOfDay(checkIn) <= today) {
        return { available: false, error: 'errorMidnight' };
    }

    // 2. Verificar bloqueios manuais
    const { data: blocks } = await supabase
        .from('blocked_dates')
        .select('*')
        .eq('property_id', propertyId)
        .gt('end_date', format(checkIn, 'yyyy-MM-dd'))
        .lt('start_date', format(checkOut, 'yyyy-MM-dd'));

    if (blocks && blocks.length > 0) {
        return { available: false, error: 'errorBlocked' };
    }

    // 3. Verificar reservas existentes (confirmed ou pending)
    const { data: reservations } = await supabase
        .from('reservations')
        .select('*')
        .eq('property_id', propertyId)
        .neq('status', 'cancelled')
        .gt('check_out', format(checkIn, 'yyyy-MM-dd'))
        .lt('check_in', format(checkOut, 'yyyy-MM-dd'));

    if (reservations && reservations.length > 0) {
        return { available: false, error: 'errorAlreadyBooked' };
    }

    // 4. Verificar Bloqueios Temporários (Locks de 15 min)
    // Se o sessionId for fornecido, ignoramos o lock que pertence a essa sessão
    let lockQuery = supabase
        .from('locked_dates')
        .select('*')
        .eq('property_id', propertyId)
        .gt('expires_at', new Date().toISOString()) // Apenas locks que ainda não expiraram
        .gt('check_out', format(checkIn, 'yyyy-MM-dd'))
        .lt('check_in', format(checkOut, 'yyyy-MM-dd'));

    if (sessionId) {
        lockQuery = lockQuery.neq('session_id', sessionId);
    }

    const { data: activeLocks } = await lockQuery;

    if (activeLocks && activeLocks.length > 0) {
        return { available: false, error: 'errorTemporarilyLocked' };
    }

    return { available: true };
}

import { parseDateLocal } from './utils';

/**
 * Obtém todas as datas indisponíveis (bloqueios + reservas) para uma propriedade.
 */
export async function getUnavailableDates(propertyId: string) {
    const { getSupabaseAdmin } = await import('./supabase');
    const adminSupabase = await getSupabaseAdmin();

    // 1. Procurar bloqueios manuais
    const { data: blocks } = await adminSupabase
        .from('blocked_dates')
        .select('start_date, end_date')
        .eq('property_id', propertyId);

    // 2. Procurar reservas (confirmadas ou pendentes)
    const { data: reservations } = await adminSupabase
        .from('reservations')
        .select('check_in, check_out')
        .eq('property_id', propertyId)
        .neq('status', 'cancelled');

    // 3. Procurar locks temporários ativos
    const { data: activeLocks } = await adminSupabase
        .from('locked_dates')
        .select('check_in, check_out')
        .eq('property_id', propertyId)
        .gt('expires_at', new Date().toISOString());

    const unavailable: DateRange[] = [];

    // Note: For overlapping logic, we represent the blocked range up to the checkout day
    // The UI calendar handles the "clickable checkout" day specifically.
    blocks?.forEach(b => {
        const from = parseDateLocal(b.start_date);
        const to = parseDateLocal(b.end_date);
        if (from && to) unavailable.push({ from, to });
    });

    reservations?.forEach(r => {
        const from = parseDateLocal(r.check_in);
        const to = parseDateLocal(r.check_out);
        if (from && to) unavailable.push({ from, to });
    });

    activeLocks?.forEach(l => {
        const from = parseDateLocal(l.check_in);
        const to = parseDateLocal(l.check_out);
        if (from && to) unavailable.push({ from, to });
    });

    return unavailable;
}
