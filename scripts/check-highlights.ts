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

async function checkHighlights() {
    console.log(`Fetching 'The Root' property highlights...`);

    const { data: property, error: fetchError } = await supabase
        .from('properties')
        .select('highlights')
        .or('slug.eq.the-root,slug.eq.the-root-porto')
        .single();

    if (fetchError || !property) {
        console.error("Error fetching property:", fetchError?.message);
        return;
    }

    console.log("\n📋 Current highlights structure:");
    console.log(JSON.stringify(property.highlights, null, 2));
}

checkHighlights();
