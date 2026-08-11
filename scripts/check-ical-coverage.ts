import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    const { data: links } = await supabase
        .from('beds24_properties')
        .select('beds24_property_id, name, internal_property_id')
        .not('internal_property_id', 'is', null);

    const ids = (links ?? []).map((l) => l.internal_property_id as string);

    const { data: props } = await supabase
        .from('properties')
        .select('id, title, ical_import_urls, sync_status, last_sync_at, last_sync_error')
        .in('id', ids);

    const today = new Date().toISOString().slice(0, 10);
    const { data: blocks } = await supabase
        .from('blocked_dates')
        .select('property_id, source, start_date, end_date')
        .in('property_id', ids)
        .gte('end_date', today);

    for (const l of links ?? []) {
        const p = props?.find((x) => x.id === l.internal_property_id) as Record<string, unknown> | undefined;
        const urls = (p?.ical_import_urls as string[]) ?? [];
        const mine = (blocks ?? []).filter((b) => b.property_id === l.internal_property_id);
        const bySource = new Map<string, number>();
        for (const b of mine) bySource.set(String(b.source), (bySource.get(String(b.source)) ?? 0) + 1);
        console.log('---');
        console.log(`${l.name}`);
        console.log(`  URLs iCal (${urls.length}): ${urls.length ? urls.map((u) => (u.includes('.ics') ? 'OK ' : 'INVÁLIDO ') + u.slice(0, 70)).join('\n                   ') : 'NENHUM'}`);
        console.log(`  sync: ${p?.sync_status ?? '?'} @ ${p?.last_sync_at ?? '?'} err=${p?.last_sync_error ?? '-'}`);
        console.log(`  blocos futuros: ${mine.length} ${JSON.stringify(Object.fromEntries(bySource))}`);
    }
}

main().catch((e) => { console.error(e); process.exit(1); });
