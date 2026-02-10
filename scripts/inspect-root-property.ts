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

async function inspectProperty() {
    console.log(`Fetching 'The Root' property data...`);

    const { data: property, error: fetchError } = await supabase
        .from('properties')
        .select('amenities, good_to_know, description, highlights_intro')
        .or('slug.eq.the-root,slug.eq.the-root-porto')
        .single();

    if (fetchError || !property) {
        console.error("Error fetching property:", fetchError?.message);
        return;
    }

    console.log("\n=== AMENITIES STRUCTURE ===");
    console.log("Type:", typeof property.amenities);
    console.log("Is Array:", Array.isArray(property.amenities));
    console.log("Content:", JSON.stringify(property.amenities, null, 2));

    console.log("\n=== GOOD TO KNOW STRUCTURE ===");
    console.log("Type:", typeof property.good_to_know);
    console.log("Content:", JSON.stringify(property.good_to_know, null, 2));

    console.log("\n=== DESCRIPTION STRUCTURE ===");
    console.log("Type:", typeof property.description);
    console.log("Content:", JSON.stringify(property.description, null, 2));

    console.log("\n=== HIGHLIGHTS INTRO STRUCTURE ===");
    console.log("Type:", typeof property.highlights_intro);
    console.log("Content:", JSON.stringify(property.highlights_intro, null, 2));
}

inspectProperty();
