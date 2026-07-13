import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  for (const t of ['ai_conversation','ai_message_log','ai_settings','property_ai_knowledge']) {
    const { error } = await s.from(t).select('*', { count: 'exact', head: true });
    console.log(t, error ? `MISSING/ERR: ${error.message}` : 'OK');
  }
  const { data, error } = await s.from('beds24_properties').select('beds24_property_id, bot_mode').limit(2);
  console.log('beds24_properties.bot_mode:', error ? `ERR: ${error.message}` : JSON.stringify(data));
}
main();
