
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Manually parse .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
    }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
// Use SERVICE ROLE for full access
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectReservations() {
    console.log('Querying information_schema for reservations columns...');

    // Use RPC to query if available, or try a raw SQL via some other means
    // Since we can't do raw SQL easily via client 2.x without RPC, 
    // we'll try to query the REST API directly or just guess based on common patterns.
    // Actually, we can try to query a common table that might have columns.

    // TRICK: Querying information_schema via the REST API (if enabled)
    // Most Supabase REST APIs allow querying information_schema if using service role
    const { data: cols, error: err } = await supabase
        .from('columns')
        .select('column_name, data_type')
        .eq('table_name', 'reservations')
        .eq('table_schema', 'public');

    if (err) {
        console.error('Error querying information_schema.columns:', err.message);
        // If that fails, try a dummy insert to get the list from the schema definition error (PostgREST sometimes returns this)
        const { error: insertErr } = await supabase.from('reservations').insert({}).select();
        console.log('Dummy insert error (might contain schema info):', insertErr?.message);
    } else {
        console.log('Columns in reservations table:');
        console.table(cols);
    }
}

inspectReservations();
