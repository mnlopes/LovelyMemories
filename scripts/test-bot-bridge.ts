import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { processBotMessages } from "../lib/beds24/bot-bridge";
import { getSupabaseAdmin } from "../lib/supabase";

/**
 * Teste de integração local do bot-bridge (sem LLM, sem API Beds24):
 * (a) mensagem host com a conversa em postura 'auto' → despromovida para 'assist'
 * (b) mensagem guest com bot_mode='off' → NÃO cria linha em ai_message_log
 * Usa booking fictício 999901 e limpa tudo no fim.
 */
async function main() {
    const supabase = await getSupabaseAdmin();
    let failed = 0;
    const t = (name: string, cond: boolean) => {
        if (!cond) { failed++; console.error("FAIL:", name); } else console.log("ok:", name);
    };

    const booking = {
        id: 999901, propertyId: 341090, firstName: "Teste", lastName: "Bridge",
        arrival: "2027-06-01", departure: "2027-06-05", numAdult: 2,
    } as never;

    // Pré-condição: coluna bot_mode existe e cobaia está 'off' (default)
    const { data: prop, error: propErr } = await supabase
        .from("beds24_properties").select("bot_mode").eq("beds24_property_id", 341090).single();
    if (propErr) {
        console.error("PRÉ-CONDIÇÃO FALHOU: beds24_properties.bot_mode não existe? ", propErr.message);
        process.exit(1);
    }
    t("pré: bot_mode legível", typeof prop?.bot_mode === "string");

    // O teste (b) mede o gate do modo 'off' — forçar 'off' e repor no fim
    // (em produção a cobaia pode estar em drafts/auto).
    const originalMode = prop?.bot_mode ?? "off";
    await supabase.from("beds24_properties").update({ bot_mode: "off" }).eq("beds24_property_id", 341090);

    // Pré-semear a conversa em postura 'auto' para medir a despromoção
    await supabase.from("ai_conversation").upsert({
        reservation_id: "999901", bot_posture: "auto",
    }, { onConflict: "reservation_id" });

    // (a) host despromove auto→assist
    await processBotMessages(booking, [
        { id: 888801, bookingId: 999901, source: "host", message: "resposta humana", time: new Date().toISOString() } as never,
    ]);
    const { data: conv } = await supabase
        .from("ai_conversation").select("bot_posture, bot_off_reason").eq("reservation_id", "999901").maybeSingle();
    t("host despromove bot (auto→assist)", conv?.bot_posture === "assist");
    t("motivo = human_replied", conv?.bot_off_reason === "human_replied");

    // (b) guest com bot_mode='off' → nada na fila
    await processBotMessages(booking, [
        { id: 888802, bookingId: 999901, source: "guest", message: "olá, teste", time: new Date().toISOString() } as never,
    ]);
    const { data: rows } = await supabase.from("ai_message_log").select("id").eq("reservation_ref", "999901");
    t("mode off não cria fila", (rows?.length ?? 0) === 0);

    // Limpeza (inclui repor o bot_mode real da cobaia)
    await supabase.from("beds24_properties").update({ bot_mode: originalMode }).eq("beds24_property_id", 341090);
    await supabase.from("ai_conversation").delete().eq("reservation_id", "999901");
    await supabase.from("ai_message_log").delete().eq("reservation_ref", "999901");
    console.log(failed ? `${failed} FALHAS` : "todos os testes passaram");
    process.exit(failed ? 1 : 0);
}
main();
