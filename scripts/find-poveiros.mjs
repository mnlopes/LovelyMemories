import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://onujtyzpvaejrvhjmlwn.supabase.co";
const supabaseAnonKey = "sb_publishable_-ldFyjljjcQ31XhnTDg70g_lenXGKTh";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function find() {
    const { data, error } = await supabase
        .from('properties')
        .select('id, slug, is_multi_unit, parent_id, title')
        .ilike('slug', '%poveiros%');

    if (error) {
        console.error(error);
        return;
    }
    console.log(JSON.stringify(data, null, 2));
}

find();
