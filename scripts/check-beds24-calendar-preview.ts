import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

async function main() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: props } = await supabase
        .from('beds24_properties')
        .select('beds24_property_id, name, internal_property_id')
        .not('internal_property_id', 'is', null);
    console.log(`Propriedades ligadas: ${props?.length ?? 0}`);
    for (const p of props ?? []) console.log(`  ${p.beds24_property_id} ${p.name} -> ${p.internal_property_id}`);
    const since = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
    const { data: rows, error } = await supabase
        .from('beds24_bookings')
        .select('beds24_booking_id, beds24_property_id, status, arrival, departure, guest_first_name, guest_last_name, price, channel')
        .in('beds24_property_id', (props ?? []).map((p) => p.beds24_property_id))
        .in('status', ['confirmed', 'new'])
        .gte('departure', since);
    if (error) throw error;
    console.log(`Bookings no preview: ${rows?.length ?? 0}`);
    for (const r of (rows ?? []).slice(0, 10)) {
        console.log(`  #${r.beds24_booking_id} ${r.status} ${r.arrival}→${r.departure} ${r.guest_first_name ?? ''} ${r.guest_last_name ?? ''} €${r.price ?? '-'} [${r.channel ?? '-'}]`);
    }
}
main().catch((e) => { console.error(e); process.exit(1); });
