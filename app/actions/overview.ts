'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { format, addDays } from 'date-fns';
import { getSupabaseAdmin } from '@/lib/supabase';
import { buildCardFallback } from '@/lib/ai-card-meta';
import { deriveStayStatus, derivePropertyToday, type StayStatus } from '@/lib/overview-status';
import { isBeds24Enabled } from '@/lib/beds24/client';

/**
 * Server action que alimenta a Overview fundida (/admin): chegadas/saídas reais
 * + estado das propriedades + resumo do co-host de IA. Uma única leitura,
 * nunca lança — em erro devolve uma estrutura vazia (mas válida).
 */

// Overview aberto a super_admin + admin (2026-07-17).
const OVERVIEW_ROLES = ['super_admin', 'admin'];

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
    const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single();
    if (!profile || !OVERVIEW_ROLES.includes(profile.role)) {
        throw new Error('Not authorized');
    }
    return { user, profile };
}

type CohostAlert = { kind: 'send_failed' | 'stale_draft'; label: string } | null;

type OverviewData = {
    firstName: string;
    counts: { staying: number; arrivalsToday: number; departuresTomorrow: number; pending: number };
    cohost: { pending: { rowId: string; title: string; guestName: string | null; message: string; propertyCode: string | null; createdAt: string }[]; alert: { kind: 'send_failed' | 'stale_draft'; label: string } | null } | null;
    stays: { guestName: string; propertyTitle: string; propertyImage: string | null; checkIn: string; checkOut: string; guests: number | null; status: 'arrives_today' | 'departs_tomorrow' | 'staying' | 'arrives_soon'; source: 'direct' | 'airbnb'; sameDayTurn: boolean }[];
    properties: { id: string; title: string; city: string | null; image: string | null; today: 'occupied' | 'arrives_today' | 'free'; nextArrival: string | null; guestInHouse: { name: string; checkOut: string } | null; pendingCount: number }[];
};

// Estrutura vazia mas válida — usada em qualquer falha (o contrato é nunca lançar).
function emptyOverview(firstName: string): OverviewData {
    return {
        firstName,
        counts: { staying: 0, arrivalsToday: 0, departuresTomorrow: 0, pending: 0 },
        cohost: null,
        stays: [],
        properties: [],
    };
}

// Mesmo padrão de app/[locale]/admin/reservations/page.tsx:163 — campos jsonb multi-idioma
// com fallback em cadeia (locale pedido → en → primeiro valor disponível).
function getTranslation(field: unknown, locale: string): string {
    if (!field) return '';
    if (typeof field === 'string') return field;
    if (typeof field === 'object') {
        const rec = field as Record<string, string>;
        return rec[locale] || rec.en || Object.values(rec)[0] || '';
    }
    return '';
}

// images[0] tanto pode ser uma string simples como { url }.
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

const STATUS_ORDER: Record<StayStatus, number> = {
    arrives_today: 0,
    departs_tomorrow: 1,
    staying: 2,
    arrives_soon: 3,
};

// Convenção já usada em app/actions/ai-inbox.ts: ids Beds24 são numéricos (sem
// hífen); refs com hífen são resíduo do fornecedor anterior (Hospitable/UUID).
const isBeds24Ref = (ref: string | null | undefined): ref is string => !!ref && !ref.includes('-');

export async function getOverviewData(locale: string = 'en'): Promise<OverviewData> {
    let firstNameFallback = '';
    try {
        const { user, profile } = await assertAdmin();
        firstNameFallback = deriveFirstName(profile?.full_name, user.email);

        const today = new Date();
        const todayISO = format(today, 'yyyy-MM-dd');
        const windowEndISO = format(addDays(today, 7), 'yyyy-MM-dd');

        const admin = await getSupabaseAdmin();

        const [reservationsRes, blockedRes, propertiesRes, b24LinkRes, b24BookingsRes] = await Promise.all([
            admin.from('reservations')
                .select('id, property_id, guest_name, check_in, check_out, adults, children, infants, status')
                .in('status', ['confirmed', 'checked-in'])
                .gte('check_out', todayISO)
                .lte('check_in', windowEndISO),
            admin.from('blocked_dates')
                .select('id, property_id, start_date, end_date, source')
                .eq('source', 'airbnb_booking')
                .gte('end_date', todayISO)
                .lte('start_date', windowEndISO),
            admin.from('properties')
                .select('id, title, city, images, is_active, is_multi_unit')
                .eq('is_active', true)
                .eq('is_multi_unit', false),
            // Beds24: ligação property↔internal + reservas na janela → nome REAL do hóspede
            // para as chegadas que hoje só existem como blocos iCal do Airbnb (6 casas ligadas).
            // Com o Beds24 desligado a chegada continua a aparecer (vem do bloco iCal),
            // apenas sem nome de hóspede — degradação suave, nunca um ecrã vazio.
            isBeds24Enabled()
                ? admin.from('beds24_properties').select('beds24_property_id, internal_property_id').not('internal_property_id', 'is', null)
                : Promise.resolve({ data: [] as { beds24_property_id: number; internal_property_id: string }[] }),
            isBeds24Enabled()
                ? admin.from('beds24_bookings')
                    .select('beds24_property_id, arrival, guest_first_name, guest_last_name, num_adult, num_child')
                    .in('status', ['confirmed', 'new'])
                    .gte('arrival', todayISO)
                    .lte('arrival', windowEndISO)
                : Promise.resolve({ data: [] as { beds24_property_id: number; arrival: string; guest_first_name: string | null; guest_last_name: string | null; num_adult: number | null; num_child: number | null }[] }),
        ]);

        // Map (internal_property_id|arrival) → { name, guests } a partir do Beds24.
        const b24Link = new Map((b24LinkRes.data ?? []).map((l) => [l.beds24_property_id as number, l.internal_property_id as string]));
        const b24ByPropDay = new Map<string, { name: string; guests: number | null }>();
        for (const bk of b24BookingsRes.data ?? []) {
            const internalId = b24Link.get(bk.beds24_property_id as number);
            if (!internalId) continue;
            const name = [bk.guest_first_name, bk.guest_last_name].filter(Boolean).join(' ').trim();
            b24ByPropDay.set(`${internalId}|${bk.arrival as string}`, {
                name: name || '',
                guests: ((bk.num_adult as number) ?? 0) + ((bk.num_child as number) ?? 0) || null,
            });
        }

        const propertyRows = propertiesRes.data ?? [];
        const propertyMap = new Map(propertyRows.map((p) => [
            p.id as string,
            {
                title: getTranslation(p.title, locale) || 'Untitled Property',
                city: getTranslation(p.city, locale) || null,
                image: firstImage(p.images),
            },
        ]));

        type RawStay = { propertyId: string; guestName: string; checkIn: string; checkOut: string; guests: number | null; source: 'direct' | 'airbnb' };

        const reservationStays: RawStay[] = (reservationsRes.data ?? []).map((r) => ({
            propertyId: r.property_id as string,
            guestName: (r.guest_name as string) || '',
            checkIn: r.check_in as string,
            checkOut: r.check_out as string,
            guests: (r.adults ?? 0) + (r.children ?? 0) + (r.infants ?? 0) || null,
            source: 'direct',
        }));

        const blockedStays: RawStay[] = (blockedRes.data ?? []).map((b) => {
            // Enriquecer com o nome real do Beds24 quando a data de chegada coincide (6 casas ligadas);
            // senão fica sem nome (o cartão mostra a propriedade + etiqueta "Airbnb").
            const b24 = b24ByPropDay.get(`${b.property_id as string}|${b.start_date as string}`);
            return {
                propertyId: b.property_id as string,
                guestName: b24?.name ?? '',
                checkIn: b.start_date as string,
                checkOut: b.end_date as string,
                guests: b24?.guests ?? null,
                source: 'airbnb',
            };
        });

        const allStays = [...reservationStays, ...blockedStays];

        // ── Contagens + lista de estadias (ordenadas por status, depois check-in) ──
        const withStatus = allStays
            .map((s) => ({ ...s, status: deriveStayStatus(s.checkIn, s.checkOut, todayISO) }))
            .filter((s): s is RawStay & { status: StayStatus } => s.status !== null);

        const counts = {
            staying: withStatus.filter((s) => s.status === 'staying').length,
            arrivalsToday: withStatus.filter((s) => s.status === 'arrives_today').length,
            departuresTomorrow: withStatus.filter((s) => s.status === 'departs_tomorrow').length,
            pending: 0, // preenchido abaixo (secção co-host), best-effort
        };

        // Same-day turn: uma saída cuja propriedade recebe uma chegada no MESMO dia.
        // (Calculável já com os dados existentes; "cleaning booked"/"gap nights" ficam
        // para o futuro — não há dados de limpeza nem query de calendário aqui.)
        const arrivalKeys = new Set(allStays.map((s) => `${s.propertyId}|${s.checkIn}`));

        // Cap 20 (não 8): o desktop divide em listas de chegadas/partidas; o carrossel
        // mobile faz slice(0,8) no cliente para manter o comportamento anterior.
        const stays = withStatus
            .slice()
            .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.checkIn.localeCompare(b.checkIn))
            .slice(0, 20)
            .map((s) => {
                const prop = propertyMap.get(s.propertyId);
                return {
                    guestName: s.guestName,
                    propertyTitle: prop?.title ?? 'Untitled Property',
                    propertyImage: prop?.image ?? null,
                    checkIn: s.checkIn,
                    checkOut: s.checkOut,
                    guests: s.guests,
                    status: s.status,
                    source: s.source,
                    sameDayTurn: s.status === 'departs_tomorrow' && arrivalKeys.has(`${s.propertyId}|${s.checkOut}`),
                };
            });

        // ── Estado "hoje" por propriedade + próxima chegada ─────────────────────
        const staysByProperty = new Map<string, RawStay[]>();
        for (const s of allStays) {
            const list = staysByProperty.get(s.propertyId) ?? [];
            list.push(s);
            staysByProperty.set(s.propertyId, list);
        }

        const properties = propertyRows.map((p) => {
            const propStays = staysByProperty.get(p.id as string) ?? [];
            const prop = propertyMap.get(p.id as string)!;
            const upcoming = propStays
                .filter((s) => s.checkIn >= todayISO)
                .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
            // Hóspede em casa esta noite (check-in ≤ hoje < check-out) — para a coluna
            // "Guest in house" do desktop; nome vazio = bloco Airbnb sem nome (a UI
            // mostra a etiqueta genérica).
            const inHouse = propStays.find((s) => s.checkIn <= todayISO && s.checkOut > todayISO) ?? null;
            return {
                id: p.id as string,
                title: prop.title,
                city: prop.city,
                image: prop.image,
                today: derivePropertyToday(propStays.map((s) => ({ check_in: s.checkIn, check_out: s.checkOut })), todayISO),
                nextArrival: upcoming[0]?.checkIn ?? null,
                guestInHouse: inHouse ? { name: inHouse.guestName, checkOut: inHouse.checkOut } : null,
                pendingCount: 0, // preenchido abaixo (secção co-host), best-effort
            };
        });

        // ── Secção co-host (feed de IA) — best-effort: as colunas card_* podem
        // ainda não existir em produção (migração 20260716120000 por aplicar),
        // por isso esta secção nunca deixa a action inteira falhar.
        let cohost: OverviewData['cohost'] = null;
        try {
            // Beds24 desligado: o co-host não tem canal por onde responder, por
            // isso a secção é genuinamente indisponível — sai pelo catch abaixo,
            // que é o caminho já existente para isso. Com `cohost` a null a UI
            // apaga de uma vez o tile "to review", o banner mobile, o rail
            // lateral, a coluna CO-HOST e o filtro da tabela (tudo atrás de
            // `data.cohost !== null`). Sem isto ficavam botões "Review draft"
            // a apontar para uma rota que devolve 404.
            if (!isBeds24Enabled()) throw new Error('co-host indisponível: Beds24 desligado');

            const dayAgoISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

            const [pendingRes, failedRes, staleRes, allDraftsRes] = await Promise.all([
                // exclui rows legacy Hospitable (reservation_ref UUID)
                admin.from('ai_message_log')
                    .select('id, guest_name, incoming_message, card_title, created_at, reservation_ref, property_code')
                    .eq('status', 'draft')
                    .not('reservation_ref', 'like', '%-%')
                    .order('created_at', { ascending: false })
                    .limit(3),
                admin.from('ai_message_log')
                    .select('id, created_at')
                    .eq('status', 'failed')
                    .gte('created_at', dayAgoISO)
                    .order('created_at', { ascending: false })
                    .limit(1),
                admin.from('ai_message_log')
                    .select('id, created_at')
                    .eq('status', 'draft')
                    .lt('created_at', dayAgoISO)
                    .order('created_at', { ascending: true })
                    .limit(1),
                // exclui rows legacy Hospitable (reservation_ref UUID)
                admin.from('ai_message_log')
                    .select('id, reservation_ref')
                    .eq('status', 'draft')
                    .not('reservation_ref', 'like', '%-%'),
            ]);

            const pending = (pendingRes.data ?? []).map((row) => ({
                rowId: row.id as string,
                title: (row.card_title as string | null) ?? buildCardFallback(row.guest_name as string | null, row.incoming_message as string).title,
                guestName: (row.guest_name as string | null) ?? null,
                message: (row.incoming_message as string) ?? '',
                propertyCode: (row.property_code as string | null) ?? null,
                createdAt: row.created_at as string,
            }));

            const alert: CohostAlert =
                (failedRes.data && failedRes.data.length > 0)
                    ? { kind: 'send_failed', label: 'Falha no envio de uma resposta nas últimas 24h' }
                    : (staleRes.data && staleRes.data.length > 0)
                        ? { kind: 'stale_draft', label: 'Há um rascunho por rever há mais de 24h' }
                        : null;

            cohost = { pending, alert };

            // pendingCount por propriedade: draft → reservation_ref → ai_conversation.external_property_id
            // → beds24_properties.internal_property_id.
            const draftRefs = Array.from(new Set(
                (allDraftsRes.data ?? [])
                    .map((d) => d.reservation_ref as string | null)
                    .filter(isBeds24Ref)
            ));
            counts.pending = (allDraftsRes.data ?? []).length;

            if (draftRefs.length > 0) {
                const refCounts = new Map<string, number>();
                for (const d of allDraftsRes.data ?? []) {
                    const ref = d.reservation_ref as string | null;
                    if (!isBeds24Ref(ref)) continue;
                    refCounts.set(ref, (refCounts.get(ref) ?? 0) + 1);
                }

                const { data: conversations } = await admin
                    .from('ai_conversation')
                    .select('reservation_id, external_property_id')
                    .in('reservation_id', draftRefs);

                const externalPropertyIds = Array.from(new Set(
                    (conversations ?? [])
                        .map((c) => c.external_property_id as string | null)
                        .filter((v): v is string => !!v)
                ));

                if (externalPropertyIds.length > 0) {
                    const { data: beds24Props } = await admin
                        .from('beds24_properties')
                        .select('beds24_property_id, internal_property_id')
                        .in('beds24_property_id', externalPropertyIds);

                    const externalToInternal = new Map(
                        (beds24Props ?? []).map((bp) => [String(bp.beds24_property_id), bp.internal_property_id as string | null])
                    );
                    const refToExternal = new Map(
                        (conversations ?? []).map((c) => [c.reservation_id as string, c.external_property_id as string | null])
                    );

                    const internalCounts = new Map<string, number>();
                    for (const [ref, count] of refCounts.entries()) {
                        const externalId = refToExternal.get(ref);
                        const internalId = externalId ? externalToInternal.get(externalId) : null;
                        if (!internalId) continue;
                        internalCounts.set(internalId, (internalCounts.get(internalId) ?? 0) + count);
                    }

                    for (const p of properties) {
                        p.pendingCount = internalCounts.get(p.id) ?? 0;
                    }
                }
            }
        } catch {
            // Secção co-host indisponível (ex.: migração de card_* por aplicar) — a
            // Overview continua a funcionar sem ela.
            cohost = null;
        }

        return {
            firstName: firstNameFallback,
            counts,
            cohost,
            stays,
            properties,
        };
    } catch {
        return emptyOverview(firstNameFallback);
    }
}

function deriveFirstName(fullName: string | null | undefined, email: string | null | undefined): string {
    if (fullName && fullName.trim()) return fullName.trim().split(/\s+/)[0];
    if (email) return email.split('@')[0];
    return '';
}
