import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://onujtyzpvaejrvhjmlwn.supabase.co";
const supabaseAnonKey = "sb_publishable_-ldFyjljjcQ31XhnTDg70g_lenXGKTh";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debug() {
    const slug = 'praca-dos-poveiros2';
    console.log(`Checking property with slug: ${slug}`);

    const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          locations (*),
          property_images (*),
          parent:parent_id (*, locations (*))
        `)
        .eq('slug', slug)
        .single();

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Raw Data:', JSON.stringify(data, null, 2));
}

debug();
