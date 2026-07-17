// One-off: reprocessa pelo bridge as conversas pendentes (última msg = hóspede, sem draft)
// das 6 propriedades Beds24 ligadas — mensagens que chegaram antes de a casa estar em 'drafts'.
import dotenv from "dotenv"; dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { processBotMessages } from "../lib/beds24/bot-bridge";

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: convs } = await s.from("ai_conversation")
    .select("reservation_id, guest_name, property_name")
    .eq("last_message_sender", "guest")
    .neq("bot_posture", "off")
    .not("reservation_id", "like", "%-%");
  console.log(`conversas candidatas (última=guest, posture≠off): ${convs?.length ?? 0}`);

  let drafted = 0, skipped = 0;
  for (const c of convs ?? []) {
    const bk = Number(c.reservation_id);
    // já tem draft? salta
    const { data: existing } = await s.from("ai_message_log").select("id").eq("reservation_ref", c.reservation_id).eq("status", "draft").limit(1);
    if (existing && existing.length) { skipped++; continue; }

    const { data: b } = await s.from("beds24_bookings").select("*").eq("beds24_booking_id", bk).maybeSingle();
    if (!b) { skipped++; continue; }
    const { data: msgs } = await s.from("beds24_messages")
      .select("beds24_message_id, beds24_property_id, source, message, message_time, read")
      .eq("beds24_booking_id", bk).order("message_time", { ascending: true });

    const booking = { id: bk, propertyId: b.beds24_property_id, roomId: b.beds24_room_id, status: b.status,
      arrival: b.arrival, departure: b.departure, firstName: b.guest_first_name, lastName: b.guest_last_name,
      numAdult: b.num_adult, numChild: b.num_child } as never;
    const messages = (msgs ?? []).map((m) => ({ id: m.beds24_message_id, bookingId: bk, propertyId: m.beds24_property_id,
      source: m.source, message: m.message, time: m.message_time, read: m.read })) as never;

    await processBotMessages(booking, messages);
    const { data: d } = await s.from("ai_message_log").select("status, ai_draft").eq("reservation_ref", c.reservation_id).eq("status", "draft").limit(1);
    if (d && d.length) { drafted++; console.log(`  ✓ ${c.guest_name} (${c.property_name?.slice(0,20)}) → draft`); }
    else { skipped++; console.log(`  – ${c.guest_name}: sem draft (agente decidiu não responder)`); }
  }
  console.log(`\nBACKFILL: ${drafted} drafts criados · ${skipped} sem draft/saltados`);
}
main().catch((e) => { console.error(e); process.exit(1); });
