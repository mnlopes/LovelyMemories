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

async function verifyTranslations() {
    console.log(`Fetching 'The Root' property data...`);

    const { data: property, error: fetchError } = await supabase
        .from('properties')
        .select('good_to_know, description, highlights_intro, amenities')
        .or('slug.eq.the-root,slug.eq.the-root-porto')
        .single();

    if (fetchError || !property) {
        console.error("Error fetching property:", fetchError?.message);
        return;
    }

    console.log("\n=== GOOD TO KNOW ===");
    console.log("EN:", JSON.stringify(property.good_to_know?.en, null, 2));
    console.log("\nPT:", JSON.stringify(property.good_to_know?.pt, null, 2));

    console.log("\n=== DESCRIPTION ===");
    console.log("EN:", property.description?.en?.substring(0, 200) + "...");
    console.log("\nPT:", property.description?.pt?.substring(0, 200) + "...");

    console.log("\n=== HIGHLIGHTS INTRO ===");
    console.log("EN:", property.highlights_intro?.en?.substring(0, 200) + "...");
    console.log("\nPT:", property.highlights_intro?.pt?.substring(0, 200) + "...");

    console.log("\n=== AMENITIES (first category) ===");
    if (Array.isArray(property.amenities) && property.amenities.length > 0) {
        const firstCat = property.amenities[0];
        console.log("Category EN:", firstCat.category?.en);
        console.log("Category PT:", firstCat.category?.pt);
        console.log("First item EN:", firstCat.items?.[0]?.en);
        console.log("First item PT:", firstCat.items?.[0]?.pt);
    } else {
        console.log("Amenities structure:", JSON.stringify(property.amenities, null, 2));
    }
}

verifyTranslations();
