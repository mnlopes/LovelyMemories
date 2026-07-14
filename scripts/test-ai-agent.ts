import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { runAgent, type AgentTool, type ModelCaller } from "../lib/ai-agent";

let failed = 0;
const t = (name: string, cond: boolean) => { if (!cond) { failed++; console.error("FAIL:", name); } else console.log("ok:", name); };

const knowledgeTool: AgentTool = {
    name: "getKnowledge",
    description: "Property facts",
    parameters: { type: "object", properties: {} },
    execute: async () => ({ content: "[knowledge.wifiPassword] Wi-Fi password: pw123", citations: ["knowledge.wifiPassword"] }),
};

(async () => {
    // 1. Fluxo feliz: tool call → resposta coberta com citação válida
    let calls = 0;
    const happy: ModelCaller = async () => {
        calls++;
        if (calls === 1) return { type: "tool_calls", calls: [{ name: "getKnowledge", args: {} }] };
        return { type: "text", text: JSON.stringify({ covered: true, reply: "A password é pw123 😊", citations: ["knowledge.wifiPassword"], confidence: "high", language: "pt" }) };
    };
    const r1 = await runAgent({ systemPrompt: "x", userMessage: "wifi?", history: [], tools: [knowledgeTool], callModel: happy });
    t("coberto", r1.covered === true);
    t("reply presente", r1.reply === "A password é pw123 😊");
    t("citação validada", r1.citations.join() === "knowledge.wifiPassword");

    // 2. Citação inventada → gate rejeita
    const invented: ModelCaller = async () => ({ type: "text", text: JSON.stringify({ covered: true, reply: "custa €500", citations: ["calendar:2026-01-01..2026-01-05"], language: "en" }) });
    const r2 = await runAgent({ systemPrompt: "x", userMessage: "price?", history: [], tools: [knowledgeTool], callModel: invented });
    t("citação inventada escala", r2.covered === false && r2.reason === "invalid_citation");
    t("draft preservado para a fila", r2.reply === "custa €500");

    // 3. covered=true SEM citações → escala (regra: nunca auto-send sem citação)
    const noCite: ModelCaller = async () => ({ type: "text", text: JSON.stringify({ covered: true, reply: "sim!", citations: [], language: "en" }) });
    const r3 = await runAgent({ systemPrompt: "x", userMessage: "q", history: [], tools: [], callModel: noCite });
    t("sem citação escala", r3.covered === false);

    // 4. JSON malformado → parse_error
    const broken: ModelCaller = async () => ({ type: "text", text: "claro, a password é..." });
    const r4 = await runAgent({ systemPrompt: "x", userMessage: "q", history: [], tools: [], callModel: broken });
    t("json partido escala", r4.covered === false && r4.reason === "parse_error");

    // 5. Loop infinito de tools → corta em maxIterations
    const looper: ModelCaller = async () => ({ type: "tool_calls", calls: [{ name: "getKnowledge", args: {} }] });
    const r5 = await runAgent({ systemPrompt: "x", userMessage: "q", history: [], tools: [knowledgeTool], callModel: looper, maxIterations: 4 });
    t("iterações limitadas", r5.covered === false && r5.reason === "max_iterations");

    // 6. Tool desconhecida pedida pelo modelo → devolve erro ao modelo, não rebenta
    let step = 0;
    const unknownTool: ModelCaller = async () => {
        step++;
        if (step === 1) return { type: "tool_calls", calls: [{ name: "getWeather", args: {} }] };
        return { type: "text", text: JSON.stringify({ covered: false, reply: "vou confirmar", citations: [], language: "pt" }) };
    };
    const r6 = await runAgent({ systemPrompt: "x", userMessage: "q", history: [], tools: [knowledgeTool], callModel: unknownTool });
    t("tool desconhecida sobrevive", r6.covered === false && r6.reply === "vou confirmar");

    // 7. covered=false com draft honesto → passa o draft
    const honest: ModelCaller = async () => ({ type: "text", text: JSON.stringify({ covered: false, reply: "Vou confirmar com a equipa e já te digo! 😊", citations: [], language: "pt" }) });
    const r7 = await runAgent({ systemPrompt: "x", userMessage: "têm bicicletas?", history: [], tools: [], callModel: honest });
    t("não coberto com draft", r7.covered === false && r7.reason === "not_covered" && !!r7.reply);

    process.exit(failed ? 1 : 0);
})();
