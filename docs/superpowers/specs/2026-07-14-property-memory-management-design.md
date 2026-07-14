# Página de gestão de memória por propriedade — Design

**Data:** 2026-07-14
**Estado:** aprovado (brainstorming), pronto para plano de implementação
**Contexto:** pedido #3 do handoff `2026-07-13-beds24-STATUS-HANDOFF.md` (secção ✅ topo).
Feature irmã: agente escalável (`2026-07-14-scalable-guest-agent-design.md`).

## Problema

No `ContextPanel` do inbox, o bloco **PROPERTY KNOWLEDGE** mostra 10 campos fixos, quase todos
"missing" para a Virtudes One. Duas causas distintas:

1. **O painel está desalinhado com o que o agente sabe.** Ele lê só a camada estruturada
   (`property_ai_extras` + base da `properties`, via `loadPropertyKnowledge`) e **ignora a camada 3**
   — os factos livres em `ai_property_fact` (18 importados do Beds24). O bot pode já saber responder
   a um tópico por um facto, e o checklist continua a dizer "missing".
2. **Gap genuíno de dados.** Os segredos que a API do Beds24 nunca dá (wifi password, códigos de
   porta, acesso ao prédio/apartamento, contacto de emergência) têm mesmo de ser preenchidos à mão.
3. **Causa raiz dos "todos missing" na Virtudes One:** provavelmente `internal_property_id = null`
   (Beds24 não ligado a uma propriedade do site). Sem ligação, `loadPropertyKnowledge` devolve
   conhecimento parcial (só o nome) → tudo aparece missing, incluindo check-in/out que o site tem.

Não existe hoje um sítio para a equipa **ver, preencher e curar** a memória por propriedade.

## Arquitetura de dados (existente — não muda)

Três origens, unidas em `PropertyKnowledge` + factos:

- **Base** (`listingName, checkIn, checkOut, address, houseRules, amenities, parking`) — derivada da
  tabela `properties` do site (read-only aqui; editar na ficha da propriedade).
- **Segredos/extras** (`wifiName, wifiPassword, doorCode, buildingAccess, apartmentAccess,
  emergencyContact, govFormUrl, guidebookUrl, tips, toneNotes`) — tabela `property_ai_extras`,
  chave `property_id` (uuid do site).
- **Factos livres** — tabela `ai_property_fact`, chave `external_property_id` (Beds24 id, text),
  com `topic`, `status` (active|pending|rejected), `source` (manual|learned|imported).

Elo Beds24 ↔ site: `beds24_properties.internal_property_id` (uuid, nullable, sem FK).

**Sem migração** — o schema serve tal como está.

## Decisões (brainstorming 2026-07-14)

- **Modelo de dados:** manter campos fixos (essenciais, com checklist de completude) **+** factos
  livres (cauda longa). NÃO unificar tudo em factos (perdíamos o checklist acionável) nem fazer
  routing automático (opaco). — opção (ii).
- **Localização:** sub-página cheia dentro de `admin/activity` (decisão A). Se no futuro justificar,
  promove-se a rota própria (`admin/memory`) — opção B, adiada.
- **Ligação Beds24↔site:** tratada DENTRO desta página (decisão A) — sem ligação não se mata nenhum
  missing, e as ações já existem.
- **Vista-grafo "estilo Graphify":** fora do âmbito (YAGNI). Iteração futura se pedida.
- **Acesso:** **só super_admin**, como o resto do inbox. O botão de entrada fica escondido para
  admin normal (o João é admin — não o deve ver nem lhe chegar por navegação), para não confundir.

## Plumbing existente (reutilizar)

- `listLinkedProperties()` — PropertyKnowledge (base+extras) das ligadas.
- `upsertPropertyExtras(input)` — escreve os segredos em `property_ai_extras`.
- `getPropertyLinkSuggestions()` / `savePropertyLinks()` — ligação com match automático por tokens.
- `listFactSuggestions()` / `reviewFact(id, action, editedFact?)` — factos `pending` (learning loop).
- `loadPropertyFacts(externalPropertyId)` (lib/ai-knowledge.ts) — factos `active`.

## A construir

### Ações novas (`app/actions/ai-inbox.ts`) — CRUD de factos por propriedade
Todas `assertAdmin` + guarda super_admin (ver Acesso). Escrevem em `ai_property_fact`.
- `listFactsForProperty(externalPropertyId)` → todos os factos (active + pending) da propriedade,
  agrupáveis por `topic` no cliente. (Distinto de `listFactSuggestions`, que é global e só pending.)
- `createFact({ externalPropertyId, topic, fact })` → insere `source:'manual'`, `status:'active'`.
- `updateFact({ id, topic?, fact? })` → edita texto/tópico.
- `setFactStatus(id, 'active' | 'rejected')` → ativar/desativar (soft).
- `deleteFact(id)` → apagar definitivo (para lixo/duplicados; confirmar no UI).

### Página + componentes
- `app/[locale]/admin/activity/memory/` (sub-página; guard super_admin no layout/segmento).
- `components/admin/memory/PropertyMemoryManager.tsx` — orquestra; seletor de propriedade no topo
  (as 6 owned; aceita `?property=<beds24Id>` para deep-link do inbox).
  - `LinkSection` — só se `internal_property_id = null`: seletor "Ligar a: [propriedade do site]"
    com sugestão automática; ao ligar, recarrega e revela as secções 2–3.
  - `EssentialsForm` — base read-only (com nota "editar na ficha da propriedade") + segredos
    editáveis (grava via `upsertPropertyExtras`). Cada campo com ✓/⚠ igual ao inbox.
  - `FactsBoard` — factos agrupados por tópico; adicionar/editar/ativar-desativar/apagar; os
    `pending` destacados com Aprovar/Rejeitar (via `reviewFact`).

### Fix do checklist no inbox (correção "A")
`components/admin/inbox/ContextPanel.tsx`:
- Carregar também os factos ativos da propriedade (via `loadPropertyFacts` / nova ação leve).
- Um tópico marca ✓ quando o campo estruturado está preenchido **OU** um facto ativo o cobre.
  Mapa tópico→campo(s): `access → buildingAccess, apartmentAccess`; `parking → parking`;
  `house_rules → houseRules`; `amenities → amenities`; (`area`/`general` não mapeiam campo — não
  alteram o checklist fixo, mas podem mostrar-se como contagem "N factos extra").
- Adicionar botão **"Gerir memória"** (abre a página na propriedade da conversa) — visível só
  super_admin.

## i18n
Namespace novo (ex. `AiMemory`) em `messages/{en,pt,he}.json`, chaves em paridade. Rótulos dos
campos, tópicos, ações (ligar, guardar, adicionar/editar/apagar facto, aprovar/rejeitar), estados
vazios e o botão "Gerir memória".

## Acesso / segurança
- Segmento guardado a **super_admin** (`guardRoles(['super_admin'])` no layout, como `admin/activity`
  do inbox). Ações server-side reafirmam a guarda (não confiar só no UI).
- Botão "Gerir memória" no inbox renderizado só quando o utilizador é super_admin.
- Segredos (`property_ai_extras`) já têm RLS staff-only; a página é super_admin. Nunca expor
  segredos fora deste ecrã.

## Fora do âmbito (YAGNI)
- Vista-grafo "estilo Graphify".
- Rota própria na sidebar (opção B) — só se A se revelar apertada.
- Editar campos base (continuam na ficha da propriedade do site).
- Qualquer alteração ao schema / migração.

## Critérios de sucesso
1. super_admin abre a página (do inbox ou direto), escolhe a Virtudes One, liga-a à propriedade do
   site, e vê os campos base a preencherem-se.
2. Preenche wifi password + código de porta → gravam em `property_ai_extras` → o checklist do inbox
   passa a ✓ nesses campos.
3. Adiciona/edita/apaga um facto livre; aprova um facto `pending` do learning loop; o facto ativo
   passa a contar no checklist do tópico correspondente.
4. Um admin normal (João) não vê o botão nem consegue aceder à página.
5. `tsc --noEmit`, `npm run build`, `npm run lint` e `npm run test:security` limpos; i18n em paridade.

## Ficheiros
- **Novos:** `app/[locale]/admin/activity/memory/**`, `components/admin/memory/*.tsx`.
- **Editar:** `app/actions/ai-inbox.ts` (CRUD de factos), `components/admin/inbox/ContextPanel.tsx`
  (fix do checklist + botão), `messages/{en,pt,he}.json`.
- **Sem migração.**
