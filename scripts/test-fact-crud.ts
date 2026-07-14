import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { getSupabaseAdmin } from "../lib/supabase";

let failed = 0;
const t = (name: string, cond: boolean) => { if (!cond) { failed++; console.error("FAIL:", name); } else console.log("ok:", name); };

async function main() {
    const admin = await getSupabaseAdmin();
    const EXT = "341090"; // Virtudes One

    const ins = await admin.from("ai_property_fact")
        .insert({ external_property_id: EXT, topic: "parking", fact: "TEST-CRUD sentinel fact", source: "manual", status: "active" })
        .select("id").single();
    t("insert ok", !ins.error && !!ins.data?.id);
    const id = ins.data!.id as string;

    const list = await admin.from("ai_property_fact")
        .select("id, status").eq("external_property_id", EXT).in("status", ["active", "pending"]);
    t("list inclui o novo", (list.data ?? []).some((r) => r.id === id));

    const upd = await admin.from("ai_property_fact")
        .update({ fact: "TEST-CRUD edited", topic: "general" }).eq("id", id);
    t("update ok", !upd.error);

    const del = await admin.from("ai_property_fact").delete().eq("id", id);
    t("delete ok", !del.error);

    const gone = await admin.from("ai_property_fact").select("id").eq("id", id).maybeSingle();
    t("apagado de facto", !gone.data);

    process.exit(failed ? 1 : 0);
}
main();
