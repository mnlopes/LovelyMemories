import OpenAI from "openai";
import { GoogleGenerativeAI, SchemaType, type FunctionDeclaration, type Content } from "@google/generative-ai";
import type { AgentChatMessage, AgentTool, ModelCaller, ModelTurn } from "@/lib/ai-agent";
import { isTransientLlmError, resolveMessagingProvider, type AIProvider } from "@/lib/ai-messaging";

/**
 * Adaptadores de function-calling por provider para o loop do agente.
 * Ordem: Gemini primeiro (OpenAI está em 429 de quota permanente — handoff
 * 2026-07-14), OpenAI como fallback quando a key existe.
 * Cada chamada do loop tenta a cadeia completa (chamadas são stateless).
 */

const GEMINI_MODEL = process.env.GEMINI_MESSAGING_MODEL || "gemini-2.5-flash";
/** Fallback com quota própria (free tier tem limites POR MODELO) — espelha ai-messaging.ts. */
const GEMINI_FALLBACK_MODELS = ["gemini-2.0-flash"];
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

async function callGeminiModel(messages: AgentChatMessage[], tools: AgentTool[], modelName: string): Promise<ModelTurn> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Missing GEMINI_API_KEY");
    const { system, contents } = toGeminiContents(messages);
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
        model: modelName,
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

/** Tenta o modelo primário e cai para os fallbacks em erros transitórios (quota por modelo). */
async function callGemini(messages: AgentChatMessage[], tools: AgentTool[]): Promise<ModelTurn> {
    const models = [GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS].filter((m, i, a) => a.indexOf(m) === i);
    let lastErr: unknown;
    for (let i = 0; i < models.length; i++) {
        try {
            return await callGeminiModel(messages, tools, models[i]);
        } catch (err) {
            lastErr = err;
            if (i === models.length - 1 || !isTransientLlmError(err)) throw err;
            console.warn(`[ai-agent-providers] Gemini ${models[i]} indisponível, a tentar ${models[i + 1]}`);
        }
    }
    throw lastErr;
}

async function callOpenAI(messages: AgentChatMessage[], tools: AgentTool[]): Promise<ModelTurn> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("Missing OPENAI_API_KEY");
    const openai = new OpenAI({ apiKey: key });
    const res = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        temperature: 0.4,
        // gpt-4o-mini ignora o "ONLY JSON" do prompt depois de usar tools e responde
        // em prosa → parse_error no gate. json_object força o envelope (as tool_calls
        // não passam por content, não são afetadas).
        response_format: { type: "json_object" },
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

/**
 * Cadeia de providers com fallover em erros transitórios.
 * A ordem respeita o provider escolhido na BD (BotSettings → ai_messaging_settings.ai_provider),
 * com fallback para a env var AI_MESSAGING_PROVIDER: 'openai' → OpenAI primeiro; senão Gemini primeiro.
 * O provider é resolvido uma vez e memoizado durante a corrida do agente (o loop de tool-calling
 * reutiliza o mesmo caller), evitando uma leitura à BD por chamada ao modelo.
 * `providerOverride` permite forçar o provider em testes/scripts sem tocar na BD.
 */
export function buildModelCaller(providerOverride?: AIProvider): ModelCaller {
    let resolved: AIProvider | undefined = providerOverride;
    return async (messages, tools) => {
        if (!resolved) resolved = await resolveMessagingProvider();
        const openAiFirst = resolved === "openai";
        const chain: Array<(m: AgentChatMessage[], t: AgentTool[]) => Promise<ModelTurn>> = [];
        if (openAiFirst && process.env.OPENAI_API_KEY) chain.push(callOpenAI);
        if (process.env.GEMINI_API_KEY) chain.push(callGemini);
        if (!openAiFirst && process.env.OPENAI_API_KEY) chain.push(callOpenAI);
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
