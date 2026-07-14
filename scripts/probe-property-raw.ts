// Probe temporário: chaves reais do raw de beds24_properties + existência de ai_property_fact
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { getSupabaseAdmin } from "../lib/supabase";

(async () => {
    const supabase = await getSupabaseAdmin();
    const { data: props, error } = await supabase
        .from("beds24_properties")
        .select("beds24_property_id, name, raw")
        .limit(10);
    if (error) { console.error("read failed:", error.message); process.exit(1); }
    for (const p of props ?? []) {
        const raw = (p.raw ?? {}) as Record<string, unknown>;
        console.log(`\n=== ${p.beds24_property_id} ${p.name} ===`);
        console.log("top-level keys:", Object.keys(raw).join(", ") || "(raw vazio)");
        for (const [k, v] of Object.entries(raw)) {
            if (typeof v === "string" && v.trim().length > 10) {
                console.log(`  ${k}: "${v.slice(0, 120).replace(/\n/g, " ")}..." (${v.length} chars)`);
            } else if (v && typeof v === "object" && !Array.isArray(v)) {
                console.log(`  ${k}: {${Object.keys(v as object).join(", ")}}`);
            } else if (Array.isArray(v)) {
                console.log(`  ${k}: [array ${v.length}]`);
            }
        }
    }
    const { error: factErr } = await supabase.from("ai_property_fact").select("id", { head: true, count: "exact" });
    console.log("\nai_property_fact:", factErr ? `NÃO EXISTE (${factErr.message})` : "existe ✅");
})();
