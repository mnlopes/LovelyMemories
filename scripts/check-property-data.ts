import { createClient } from "@supabase/supabase-js";
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey || !supabaseUrl) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in environment");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPropertyData() {
    const { data: property, error: fetchError } = await supabase
        .from('properties')
        .select('bedrooms, bathrooms, beds, price_per_night, original_price, max_guests')
        .or('slug.eq.the-root,slug.eq.the-root-porto')
        .single();

    if (fetchError || !property) {
        console.error("Error fetching property:", fetchError?.message);
        return;
    }

    console.log("\n=== PROPERTY DATA ===");
    console.log("Bedrooms:", JSON.stringify(property.bedrooms, null, 2));
    console.log("Bathrooms:", JSON.stringify(property.bathrooms, null, 2));
    console.log("Beds:", JSON.stringify(property.beds, null, 2));
    console.log("Max Guests:", JSON.stringify(property.max_guests, null, 2));
    console.log("Price per night:", JSON.stringify(property.price_per_night, null, 2));
    console.log("Original price:", JSON.stringify(property.original_price, null, 2));
}

checkPropertyData();
