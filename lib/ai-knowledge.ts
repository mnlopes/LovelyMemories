import { getSupabaseAdmin } from "@/lib/supabase";
import type { PropertyKnowledge } from "@/lib/ai-messaging";

/**
 * Camada 3 do knowledge: factos livres por propriedade (ai_property_fact).
 * A formatação anexa a CHAVE DE CITAÇÃO a cada facto — o gate (lib/ai-agent.ts)
 * só aceita citações que existam nas chaves realmente fornecidas ao modelo.
 */

export interface PropertyFact {
    id: string;
    topic: string;
    fact: string;
    source: string;
    status?: string;
}

/** Factos ativos da propriedade. Fail-soft: erro → lista vazia. */
export async function loadPropertyFacts(externalPropertyId: string): Promise<PropertyFact[]> {
    try {
        const supabase = await getSupabaseAdmin();
        const { data } = await supabase
            .from("ai_property_fact")
            .select("id, topic, fact, source")
            .eq("external_property_id", externalPropertyId)
            .eq("status", "active")
            .order("created_at", { ascending: true })
            .limit(100);
        return (data ?? []) as PropertyFact[];
    } catch {
        return [];
    }
}

/** Os campos de PropertyKnowledge expostos ao agente, com a sua chave de citação. */
const KNOWLEDGE_FIELDS: Array<{ key: keyof PropertyKnowledge; label: string }> = [
    { key: "listingName", label: "Property" },
    { key: "address", label: "Address" },
    { key: "checkIn", label: "Check-in" },
    { key: "checkOut", label: "Check-out" },
    { key: "wifiName", label: "Wi-Fi network" },
    { key: "wifiPassword", label: "Wi-Fi password" },
    { key: "doorCode", label: "Door code" },
    { key: "buildingAccess", label: "Building access" },
    { key: "apartmentAccess", label: "Apartment access" },
    { key: "parking", label: "Parking" },
    { key: "houseRules", label: "House rules" },
    { key: "amenities", label: "Amenities available" },
    { key: "emergencyContact", label: "Emergency contact" },
    { key: "govFormUrl", label: "Mandatory pre-arrival government (SEF) form" },
    { key: "guidebookUrl", label: "Guidebook" },
    { key: "tips", label: "Local tips" },
];

/**
 * Junta camadas 1+2 (PropertyKnowledge: site + extras) e camada 3 (factos) num
 * bloco de texto onde CADA linha tem a sua chave de citação. Devolve também o
 * conjunto de chaves válidas (para o gate).
 */
export function formatKnowledgeWithCitations(
    k: PropertyKnowledge | null,
    facts: PropertyFact[],
): { text: string; citations: string[] } {
    const lines: string[] = [];
    const citations: string[] = [];

    if (k) {
        for (const f of KNOWLEDGE_FIELDS) {
            const v = k[f.key];
            if (typeof v === "string" && v.trim()) {
                const cite = `knowledge.${String(f.key)}`;
                lines.push(`[${cite}] ${f.label}: ${v}`);
                citations.push(cite);
            }
        }
    }
    for (const fact of facts) {
        const cite = `fact:${fact.id}`;
        lines.push(`[${cite}] ${fact.fact}`);
        citations.push(cite);
    }

    if (!lines.length) {
        return { text: "No property information is available. Do not state any property-specific detail.", citations: [] };
    }
    return {
        text: `Property information — cite the bracketed key of every fact you use:\n${lines.join("\n")}`,
        citations,
    };
}

/** Campos do checklist do painel do inbox (mesma ordem). */
export type KnowledgeField =
    | "wifiName" | "wifiPassword" | "checkIn" | "checkOut" | "buildingAccess"
    | "apartmentAccess" | "parking" | "emergencyContact" | "houseRules" | "tips";

export const CHECKLIST_FIELDS: KnowledgeField[] = [
    "wifiName", "wifiPassword", "checkIn", "checkOut", "buildingAccess",
    "apartmentAccess", "parking", "emergencyContact", "houseRules", "tips",
];

/** Que campos do checklist um facto de cada topic cobre. */
const TOPIC_COVERS: Record<string, KnowledgeField[]> = {
    access: ["buildingAccess", "apartmentAccess"],
    parking: ["parking"],
    house_rules: ["houseRules"],
    // amenities/area/general não mapeiam um campo fixo do checklist.
};

/**
 * Para cada campo do checklist, true se o campo estruturado estiver preenchido
 * OU um facto ACTIVE cobrir o seu topic. Corrige o painel que antes ignorava
 * a camada 3 (factos) e mostrava "missing" o que o bot já sabia.
 */
export function computeCoverage(
    k: PropertyKnowledge | null,
    facts: { topic: string; status: string }[],
): Record<KnowledgeField, boolean> {
    const covered = {} as Record<KnowledgeField, boolean>;
    for (const f of CHECKLIST_FIELDS) {
        const v = k ? k[f as keyof PropertyKnowledge] : null;
        covered[f] = !!(v && String(v).trim());
    }
    for (const fact of facts) {
        if (fact.status !== "active") continue;
        for (const field of TOPIC_COVERS[fact.topic] ?? []) covered[field] = true;
    }
    return covered;
}
