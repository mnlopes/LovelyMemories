import { getSupabaseAdmin } from "@/lib/supabase";
import { beds24Request } from "@/lib/beds24/client";
import type { Beds24Booking, Beds24Message } from "@/lib/beds24/types";
import { buildContext, type ThreadMessage } from "@/lib/ai-messaging";
import { decide } from "@/lib/ai-decision";
import { messagesMatch } from "@/lib/ai-message-match";
import { resolveBotAction, type BotPosture, type PropertyBotMode } from "@/lib/cohost-posture";

type Supa = Awaited<ReturnType<typeof getSupabaseAdmin>>;

/**
 * Ponte webhook→bot. Corre DEPOIS da ingestão beds24_* e NUNCA lança —
 * o webhook responde 200 independentemente do bot (payload bruto fica
 * em beds24_webhook_events, reprocessável).
 *
 * host  → bot off na conversa (exceto mensagens enviadas pelo próprio bot).
 * guest → motor de decisão: auto-send (modo 'auto' + knowledge coberto) ou fila humana.
 */
export async function processBotMessages(booking: Beds24Booking | null, messages: Beds24Message[]): Promise<void> {
    try {
        const supabase = await getSupabaseAdmin();
        const bookingId = booking?.id ?? messages[0]?.bookingId;
        if (!bookingId) return;

        // Kill-switch global (ai_messaging_settings, singleton id=1)
        const { data: settings } = await supabase
            .from("ai_messaging_settings")
            .select("bot_globally_enabled")
            .eq("id", 1)
            .maybeSingle();
        if (settings && settings.bot_globally_enabled === false) return;

        const propertyId = booking?.propertyId ?? null;

        // Nome da propriedade + modo do bot (uma leitura, usada em todo o batch)
        const { data: prop } = await supabase
            .from("beds24_properties")
            .select("bot_mode, name")
            .eq("beds24_property_id", propertyId ?? -1)
            .maybeSingle();

        // Upsert da conversa (uma por booking) + metadados de lista
        const sorted = [...messages].sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
        const last = sorted[sorted.length - 1];
        await supabase.from("ai_conversation").upsert({
            reservation_id: String(bookingId),
            external_property_id: propertyId ? String(propertyId) : null,
            property_name: prop?.name ?? null,
            guest_name: [booking?.firstName, booking?.lastName].filter(Boolean).join(" ") || null,
            platform: "airbnb",
            check_in: booking?.arrival ?? null,
            check_out: booking?.departure ?? null,
            ...(last?.message ? {
                last_message_at: last.time ?? new Date().toISOString(),
                last_message_preview: last.message.slice(0, 140),
                last_message_sender: last.source === "host" ? "host" : "guest",
            } : {}),
            updated_at: new Date().toISOString(),
        }, { onConflict: "reservation_id" });

        for (const msg of sorted) {
            if (!msg.message) continue;

            if (msg.source === "host") {
                // Resposta humana desliga o bot nesta conversa; mensagens que o
                // PRÓPRIO bot/painel enviou (registadas em ai_message_log) não.
                const { data: own } = await supabase
                    .from("ai_message_log")
                    .select("id")
                    .eq("external_message_id", String(msg.id))
                    .maybeSingle();
                let sentByUs = !!own;
                if (!sentByUs) {
                    // O canal devolve emoji como '?' no eco (e o painel não guarda o id
                    // da msg enviada), por isso comparamos por forma NORMALIZADA, não '==='.
                    const { data: recent } = await supabase
                        .from("ai_message_log")
                        .select("sent_message")
                        .eq("reservation_ref", String(bookingId))
                        .not("sent_message", "is", null)
                        .gte("sent_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());
                    sentByUs = (recent ?? []).some((r) => messagesMatch(r.sent_message as string, msg.message));
                }
                if (!sentByUs) {
                    // Resposta humana DESPROMOVE auto→assist (não desliga: o bot continua
                    // a redigir; só perde o direito de auto-enviar). Postura off não é tocada.
                    await supabase.from("ai_conversation").update({
                        bot_posture: "assist",
                        bot_off_reason: "human_replied",
                        bot_off_at: new Date().toISOString(),
                        bot_off_by: "bot",
                        updated_at: new Date().toISOString(),
                    }).eq("reservation_id", String(bookingId)).eq("bot_posture", "auto");

                    // Learning loop: a resposta humana no Airbnb pode ensinar o bot
                    const { captureLearning } = await import("@/lib/ai-learning");
                    await captureLearning({
                        reservationId: String(bookingId),
                        externalPropertyId: propertyId ? String(propertyId) : null,
                        humanAnswer: msg.message,
                    });
                }
                continue;
            }

            if (msg.source !== "guest") continue;
            await handleGuestMessage(supabase, bookingId, propertyId, prop, booking, msg);
        }
    } catch (e) {
        console.error("[bot-bridge] failed:", e);
    }
}

async function handleGuestMessage(
    supabase: Supa,
    bookingId: number,
    propertyId: number | null,
    prop: { bot_mode?: string | null; name?: string | null } | null,
    booking: Beds24Booking | null,
    msg: Beds24Message,
): Promise<void> {
    // Postura da conversa (default assist se a conversa ainda não existe)
    const { data: conv } = await supabase
        .from("ai_conversation")
        .select("bot_posture")
        .eq("reservation_id", String(bookingId))
        .maybeSingle();
    const posture = (conv?.bot_posture as BotPosture | undefined) ?? "assist";
    const mode = (prop?.bot_mode as PropertyBotMode | undefined) ?? "off";
    // Gate barato ANTES de gastar LLM: se nem draft vai haver, sair já.
    if (resolveBotAction(mode, posture, "needs_human") === "skip") return;

    // Claim idempotente: unique parcial em external_message_id → duplicado falha o insert e saímos.
    const { data: row, error } = await supabase.from("ai_message_log").insert({
        reservation_ref: String(bookingId),
        external_message_id: String(msg.id),
        property_code: prop?.name ?? null,
        guest_name: [booking?.firstName, booking?.lastName].filter(Boolean).join(" ") || null,
        channel: "airbnb",
        incoming_message: msg.message,
        status: "draft",
    }).select("id").single();
    if (error || !row) return;

    // Nova mensagem do hóspede torna obsoletos os drafts pendentes anteriores
    // desta conversa (spec: o draft regenera-se, não acumula).
    await supabase.from("ai_message_log").update({
        status: "skipped",
        skip_reason: "superseded",
        updated_at: new Date().toISOString(),
    }).eq("reservation_ref", String(bookingId)).eq("status", "draft").neq("id", row.id);

    // Histórico recente da conversa (fonte de verdade: beds24_messages)
    const { data: threadRows } = await supabase
        .from("beds24_messages")
        .select("source, message, message_time")
        .eq("beds24_booking_id", bookingId)
        .order("message_time", { ascending: false })
        .limit(10);
    const history: ThreadMessage[] = (threadRows ?? [])
        .reverse()
        .filter((r) => r.message && (r.source === "guest" || r.source === "host"))
        .map((r) => ({ role: r.source as "guest" | "host", content: r.message as string, at: r.message_time }));

    const ctx = await buildContext({
        guestMessage: msg.message!,
        externalPropertyId: propertyId ? String(propertyId) : null,
        reservation: booking ? {
            guestName: [booking.firstName, booking.lastName].filter(Boolean).join(" ") || null,
            checkInDate: booking.arrival ?? null,
            checkOutDate: booking.departure ?? null,
            guests: booking.numAdult ?? null,
        } : null,
        history,
    });
    const decision = await decide(ctx);

    if (decision.action === "auto_send" && resolveBotAction(mode, posture, "auto_send") === "auto_send") {
        let sendOk = false;
        try {
            const res = await beds24Request<unknown>("POST", "/bookings/messages", {
                body: [{ bookingId, message: decision.reply }],
                context: "bot",
            }) as Array<{ success: boolean }>;
            sendOk = !!res?.[0]?.success;
        } catch (e) {
            console.error("[bot-bridge] auto-send failed:", e);
        }
        await supabase.from("ai_message_log").update(sendOk ? {
            status: "sent",
            sent_message: decision.reply,
            decision: "auto_sent",
            knowledge_citation: decision.citation,
            auto_sent_at: new Date().toISOString(),
            sent_at: new Date().toISOString(),
        } : {
            status: "draft",
            ai_draft: decision.reply,
            decision: "needs_human",
            error: "auto-send failed",
        }).eq("id", row.id);
        return;
    }

    // Modo 'drafts', ou needs_human em qualquer modo → fila humana com draft
    await supabase.from("ai_message_log").update({
        status: "draft",
        ai_draft: decision.action === "auto_send" ? decision.reply : decision.draft,
        decision: decision.action === "needs_human" && decision.reason.startsWith("hard_rule")
            ? "hard_rule"
            : "needs_human",
        knowledge_citation: decision.action === "auto_send" ? decision.citation : null,
    }).eq("id", row.id);
}
