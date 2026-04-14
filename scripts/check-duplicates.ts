import { getSupabaseAdmin } from '../lib/supabase';

async function checkDuplicates() {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
        .from('blocked_dates')
        .select('property_id, external_id, count(*)')
        .not('external_id', 'is', null)
        .filter('source', 'eq', 'airbnb_booking')
        .group('property_id, external_id')
        .having('count(*)', 'gt', 1);

    if (error) {
        console.error('Error checking duplicates:', error);
        return;
    }

    console.log('Duplicate counts:', JSON.stringify(data, null, 2));
}

checkDuplicates();
