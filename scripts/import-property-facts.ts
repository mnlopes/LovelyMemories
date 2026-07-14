// Import inicial best-effort do knowledge Beds24 (arranque a frio do agente).
// Lê beds24_properties.raw (payload Airbnb via Beds24, GET /properties) e cria
// factos source='imported', status='active'. Idempotente: propriedades que já
// têm factos imported são saltadas.
//
// Chaves reais do raw (verificadas com scripts/probe-property-raw.ts, 2026-07-14):
//   house_manual (texto longo), directions (como chegar), check_in_option.instruction,
//   amenities (objeto de flags Airbnb), wifi_network + wifi_password.
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { getSupabaseAdmin } from "../lib/supabase";

(async () => {
    const supabase = await getSupabaseAdmin();

    // Pré-condição: migração 20260715090000_ai_property_fact.sql aplicada no Supabase.
    // (Um select real — head/count devolve 204 sem erro mesmo sem tabela.)
    const probe = await supabase.from("ai_property_fact").select("id").limit(1);
    if (probe.error) {
        console.error("A tabela ai_property_fact não existe — aplicar a migração 20260715090000_ai_property_fact.sql no dashboard Supabase primeiro.");
        process.exit(1);
    }

    const { data: props, error } = await supabase
        .from("beds24_properties")
        .select("beds24_property_id, name, raw");
    if (error || !props) { console.error("read failed:", error?.message); process.exit(1); }

    let inserted = 0;
    for (const p of props) {
        const extId = String(p.beds24_property_id);
        const raw = (p.raw ?? {}) as Record<string, unknown>;
        if (!Object.keys(raw).length) { console.log(`sem raw: ${p.name} — nada a importar`); continue; }

        // Idempotência: salta propriedades que já têm factos imported
        const { count } = await supabase
            .from("ai_property_fact")
            .select("id", { count: "exact", head: true })
            .eq("external_property_id", extId)
            .eq("source", "imported");
        if ((count ?? 0) > 0) { console.log(`skip ${p.name} (já importado)`); continue; }

        const s = (v: unknown): string | null => (typeof v === "string" && v.trim().length > 10 ? v.trim() : null);
        const candidates: Array<{ topic: string; fact: string }> = [];

        const manual = s(raw.house_manual);
        if (manual) candidates.push({ topic: "general", fact: `House manual (from the Airbnb listing): ${manual.slice(0, 1500)}` });

        const directions = s(raw.directions);
        if (directions) candidates.push({ topic: "access", fact: `How to get to the property: ${directions.slice(0, 1200)}` });

        const checkInOpt = (raw.check_in_option ?? {}) as Record<string, unknown>;
        const checkInInstruction = s(checkInOpt.instruction);
        if (checkInInstruction) candidates.push({ topic: "access", fact: `Check-in instructions (verify before relying on codes): ${checkInInstruction.slice(0, 1000)}` });

        const amenities = raw.amenities && typeof raw.amenities === "object" && !Array.isArray(raw.amenities)
            ? Object.keys(raw.amenities as object)
            : [];
        if (amenities.length) {
            candidates.push({
                topic: "amenities",
                fact: `Amenities listed on Airbnb: ${amenities.map((a) => a.toLowerCase().replace(/_/g, " ")).join(", ")}.`,
            });
        }

        const wifiName = s(raw.wifi_network);
        const wifiPass = typeof raw.wifi_password === "string" && raw.wifi_password.trim() ? raw.wifi_password.trim() : null;
        if (wifiName && wifiPass) {
            candidates.push({ topic: "general", fact: `Wi-Fi network "${wifiName}", password: ${wifiPass}` });
        }

        if (!candidates.length) { console.log(`sem textos: ${p.name} — nada a importar`); continue; }
        const { error: insErr } = await supabase.from("ai_property_fact").insert(
            candidates.map((c) => ({
                external_property_id: extId,
                topic: c.topic,
                fact: c.fact,
                source: "imported",
                status: "active",
            })),
        );
        if (insErr) console.error(`insert falhou ${p.name}:`, insErr.message);
        else { inserted += candidates.length; console.log(`ok: ${p.name} +${candidates.length} factos (${candidates.map((c) => c.topic).join(", ")})`); }
    }
    console.log(`total inseridos: ${inserted}`);
})();
