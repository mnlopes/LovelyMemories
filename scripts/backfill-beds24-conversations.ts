import dotenv from "dotenv"; dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { beds24Request } from "../lib/beds24/client";
import { ingestMessages } from "../lib/beds24/sync";
import type { Beds24ApiEnvelope, Beds24Message } from "../lib/beds24/types";

/**
 * Backfill: para cada reserva Beds24 real, busca o histórico de mensagens à API,
 * ingere em beds24_messages e cria/atualiza a conversa no inbox — SEM correr o
 * motor de decisão (mensagens antigas não geram drafts; só as futuras, via webhook).
 */
(async () => {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: bookings } = await s.from("beds24_bookings")
    .select("beds24_booking_id, beds24_property_id, guest_first_name, guest_last_name, arrival, departure, status")
    .not("status", "in", '("cancelled")')
    .order("arrival");
  const real = (bookings ?? []).filter((b) => !/teste|test/i.test(`${b.guest_first_name} ${b.guest_last_name}`));
  console.log(`Backfill de ${real.length} reservas…`);

  const { data: props } = await s.from("beds24_properties").select("beds24_property_id, name");
  const propName = new Map((props ?? []).map((p) => [p.beds24_property_id, p.name]));

  for (const b of real) {
    const res = await beds24Request<Beds24Message>("GET", "/bookings/messages", {
      query: { bookingId: [b.beds24_booking_id], maxAge: 365 },
      context: "action",
    }) as Beds24ApiEnvelope<Beds24Message>;
    const msgs = res.data ?? [];
    await ingestMessages(msgs, "manual");

    const sorted = [...msgs].sort((a, c) => (a.time ?? "").localeCompare(c.time ?? ""));
    const last = sorted[sorted.length - 1];
    const { error } = await s.from("ai_conversation").upsert({
      reservation_id: String(b.beds24_booking_id),
      external_property_id: b.beds24_property_id ? String(b.beds24_property_id) : null,
      property_name: propName.get(b.beds24_property_id) ?? null,
      guest_name: [b.guest_first_name, b.guest_last_name].filter(Boolean).join(" ") || null,
      platform: "airbnb",
      check_in: b.arrival ?? null,
      check_out: b.departure ?? null,
      ...(last?.message ? {
        last_message_at: last.time ?? null,
        last_message_preview: last.message.slice(0, 140),
        last_message_sender: last.source === "host" ? "host" : "guest",
      } : {}),
      bot_checked_at: new Date().toISOString(), // mensagens antigas: já vistas, sem drafts
      updated_at: new Date().toISOString(),
    }, { onConflict: "reservation_id" });
    console.log(`  ${b.beds24_booking_id} ${b.guest_first_name ?? ""} ${b.guest_last_name ?? ""}: ${msgs.length} msgs ${error ? "ERRO " + error.message : "ok"}`);
  }

  const { data: convs } = await s.from("ai_conversation").select("reservation_id, guest_name, last_message_preview");
  const numeric = (convs ?? []).filter((c) => /^\d+$/.test(c.reservation_id));
  console.log(`\nConversas Beds24 no inbox agora: ${numeric.length}`);
  numeric.forEach((c) => console.log(` • ${c.reservation_id} ${c.guest_name}: ${(c.last_message_preview ?? "").slice(0, 40)}`));
})();
