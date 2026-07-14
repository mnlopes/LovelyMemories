import type { AgentTool } from "@/lib/ai-agent";
import type { DraftContext } from "@/lib/ai-messaging";
import { getRoomCalendar, summariseCalendar } from "@/lib/beds24/calendar";
import { loadPropertyFacts, formatKnowledgeWithCitations } from "@/lib/ai-knowledge";

/**
 * Constrói as ferramentas do agente LIGADAS à propriedade da conversa.
 * Isolamento por propriedade (invariante do spec): os ids vêm do ctx, nunca do modelo.
 */
export function buildAgentTools(ctx: DraftContext): AgentTool[] {
    const tools: AgentTool[] = [];

    tools.push({
        name: "getKnowledge",
        description: "Returns this property's verified facts: check-in/out, wifi, access, parking, house rules, amenities, learned facts. Call before answering any property question.",
        parameters: { type: "object", properties: {} },
        execute: async () => {
            const facts = ctx.property?.externalPropertyId
                ? await loadPropertyFacts(ctx.property.externalPropertyId)
                : [];
            const knowledge = formatKnowledgeWithCitations(ctx.property, facts);
            return { content: knowledge.text, citations: knowledge.citations };
        },
    });

    const roomId = ctx.property?.beds24RoomId ?? null;
    if (roomId) {
        tools.push({
            name: "getCalendar",
            description: "Returns REAL availability and nightly prices for this property for a date range. The ONLY valid source for prices/availability/minimum stay. Dates are YYYY-MM-DD; checkOut is the departure day (exclusive night).",
            parameters: {
                type: "object",
                properties: {
                    checkIn: { type: "string", description: "First night, YYYY-MM-DD" },
                    checkOut: { type: "string", description: "Checkout day, YYYY-MM-DD" },
                },
                required: ["checkIn", "checkOut"],
            },
            execute: async (args) => {
                const checkIn = String(args.checkIn ?? "");
                const checkOut = String(args.checkOut ?? "");
                if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) {
                    return { content: "Error: invalid dates. Use YYYY-MM-DD.", citations: [] };
                }
                const days = await getRoomCalendar(roomId, checkIn, checkOut);
                const s = summariseCalendar(days, checkIn, checkOut);
                // A citação só entra no universo válido se HÁ dados (sem dados → sem citação → gate escala).
                // A chave vai embutida no texto ([calendar:…]) — tal como as linhas de knowledge —
                // senão o modelo inventa uma chave a partir do nome da ferramenta.
                if (!days.length) return { content: s.text, citations: [] };
                return { content: `[${s.citation}] ${s.text}`, citations: [s.citation] };
            },
        });
    }

    return tools;
}
