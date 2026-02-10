import { createClient } from '@supabase/supabase-js';
import pkg from 'dotenv';
const { config } = pkg;
config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function update() {
    const { data, error } = await supabase
        .from('reservations')
        .update({ transfer_type: 'round_trip' })
        .eq('reference_id', 'LM-YD52B4')
        .select();

    if (error) {
        console.error('Error updating reservation:', error);
    } else {
        console.log('Successfully updated reservation:', data);
    }
}
update();
