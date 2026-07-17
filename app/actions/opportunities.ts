'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { format, addDays } from 'date-fns';
import { getSupabaseAdmin } from '@/lib/supabase';
import { findGaps, type Interval } from '@/lib/opportunities';

/**
 * Server action da feature Opportunities: varre a ocupação de todas as casas nos
 * próximos WINDOW_DAYS e devolve as noites órfãs (gaps curtos entre reservas) + as
 * linhas de calendário (barras de ocupação) para o modo Opportunities da Overview.
 * Nunca lança — em erro devolve estrutura vazia (contrato como o getOverviewData).
 */

const OPP_ROLES = ['super_admin', 'admin'];
const MAX_GAP_NIGHTS = 3;

async function assertAdmin() {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll(); },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
                },
            },
        }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !OPP_ROLES.includes(profile.role)) throw new Error('Not authorized');
    return user;
}

// jsonb multi-idioma com fallback em cadeia (locale → en → primeiro valor). Igual ao overview.
function getTranslation(field: unknown, locale: string): string {
    if (!field) return '';
    if (typeof field === 'string') return field;
    if (typeof field === 'object') {
        const rec = field as Record<string, string>;
        return rec[locale] || rec.en || Object.values(rec)[0] || '';
    }
    return '';
}

function firstImage(images: unknown): string | null {
    const arr = Array.isArray(images) ? images : [];
    const first = arr[0];
    if (!first) return null;
    if (typeof first === 'string') return first;
    if (typeof first === 'object' && first !== null && 'url' in (first as Record<string, unknown>)) {
        return (first as { url?: string }).url ?? null;
    }
    return null;
}

export interface OpportunityItem {
    id: string; // `${propertyId}:${gapStart}`
    propertyId: string;
    propertyTitle: string;
    city: string | null;
    image: string | null;
    gapStart: string;
    gapEnd: string;
    nights: number;
}

export interface OpportunityRow {
    propertyId: string;
    title: string;
    city: string | null;
    image: string | null;
    blocks: { start: string; end: string; kind: 'reservation' | 'airbnb' }[];
}

export interface OpportunitiesData {
    windowFrom: string;
    windowTo: string;
    opportunities: OpportunityItem[];
    // Só as casas COM gaps — para desenhar as timelines no calendário do modo Opportunities.
    rows: OpportunityRow[];
}

function empty(from: string, to: string): OpportunitiesData {
    return { windowFrom: from, windowTo: to, opportunities: [], rows: [] };
}

// Janela de 30 dias por defeito (menos ruído); 60 carrega mais a pedido.
export async function getOpportunities(locale: string = 'en', windowDays: number = 30): Promise<OpportunitiesData> {
    const days = windowDays === 60 ? 60 : 30;
    const today = new Date();
    const todayISO = format(today, 'yyyy-MM-dd');
    const windowEndISO = format(addDays(today, days), 'yyyy-MM-dd');

    try {
        await assertAdmin();
        const admin = await getSupabaseAdmin();

        const [reservationsRes, blockedRes, propertiesRes] = await Promise.all([
            admin.from('reservations')
                .select('property_id, check_in, check_out, status')
                .in('status', ['confirmed', 'checked-in'])
                .gte('check_out', todayISO)
                .lte('check_in', windowEndISO),
            admin.from('blocked_dates')
                .select('property_id, start_date, end_date, source')
                .eq('source', 'airbnb_booking')
                .gte('end_date', todayISO)
                .lte('start_date', windowEndISO),
            admin.from('properties')
                .select('id, title, city, images, is_active, is_multi_unit')
                .eq('is_active', true)
                .eq('is_multi_unit', false),
        ]);

        const propertyRows = propertiesRes.data ?? [];
        const propertyMap = new Map(propertyRows.map((p) => [
            p.id as string,
            {
                title: getTranslation(p.title, locale) || 'Untitled Property',
                city: getTranslation(p.city, locale) || null,
                image: firstImage(p.images),
            },
        ]));

        // Ocupação por casa (mesma fonte que o calendário na vista iCal: reservas + blocos Airbnb).
        const occupancyByProperty: Record<string, Interval[]> = {};
        const blocksByProperty = new Map<string, { start: string; end: string; kind: 'reservation' | 'airbnb' }[]>();
        const push = (propertyId: string, start: string, end: string, kind: 'reservation' | 'airbnb') => {
            (occupancyByProperty[propertyId] ??= []).push({ start, end });
            const list = blocksByProperty.get(propertyId) ?? [];
            list.push({ start, end, kind });
            blocksByProperty.set(propertyId, list);
        };
        for (const r of reservationsRes.data ?? []) {
            push(r.property_id as string, r.check_in as string, r.check_out as string, 'reservation');
        }
        for (const b of blockedRes.data ?? []) {
            push(b.property_id as string, b.start_date as string, b.end_date as string, 'airbnb');
        }

        const gaps = findGaps(occupancyByProperty, { fromISO: todayISO, toISO: windowEndISO, maxGapNights: MAX_GAP_NIGHTS });

        const opportunities: OpportunityItem[] = gaps.map((g) => {
            const prop = propertyMap.get(g.propertyId);
            return {
                id: `${g.propertyId}:${g.gapStart}`,
                propertyId: g.propertyId,
                propertyTitle: prop?.title ?? 'Untitled Property',
                city: prop?.city ?? null,
                image: prop?.image ?? null,
                gapStart: g.gapStart,
                gapEnd: g.gapEnd,
                nights: g.nights,
            };
        });

        // Linhas de calendário: só as casas que têm pelo menos um gap.
        const propertiesWithGaps = new Set(gaps.map((g) => g.propertyId));
        const rows: OpportunityRow[] = [...propertiesWithGaps].map((propertyId) => {
            const prop = propertyMap.get(propertyId);
            const blocks = (blocksByProperty.get(propertyId) ?? [])
                .slice()
                .sort((a, b) => a.start.localeCompare(b.start));
            return {
                propertyId,
                title: prop?.title ?? 'Untitled Property',
                city: prop?.city ?? null,
                image: prop?.image ?? null,
                blocks,
            };
        });

        return { windowFrom: todayISO, windowTo: windowEndISO, opportunities, rows };
    } catch {
        return empty(todayISO, windowEndISO);
    }
}
