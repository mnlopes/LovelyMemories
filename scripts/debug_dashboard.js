
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function debugDashboard() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const ownerId = "295d6140-4917-4d7b-8e58-b9e1ff958a51"; // Carolina

    console.log('--- Property Check ---');
    const { data: props, error: pErr } = await supabase
        .from('properties')
        .select('id, slug, owner_id, is_active')
        .eq('owner_id', ownerId);
    
    console.log('Properties for owner:', props?.length || 0);
    console.log(JSON.stringify(props, null, 2));

    if (props && props.length > 0) {
        const pids = props.map(p => p.id);
        console.log('--- Reservation Check ---');
        const { data: res, error: rErr } = await supabase
            .from('reservations')
            .select('id, property_id, status, created_at')
            .in('property_id', pids);
        
        console.log('Reservations found:', res?.length || 0);
        console.log(JSON.stringify(res, null, 2));
    }
}

debugDashboard();
