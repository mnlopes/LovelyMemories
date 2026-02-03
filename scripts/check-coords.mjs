import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://onujtyzpvaejrvhjmlwn.supabase.co";
const supabaseAnonKey = "sb_publishable_-ldFyjljjcQ31XhnTDg70g_lenXGKTh";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCoords() {
    const { data, error } = await supabase
        .from('properties')
        .select('id, slug, lat, lng, nearby_places');

    if (error) {
        console.error(error);
        return;
    }

    data.forEach(p => {
        if (p.lat && (p.lat < -90 || p.lat > 90)) console.log(`Invalid lat: ${p.slug} (${p.lat})`);
        if (p.lng && (p.lng < -180 || p.lng > 180)) console.log(`Invalid lng: ${p.slug} (${p.lng})`);

        p.nearby_places?.forEach(cat => {
            cat.items?.forEach(item => {
                if (item.coordinates) {
                    const [lat, lng] = item.coordinates;
                    if (lat < -90 || lat > 90) console.log(`Invalid nearby lat: ${p.slug} -> ${item.name} (${lat})`);
                    if (lng < -180 || lng > 180) console.log(`Invalid nearby lng: ${p.slug} -> ${item.name} (${lng})`);
                }
            });
        });
    });
}

checkCoords();
