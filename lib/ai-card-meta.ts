// lib/ai-card-meta.ts — meta dos cartões do decision feed. Ficheiro normal (tipos exportáveis).
import { completeText } from "@/lib/ai-messaging";

export type CardMeta = { title: string; summary: string; why: string | null };

/**
 * Fallback heurístico puro — o feed NUNCA depende do LLM para renderizar.
 * Título = as primeiras "frases" (separadas por linha ou por pontuação de fim de frase) que
 * cabem em 44 caracteres, sem cortar a meio de uma frase; se mesmo a primeira já for maior que
 * isso, corta-se a meio com reticências.
 */
export function buildCardFallback(_guestName: string | null, incomingMessage: string): CardMeta {
    const text = (incomingMessage ?? "").trim();
    if (!text) return { title: "Nova mensagem", summary: "Nova mensagem do hóspede.", why: null };

    const sentences = text.split(/\n+|(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
    let title = "";
    for (const s of sentences) {
        const candidate = title ? `${title} ${s}` : s;
        if (candidate.length <= 44) title = candidate;
        else break;
    }
    if (!title) title = `${sentences[0].slice(0, 44)}…`;

    const summary = text.slice(0, 160) || "Nova mensagem do hóspede.";
    return { title, summary, why: null };
}

const SYSTEM = `És o assistente de um backoffice de alojamento local. Recebes a mensagem de um hóspede e o rascunho de resposta preparado. Devolve APENAS JSON válido (sem markdown), em PORTUGUÊS de Portugal:
{"title":"2 a 4 palavras que identificam o assunto (ex.: Early check-in + Wi-Fi)","summary":"1-2 frases: o que o hóspede quer e o que o rascunho propõe","why":"1 frase curta: porque é que responder a isto importa"}`;

/** Chamada LLM leve pós-decisão. NUNCA lança — null em qualquer falha (o chamador usa o fallback). */
export async function generateCardMeta(input: {
    guestMessage: string; draft: string | null; guestName: string | null; propertyName: string | null;
}): Promise<CardMeta | null> {
    try {
        const user = [
            `Hóspede: ${input.guestName ?? "?"} · Propriedade: ${input.propertyName ?? "?"}`,
            `Mensagem do hóspede:\n${input.guestMessage}`,
            input.draft ? `Rascunho preparado:\n${input.draft}` : "Sem rascunho (escalado para humano).",
        ].join("\n\n");
        const raw = await completeText(SYSTEM, user);
        const jsonStr = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
        const parsed = JSON.parse(jsonStr) as Partial<CardMeta>;
        if (typeof parsed.title !== "string" || typeof parsed.summary !== "string") return null;
        return {
            title: parsed.title.trim().slice(0, 60),
            summary: parsed.summary.trim().slice(0, 220),
            why: typeof parsed.why === "string" && parsed.why.trim() ? parsed.why.trim().slice(0, 160) : null,
        };
    } catch {
        return null;
    }
}
