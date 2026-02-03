
import { supabase } from "../lib/supabase";

async function checkColumns() {
    const { data, error } = await supabase
        .from('properties')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error fetching properties:", error);
        return;
    }

    if (data && data.length > 0) {
        console.log("Columns found in properties:", Object.keys(data[0]));
    } else {
        console.log("No data found in properties table to inspect columns.");
        // Try to fetch column names from information_schema if possible (might fail depending on RLS/Permissions)
        const { data: schemaData, error: schemaError } = await supabase
            .rpc('get_table_columns', { table_name: 'properties' });

        if (schemaError) {
            console.log("Could not fetch schema info via RPC.");
        } else {
            console.log("Schema columns:", schemaData);
        }
    }
}

checkColumns();
