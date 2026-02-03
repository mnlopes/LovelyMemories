
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://onujtyzpvaejrvhjmlwn.supabase.co";
const supabaseAnonKey = "sb_publishable_-ldFyjljjcQ31XhnTDg70g_lenXGKTh";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PROPERTIES_TO_DELETE = [
    "the-flower-power-two-bedroom-home",
    "avenida-luxury-penthouse",
    "sunset-villa-beachfront-home",
    "chiado-loft-classic-studio",
    "ocean-breeze-modern-apartment"
];

async function cleanupLegacy() {
    console.log('Cleaning up legacy properties:', PROPERTIES_TO_DELETE);

    // 1. Get IDs
    const { data: props } = await supabase
        .from('properties')
        .select('id, slug')
        .in('slug', PROPERTIES_TO_DELETE);

    if (!props || props.length === 0) {
        console.log('No properties to delete found.');
        return;
    }

    const ids = props.map(p => p.id);
    console.log('Found properties to delete:', ids);

    // 2. Delete Reservations
    const { data: delData, error: resError, count } = await supabase
        .from('reservations')
        .delete({ count: 'exact' })
        .in('property_id', ids);

    if (resError) {
        console.error('Error deleting reservations:', resError);
        return;
    }
    console.log('Deleted associated reservations count:', count);

    // 3. Archive Properties (soft delete) since hard delete is blocked
    console.log('Attempting soft delete (archiving)...');
    const { data, error } = await supabase
        .from('properties')
        .update({ is_active: false })
        .in('id', ids)
        .select('slug, title, is_active');

    if (error) {
        console.error('Error archiving properties:', error);
    } else {
        console.log('Successfully archived properties:', data);
    }
}

cleanupLegacy();
