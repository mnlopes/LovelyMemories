import { getSupabaseAdmin } from "@/lib/supabase";
import type { ModelCaller } from "@/lib/ai-agent";
import { buildModelCaller } from "@/lib/ai-agent-providers";

/**
 * Learning loop (camada 4 do spec 2026-07-14-scalable-guest-agent-design.md):
 * quando o bot escalou e um humano respondeu (backoffice OU Airbnb — ambos
 * chegam cá), extrai um facto candidato e grava-o como 'pending' para
 * aprovação no backoffice (BotSettings). NUNCA lança.
 *
 * Guardas anti-lixo:
 *  - só corre quando existe uma escalação recente em aberto (needs_human/hard_rule,
 *    ≤7 dias) — é o par pergunta↔resposta; as mensagens agendadas do Airbnb
 *    (Booking Confirmation/Check-in/Follow Up/Farewell) raramente coincidem com
 *    uma escalação pendente, e o extrator rejeita conteúdo não-factual.
 *    (Refinar com o marcador/fingerprint da experiência de 17/07 quando existir.)
 *  - o extrator só aceita factos GERAIS e reutilizáveis da propriedade — nunca
 *    respostas situacionais desta reserva.
 */

const EXTRACT_PROMPT = `You review a Q&A between a vacation-rental guest and the human host.
Decide if the host's answer contains a GENERAL, REUSABLE fact about the PROPERTY itself —
something that would be true for future guests too (amenities, access, parking, rules, area info).
Situational answers about THIS booking only (e.g. "yes, today that's fine", "we'll check", dates,
prices, discounts) are NOT facts.
Respond with ONLY one JSON object, no fences:
{"has_fact": boolean, "topic": "amenities"|"access"|"parking"|"house_rules"|"area"|"general", "fact": string}
"fact" must be a single self-contained sentence in the language the host used.`;

const TOPICS = ["amenities", "access", "parking", "house_rules", "area", "general"];

export async function extractFactCandidate(
    question: string,
    answer: string,
    callModel: ModelCaller = buildModelCaller(),
): Promise<{ topic: string; fact: string } | null> {
    if (answer.trim().length < 15) return null;
    try {
        const turn = await callModel([
            { role: "system", content: EXTRACT_PROMPT },
            { role: "user", content: `Guest question: ${question}\nHost answer: ${answer}` },
        ], []);
        if (turn.type !== "text") return null;
        const cleaned = turn.text.replace(/^```json?\s*|```\s*$/g, "").trim();
        const parsed = JSON.parse(cleaned) as { has_fact?: boolean; topic?: string; fact?: string };
        if (parsed.has_fact !== true || !parsed.fact?.trim()) return null;
        return { topic: TOPICS.includes(parsed.topic ?? "") ? parsed.topic! : "general", fact: parsed.fact.trim() };
    } catch {
        return null;
    }
}

export async function captureLearning(input: {
    reservationId: string;
    externalPropertyId: string | null;
    humanAnswer: string;
    /**
     * Pergunta escalada, quando o chamador já a conhece (sendReply tem o draft row).
     * Sem ela, procura-se a escalação em aberto mais recente da conversa.
     */
    question?: string;
}): Promise<void> {
    try {
        if (!input.externalPropertyId) return;
        const supabase = await getSupabaseAdmin();

        let question = input.question ?? null;
        if (!question) {
            // Par: a escalação em aberto mais recente desta conversa (≤7 dias)
            const { data: esc } = await supabase
                .from("ai_message_log")
                .select("id, incoming_message")
                .eq("reservation_ref", input.reservationId)
                .eq("status", "draft")
                .in("decision", ["needs_human", "hard_rule"])
                .gte("created_at", new Date(Date.now() - 7 * 24 * 3600_000).toISOString())
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
            question = esc?.incoming_message ?? null;
        }
        if (!question) return;

        const candidate = await extractFactCandidate(question, input.humanAnswer);
        if (!candidate) return;

        await supabase.from("ai_property_fact").insert({
            external_property_id: input.externalPropertyId,
            topic: candidate.topic,
            fact: candidate.fact,
            source: "learned",
            status: "pending",
            learned_from: input.reservationId,
        });
    } catch (e) {
        console.error("[ai-learning] capture failed:", e);
    }
}
