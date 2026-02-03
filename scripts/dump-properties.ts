
import { createClient } from "@supabase/supabase-js";
import * as fs from 'fs';
import * as path from 'path';

// Note: Run with --env-file=.env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey || !supabaseUrl) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in environment");
    console.error("URL:", supabaseUrl);
    console.error("Key:", supabaseServiceKey ? "EXISTS" : "MISSING");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function dumpProperties() {
    console.log("Fetching all properties...");
    const { data, error } = await supabase
        .from('properties')
        .select('*');

    if (error) {
        console.error("Error fetching properties:", error);
        return;
    }

    const outputPath = path.join(process.cwd(), 'scripts', 'properties_dump.json');
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`Successfully dumped ${data.length} properties to ${outputPath}`);
}

dumpProperties();
