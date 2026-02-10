
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

async function setRootPrice() {
    console.log(`Searching for 'The Root' property...`);

    // Find by slug
    const { data: properties, error: fetchError } = await supabase
        .from('properties')
        .select('id, title, slug')
        .or('slug.eq.the-root,slug.eq.the-root-porto');

    if (fetchError) {
        console.error("Error fetching property:", fetchError.message);
        return;
    }

    if (!properties || properties.length === 0) {
        console.log("Property 'The Root' not found.");
        return;
    }

    const prop = properties[0];
    console.log(`Found property: ${prop.title.en} (ID: ${prop.id})`);

    console.log(`Updating price_per_night to 150...`);
    const { error: updateError } = await supabase
        .from('properties')
        .update({
            price_per_night: 150
        })
        .eq('id', prop.id);

    if (updateError) {
        console.error("❌ Error updating price:", updateError.message);
    } else {
        console.log("✅ Price updated successfully to 150€!");
    }
}

setRootPrice();
