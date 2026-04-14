import 'dotenv/config';
import { getSupabaseAdmin } from '../lib/supabase';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function listBlocked() {
    const supabase = await getSupabaseAdmin();
    const { data: properties } = await supabase.from('properties').select('id, title').limit(5);
    
    for (const prop of properties || []) {
        console.log(`Property: ${prop.title} (${prop.id})`);
        const { data: blocks } = await supabase
            .from('blocked_dates')
            .select('*')
            .eq('property_id', prop.id)
            .eq('source', 'airbnb_booking')
            .order('start_date', { ascending: true });
        
        if (blocks && blocks.length > 0) {
            blocks.forEach(b => {
                console.log(`  - ${b.start_date} to ${b.end_date} | UID: ${b.external_id} | Created: ${b.created_at}`);
            });
        } else {
            console.log('  No Airbnb blocks found.');
        }
    }
}

listBlocked();
