# Página de gestão de memória por propriedade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar à equipa (só super_admin) um ecrã para ligar cada propriedade Beds24 ao site, preencher os segredos que a API não dá, e curar factos livres — matando os "missing" do painel do inbox.

**Architecture:** Sub-página cheia dentro de `admin/activity` (`.../memory`), guardada a super_admin. Reutiliza a canalização existente em `app/actions/ai-inbox.ts` (`listLinkedProperties`, `upsertPropertyExtras`, `getPropertyLinkSuggestions`, `savePropertyLinks`, `reviewFact`) e acrescenta CRUD de factos por propriedade. Corrige o checklist do `ContextPanel` para contar factos ativos.

**Tech Stack:** Next.js 16 App Router, React client components, next-intl, Supabase (service-role via `getSupabaseAdmin`), Tailwind. Sem novas dependências.

## Global Constraints

- **Sem migração de BD.** O schema `ai_property_fact` e `property_ai_extras` já serve. Não criar ficheiros em `supabase/migrations/`.
- **Acesso = super_admin apenas.** Todas as ações novas usam `assertAdmin()` (já força `INBOX_ROLES = ['super_admin']`). O botão/entrada no inbox só aparece a super_admin. Nunca confiar só no UI — a guarda server-side é a real.
- **i18n em paridade:** qualquer string nova entra em `messages/en.json`, `messages/pt.json` e `messages/he.json` com as MESMAS chaves. `defaultLocale` continua `'en'`.
- **Verificação (não há suite de testes unitários):** `npx tsc --noEmit` é a verificação principal. Lógica pura verifica-se com um script `scripts/test-*.ts` corrido por `npx tsx` (estilo `scripts/test-ai-knowledge.ts`: helper `t(name, cond)`, `process.exit(failed?1:0)`). UI verifica-se com `npm run build` + E2E manual. `scripts/` está fora do `tsconfig`.
- **Usar os wrappers `Link`/`useRouter` de `i18n/routing.ts`**, nunca os de `next/navigation`.
- **Idioma do código/comentários/UI copy:** seguir o existente — comentários e UI em PT no inbox; chaves i18n em inglês.
- Commits frequentes, um por task. Mensagens terminam com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

### Task 1: CRUD de factos por propriedade (server actions)

Acrescenta as ações que faltam para gerir `ai_property_fact` de uma propriedade. Reutiliza `assertAdmin` (super_admin) e `getSupabaseAdmin`.

**Files:**
- Modify: `app/actions/ai-inbox.ts` (acrescentar no fim da secção de factos, a seguir a `reviewFact`, ~linha 544)
- Test: `scripts/test-fact-crud.ts` (novo)

**Interfaces:**
- Consumes: `assertAdmin()`, `getSupabaseAdmin()` (já no ficheiro).
- Produces:
  - `interface PropertyFactRow { id: string; topic: string; fact: string; source: string; status: string; learnedFrom: string | null; createdAt: string }`
  - `listFactsForProperty(externalPropertyId: string): Promise<PropertyFactRow[]>` — active + pending desta propriedade, mais recentes primeiro.
  - `createFact(input: { externalPropertyId: string; topic: string; fact: string }): Promise<{ ok: boolean; error?: string }>`
  - `updateFact(input: { id: string; topic?: string; fact?: string }): Promise<{ ok: boolean; error?: string }>`
  - `setFactStatus(id: string, status: 'active' | 'rejected'): Promise<{ ok: boolean; error?: string }>`
  - `deleteFact(id: string): Promise<{ ok: boolean; error?: string }>`

- [ ] **Step 1: Escrever as ações**

Acrescentar em `app/actions/ai-inbox.ts` (a seguir a `reviewFact`):

```typescript
// ── CRUD de factos por propriedade (gestão de memória) ────────────────────────

export interface PropertyFactRow {
    id: string;
    topic: string;
    fact: string;
    source: string;
    status: string;
    learnedFrom: string | null;
    createdAt: string;
}

const FACT_TOPICS = ['amenities', 'access', 'parking', 'house_rules', 'area', 'general'];

/** Factos active + pending de uma propriedade (para o ecrã de gestão). */
export async function listFactsForProperty(externalPropertyId: string): Promise<PropertyFactRow[]> {
    await assertAdmin();
    try {
        const admin = await getSupabaseAdmin();
        const { data } = await admin
            .from('ai_property_fact')
            .select('id, topic, fact, source, status, learned_from, created_at')
            .eq('external_property_id', externalPropertyId)
            .in('status', ['active', 'pending'])
            .order('created_at', { ascending: false })
            .limit(200);
        return ((data ?? []) as Record<string, unknown>[]).map((f) => ({
            id: f.id as string,
            topic: f.topic as string,
            fact: f.fact as string,
            source: f.source as string,
            status: f.status as string,
            learnedFrom: (f.learned_from as string) ?? null,
            createdAt: f.created_at as string,
        }));
    } catch {
        return [];
    }
}

export async function createFact(input: { externalPropertyId: string; topic: string; fact: string }): Promise<{ ok: boolean; error?: string }> {
    await assertAdmin();
    const fact = input.fact.trim();
    if (!fact) return { ok: false, error: 'Empty fact' };
    const topic = FACT_TOPICS.includes(input.topic) ? input.topic : 'general';
    try {
        const admin = await getSupabaseAdmin();
        const { error } = await admin.from('ai_property_fact').insert({
            external_property_id: input.externalPropertyId,
            topic, fact, source: 'manual', status: 'active',
        });
        if (error) throw error;
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Create failed' };
    }
}

export async function updateFact(input: { id: string; topic?: string; fact?: string }): Promise<{ ok: boolean; error?: string }> {
    await assertAdmin();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.fact !== undefined) {
        const f = input.fact.trim();
        if (!f) return { ok: false, error: 'Empty fact' };
        patch.fact = f;
    }
    if (input.topic !== undefined) patch.topic = FACT_TOPICS.includes(input.topic) ? input.topic : 'general';
    try {
        const admin = await getSupabaseAdmin();
        const { error } = await admin.from('ai_property_fact').update(patch).eq('id', input.id);
        if (error) throw error;
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
    }
}

export async function setFactStatus(id: string, status: 'active' | 'rejected'): Promise<{ ok: boolean; error?: string }> {
    await assertAdmin();
    try {
        const admin = await getSupabaseAdmin();
        const { error } = await admin.from('ai_property_fact')
            .update({ status, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
    }
}

export async function deleteFact(id: string): Promise<{ ok: boolean; error?: string }> {
    await assertAdmin();
    try {
        const admin = await getSupabaseAdmin();
        const { error } = await admin.from('ai_property_fact').delete().eq('id', id);
        if (error) throw error;
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' };
    }
}
```

- [ ] **Step 2: Escrever o script de smoke (round-trip real na BD)**

`scripts/test-fact-crud.ts` — usa a propriedade cobaia (Virtudes One, external id `341090`), faz create→list→update→delete sem deixar lixo. Nota: as ações têm `assertAdmin` (cookies) e NÃO correm fora do Next; por isso o script fala direto com a BD via as MESMAS queries, validando o schema/round-trip.

```typescript
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { getSupabaseAdmin } from "../lib/supabase";

let failed = 0;
const t = (name: string, cond: boolean) => { if (!cond) { failed++; console.error("FAIL:", name); } else console.log("ok:", name); };

async function main() {
    const admin = await getSupabaseAdmin();
    const EXT = "341090"; // Virtudes One

    const ins = await admin.from("ai_property_fact")
        .insert({ external_property_id: EXT, topic: "parking", fact: "TEST-CRUD sentinel fact", source: "manual", status: "active" })
        .select("id").single();
    t("insert ok", !ins.error && !!ins.data?.id);
    const id = ins.data!.id as string;

    const list = await admin.from("ai_property_fact")
        .select("id, status").eq("external_property_id", EXT).in("status", ["active", "pending"]);
    t("list inclui o novo", (list.data ?? []).some((r) => r.id === id));

    const upd = await admin.from("ai_property_fact")
        .update({ fact: "TEST-CRUD edited", topic: "general" }).eq("id", id);
    t("update ok", !upd.error);

    const del = await admin.from("ai_property_fact").delete().eq("id", id);
    t("delete ok", !del.error);

    const gone = await admin.from("ai_property_fact").select("id").eq("id", id).maybeSingle();
    t("apagado de facto", !gone.data);

    process.exit(failed ? 1 : 0);
}
main();
```

- [ ] **Step 3: Correr tsc e o script**

Run: `npx tsc --noEmit`
Expected: sem erros.

Run: `npx tsx scripts/test-fact-crud.ts`
Expected: todas as linhas `ok:`, exit 0. (Requer `.env.local` com service role — igual aos outros scripts.)

- [ ] **Step 4: Commit**

```bash
git add app/actions/ai-inbox.ts scripts/test-fact-crud.ts
git commit -m "feat(ai-memory): CRUD de factos por propriedade (server actions)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Cobertura do checklist por factos (lógica pura)

Função pura que decide, para cada campo do checklist, se está coberto por um campo estruturado OU por um facto ativo cujo `topic` mapeia esse campo. Vive em `lib/ai-knowledge.ts` (perto do knowledge). É a base do fix do `ContextPanel` (Task 3).

**Files:**
- Modify: `lib/ai-knowledge.ts` (acrescentar no fim)
- Test: `scripts/test-knowledge-coverage.ts` (novo)

**Interfaces:**
- Consumes: `PropertyKnowledge` (de `lib/ai-messaging`), `PropertyFact` (deste ficheiro).
- Produces:
  - `type KnowledgeField = 'wifiName' | 'wifiPassword' | 'checkIn' | 'checkOut' | 'buildingAccess' | 'apartmentAccess' | 'parking' | 'emergencyContact' | 'houseRules' | 'tips'`
  - `const CHECKLIST_FIELDS: KnowledgeField[]` — a ordem do painel.
  - `computeCoverage(k: PropertyKnowledge | null, facts: Pick<PropertyFact, 'topic' | 'status'>[]): Record<KnowledgeField, boolean>` — true se o campo estiver preenchido OU um facto `active` cobrir o topic mapeado.

- [ ] **Step 1: Escrever o teste primeiro**

`scripts/test-knowledge-coverage.ts`:

```typescript
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { computeCoverage, CHECKLIST_FIELDS } from "../lib/ai-knowledge";
import type { PropertyKnowledge } from "../lib/ai-messaging";

let failed = 0;
const t = (name: string, cond: boolean) => { if (!cond) { failed++; console.error("FAIL:", name); } else console.log("ok:", name); };

t("tem 10 campos", CHECKLIST_FIELDS.length === 10);

// Campo estruturado preenchido → coberto
const k1: PropertyKnowledge = { wifiName: "root-wifi", checkIn: "15:00" };
const c1 = computeCoverage(k1, []);
t("wifiName preenchido", c1.wifiName === true);
t("checkIn preenchido", c1.checkIn === true);
t("wifiPassword vazio", c1.wifiPassword === false);

// Facto ativo de access cobre building/apartmentAccess
const c2 = computeCoverage(null, [{ topic: "access", status: "active" }]);
t("access facto cobre buildingAccess", c2.buildingAccess === true);
t("access facto cobre apartmentAccess", c2.apartmentAccess === true);
t("access facto NÃO cobre wifi", c2.wifiPassword === false);

// Facto PENDING não cobre
const c3 = computeCoverage(null, [{ topic: "parking", status: "pending" }]);
t("facto pending não cobre", c3.parking === false);

// house_rules por facto
const c4 = computeCoverage(null, [{ topic: "house_rules", status: "active" }]);
t("house_rules facto cobre houseRules", c4.houseRules === true);

process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Correr o teste e ver falhar**

Run: `npx tsx scripts/test-knowledge-coverage.ts`
Expected: FAIL — `computeCoverage`/`CHECKLIST_FIELDS` não existem (erro de import/execução).

- [ ] **Step 3: Implementar a lógica**

Acrescentar no fim de `lib/ai-knowledge.ts`:

```typescript
import type { PropertyKnowledge } from "@/lib/ai-messaging";

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
    facts: Pick<PropertyFact, "topic" | "status">[],
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
```

- [ ] **Step 4: Correr o teste e ver passar**

Run: `npx tsx scripts/test-knowledge-coverage.ts`
Expected: todas `ok:`, exit 0.

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add lib/ai-knowledge.ts scripts/test-knowledge-coverage.ts
git commit -m "feat(ai-memory): cobertura do checklist por factos ativos (lógica pura)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Fix do checklist + botão \"Gerir memória\" no ContextPanel

O painel passa a marcar ✓ quando o campo está preenchido OU um facto ativo o cobre, e ganha um botão para abrir a página de memória (só super_admin).

**Files:**
- Modify: `components/admin/inbox/ContextPanel.tsx`
- Modify: `app/actions/ai-inbox.ts` (ação leve para o painel — factos + flag super_admin)
- Modify: `messages/{en,pt,he}.json` (2 chaves em `AiInbox`)

**Interfaces:**
- Consumes: `computeCoverage`, `CHECKLIST_FIELDS` (Task 2); `getKnowledgeForProperty` (existente); `listFactsForProperty` (Task 1).
- Produces: `getPanelExtras(externalPropertyId: string): Promise<{ facts: { topic: string; status: string }[]; isSuperAdmin: boolean }>`

- [ ] **Step 1: Ação leve para o painel**

Acrescentar em `app/actions/ai-inbox.ts`:

```typescript
/** Dados extra para o ContextPanel: factos (p/ cobertura) + se pode gerir memória. */
export async function getPanelExtras(externalPropertyId: string): Promise<{ facts: { topic: string; status: string }[]; isSuperAdmin: boolean }> {
    await assertAdmin(); // super_admin apenas (INBOX_ROLES)
    try {
        const admin = await getSupabaseAdmin();
        const { data } = await admin.from('ai_property_fact')
            .select('topic, status').eq('external_property_id', externalPropertyId);
        return { facts: (data ?? []) as { topic: string; status: string }[], isSuperAdmin: true };
    } catch {
        return { facts: [], isSuperAdmin: true };
    }
}
```

(Nota: só super_admin passa a `assertAdmin`; se lançasse, o painel não renderiza — por isso devolvemos `isSuperAdmin: true` só no caminho autorizado. O botão fica visível porque quem vê o inbox já é super_admin.)

- [ ] **Step 2: Atualizar o ContextPanel**

Em `components/admin/inbox/ContextPanel.tsx`, substituir o array local `KNOWLEDGE_FIELDS` e a secção Knowledge. Trocar o import do topo e a lógica:

```typescript
import { CalendarDays, Check, CircleAlert, Users, Brain } from "lucide-react";
import { Link } from "@/i18n/routing";
import {
    getKnowledgeForProperty, getPanelExtras, setConversationBot,
    type InboxConversation, type ThreadData,
} from "@/app/actions/ai-inbox";
import { computeCoverage, CHECKLIST_FIELDS } from "@/lib/ai-knowledge";
```

Acrescentar estado e carregamento dos factos, a par do `knowledge`:

```typescript
const [facts, setFacts] = useState<{ topic: string; status: string }[]>([]);
// ... dentro do useEffect que já carrega knowledge, em paralelo:
if (props.conversation.externalPropertyId) {
    void getPanelExtras(props.conversation.externalPropertyId)
        .then((x) => { if (alive) setFacts(x.facts); })
        .catch(() => { if (alive) setFacts([]); });
}
```

Substituir o `<ul>` do checklist para usar a cobertura:

```tsx
) : (() => {
    const coverage = computeCoverage(knowledge, facts);
    return (
        <ul className="space-y-1">
            {CHECKLIST_FIELDS.map((f) => {
                const filled = coverage[f];
                return (
                    <li key={f} className="flex items-center gap-2 text-xs">
                        {filled ? (
                            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                            <CircleAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                        )}
                        <span className={cn(filled ? "text-[#525252] dark:text-white/70" : "text-[#a3a3a3]")}>
                            {f}{!filled && ` — ${t("knowledgeMissing")}`}
                        </span>
                    </li>
                );
            })}
        </ul>
    );
})()}
```

Acrescentar o botão "Gerir memória" no fim da secção Knowledge (dentro do card, depois do `<ul>`), só quando há propriedade:

```tsx
{props.conversation.externalPropertyId && (
    <Link
        href={`/admin/activity/memory?property=${props.conversation.externalPropertyId}`}
        className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-[#e5e5e5] py-1.5 text-xs font-medium text-[#525252] transition-colors hover:bg-[#fafafa] dark:border-admin-dark-border dark:text-white/70 dark:hover:bg-white/5"
    >
        <Brain className="h-3.5 w-3.5" /> {t("manageMemory")}
    </Link>
)}
```

- [ ] **Step 3: i18n — 1 chave nova em `AiInbox`**

Em cada `messages/{en,pt,he}.json`, no namespace `AiInbox`, acrescentar (`knowledgeMissing` já existe):
- en: `"manageMemory": "Manage memory"`
- pt: `"manageMemory": "Gerir memória"`
- he: `"manageMemory": "ניהול זיכרון"`

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit`
Expected: sem erros.

Run: `node -e "for (const l of ['en','pt','he']) { const j=require('./messages/'+l+'.json'); if(!j.AiInbox.manageMemory) { console.error('falta em',l); process.exit(1);} } console.log('i18n ok')"`
Expected: `i18n ok`.

- [ ] **Step 5: Commit**

```bash
git add components/admin/inbox/ContextPanel.tsx app/actions/ai-inbox.ts messages/en.json messages/pt.json messages/he.json
git commit -m "feat(ai-memory): checklist do inbox conta factos + botão Gerir memória

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Página de memória (rota, guarda, seletor de propriedade)

Sub-página `admin/activity/memory` guardada a super_admin, com seletor das 6 propriedades e deep-link `?property=<beds24Id>`. As secções (link/essenciais/factos) entram nas Tasks 5–7; aqui fica o shell + carregamento da propriedade selecionada.

**Files:**
- Create: `app/[locale]/admin/activity/memory/layout.tsx`
- Create: `app/[locale]/admin/activity/memory/page.tsx`
- Create: `components/admin/memory/PropertyMemoryManager.tsx`
- Modify: `app/actions/ai-inbox.ts` (loader agregado da propriedade)
- Modify: `messages/{en,pt,he}.json` (namespace novo `AiMemory`)

**Interfaces:**
- Consumes: `guardRoles` (`lib/admin-guard.ts`), `getPropertyLinkSuggestions` (existente), `listLinkedProperties` (existente), `listFactsForProperty` (Task 1).
- Produces:
  - `interface MemoryProperty { beds24PropertyId: number; name: string; internalPropertyId: string | null; knowledge: PropertyKnowledge | null; facts: PropertyFactRow[] }`
  - `getMemoryForProperty(beds24PropertyId: number): Promise<MemoryProperty>`
  - `listMemoryProperties(): Promise<{ beds24PropertyId: number; name: string; linked: boolean }[]>`

- [ ] **Step 1: Loaders agregados**

Acrescentar em `app/actions/ai-inbox.ts`:

```typescript
// ── Gestão de memória (página) ────────────────────────────────────────────────

export interface MemoryPropertyItem { beds24PropertyId: number; name: string; linked: boolean }

export async function listMemoryProperties(): Promise<MemoryPropertyItem[]> {
    await assertAdmin();
    const admin = await getSupabaseAdmin();
    const { data } = await admin.from('beds24_properties')
        .select('beds24_property_id, name, internal_property_id').order('name');
    return ((data ?? []) as { beds24_property_id: number; name: string; internal_property_id: string | null }[])
        .map((p) => ({ beds24PropertyId: p.beds24_property_id, name: p.name, linked: !!p.internal_property_id }));
}

export interface MemoryProperty {
    beds24PropertyId: number;
    name: string;
    internalPropertyId: string | null;
    knowledge: PropertyKnowledge | null;
    facts: PropertyFactRow[];
}

export async function getMemoryForProperty(beds24PropertyId: number): Promise<MemoryProperty> {
    await assertAdmin();
    const admin = await getSupabaseAdmin();
    const { data: prop } = await admin.from('beds24_properties')
        .select('beds24_property_id, name, internal_property_id')
        .eq('beds24_property_id', beds24PropertyId).maybeSingle();
    const p = prop as { name: string; internal_property_id: string | null } | null;
    const [{ loadPropertyKnowledge }, facts] = await Promise.all([
        import('@/lib/ai-messaging'),
        listFactsForProperty(String(beds24PropertyId)),
    ]);
    const knowledge = p?.internal_property_id
        ? await loadPropertyKnowledge(String(beds24PropertyId))
        : null;
    return {
        beds24PropertyId,
        name: p?.name ?? String(beds24PropertyId),
        internalPropertyId: p?.internal_property_id ?? null,
        knowledge,
        facts,
    };
}
```

- [ ] **Step 2: Guarda da rota (super_admin)**

`app/[locale]/admin/activity/memory/layout.tsx`:

```tsx
import { guardRoles } from "@/lib/admin-guard";

export default async function MemoryGuardLayout({
    children, params,
}: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    await guardRoles(["super_admin"], locale);
    return <>{children}</>;
}
```

- [ ] **Step 3: Página (server) → passa a lista + seleção inicial ao manager**

`app/[locale]/admin/activity/memory/page.tsx`:

```tsx
import { listMemoryProperties } from "@/app/actions/ai-inbox";
import { PropertyMemoryManager } from "@/components/admin/memory/PropertyMemoryManager";

export default async function MemoryPage({
    searchParams,
}: { searchParams: Promise<{ property?: string }> }) {
    const { property } = await searchParams;
    const properties = await listMemoryProperties();
    const initial = property && properties.some((p) => String(p.beds24PropertyId) === property)
        ? Number(property)
        : properties[0]?.beds24PropertyId ?? null;
    return <PropertyMemoryManager properties={properties} initialSelected={initial} />;
}
```

- [ ] **Step 4: Manager (client) — seletor + carregamento da propriedade**

`components/admin/memory/PropertyMemoryManager.tsx`:

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { ArrowLeft } from "lucide-react";
import { getMemoryForProperty, type MemoryProperty, type MemoryPropertyItem } from "@/app/actions/ai-inbox";

export function PropertyMemoryManager(props: {
    properties: MemoryPropertyItem[];
    initialSelected: number | null;
}) {
    const t = useTranslations("AiMemory");
    const [selected, setSelected] = useState<number | null>(props.initialSelected);
    const [data, setData] = useState<MemoryProperty | null>(null);
    const [loading, setLoading] = useState(false);

    const reload = useCallback(() => {
        if (selected == null) { setData(null); return; }
        setLoading(true);
        getMemoryForProperty(selected)
            .then(setData)
            .finally(() => setLoading(false));
    }, [selected]);

    useEffect(() => { reload(); }, [reload]);

    return (
        <div className="container max-w-4xl py-6">
            <Link href="/admin/activity" className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#737373] hover:text-[#171717] dark:text-white/50 dark:hover:text-white">
                <ArrowLeft className="h-4 w-4" /> {t("backToInbox")}
            </Link>
            <h1 className="mb-1 text-xl font-semibold text-[#171717] dark:text-admin-dark-text-primary">{t("title")}</h1>
            <p className="mb-5 text-sm text-[#737373] dark:text-white/50">{t("subtitle")}</p>

            <div className="mb-6 flex flex-wrap gap-2">
                {props.properties.map((p) => (
                    <button
                        key={p.beds24PropertyId}
                        onClick={() => setSelected(p.beds24PropertyId)}
                        className={
                            "rounded-full border px-3 py-1.5 text-sm transition-colors " +
                            (selected === p.beds24PropertyId
                                ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                                : "border-[#e5e5e5] text-[#525252] hover:bg-[#fafafa] dark:border-admin-dark-border dark:text-white/70 dark:hover:bg-white/5")
                        }
                    >
                        {p.name}{!p.linked && <span className="ml-1.5 text-[10px] text-amber-500">●</span>}
                    </button>
                ))}
            </div>

            {loading && <p className="text-sm text-[#a3a3a3]">{t("loading")}</p>}
            {!loading && data && (
                <div className="space-y-6">
                    {/* Task 5: <LinkSection /> quando data.internalPropertyId == null */}
                    {/* Task 6: <EssentialsForm /> */}
                    {/* Task 7: <FactsBoard /> */}
                    <pre className="text-xs text-[#a3a3a3]">{data.name} — {data.internalPropertyId ? "linked" : "not linked"} — {data.facts.length} factos</pre>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 5: i18n — namespace `AiMemory` (base)**

Acrescentar o namespace `AiMemory` em cada `messages/{en,pt,he}.json` com estas chaves (as restantes chegam nas Tasks 5–7):

```json
"AiMemory": {
    "title": "Property memory",
    "subtitle": "Link, fill the essentials and curate facts the bot uses to reply.",
    "backToInbox": "Back to inbox",
    "loading": "Loading…"
}
```

pt: `"title":"Memória da propriedade"`, `"subtitle":"Liga, preenche os essenciais e cura os factos que o bot usa para responder."`, `"backToInbox":"Voltar ao inbox"`, `"loading":"A carregar…"`.
he: `"title":"זיכרון הנכס"`, `"subtitle":"קשר, מלא את הפרטים החיוניים ונהל את העובדות שהבוט משתמש בהן."`, `"backToInbox":"חזרה לתיבה"`, `"loading":"טוען…"`.

- [ ] **Step 6: Verificar (tsc, build, i18n parity, guarda)**

Run: `npx tsc --noEmit`
Expected: sem erros.

Run: `npm run build`
Expected: build OK; a rota `/[locale]/admin/activity/memory` aparece no manifest.

Run: `node -e "const a=Object.keys(require('./messages/en.json').AiMemory).sort(),b=Object.keys(require('./messages/pt.json').AiMemory).sort(),c=Object.keys(require('./messages/he.json').AiMemory).sort();const eq=JSON.stringify(a)===JSON.stringify(b)&&JSON.stringify(b)===JSON.stringify(c);console.log(eq?'parity ok':'PARITY FAIL');process.exit(eq?0:1)"`
Expected: `parity ok`.

Verificação manual (dev server, `npm run dev` na porta 3001): como super_admin, `/pt/admin/activity/memory` mostra os chips das 6 e o placeholder; como admin normal → redirect da `guardRoles`.

- [ ] **Step 7: Commit**

```bash
git add "app/[locale]/admin/activity/memory" components/admin/memory app/actions/ai-inbox.ts messages/en.json messages/pt.json messages/he.json
git commit -m "feat(ai-memory): página de memória (rota super_admin + seletor de propriedade)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Secção de ligação Beds24 ↔ site

Quando a propriedade não está ligada (`internalPropertyId == null`), mostra um seletor com a sugestão automática; ao ligar, grava e recarrega para revelar as secções seguintes.

**Files:**
- Create: `components/admin/memory/LinkSection.tsx`
- Modify: `components/admin/memory/PropertyMemoryManager.tsx` (montar a secção)
- Modify: `messages/{en,pt,he}.json` (chaves `link*` em `AiMemory`)

**Interfaces:**
- Consumes: `getPropertyLinkSuggestions` (devolve `{ suggestions, properties }`), `savePropertyLinks` (existente).
- Produces: `<LinkSection beds24PropertyId={number} onLinked={() => void} />`

- [ ] **Step 1: Componente**

`components/admin/memory/LinkSection.tsx`:

```tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link2 } from "lucide-react";
import {
    getPropertyLinkSuggestions, savePropertyLinks,
    type LocalPropertyOption,
} from "@/app/actions/ai-inbox";

export function LinkSection(props: { beds24PropertyId: number; onLinked: () => void }) {
    const t = useTranslations("AiMemory");
    const [options, setOptions] = useState<LocalPropertyOption[]>([]);
    const [choice, setChoice] = useState<string>("");
    const [saving, startSaving] = useTransition();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        void getPropertyLinkSuggestions().then((d) => {
            if (!alive) return;
            setOptions(d.properties);
            const sug = d.suggestions.find((s) => s.beds24PropertyId === props.beds24PropertyId);
            setChoice(sug?.suggestedPropertyId ?? "");
        });
        return () => { alive = false; };
    }, [props.beds24PropertyId]);

    return (
        <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-500/30 dark:bg-amber-500/5">
            <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-[#171717] dark:text-admin-dark-text-primary">
                <Link2 className="h-4 w-4 text-amber-500" /> {t("linkTitle")}
            </h2>
            <p className="mb-3 text-xs text-[#737373] dark:text-white/50">{t("linkHelp")}</p>
            <div className="flex flex-wrap items-center gap-2">
                <select
                    value={choice}
                    onChange={(e) => setChoice(e.target.value)}
                    className="rounded-lg border border-[#e5e5e5] bg-white px-3 py-1.5 text-sm dark:border-admin-dark-border dark:bg-transparent"
                >
                    <option value="">{t("linkPlaceholder")}</option>
                    {options.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
                </select>
                <button
                    disabled={!choice || saving}
                    onClick={() => startSaving(async () => {
                        setError(null);
                        const r = await savePropertyLinks([{ beds24PropertyId: props.beds24PropertyId, propertyId: choice }]);
                        if (r.ok) props.onLinked(); else setError(r.error ?? "error");
                    })}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                >
                    {t("linkButton")}
                </button>
            </div>
            {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        </section>
    );
}
```

- [ ] **Step 2: Montar no manager**

Em `PropertyMemoryManager.tsx`, substituir o bloco de placeholder por:

```tsx
{!data.internalPropertyId ? (
    <LinkSection beds24PropertyId={data.beds24PropertyId} onLinked={reload} />
) : (
    <div className="space-y-6">
        {/* Task 6: <EssentialsForm /> */}
        {/* Task 7: <FactsBoard /> */}
        <pre className="text-xs text-[#a3a3a3]">linked — {data.facts.length} factos</pre>
    </div>
)}
```

E o import: `import { LinkSection } from "./LinkSection";`

- [ ] **Step 3: i18n — chaves `link*`**

Acrescentar a `AiMemory` (en / pt / he):
- `linkTitle`: "Not linked yet" / "Ainda não ligada" / "עדיין לא מקושר"
- `linkHelp`: "Link this Beds24 property to a site listing to fill the essentials." / "Liga esta propriedade Beds24 a uma propriedade do site para preencher os essenciais." / "קשר נכס Beds24 זה לרישום באתר כדי למלא את הפרטים."
- `linkPlaceholder`: "Choose a property…" / "Escolhe uma propriedade…" / "בחר נכס…"
- `linkButton`: "Link" / "Ligar" / "קשר"

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit` → sem erros.
Run: comando de parity da Task 4 Step 6 → `parity ok`.
Manual: numa propriedade não-ligada, o seletor mostra a sugestão; ligar → a secção desaparece e o resto aparece (reload).

- [ ] **Step 5: Commit**

```bash
git add components/admin/memory/LinkSection.tsx components/admin/memory/PropertyMemoryManager.tsx messages/en.json messages/pt.json messages/he.json
git commit -m "feat(ai-memory): secção de ligação Beds24 ao site na página de memória

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Formulário de essenciais (base read-only + segredos editáveis)

Mostra os campos base (read-only, do site) e os segredos editáveis, com ✓/⚠ por campo. Grava via `upsertPropertyExtras`.

**Files:**
- Create: `components/admin/memory/EssentialsForm.tsx`
- Modify: `components/admin/memory/PropertyMemoryManager.tsx`
- Modify: `messages/{en,pt,he}.json` (chaves `essentials*` + labels dos campos)

**Interfaces:**
- Consumes: `upsertPropertyExtras` (existente; `PropertyExtrasInput` com `propertyId` + segredos), `MemoryProperty.knowledge`, `MemoryProperty.internalPropertyId`.
- Produces: `<EssentialsForm internalPropertyId={string} knowledge={PropertyKnowledge | null} onSaved={() => void} />`

- [ ] **Step 1: Componente**

`components/admin/memory/EssentialsForm.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, CircleAlert } from "lucide-react";
import { upsertPropertyExtras } from "@/app/actions/ai-inbox";
import type { PropertyKnowledge } from "@/lib/ai-messaging";

const BASE_FIELDS: (keyof PropertyKnowledge)[] = ["checkIn", "checkOut", "address", "houseRules", "amenities", "parking"];
const SECRET_FIELDS = [
    "wifiName", "wifiPassword", "doorCode", "buildingAccess", "apartmentAccess",
    "emergencyContact", "govFormUrl", "guidebookUrl", "tips", "toneNotes",
] as const;
type SecretField = (typeof SECRET_FIELDS)[number];

export function EssentialsForm(props: {
    internalPropertyId: string;
    knowledge: PropertyKnowledge | null;
    onSaved: () => void;
}) {
    const t = useTranslations("AiMemory");
    const k = props.knowledge;
    const [form, setForm] = useState<Record<SecretField, string>>(() => {
        const init = {} as Record<SecretField, string>;
        for (const f of SECRET_FIELDS) init[f] = (k?.[f] as string) ?? "";
        return init;
    });
    const [saving, startSaving] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const dot = (filled: boolean) => filled
        ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        : <CircleAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" />;

    return (
        <section className="rounded-xl border border-[#f0f0f0] p-4 dark:border-admin-dark-border">
            <h2 className="mb-3 text-sm font-semibold text-[#171717] dark:text-admin-dark-text-primary">{t("essentialsTitle")}</h2>

            {/* Base — read-only */}
            <div className="mb-4">
                <p className="mb-2 text-[11px] uppercase tracking-wide text-[#a3a3a3]">{t("essentialsBase")}</p>
                <ul className="space-y-1.5">
                    {BASE_FIELDS.map((f) => {
                        const v = (k?.[f] as string) ?? "";
                        return (
                            <li key={String(f)} className="flex items-center gap-2 text-xs">
                                {dot(!!v.trim())}
                                <span className="w-28 shrink-0 text-[#737373] dark:text-white/50">{t(`field.${String(f)}`)}</span>
                                <span className="truncate text-[#525252] dark:text-white/70">{v || t("emptyFromSite")}</span>
                            </li>
                        );
                    })}
                </ul>
                <p className="mt-1.5 text-[10px] text-[#a3a3a3]">{t("essentialsBaseNote")}</p>
            </div>

            {/* Segredos — editáveis */}
            <div>
                <p className="mb-2 text-[11px] uppercase tracking-wide text-[#a3a3a3]">{t("essentialsSecrets")}</p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                    {SECRET_FIELDS.map((f) => (
                        <label key={f} className="block text-xs">
                            <span className="mb-1 flex items-center gap-1.5 text-[#737373] dark:text-white/50">
                                {dot(!!form[f].trim())} {t(`field.${f}`)}
                            </span>
                            <input
                                value={form[f]}
                                onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
                                className="w-full rounded-lg border border-[#e5e5e5] bg-white px-2.5 py-1.5 text-sm dark:border-admin-dark-border dark:bg-transparent"
                            />
                        </label>
                    ))}
                </div>
                <div className="mt-3 flex items-center gap-3">
                    <button
                        disabled={saving}
                        onClick={() => startSaving(async () => {
                            setError(null);
                            const r = await upsertPropertyExtras({
                                propertyId: props.internalPropertyId,
                                wifiName: form.wifiName || null,
                                wifiPassword: form.wifiPassword || null,
                                doorCode: form.doorCode || null,
                                buildingAccess: form.buildingAccess || null,
                                apartmentAccess: form.apartmentAccess || null,
                                emergencyContact: form.emergencyContact || null,
                                govFormUrl: form.govFormUrl || null,
                                guidebookUrl: form.guidebookUrl || null,
                                tips: form.tips || null,
                                toneNotes: form.toneNotes || null,
                            });
                            if (r.ok) props.onSaved(); else setError(r.error ?? "error");
                        })}
                        className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                        {t("save")}
                    </button>
                    {error && <span className="text-xs text-red-500">{error}</span>}
                </div>
            </div>
        </section>
    );
}
```

- [ ] **Step 2: Montar no manager** (dentro do ramo `internalPropertyId` presente):

```tsx
<EssentialsForm internalPropertyId={data.internalPropertyId} knowledge={data.knowledge} onSaved={reload} />
```
Import: `import { EssentialsForm } from "./EssentialsForm";`

- [ ] **Step 3: i18n** — acrescentar a `AiMemory`:

`essentialsTitle`/`essentialsBase`/`essentialsSecrets`/`essentialsBaseNote`/`emptyFromSite`/`save` + um sub-objeto `field` com labels para todos os campos usados (`checkIn, checkOut, address, houseRules, amenities, parking, wifiName, wifiPassword, doorCode, buildingAccess, apartmentAccess, emergencyContact, govFormUrl, guidebookUrl, tips, toneNotes`).

en (exemplos): `"essentialsTitle":"Essentials"`, `"essentialsBase":"From the site (read-only)"`, `"essentialsSecrets":"Secrets (fill by hand)"`, `"essentialsBaseNote":"Edit these on the property page of the site."`, `"emptyFromSite":"— (empty on site)"`, `"save":"Save"`, `"field":{"checkIn":"Check-in","checkOut":"Check-out","address":"Address","houseRules":"House rules","amenities":"Amenities","parking":"Parking","wifiName":"Wi-Fi network","wifiPassword":"Wi-Fi password","doorCode":"Door code","buildingAccess":"Building access","apartmentAccess":"Apartment access","emergencyContact":"Emergency contact","govFormUrl":"SEF form URL","guidebookUrl":"Guidebook URL","tips":"Local tips","toneNotes":"Tone notes"}`.

pt: `essentialsTitle`:"Essenciais", `essentialsBase`:"Do site (só leitura)", `essentialsSecrets`:"Segredos (preencher à mão)", `essentialsBaseNote`:"Edita estes na ficha da propriedade do site.", `emptyFromSite`:"— (vazio no site)", `save`:"Guardar"; `field`: {check-in→"Check-in", check-out→"Check-out", address→"Morada", houseRules→"Regras da casa", amenities→"Comodidades", parking→"Estacionamento", wifiName→"Rede Wi-Fi", wifiPassword→"Password Wi-Fi", doorCode→"Código da porta", buildingAccess→"Acesso ao prédio", apartmentAccess→"Acesso ao apartamento", emergencyContact→"Contacto de emergência", govFormUrl→"URL do formulário SEF", guidebookUrl→"URL do guia", tips→"Dicas locais", toneNotes→"Notas de tom"}.

he: traduzir as mesmas chaves (paridade obrigatória; usar termos hebraicos equivalentes).

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit` → sem erros.
Run: parity da Task 4 (mas incluir o sub-objeto `field`):
`node -e "const f=l=>{const o=require('./messages/'+l+'.json').AiMemory;return [...Object.keys(o),...Object.keys(o.field||{}).map(k=>'field.'+k)].sort()};const a=f('en'),b=f('pt'),c=f('he');const eq=JSON.stringify(a)===JSON.stringify(b)&&JSON.stringify(b)===JSON.stringify(c);console.log(eq?'parity ok':'PARITY FAIL');process.exit(eq?0:1)"`
Expected: `parity ok`.
Manual: preencher wifiPassword + doorCode → Guardar → recarregar a página do inbox dessa conversa → os campos passam a ✓.

- [ ] **Step 5: Commit**

```bash
git add components/admin/memory/EssentialsForm.tsx components/admin/memory/PropertyMemoryManager.tsx messages/en.json messages/pt.json messages/he.json
git commit -m "feat(ai-memory): formulário de essenciais (base read-only + segredos editáveis)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Board de factos (CRUD + aprovar/rejeitar pending)

Factos agrupados por tópico; adicionar/editar/ativar-desativar/apagar; os `pending` do learning loop destacados com Aprovar/Rejeitar.

**Files:**
- Create: `components/admin/memory/FactsBoard.tsx`
- Modify: `components/admin/memory/PropertyMemoryManager.tsx`
- Modify: `messages/{en,pt,he}.json` (chaves `facts*` + labels de tópicos)

**Interfaces:**
- Consumes: `createFact`, `updateFact`, `setFactStatus`, `deleteFact`, `reviewFact` (Task 1 + existente); `PropertyFactRow[]`.
- Produces: `<FactsBoard externalPropertyId={string} facts={PropertyFactRow[]} onChanged={() => void} />`

- [ ] **Step 1: Componente**

`components/admin/memory/FactsBoard.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import {
    createFact, updateFact, setFactStatus, deleteFact, reviewFact,
    type PropertyFactRow,
} from "@/app/actions/ai-inbox";

const TOPICS = ["amenities", "access", "parking", "house_rules", "area", "general"];

export function FactsBoard(props: {
    externalPropertyId: string;
    facts: PropertyFactRow[];
    onChanged: () => void;
}) {
    const t = useTranslations("AiMemory");
    const [, startAction] = useTransition();
    const [newTopic, setNewTopic] = useState("general");
    const [newFact, setNewFact] = useState("");
    const [editId, setEditId] = useState<string | null>(null);
    const [editText, setEditText] = useState("");

    const run = (fn: () => Promise<unknown>) => startAction(async () => { await fn(); props.onChanged(); });
    const pending = props.facts.filter((f) => f.status === "pending");
    const active = props.facts.filter((f) => f.status === "active");
    const byTopic = (topic: string) => active.filter((f) => f.topic === topic);

    return (
        <section className="rounded-xl border border-[#f0f0f0] p-4 dark:border-admin-dark-border">
            <h2 className="mb-3 text-sm font-semibold text-[#171717] dark:text-admin-dark-text-primary">{t("factsTitle")}</h2>

            {/* Pending (learning loop) */}
            {pending.length > 0 && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-500/30 dark:bg-amber-500/5">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300">{t("factsPending")}</p>
                    <ul className="space-y-2">
                        {pending.map((f) => (
                            <li key={f.id} className="flex items-start gap-2 text-xs">
                                <span className="flex-1 text-[#525252] dark:text-white/70">
                                    <span className="mr-1.5 rounded bg-white/60 px-1 text-[10px] text-[#737373] dark:bg-white/10">{t(`topic.${f.topic}`)}</span>
                                    {f.fact}
                                </span>
                                <button onClick={() => run(() => reviewFact(f.id, "approve"))} className="rounded p-1 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-500/20" title={t("approve")}><Check className="h-4 w-4" /></button>
                                <button onClick={() => run(() => reviewFact(f.id, "reject"))} className="rounded p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20" title={t("reject")}><X className="h-4 w-4" /></button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Adicionar */}
            <div className="mb-4 flex flex-wrap items-end gap-2">
                <select value={newTopic} onChange={(e) => setNewTopic(e.target.value)} className="rounded-lg border border-[#e5e5e5] bg-white px-2.5 py-1.5 text-sm dark:border-admin-dark-border dark:bg-transparent">
                    {TOPICS.map((tp) => <option key={tp} value={tp}>{t(`topic.${tp}`)}</option>)}
                </select>
                <input value={newFact} onChange={(e) => setNewFact(e.target.value)} placeholder={t("factsAddPlaceholder")} className="min-w-[200px] flex-1 rounded-lg border border-[#e5e5e5] bg-white px-2.5 py-1.5 text-sm dark:border-admin-dark-border dark:bg-transparent" />
                <button disabled={!newFact.trim()} onClick={() => { run(() => createFact({ externalPropertyId: props.externalPropertyId, topic: newTopic, fact: newFact })); setNewFact(""); }} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                    <Plus className="h-4 w-4" /> {t("add")}
                </button>
            </div>

            {/* Ativos por tópico */}
            {TOPICS.map((tp) => {
                const items = byTopic(tp);
                if (!items.length) return null;
                return (
                    <div key={tp} className="mb-3">
                        <p className="mb-1 text-[11px] uppercase tracking-wide text-[#a3a3a3]">{t(`topic.${tp}`)}</p>
                        <ul className="space-y-1.5">
                            {items.map((f) => (
                                <li key={f.id} className="flex items-start gap-2 text-xs">
                                    {editId === f.id ? (
                                        <>
                                            <input value={editText} onChange={(e) => setEditText(e.target.value)} className="flex-1 rounded border border-[#e5e5e5] bg-white px-2 py-1 dark:border-admin-dark-border dark:bg-transparent" />
                                            <button onClick={() => { run(() => updateFact({ id: f.id, fact: editText })); setEditId(null); }} className="rounded p-1 text-emerald-600 hover:bg-emerald-100" title={t("save")}><Check className="h-4 w-4" /></button>
                                            <button onClick={() => setEditId(null)} className="rounded p-1 text-[#737373] hover:bg-[#f0f0f0]" title={t("cancel")}><X className="h-4 w-4" /></button>
                                        </>
                                    ) : (
                                        <>
                                            <span className="flex-1 text-[#525252] dark:text-white/70">{f.fact}{f.source === "learned" && <span className="ml-1.5 text-[10px] text-[#a3a3a3]">({t("learned")})</span>}</span>
                                            <button onClick={() => { setEditId(f.id); setEditText(f.fact); }} className="rounded p-1 text-[#737373] hover:bg-[#f0f0f0] dark:hover:bg-white/10" title={t("edit")}><Pencil className="h-3.5 w-3.5" /></button>
                                            <button onClick={() => run(() => setFactStatus(f.id, "rejected"))} className="rounded p-1 text-[#737373] hover:bg-[#f0f0f0] dark:hover:bg-white/10" title={t("deactivate")}><X className="h-3.5 w-3.5" /></button>
                                            <button onClick={() => run(() => deleteFact(f.id))} className="rounded p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20" title={t("delete")}><Trash2 className="h-3.5 w-3.5" /></button>
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                );
            })}
            {active.length === 0 && pending.length === 0 && <p className="text-xs text-[#a3a3a3]">{t("factsEmpty")}</p>}
        </section>
    );
}
```

- [ ] **Step 2: Montar no manager** (ramo `internalPropertyId` presente, a seguir ao EssentialsForm; substituir o `<pre>`):

```tsx
<FactsBoard externalPropertyId={String(data.beds24PropertyId)} facts={data.facts} onChanged={reload} />
```
Import: `import { FactsBoard } from "./FactsBoard";`

- [ ] **Step 3: i18n** — acrescentar a `AiMemory`:

`factsTitle`,`factsPending`,`factsAddPlaceholder`,`factsEmpty`,`add`,`edit`,`delete`,`deactivate`,`cancel`,`approve`,`reject`,`learned` + sub-objeto `topic` com `{amenities, access, parking, house_rules, area, general}`.

en: `"factsTitle":"Facts"`, `"factsPending":"Suggested by the bot — review"`, `"factsAddPlaceholder":"Add a fact the bot can use…"`, `"factsEmpty":"No facts yet."`, `"add":"Add"`, `"edit":"Edit"`, `"delete":"Delete"`, `"deactivate":"Deactivate"`, `"cancel":"Cancel"`, `"approve":"Approve"`, `"reject":"Reject"`, `"learned":"learned"`, `"topic":{"amenities":"Amenities","access":"Access","parking":"Parking","house_rules":"House rules","area":"Area","general":"General"}`.

pt: `factsTitle`:"Factos", `factsPending`:"Sugeridos pelo bot — rever", `factsAddPlaceholder`:"Adiciona um facto que o bot pode usar…", `factsEmpty`:"Ainda sem factos.", `add`:"Adicionar", `edit`:"Editar", `delete`:"Apagar", `deactivate`:"Desativar", `cancel`:"Cancelar", `approve`:"Aprovar", `reject`:"Rejeitar", `learned`:"aprendido", `topic`:{amenities→"Comodidades", access→"Acesso", parking→"Estacionamento", house_rules→"Regras da casa", area→"Zona", general→"Geral"}.

he: paridade (traduzir todas).

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit` → sem erros.
Run: parity (incluir `field` e `topic`):
`node -e "const f=l=>{const o=require('./messages/'+l+'.json').AiMemory;return [...Object.keys(o),...Object.keys(o.field||{}).map(k=>'field.'+k),...Object.keys(o.topic||{}).map(k=>'topic.'+k)].sort()};const a=f('en'),b=f('pt'),c=f('he');const eq=JSON.stringify(a)===JSON.stringify(b)&&JSON.stringify(b)===JSON.stringify(c);console.log(eq?'parity ok':'PARITY FAIL');process.exit(eq?0:1)"`
Expected: `parity ok`.
Manual: adicionar facto de `access` → guardar → o checklist do inbox marca buildingAccess/apartmentAccess ✓; aprovar um pending; apagar um facto.

- [ ] **Step 5: Commit**

```bash
git add components/admin/memory/FactsBoard.tsx components/admin/memory/PropertyMemoryManager.tsx messages/en.json messages/pt.json messages/he.json
git commit -m "feat(ai-memory): board de factos (CRUD + aprovar/rejeitar pending)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Verificação final e E2E manual

Fecha com a bateria de verificação do projeto e um E2E manual do fluxo completo.

**Files:** nenhum (só verificação; corrigir inline o que falhar).

- [ ] **Step 1: Bateria automática**

Run: `npx tsc --noEmit` → sem erros.
Run: `npm run lint` → sem erros nos ficheiros alterados.
Run: `npm run build` → build OK, rota `memory` no manifest.
Run: `npm run test:security` → PASS.
Run: `npx tsx scripts/test-fact-crud.ts` e `npx tsx scripts/test-knowledge-coverage.ts` → exit 0.

- [ ] **Step 2: E2E manual (dev server porta 3001, como super_admin)**

1. `/pt/admin/activity` → inbox → conversa da Virtudes One → no ContextPanel, clicar **Gerir memória** → abre `/pt/admin/activity/memory?property=341090`.
2. Se não ligada, ligar à propriedade do site sugerida → campos base preenchem.
3. Preencher wifiPassword + doorCode → Guardar → voltar ao inbox, recarregar a conversa → esses campos ✓ no checklist.
4. Adicionar facto `access` → voltar ao inbox → buildingAccess/apartmentAccess ✓.
5. Se houver facto pending, Aprovar → deixa de estar destacado; editar e apagar um facto.
6. Confirmar acesso negado: com um utilizador `admin` (não super_admin), `/pt/admin/activity/memory` redireciona (guardRoles) e o botão "Gerir memória" não aparece no inbox.

- [ ] **Step 3: Commit (se houve correções)**

```bash
git add -A
git commit -m "chore(ai-memory): verificação final e ajustes do E2E

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Notas de implementação

- **Migração:** nenhuma. Se `tsc`/queries falharem por coluna inexistente, PARAR — o schema `ai_property_fact`/`property_ai_extras` já devia estar aplicado (ver handoff). Não inventar migração sem confirmar com o Marcelo.
- **`assertAdmin` como guarda real:** todas as ações novas chamam-na (super_admin). O `guardRoles(["super_admin"])` do layout é a segunda camada. Um admin normal nunca chega às ações nem à rota.
- **Deep-link:** o botão do inbox usa `?property=<beds24Id>`; a page valida que existe na lista antes de selecionar.
- **RTL/he:** as strings hebraicas entram por paridade; passagem nativa de hebraico fica para o mesmo momento das outras (dívida conhecida do inbox), não bloqueia.
