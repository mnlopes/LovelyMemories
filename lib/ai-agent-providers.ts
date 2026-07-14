import OpenAI from "openai";
import { GoogleGenerativeAI, SchemaType, type FunctionDeclaration, type Content } from "@google/generative-ai";
import type { AgentChatMessage, AgentTool, ModelCaller, ModelTurn } from "@/lib/ai-agent";
import { isTransientLlmError } from "@/lib/ai-messaging";

/**
 * Adaptadores de function-calling por provider para o loop do agente.
 * Ordem: Gemini primeiro (OpenAI está em 429 de quota permanente — handoff
 * 2026-07-14), OpenAI como fallback quando a key existe.
 * Cada chamada do loop tenta a cadeia completa (chamadas são stateless).
 */

const GEMINI_MODEL = process.env.GEMINI_MESSAGING_MODEL || "gemini-2.5-flash";
const OPENAI_MODEL = process.env.OPENAI_MESSAGING_MODEL || "gpt-4o-mini";

function toGeminiTools(tools: AgentTool[]): FunctionDeclaration[] {
    return tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: (t.parameters as unknown as FunctionDeclaration["parameters"]) ?? {
            type: SchemaType.OBJECT, properties: {},
        },
    }));
}

/** Gemini exige histórico a começar em user; role tool→function. */
function toGeminiContents(messages: AgentChatMessage[]): { system: string; contents: Content[] } {
    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const contents: Content[] = [];
    for (const m of messages) {
        if (m.role === "system") continue;
        if (m.role === "tool") {
            contents.push({ role: "function", parts: [{ functionResponse: { name: m.name, response: { content: m.content } } }] });
        } else {
            contents.push({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.content }] });
        }
    }
    while (contents.length && contents[0].role !== "user") contents.shift();
    return { system, contents };
}

async function callGemini(messages: AgentChatMessage[], tools: AgentTool[]): Promise<ModelTurn> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Missing GEMINI_API_KEY");
    const { system, contents } = toGeminiContents(messages);
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: system,
        generationConfig: { temperature: 0.4 },
        ...(tools.length ? { tools: [{ functionDeclarations: toGeminiTools(tools) }] } : {}),
    });
    const res = await model.generateContent({ contents });
    const fcalls = res.response.functionCalls();
    if (fcalls && fcalls.length) {
        return { type: "tool_calls", calls: fcalls.map((c) => ({ name: c.name, args: (c.args ?? {}) as Record<string, unknown> })) };
    }
    return { type: "text", text: res.response.text().trim() };
}

async function callOpenAI(messages: AgentChatMessage[], tools: AgentTool[]): Promise<ModelTurn> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("Missing OPENAI_API_KEY");
    const openai = new OpenAI({ apiKey: key });
    const res = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        temperature: 0.4,
        messages: messages.map((m) => m.role === "tool"
            ? { role: "user" as const, content: `[tool result: ${m.name}]\n${m.content}` }
            : { role: m.role, content: m.content }),
        ...(tools.length ? {
            tools: tools.map((t) => ({
                type: "function" as const,
                function: { name: t.name, description: t.description, parameters: t.parameters },
            })),
        } : {}),
    });
    const msg = res.choices[0]?.message;
    const functionCalls = msg?.tool_calls?.filter((c) => c.type === "function");
    if (functionCalls?.length) {
        return {
            type: "tool_calls",
            calls: functionCalls.map((c) => ({
                name: c.function.name,
                args: (() => { try { return JSON.parse(c.function.arguments) as Record<string, unknown>; } catch { return {}; } })(),
            })),
        };
    }
    return { type: "text", text: (msg?.content ?? "").trim() };
}

/** Cadeia Gemini→OpenAI (só providers com key), com fallover em erros transitórios. */
export function buildModelCaller(): ModelCaller {
    return async (messages, tools) => {
        const chain: Array<(m: AgentChatMessage[], t: AgentTool[]) => Promise<ModelTurn>> = [];
        if (process.env.GEMINI_API_KEY) chain.push(callGemini);
        if (process.env.OPENAI_API_KEY) chain.push(callOpenAI);
        if (!chain.length) chain.push(callGemini); // deixa rebentar com o erro claro de key
        let lastErr: unknown;
        for (let i = 0; i < chain.length; i++) {
            try {
                return await chain[i](messages, tools);
            } catch (err) {
                lastErr = err;
                if (i === chain.length - 1 || !isTransientLlmError(err)) throw err;
                console.warn("[ai-agent-providers] fallover:", err instanceof Error ? err.message : err);
            }
        }
        throw lastErr;
    };
}
