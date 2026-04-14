
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function listColumns() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'reservations' });
    
    if (error) {
        // Fallback: Query information_schema directly if RPC is missing
        const { data: cols, error: err2 } = await supabase
            .from('reservations')
            .select('*')
            .limit(1);
        
        if (cols && cols.length > 0) {
            console.log('Columns found in first row:', Object.keys(cols[0]));
        } else {
             console.log('No rows found to inspect columns.');
             // Try a select with a known column to see if it works
             const { data: d3, error: e3 } = await supabase.from('reservations').select('id').limit(1);
             console.log('Select ID result:', e3 || 'Success');
        }
    } else {
        console.log('Columns:', data);
    }
}

listColumns();
