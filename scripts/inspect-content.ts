
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

async function inspectContent() {
    console.log('Fetching RDM II property content...');

    const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('slug', 'rdm-ii-premium-apartments')
        .single();

    if (error) {
        console.error('Error fetching property:', error);
    } else if (data) {
        console.log('Property content:');
        console.log(JSON.stringify(data, null, 2));
    } else {
        console.log('No property found.');
    }
}

inspectContent();
