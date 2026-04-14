
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function findCarolina() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .ilike('full_name', '%Carolina%');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('--- Profiles Found ---');
    console.log(JSON.stringify(profiles, null, 2));

    // Also list top 5 properties to help matching
    const { data: properties } = await supabase
        .from('properties')
        .select('id, slug, title')
        .limit(5);

    console.log('--- Top 5 Properties ---');
    console.log(JSON.stringify(properties, null, 2));
}

findCarolina();
