/**
 * Núcleo do agente (camadas 2+3 do spec 2026-07-14-scalable-guest-agent-design.md):
 * loop de tool-calling provider-agnóstico + gate de citações determinístico.
 *
 * O LLM nunca decide o envio: este módulo devolve um AgentOutcome; quem envia
 * (bot-bridge) cruza `covered` com o modo da propriedade (off/drafts/auto).
 * `callModel` é injetável — os adaptadores reais (Gemini/OpenAI) vivem em
 * lib/ai-agent-providers.ts; os testes usam um modelo falso.
 */

export interface AgentTool {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    execute: (args: Record<string, unknown>) => Promise<{ content: string; citations: string[] }>;
}

export type ModelTurn =
    | { type: "text"; text: string }
    | { type: "tool_calls"; calls: Array<{ name: string; args: Record<string, unknown> }> };

export type AgentChatMessage =
    | { role: "system" | "user" | "assistant"; content: string }
    | { role: "tool"; name: string; content: string };

export type ModelCaller = (messages: AgentChatMessage[], tools: AgentTool[]) => Promise<ModelTurn>;

export interface AgentOutcome {
    covered: boolean;
    reply: string | null;
    citations: string[];
    reason: string; // ok | not_covered | invalid_citation | parse_error | max_iterations
}

/** Contrato de saída, anexado ao system prompt por quem monta o contexto (Task 6). */
export const AGENT_OUTPUT_INSTRUCTIONS = `
TOOLS: Use the available tools to fetch real data before answering. Never answer property or
calendar questions from memory.

FINAL ANSWER FORMAT: When you are done (with or without tools), respond with ONLY a single JSON
object — no markdown fence, no extra text:
{"covered": boolean, "reply": string, "citations": string[], "confidence": "high"|"low", "language": string}
- "covered" is true ONLY when every factual claim in "reply" is backed by data the tools returned
  in THIS conversation. General knowledge or guesses do NOT count.
- "citations" lists the bracketed keys of the exact facts used (e.g. "knowledge.wifiPassword",
  "fact:<id>", "calendar:2026-09-10..2026-09-13"). Empty when covered is false.
- When covered is false, "reply" must still be a warm, honest guest-facing message saying you'll
  confirm with the team shortly — in the guest's language. Never invent information. If a specific
  detail is missing (e.g. access code, wifi password), acknowledge the question and say the team
  will confirm and send the details before arrival — do NOT infer it from availability or other tools.
- Never confirm, accept, pre-approve or modify a booking; invite the guest to complete the booking
  and note the team will confirm.`;

/** Extrai o objeto JSON balanceado ({ ... }) de um texto, ignorando chavetas dentro de strings. */
function extractBalancedJson(text: string): string | null {
    const start = text.indexOf("{");
    if (start === -1) return null;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (ch === "\\") {
                escaped = true;
            } else if (ch === '"') {
                inString = false;
            }
            continue;
        }
        if (ch === '"') {
            inString = true;
        } else if (ch === "{") {
            depth++;
        } else if (ch === "}") {
            depth--;
            if (depth === 0) return text.slice(start, i + 1);
        }
    }
    return null;
}

/** Extrai o primeiro objeto JSON do texto (tolera fences ``` / ```json e prosa antes/depois). */
function parseOutcome(text: string): { covered: boolean; reply: string | null; citations: string[] } | null {
    const candidate = extractBalancedJson(text);
    if (!candidate) return null;
    try {
        const parsed = JSON.parse(candidate) as { covered?: unknown; reply?: unknown; citations?: unknown };
        if (typeof parsed.covered !== "boolean") return null;
        return {
            covered: parsed.covered,
            reply: typeof parsed.reply === "string" && parsed.reply.trim() ? parsed.reply.trim() : null,
            citations: Array.isArray(parsed.citations) ? parsed.citations.filter((c): c is string => typeof c === "string") : [],
        };
    } catch {
        return null;
    }
}

export async function runAgent(opts: {
    systemPrompt: string;
    userMessage: string;
    history: Array<{ role: "user" | "assistant"; content: string }>;
    tools: AgentTool[];
    callModel: ModelCaller;
    maxIterations?: number;
}): Promise<AgentOutcome> {
    const max = opts.maxIterations ?? 4;
    const messages: AgentChatMessage[] = [
        { role: "system", content: opts.systemPrompt },
        ...opts.history,
        { role: "user", content: opts.userMessage },
    ];
    /** Chaves de citação REALMENTE fornecidas ao modelo nesta execução — o universo válido do gate. */
    const availableCitations = new Set<string>();

    for (let i = 0; i < max; i++) {
        let turn: ModelTurn;
        try {
            turn = await opts.callModel(messages, opts.tools);
        } catch (err) {
            throw err; // erro de LLM sobe — o chamador (decide) trata transient vs erro
        }

        if (turn.type === "tool_calls") {
            for (const call of turn.calls) {
                const tool = opts.tools.find((t) => t.name === call.name);
                messages.push({ role: "assistant", content: `[tool call] ${call.name}(${JSON.stringify(call.args)})` });
                if (!tool) {
                    messages.push({ role: "tool", name: call.name, content: `Error: unknown tool "${call.name}". Available: ${opts.tools.map((t) => t.name).join(", ") || "none"}.` });
                    continue;
                }
                try {
                    const result = await tool.execute(call.args ?? {});
                    result.citations.forEach((c) => availableCitations.add(c));
                    messages.push({ role: "tool", name: call.name, content: result.content });
                } catch (err) {
                    messages.push({ role: "tool", name: call.name, content: `Error: tool failed (${err instanceof Error ? err.message : "unknown"}). Treat this data as unavailable.` });
                }
            }
            continue;
        }

        // Resposta final → gate determinístico
        const parsed = parseOutcome(turn.text);
        if (!parsed) return { covered: false, reply: null, citations: [], reason: "parse_error" };
        if (!parsed.covered) return { covered: false, reply: parsed.reply, citations: [], reason: "not_covered" };
        if (!parsed.citations.length) return { covered: false, reply: parsed.reply, citations: [], reason: "not_covered" };
        const invalid = parsed.citations.filter((c) => !availableCitations.has(c));
        if (invalid.length) {
            console.warn("[ai-agent] invalid citations (auditoria):", invalid);
            return { covered: false, reply: parsed.reply, citations: [], reason: "invalid_citation" };
        }
        return { covered: true, reply: parsed.reply, citations: parsed.citations, reason: "ok" };
    }
    return { covered: false, reply: null, citations: [], reason: "max_iterations" };
}
