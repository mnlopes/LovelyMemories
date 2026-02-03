import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://onujtyzpvaejrvhjmlwn.supabase.co";
const supabaseAnonKey = "sb_publishable_-ldFyjljjcQ31XhnTDg70g_lenXGKTh";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fix() {
    const slug = 'praca-dos-poveiros2';

    // Normalizing coordinates - dividing by 1e15 if it looks like the bugged value
    const fixVal = (v) => {
        if (v && Math.abs(v) > 1000) {
            // e.g. -8602860321262310 -> -8.602...
            // It seems to be around 15 decimal places shift
            let s = v.toString();
            if (s.startsWith('-')) {
                return parseFloat(s.slice(0, 2) + '.' + s.slice(2));
            } else {
                return parseFloat(s.slice(0, 2) + '.' + s.slice(2));
            }
        }
        return v;
    };

    const { data: p, error } = await supabase
        .from('properties')
        .select('*')
        .eq('slug', slug)
        .single();

    if (error) {
        console.error(error);
        return;
    }

    const newLng = fixVal(p.lng);
    const newNearby = p.nearby_places?.map(cat => ({
        ...cat,
        items: cat.items?.map(item => ({
            ...item,
            coordinates: item.coordinates ? [fixVal(item.coordinates[0]), fixVal(item.coordinates[1])] : null
        }))
    }));

    const { error: updateError } = await supabase
        .from('properties')
        .update({
            lng: newLng,
            nearby_places: newNearby,
            is_multi_unit: true, // It is the building
            parent_id: null
        })
        .eq('id', p.id);

    if (updateError) {
        console.error('Update failed:', updateError);
    } else {
        console.log('Successfully fixed coordinates and status for', slug);
    }
}

fix();
