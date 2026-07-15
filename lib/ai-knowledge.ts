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
    // HIERARQUIA: os campos estruturados (essenciais + segredos curados à mão na
    // página de memória) são a fonte de verdade. Os factos livres são complementares.
    // Se um facto contradiz um campo estruturado (ex.: duas passwords de wi-fi), o
    // modelo tem de confiar no bloco AUTORITÁRIO. Por isso separamos em dois blocos
    // rotulados em vez de uma lista plana onde o modelo escolheria à sorte.
    const authoritative: string[] = [];
    const supplementary: string[] = [];
    const citations: string[] = [];

    if (k) {
        for (const f of KNOWLEDGE_FIELDS) {
            const v = k[f.key];
            if (typeof v === "string" && v.trim()) {
                const cite = `knowledge.${String(f.key)}`;
                authoritative.push(`[${cite}] ${f.label}: ${v}`);
                citations.push(cite);
            }
        }
    }
    for (const fact of facts) {
        const cite = `fact:${fact.id}`;
        supplementary.push(`[${cite}] ${fact.fact}`);
        citations.push(cite);
    }

    if (!authoritative.length && !supplementary.length) {
        return { text: "No property information is available. Do not state any property-specific detail.", citations: [] };
    }

    const blocks: string[] = [
        "Property information — cite the bracketed key of every fact you use.",
    ];
    if (authoritative.length) {
        blocks.push(
            `AUTHORITATIVE property details (human-curated, always correct — prefer these):\n${authoritative.join("\n")}`,
        );
    }
    if (supplementary.length) {
        blocks.push(
            (authoritative.length
                ? "Supplementary facts (use for details not in the authoritative block; if a fact contradicts an authoritative detail, trust the authoritative one and cite its key):\n"
                : "Facts:\n") + supplementary.join("\n"),
        );
    }
    return { text: blocks.join("\n\n"), citations };
}

/** Campos do checklist do painel do inbox (mesma ordem). */
export type KnowledgeField =
    | "wifiName" | "wifiPassword" | "checkIn" | "checkOut" | "buildingAccess"
    | "apartmentAccess" | "parking" | "emergencyContact" | "houseRules" | "tips";

export const CHECKLIST_FIELDS: KnowledgeField[] = [
    "wifiName", "wifiPassword", "checkIn", "checkOut", "buildingAccess",
    "apartmentAccess", "parking", "emergencyContact", "houseRules", "tips",
];

/** Tópicos válidos de um facto (partilhado entre a action server e o board no cliente). */
export const FACT_TOPICS = ["amenities", "access", "parking", "house_rules", "area", "general"];

/**
 * Segredos estruturados que um facto livre pode CONTRADIZER, com o padrão de texto
 * que os "toca". Aviso curatorial para a página de memória — não bloqueia nada; serve
 * para um humano reconciliar (ex.: password de wi-fi diferente num facto e no segredo).
 * Limitado aos segredos com campo estruturado próprio, para evitar falsos positivos.
 */
const CONFLICT_SECRETS: Array<{ field: keyof PropertyKnowledge; match: RegExp; label: string }> = [
    { field: "wifiPassword", match: /wi-?fi|palavra-passe|password|senha/i, label: "wifi" },
    { field: "wifiName", match: /wi-?fi|rede sem fios|network|ssid/i, label: "wifi" },
    { field: "doorCode", match: /door\s*code|lockbox|cofre|teclado|c[oó]digo\s*(da porta|de entrada|de acesso|do teclado)/i, label: "doorCode" },
];

/**
 * Marcadores de placeholder de template (ex.: manual importado do anúncio com
 * "Wi-Fi Network: [insert] Password: [insert]"). Um slot por preencher não tem
 * valor real, logo não pode contradizer um segredo curado.
 */
const PLACEHOLDER_RE = /\[[^\]]*\]|\{[^}]*\}|<[^>]*>|_{3,}|x{4,}/i;

/**
 * Há uma menção à keyword seguida de um VALOR REAL (não um placeholder de template)?
 * Percorre cada ocorrência da keyword e inspeciona a janela seguinte: se todas as
 * ocorrências são seguidas de um placeholder, não há valor a contradizer.
 */
function keywordHasRealValue(factText: string, keyword: RegExp): boolean {
    const re = new RegExp(keyword.source, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(factText)) !== null) {
        const window = factText.slice(m.index, m.index + 60);
        if (!PLACEHOLDER_RE.test(window)) return true;
        if (m.index === re.lastIndex) re.lastIndex++; // evita loop em match de largura zero
    }
    return false;
}

/**
 * Rótulos dos segredos PREENCHIDOS que este facto parece contradizer (deduplicados).
 * Vazio = sem conflito aparente. Pura, síncrona — usável no cliente.
 * Um facto que só menciona o segredo com placeholders de template (ex.: house
 * manual com "Wi-Fi Network: [insert]") NÃO conta como conflito — não há valor real.
 */
export function detectFactConflicts(
    factText: string,
    k: PropertyKnowledge | null,
): string[] {
    if (!k || !factText.trim()) return [];
    const hits: string[] = [];
    for (const c of CONFLICT_SECRETS) {
        const v = k[c.field];
        if (typeof v === "string" && v.trim() && c.match.test(factText) && keywordHasRealValue(factText, c.match)) {
            hits.push(c.label);
        }
    }
    return [...new Set(hits)];
}

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
