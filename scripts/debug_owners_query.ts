
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
    console.log('Testing getOwnersWithPropertyCounts query...');

    // 1. Simple fetch of owners
    const { data: owners, error: simpleError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('role', 'owner');

    if (simpleError) {
        console.error('Simple fetch error:', simpleError);
    } else {
        console.log('Simple fetch found:', owners?.length, 'owners');
        owners?.forEach(o => console.log(`- ${o.full_name} (${o.email})`));
    }

    // 2. Fetch with properties count (The failing query?)
    // Note: PostgREST syntax for count in related table might be tricky
    console.log('\nTesting query with properties count...');
    const { data: ownersWithCount, error: countError } = await supabase
        .from('profiles')
        .select(`
        id, 
        full_name, 
        email, 
        phone,
        created_at,
        properties:properties(count)
    `)
        .eq('role', 'owner');

    if (countError) {
        console.error('Count query error:', countError);
        // Try alternative syntax if this fails
        console.log('\nTrying alternative syntax: properties(count)');
        const { data: altData, error: altError } = await supabase
            .from('profiles')
            .select('*, properties(count)')
            .eq('role', 'owner');

        if (altError) console.error('Alternative query error:', altError);
        else console.log('Alternative query success:', altData);

    } else {
        console.log('Count query success. Data:', JSON.stringify(ownersWithCount, null, 2));
    }
}

testQuery();
