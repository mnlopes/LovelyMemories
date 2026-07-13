import { DraftContext, draftReply, isTransientLlmError } from "@/lib/ai-messaging";

export type BotDecision =
    | { action: "auto_send"; reply: string; citation: string }
    | { action: "needs_human"; draft: string | null; reason: string };

/** Regras duras: temas que escalam SEMPRE para humano, sem LLM. Devolve o motivo ou null. */
const HARD_RULES: { reason: string; re: RegExp }[] = [
    { reason: "pricing", re: /pre[çc]o|price|discount|desconto|tarif|rate|cost|custa|valor|payment|pagamento/i },
    { reason: "dates_change", re: /mudar as datas|change (the )?dates|alterar? a reserva|modify (the )?booking|extend (the )?stay|prolongar/i },
    { reason: "availability", re: /disponibilidade|availab|vagas?|free on|livre em/i },
    { reason: "complaint", re: /n[aã]o funciona|not working|broken|avariad|inaceit|unacceptable|complain|reclama|problema com|issue with|dirty|sujo/i },
    { reason: "refund_cancel", re: /refund|reembols|cancel(ar|lation)?|devolu[çc][aã]o/i },
    { reason: "physical_action", re: /early check.?in|check.?in early|late check.?out|check.?out late|check.?in (cedo|antecipado)|deixar (as )?malas|luggage|bags? (before|early)|bagagem/i },
];

export function matchesHardRule(text: string): string | null {
    for (const r of HARD_RULES) if (r.re.test(text)) return r.reason;
    return null;
}

/**
 * Decide auto-send vs humano. O LLM responde em JSON estruturado; só há auto_send quando
 * `covered=true` E existe citação de knowledge. Qualquer dúvida/erro → needs_human.
 */
export async function decide(ctx: DraftContext): Promise<BotDecision> {
    const hard = matchesHardRule(ctx.guestMessage);
    if (hard) {
        let draft: string | null = null;
        try { draft = await draftReply(ctx); } catch { /* draft é opcional na escalação */ }
        return { action: "needs_human", draft, reason: `hard_rule:${hard}` };
    }
    try {
        const raw = await draftReply({
            ...ctx,
            decisionMode: true,
        });
        const parsed = JSON.parse(raw.replace(/^```json?\s*|```\s*$/g, "")) as {
            covered: boolean; citation?: string; reply?: string;
        };
        if (parsed.covered && parsed.citation && parsed.reply) {
            return { action: "auto_send", reply: parsed.reply, citation: parsed.citation };
        }
        return { action: "needs_human", draft: parsed.reply ?? null, reason: "not_covered" };
    } catch (err) {
        return { action: "needs_human", draft: null, reason: isTransientLlmError(err) ? "llm_transient" : "llm_error" };
    }
}
