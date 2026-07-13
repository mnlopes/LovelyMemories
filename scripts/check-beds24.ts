import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const ev = await s.from('beds24_webhook_events').select('id, received_at, latency_ms, event_type, beds24_booking_id, processed, processing_error').order('id', { ascending: false }).limit(3);
  console.log('webhook_events:', JSON.stringify(ev.data ?? ev.error));
  const bk = await s.from('beds24_bookings').select('beds24_booking_id, guest_first_name, arrival, departure, price, first_seen_via').limit(5);
  console.log('bookings:', JSON.stringify(bk.data ?? bk.error));
  const ms = await s.from('beds24_messages').select('beds24_message_id, source, message, first_seen_via, latency_ms').limit(5);
  console.log('messages:', JSON.stringify(ms.data ?? ms.error));
}
main();
