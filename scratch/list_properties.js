const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function listProperties() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
        .from('properties')
        .select('id, title, slug, is_active, status');

    if (error) {
        console.error('Error fetching properties:', error);
    } else {
        console.log('Properties in Database:');
        console.log(JSON.stringify(data, null, 2));
    }
}

listProperties();
