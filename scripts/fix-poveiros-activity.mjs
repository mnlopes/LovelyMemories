import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://onujtyzpvaejrvhjmlwn.supabase.co";
const supabaseAnonKey = "sb_publishable_-ldFyjljjcQ31XhnTDg70g_lenXGKTh";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    const { data: poveiros, error } = await supabase
        .from('properties')
        .select('*')
        .ilike('slug', '%poveiros%');

    if (error) {
        console.error(error);
        return;
    }

    console.log('--- Properties Found ---');
    poveiros.forEach(p => {
        console.log(`ID: ${p.id} | Slug: ${p.slug} | Active: ${p.is_active} | Parent: ${p.parent_id} | Multi-unit: ${p.is_multi_unit}`);
    });

    const child = poveiros.find(p => p.slug === 'praca-dos-poveiros-studio-loft');
    if (child && !child.is_active) {
        console.log('Activating child unit...');
        await supabase.from('properties').update({ is_active: true }).eq('id', child.id);
    }
}

check();
