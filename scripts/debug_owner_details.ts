
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

// ID of the owner causing issues (Ze Antonio)
// I need to find his ID first.
async function debugOwnerDetails() {
    console.log('Finding owner "Ze Antonio"...');
    const { data: owners, error: searchError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .ilike('full_name', '%Ze Antonio%');

    if (searchError || !owners || owners.length === 0) {
        console.error('Owner not found or error:', searchError);
        return;
    }

    const ownerId = owners[0].id; // Use the first match
    console.log(`Found owner: ${owners[0].full_name} (${ownerId})`);

    console.log('Testing getOwnerWithProperties logic...');

    // 1. Fetch Owner Profile
    console.log('Step 1: Fetching profile...');
    const { data: owner, error: ownerError } = await supabase
        .from('profiles')
        .select(`
          id, 
          full_name, 
          email, 
          phone,
          created_at,
          role
      `)
        .eq('id', ownerId)
        .eq('role', 'owner')
        .single();

    if (ownerError) {
        console.error('Error fetching owner profile:', ownerError);
    } else {
        console.log('Owner profile fetched successfully.');
    }

    // 2. Fetch Assigned Properties
    console.log('Step 2: Fetching properties...');
    const { data: properties, error: propsError } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', ownerId);

    if (propsError) {
        console.error('Error fetching owner properties:', propsError);
    } else {
        console.log(`Owner properties fetched successfully: ${properties?.length} found.`);
    }
}

debugOwnerDetails();
