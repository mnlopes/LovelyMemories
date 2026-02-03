
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
const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectSchema() {
    console.log('Fetching a single property to inspect columns...');

    const { data, error } = await supabase
        .from('properties')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching property:', error);
    } else if (data && data.length > 0) {
        console.log('Available columns in properties table:');
        console.log(Object.keys(data[0]));
    } else {
        console.log('No properties found.');
    }
}

inspectSchema();
