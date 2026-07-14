import dotenv from "dotenv"; dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { processBotMessages } from "../lib/beds24/bot-bridge";

(async () => {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const BOOKING = 89794243;

  // Pôr a cobaia em 'drafts' para o pipeline gerar rascunho
  await s.from("beds24_properties").update({ bot_mode: "drafts" }).eq("beds24_property_id", 341090);

  // Reconstruir booking + mensagens a partir da BD (fonte de verdade)
  const { data: bk } = await s.from("beds24_bookings").select("*").eq("beds24_booking_id", BOOKING).single();
  const { data: msgs } = await s.from("beds24_messages")
    .select("beds24_message_id, beds24_booking_id, beds24_property_id, source, message, message_time, read")
    .eq("beds24_booking_id", BOOKING).order("message_time", { ascending: true });

  const booking = {
    id: BOOKING, propertyId: bk?.beds24_property_id ?? 341090, roomId: bk?.beds24_room_id,
    status: bk?.status, arrival: bk?.arrival, departure: bk?.departure,
    firstName: bk?.guest_first_name, lastName: bk?.guest_last_name, numAdult: bk?.num_adult,
  } as never;
  const messages = (msgs ?? []).map((m) => ({
    id: m.beds24_message_id, bookingId: BOOKING, propertyId: m.beds24_property_id,
    source: m.source, message: m.message, time: m.message_time, read: m.read,
  })) as never;

  console.log(`Reprocessar ${(msgs??[]).length} mensagens da Carolina…`);
  await processBotMessages(booking, messages);

  // Verificar
  const { data: conv } = await s.from("ai_conversation").select("reservation_id, guest_name, bot_enabled, bot_off_reason, last_message_preview").eq("reservation_id", String(BOOKING)).maybeSingle();
  console.log("conversa criada:", JSON.stringify(conv));
  const { data: log } = await s.from("ai_message_log").select("incoming_message, status, decision, ai_draft").eq("reservation_ref", String(BOOKING));
  console.log("fila/log:", JSON.stringify(log, null, 1));
})();
