
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkAllAssignedProperties() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
        .from('properties')
        .select('id, slug, owner_id, is_active')
        .not('owner_id', 'is', null);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('--- Assigned Properties ---');
    console.log(JSON.stringify(data, null, 2));
}

checkAllAssignedProperties();
