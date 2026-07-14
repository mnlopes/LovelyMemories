# Agente de mensagens escalável (50 propriedades): tool-calling + learning loop

**Data:** 2026-07-14
**Feature:** AI guest messaging sobre Beds24 — evolução do bot atual para escalar a ~50 propriedades
**Status:** Design aprovado pelo Marcelo (2026-07-14) — pronto para plano de implementação
**Substitui:** `2026-07-11-data-grounded-agent-design.md` (era Hospitable; nunca implementado —
recuperar de `git show 2b1ed1e`). Os princípios mantêm-se; a fonte de dados passou a Beds24 e a
orquestração passou de two-pass determinístico a tool-calling nativo.

## Objetivo

O bot deve gerir conversas de hóspedes em ~50 propriedades: responder automaticamente às perguntas
informativas com **dados reais** (calendário Beds24 + knowledge por propriedade), escalar para
humano só os casos em que não tem a certeza, e **aprender com cada escalação** para que o trabalho
humano decresça com o uso em vez de crescer com o número de propriedades.

Decisões do Marcelo (brainstorming 2026-07-14):

- **Knowledge = learning loop (opção C):** import automático do Beds24 como base + cada escalação
  respondida por um humano vira um facto candidato, aprovado com 1 clique no backoffice.
- **Auto-send = draft-first (opção B):** preço/disponibilidade passam a ser respondidos pelo agente
  mas entram na fila (modo `drafts`); a promoção a `auto` é decisão humana por propriedade via o
  toggle off/drafts/auto que já existe no BotSettings.
- **Orquestração = tool-calling nativo do LLM (opção B), sem framework:** nada de LangChain/
  LangGraph — o loop é ~100 linhas nossas; a fila de aprovação já é o human-in-the-loop, o
  `ai_message_log` já é o estado/auditoria.
- **Acesso a dados sem fricção:** o agente corre 100% server-side com service role
  (`getSupabaseAdmin()`) e a nossa API key Beds24 — nunca pede permissões em runtime. As únicas
  aprovações humanas são decisões de negócio (envio, knowledge), nunca de acesso.
- **O cliente (host) vive no Airbnb:** o learning loop capta as respostas humanas dos DOIS canais —
  backoffice e Airbnb (chegam via webhook com `source: "host"`). O host não precisa de mudar nada;
  a curadoria do knowledge é da equipa Lovely Memories no backoffice.

## Princípios invariantes (não mudam com a escala)

1. O LLM **nunca decide se envia** — só as guardas (camada 1) e o gate (camada 3), código nosso.
2. Auto-send **nunca sem citação** de uma fonte real (calendário ou facto de knowledge), validada
   pelo gate contra os dados verdadeiros.
3. **O bot informa, o humano decide** — negociação, descontos, cancelamentos, reclamações,
   alterações de reserva e aceitação de reservas escalam SEMPRE, sem LLM.
4. Isolamento por propriedade: o agente só vê dados da propriedade da conversa.
5. Degradação sempre para humano — nunca para silêncio nem para invenção.

## Arquitetura — 4 camadas

```
mensagem do hóspede (webhook Beds24 → bot-bridge, já existe)
  → CAMADA 1 · guardas duras (determinístico, sem LLM)
      bot off / kill-switch → para; negociação/reclamação/cancelamento/PII → escalar;
      mensagem de plataforma/cortesia → sem resposta
  → CAMADA 2 · agente (LLM com ferramentas, máx. 4 iterações)
      ferramentas: getCalendar(datas), getKnowledge(topico?)
      saída obrigatória JSON: { covered, reply, citations[], confidence, language }
  → CAMADA 3 · gate de saída (determinístico, sem LLM)
      covered + citações válidas + modo auto  → auto-send
      covered + citações + modo drafts        → fila (1 clique)
      resto                                   → escalar + draft "vou confirmar"
  → CAMADA 4 · learning loop (pós-escalação)
      resposta humana (backoffice OU Airbnb) → facto candidato → fila de sugestões → aprovado
      → knowledge da propriedade
```

### Camada 1 — guardas duras

As `HARD_RULES` de `lib/ai-decision.ts` mantêm-se, com UMA mudança: **preço e disponibilidade
informativos deixam de escalar** (passam ao agente, que agora tem dados). Continuam a escalar
sempre: negociação (desconto, "mais barato"), refund/cancelamento, mudança de datas/reserva,
reclamações, early check-in/late check-out/bagagem (ações físicas), PII. Pedidos de RESERVA
(aceitar/pré-aprovar) são decisão humana — o agente convida a completar a reserva mas nunca
confirma nada.

### Camada 2 — agente com ferramentas

Novo `lib/ai-agent.ts` com o loop de tool-calling (substitui o miolo LLM do `decide()`; a
assinatura `decide(ctx) → BotDecision` mantém-se para o bot-bridge não mudar).

Ferramentas (funções TypeScript nossas, expostas via function-calling do provider):

- **`getCalendar(checkIn, checkOut)`** — calendário Beds24 da propriedade da conversa
  (`lib/beds24/client.ts` já autentica): por noite, preço/disponível/min-stay. Guardas: janela ≤ 31
  noites e ≤ 365 dias à frente; erro da API → "sem dados" (o gate escala).
- **`getKnowledge(topico?)`** — 3 camadas por ordem de fiabilidade:
  1. `properties` do site (amenities JSONB, parking c/ `hasElectricCharger`, policies, descrições)
     — só quando a propriedade Beds24 está ligada (`beds24_properties.internal_property_id`);
  2. `property_ai_extras` (wifi, acessos, notas operacionais);
  3. `ai_property_fact` (factos aprendidos/importados — novo, abaixo).

`escalateToHuman` NÃO é ferramenta do modelo — é o gate que escala quando `covered: false` (o
modelo não pode "esquecer-se" de escalar).

Loop: máx. 4 iterações; a maioria resolve em 1-2. Contexto: mensagem + histórico recente + reserva
(datas, hóspedes, estado, inquiry vs booked). Provider chain de `lib/ai-messaging.ts` mantém-se,
com **Gemini como primário** (OpenAI está em 429 permanente; evita a chamada falhada por mensagem).
Tom inquiry (pré-reserva, voz calorosa de vendas) herdado do design de 2026-07-11.

Contrato de saída (JSON estrito):

```json
{ "covered": true, "reply": "…", "citations": ["properties.parking.hasElectricCharger"],
  "confidence": "high", "language": "pt" }
```

- `citations` referencia factos concretos (campo de knowledge, id de facto, noites do calendário).
- `covered: false` → o modelo escreve mesmo assim um draft honesto ("vou confirmar com a equipa")
  que acompanha a escalação — o hóspede nunca fica sem resposta preparada na fila.

### Camada 3 — gate de saída

- Valida que **cada citação existe** nos dados realmente devolvidos pelas ferramentas nesta
  execução — citação inventada = escala + log de auditoria.
- Cruza com o modo da propriedade (off/drafts/auto, BotSettings existente) e o kill-switch global.
- Escalação usa o mecanismo existente (needs_human na fila + auto-off quando aplicável). O cartão
  emerald do inbox continua a mostrar a citação do auto-send.

### Camada 4 — learning loop

Gatilho: conversa escalada (bot não soube X) e depois chega uma resposta humana:

- **Backoffice:** envio pela fila (evento nosso).
- **Airbnb:** o host responde na UI do Airbnb → webhook entrega em segundos com `source: "host"`
  (provado 2026-07-13, teste Carolina) — o MESMO evento que hoje dispara o auto-off
  `human_replied`; o loop pendura-se aí.

Pipeline: par (pergunta do hóspede, resposta humana) → chamada LLM extrai facto candidato
("Pergunta: 'têm berço?' / Resposta: 'sim, e cadeira de refeição' → FACTO: berço + cadeira de
refeição disponíveis — propriedade X") → grava `ai_property_fact` com `status='pending'` → fila
"Sugestões de knowledge" no backoffice → equipa aprova/edita/rejeita com 1 clique → `active` →
próxima pergunta igual é respondida pelo bot.

**Nada entra no knowledge sem aprovação humana** (uma resposta errada/pontual do host não pode
virar "verdade").

**⚠ Filtro obrigatório: mensagens agendadas do Airbnb.** As 4 quick-replies agendadas por reserva
(Booking Confirmation → Check-in → Follow Up 24h → Farewell) chegam como `source: host` e NÃO são
respostas a perguntas — não podem alimentar o loop. A experiência de **17/07 ~10:01 WET** (payload
do "Farewell Porto") decide o mecanismo: marcador no payload se existir; senão fingerprint dos 4
templates. O mesmo mecanismo isenta as agendadas do auto-off (problema sistémico já registado no
handoff Beds24).

## Modelo de knowledge

Nova tabela `ai_property_fact` (RLS como as ai_*: policy staff para authenticated):

| coluna | descrição |
|---|---|
| `id` | uuid pk |
| `external_property_id` | Beds24 property id (text) — join com beds24_properties |
| `topic` | slug livre: amenities, access, parking, house_rules, area, … |
| `fact` | texto do facto, uma afirmação verificável |
| `source` | `manual` \| `learned` \| `imported` |
| `status` | `active` \| `pending` \| `rejected` |
| `learned_from` | reservation_id da conversa de origem (auditoria), nullable |
| `created_at` / `updated_at` / `reviewed_by` | housekeeping |

- Fila de sugestões = `status='pending'`. Facto errado corrige-se num único registo e o bot
  corrige-se em todas as conversas futuras.
- `property_ai_extras` mantém-se (campos estruturados; checklist ✓/⚠ do ContextPanel intacto).
- **Arranque a frio:** import inicial best-effort do Beds24 (descrição, amenities, house rules por
  propriedade) → factos `imported` ativos, marcados como não-curados. Co-hosted sem página no site
  começam só com camadas 2+3 e enriquecem com o uso.

## Rollout

- **Fase A — fundação:** `ai_property_fact` + import inicial; `lib/ai-agent.ts` (loop);
  `getCalendar`/`getKnowledge`; gate com validação de citações; relaxar hard rules SÓ em
  preço/disponibilidade informativos.
- **Fase B — learning loop:** captura do par pergunta→resposta humana (2 canais); extração LLM;
  fila de sugestões no backoffice. Depende da experiência de 17/07 para o filtro das agendadas.
- **Fase C — escala:** 2-3 semanas em `drafts` nas 6 owned → promover a `auto` por propriedade;
  co-hosted entram conforme o onboarding Beds24 (Fase 2 do PMS), suportadas no dia 1.

Cada fase é útil sozinha; o bot atual continua a funcionar até o loop novo o substituir por trás do
mesmo gate.

## Não-objetivos (v1)

- Nenhuma framework de agentes (LangChain/LangGraph) — reavaliá-lo só se um dia houver múltiplos
  agentes/equipa maior.
- Sem cache do calendário (volume baixo; 1 chamada por mensagem relevante).
- Sem cotação de taxas/fees além do que o calendário devolve (preços por noite; totais como soma
  das noites com wording "mais taxas da plataforma, se aplicável").
- Notificações de escalação (Telegram/WhatsApp/email) ficam para depois (decisão Marcelo
  2026-07-14) — o ponto de ligação é o fluxo de escalação do gate.
- Aprendizagem automática sem aprovação humana — nunca.

## Ficheiros a tocar (estimativa)

- `lib/ai-agent.ts` — novo: loop de tool-calling + contrato JSON + validação de citações.
- `lib/ai-decision.ts` — hard rules relaxadas (preço/disponibilidade informativos → agente);
  `decide()` delega no agente.
- `lib/ai-messaging.ts` — provider chain (Gemini primário), suporte a function-calling, tom inquiry.
- `lib/beds24/client.ts` — endpoint de calendário (se ainda não exposto).
- `lib/beds24/bot-bridge.ts` — hook do learning loop no evento de resposta humana (junto ao
  auto-off `human_replied`); filtro de mensagens agendadas (partilhado com o fix do auto-off).
- `app/actions/ai-inbox.ts` — ações da fila de sugestões de knowledge (listar/aprovar/editar/
  rejeitar); import inicial de factos.
- `components/admin/inbox/*` — fila de sugestões (novo painel ou secção no BotSettings/ContextPanel).
- `messages/{en,pt,he}.json` — chaves novas em paridade.
- `supabase/migrations/20260715090000_ai_property_fact.sql` — tabela nova (aplicar MANUALMENTE no
  dashboard Supabase).
- `scripts/` — import inicial de factos; smoke test do agente com amostras multilingues.

## Verificação

- `npx tsc --noEmit` + lint + paridade i18n (convenção do projeto; sem suite de testes).
- Scripts live (tsx): agente com amostras reais multilingues ("está livre de 20 a 23 de agosto?",
  "how much for 3 nights in September?", "do you have EV charging?"); pipeline completo em dry-run
  produzindo (a) resposta grounded de preço com citação de calendário, (b) needs_human + draft
  "vou confirmar" para pergunta sem dados.
- **Armadilha clássica de alucinação tem de passar:** pedir um preço com o `getCalendar` desligado
  → o draft não pode conter nenhum número e tem de escalar.
- Learning loop em dry-run: escalação simulada + resposta humana simulada → facto `pending` correto
  na fila; mensagem agendada (Farewell) NÃO gera facto.
