
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://onujtyzpvaejrvhjmlwn.supabase.co";
const supabaseKey = "sb_publishable_-ldFyjljjcQ31XhnTDg70g_lenXGKTh";
const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
    const slug = 'the-golde-dune';
    console.log(`Testing query for slug: ${slug}`);
    
    const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          locations (*),
          property_images (*),
          pricing_rules (*),
          parent:parent_id (*, locations (*))
        `)
        .eq('slug', slug)
        .single();
    
    if (error) {
        console.error('Query Error:', JSON.stringify(error, null, 2));
    } else {
        console.log('Query Success!');
        // console.log(JSON.stringify(data, null, 2));
    }
}

testQuery();
