
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

async function checkSchema() {
    console.log('Checking properties table schema...');

    // Try to insert a dummy record to see columns in error, 
    // or just select a single record and look at keys
    const { data, error } = await supabase
        .from('properties')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching properties:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns found in properties table:', Object.keys(data[0]));
        const hasOwnerId = Object.keys(data[0]).includes('owner_id');
        console.log('Has owner_id column:', hasOwnerId);
    } else {
        console.log('No properties found to check columns. Trying to infer from error on invalid select...');
        const { error: colError } = await supabase
            .from('properties')
            .select('owner_id')
            .limit(1);

        if (colError) {
            console.log('Error selecting owner_id (likely missing):', colError.message);
        } else {
            console.log('Successfully selected owner_id. Column exists.');
        }
    }
}

checkSchema();
