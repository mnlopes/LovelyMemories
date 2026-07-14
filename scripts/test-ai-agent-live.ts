import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { runAgent, AGENT_OUTPUT_INSTRUCTIONS, type AgentTool } from "../lib/ai-agent";
import { buildModelCaller } from "../lib/ai-agent-providers";

const tool: AgentTool = {
    name: "getKnowledge",
    description: "Returns the property's verified facts (wifi, check-in, amenities…). Always call this before answering property questions.",
    parameters: { type: "object", properties: {} },
    execute: async () => ({
        content: "[knowledge.wifiPassword] Wi-Fi password: sunset2026\n[knowledge.checkIn] Check-in: 15:00",
        citations: ["knowledge.wifiPassword", "knowledge.checkIn"],
    }),
};

(async () => {
    const out = await runAgent({
        systemPrompt: `You are a vacation-rental guest assistant. Today's date: ${new Date().toISOString().slice(0, 10)}.\n${AGENT_OUTPUT_INSTRUCTIONS}`,
        userMessage: "Hi! What's the wifi password?",
        history: [],
        tools: [tool],
        callModel: buildModelCaller(),
    });
    console.log(JSON.stringify(out, null, 2));
    // Armadilha de alucinação: pergunta de preço SEM ferramenta de calendário
    const trap = await runAgent({
        systemPrompt: `You are a vacation-rental guest assistant. Today's date: ${new Date().toISOString().slice(0, 10)}.\n${AGENT_OUTPUT_INSTRUCTIONS}`,
        userMessage: "How much for 3 nights in September?",
        history: [],
        tools: [tool],
        callModel: buildModelCaller(),
    });
    console.log(JSON.stringify(trap, null, 2));
    const trapOk = trap.covered === false && !/\d+\s?€|€\s?\d+|\$\d+/.test(trap.reply ?? "");
    console.log(trapOk ? "ok: armadilha de preço passou (sem números, escalou)" : "FAIL: armadilha de preço");
    process.exit(trapOk && out.covered ? 0 : 1);
})();
