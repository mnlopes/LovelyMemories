
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://onujtyzpvaejrvhjmlwn.supabase.co";
const supabaseAnonKey = "sb_publishable_-ldFyjljjcQ31XhnTDg70g_lenXGKTh";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkImages() {
    console.log('Checking images for paraiso-331...');
    const { data, error } = await supabase
        .from('properties')
        .select('slug, images, property_images(url, is_main)')
        .eq('slug', 'paraiso-331-garden-huts-eco-homes');

    if (error) {
        console.error('Error fetching property:', error);
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
}

checkImages();
