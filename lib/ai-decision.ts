import { DraftContext, buildSystemPrompt, draftReply, isTransientLlmError } from "@/lib/ai-messaging";
import { runAgent, AGENT_OUTPUT_INSTRUCTIONS } from "@/lib/ai-agent";
import { buildModelCaller } from "@/lib/ai-agent-providers";
import { buildAgentTools } from "@/lib/ai-agent-tools";

export type BotDecision =
    | { action: "auto_send"; reply: string; citation: string }
    | { action: "needs_human"; draft: string | null; reason: string };

/**
 * Regras duras: NEGOCIAÇÃO e decisões escalam SEMPRE, sem LLM.
 * (Spec 2026-07-14: preço/disponibilidade INFORMATIVOS já não escalam —
 * o agente responde-lhes com dados reais do calendário.)
 */
const HARD_RULES: { reason: string; re: RegExp }[] = [
    { reason: "negotiation", re: /desconto|discount|cheaper|mais barato|lower price|better price|negoci|last minute deal/i },
    { reason: "dates_change", re: /mudar as datas|change (the )?dates|alterar? a reserva|modify (the )?booking|extend (the )?stay|prolongar|reschedule/i },
    { reason: "complaint", re: /n[aã]o funciona|not working|broken|avariad|inaceit|unacceptable|complain|reclama|problema com|issue with|dirty|sujo/i },
    { reason: "refund_cancel", re: /refund|reembols|cancel(ar|lation)?|devolu[çc][aã]o/i },
    { reason: "physical_action", re: /early check.?in|check.?in early|late check.?out|check.?out late|check.?in (cedo|antecipado)|deixar (as )?malas|luggage|bags? (before|early)|bagagem/i },
];

export function matchesHardRule(text: string): string | null {
    for (const r of HARD_RULES) if (r.re.test(text)) return r.reason;
    return null;
}

/**
 * Decide auto-send vs humano. Camada 1 (regras duras) → camada 2 (agente com
 * ferramentas) → camada 3 (gate de citações dentro do runAgent). O modo da
 * propriedade (off/drafts/auto) é aplicado pelo chamador (bot-bridge), como hoje.
 */
export async function decide(ctx: DraftContext): Promise<BotDecision> {
    const hard = matchesHardRule(ctx.guestMessage);
    if (hard) {
        let draft: string | null = null;
        try { draft = await draftReply(ctx); } catch { /* draft é opcional na escalação */ }
        return { action: "needs_human", draft, reason: `hard_rule:${hard}` };
    }

    try {
        const today = new Date().toISOString().slice(0, 10);
        const outcome = await runAgent({
            systemPrompt: `${buildSystemPrompt(ctx)}\n\nToday's date: ${today}.\n${AGENT_OUTPUT_INSTRUCTIONS}`,
            userMessage: ctx.guestMessage,
            history: ctx.history.map((m) => ({
                role: m.role === "guest" ? ("user" as const) : ("assistant" as const),
                content: m.content,
            })),
            tools: buildAgentTools(ctx),
            callModel: buildModelCaller(),
        });
        if (outcome.covered && outcome.reply) {
            return { action: "auto_send", reply: outcome.reply, citation: outcome.citations.join(", ") };
        }
        return { action: "needs_human", draft: outcome.reply, reason: outcome.reason };
    } catch (err) {
        return { action: "needs_human", draft: null, reason: isTransientLlmError(err) ? "llm_transient" : "llm_error" };
    }
}
