import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVirtudes() {
    const { data, error } = await supabase
        .from('properties')
        .select('id, title, slug, images')
        .ilike('slug', '%virtudes-1%')
        .limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data && data.length > 0) {
        const p = data[0];
        console.log('First 2 images:');
        console.log(JSON.stringify(p.images?.slice(0, 2), null, 2));
    }
}

checkVirtudes();
