// Testa a extração de factos do learning loop (modelo falso — sem rede).
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { extractFactCandidate } from "../lib/ai-learning";
import type { ModelCaller } from "../lib/ai-agent";

let failed = 0;
const t = (name: string, cond: boolean) => { if (!cond) { failed++; console.error("FAIL:", name); } else console.log("ok:", name); };

(async () => {
    const yes: ModelCaller = async () => ({ type: "text", text: JSON.stringify({ has_fact: true, topic: "amenities", fact: "Tem berço e cadeira de refeição disponíveis a pedido" }) });
    const r1 = await extractFactCandidate("Têm berço?", "Sim temos berço e cadeira de refeição, é só pedir!", yes);
    t("facto extraído", r1?.topic === "amenities" && !!r1?.fact);

    const no: ModelCaller = async () => ({ type: "text", text: JSON.stringify({ has_fact: false }) });
    const r2 = await extractFactCandidate("Can I leave my bags today at 11?", "Yes today it's fine, come by", no);
    t("situacional rejeitado", r2 === null);

    const broken: ModelCaller = async () => ({ type: "text", text: "hm let me think" });
    const r3 = await extractFactCandidate("q", "a resposta é esta e tem comprimento", broken);
    t("json partido = null", r3 === null);

    const r4 = await extractFactCandidate("q", "ok", yes);
    t("resposta curta ignorada", r4 === null);

    const badTopic: ModelCaller = async () => ({ type: "text", text: JSON.stringify({ has_fact: true, topic: "weather", fact: "Facto com topic inválido cai em general" }) });
    const r5 = await extractFactCandidate("q", "resposta suficientemente longa para passar", badTopic);
    t("topic inválido → general", r5?.topic === "general");

    const throws: ModelCaller = async () => { throw new Error("LLM down"); };
    const r6 = await extractFactCandidate("q", "resposta suficientemente longa para passar", throws);
    t("erro de LLM = null (nunca lança)", r6 === null);

    process.exit(failed ? 1 : 0);
})();
