# Bot de IA de mensagens — migração Hospitable → Beds24 (design aprovado)

**Data:** 2026-07-13 (brainstorming noturno, após prova completa do transporte Beds24)
**Estado:** Design aprovado pelo Marcelo secção a secção; UI premium pixel-perfect exigida.
**Docs irmãos:** `2026-07-13-beds24-STATUS-HANDOFF.md` (transporte provado), `2026-07-11-data-grounded-agent-design.md` (fase seguinte), branch `feat/ai-guest-messaging` (pipeline original Hospitable, nunca mergeado).

## Contexto e porquê

O transporte Beds24 foi provado ponta-a-ponta a 2026-07-13: webhook dispara com mensagens
(guest ~4s, host ~6-7s), `source` distingue guest/host — o que torna possível a deteção de
resposta humana (impossível no Hospitable, onde tudo era "platform") — e o outbound
`POST /bookings/messages` chega ao Airbnb em segundos. O Hospitable já está desligado da conta
Airbnb do João. O pipeline de IA (Gemini, tom, escalação, knowledge) vive no branch
`feat/ai-guest-messaging` (~8.4k linhas testadas) e migra de transporte.

## Decisões do Marcelo (2026-07-13)

1. **Âmbito:** as 6 propriedades Primary Owner ligáveis (1 ligada hoje — Virtudes One; 5 a ligar).
   As ~39 co-hosted ficam para a Fase 2 (onboarding de owners via botão "Connect with Airbnb"
   embebido no owner portal — pedir botão ao suporte Beds24 JÁ, tem lead time; trial acaba ~2026-07-27).
   Nota: o Hospitable via as 45 porque lia o inbox da conta (co-host incluído); o Beds24 é ligação
   por anúncio — regra do Airbnb, qualquer PMS completo exige autorização do owner.
2. **Funcionalidades:** paridade com o que funcionava no Hospitable (monitor, drafts Gemini com tom
   Lovely, bot ON/OFF global+por conversa, escalação, knowledge por propriedade). O agente
   data-grounded (preços/disponibilidade reais) fica para a fase seguinte.
3. **Envio:** o sistema nasce **pronto para auto-send com human-in-the-loop**. Sem score numérico
   de confiança: a regra é binária — **sabe → responde sozinho; não sabe → humano**.
4. **UI:** premium, pixel-perfect, moderna (nível Awwwards) — primeira peça do PMS final.
   Mockup aprovado (3 painéis; ver secção UI).
5. **Abordagem:** A — port limpo para `main` (ver abaixo).

## Abordagem A — port limpo (aprovada)

Trazer do branch `feat/ai-guest-messaging` APENAS:
- `lib/ai-messaging.ts` (pipeline Gemini/tom/escalação) — com chamadas de transporte substituídas
- `app/actions/ai-messaging.ts` (adaptado a IDs Beds24)
- Componentes UI (reconstruídos premium — não é port de CSS)
- Migrações `ai_*` (aplicação manual no Supabase; avisar ao criar)
- i18n necessário (en/pt/he em paridade)

**Fica para trás (não entra em main):** `lib/hospitable-api.ts`, `lib/hospitable.ts`,
`app/api/webhooks/hospitable/route.ts`, scripts de teste Hospitable, cron de 3 min.

## Arquitetura do transporte

```
[Airbnb] → Beds24 → webhook (JÁ em produção, ~4s)
                        ↓
   app/api/webhooks/beds24/route.ts (existente)
        ├─ ingestBookings/ingestMessages → beds24_* (existente, intocado)
        └─ NOVO hook pós-ingestão de mensagem:
             ├─ upsert ai_conversation (beds24 booking → conversa)
             ├─ source=host → bot OFF automático nessa conversa
             └─ source=guest → motor de decisão → auto-send OU fila humana

Outbound: painel/motor → lib/beds24/client POST /bookings/messages (provado)
```

- Webhook-only (decisão do Marcelo: sem polling automático; "Sync agora" manual continua como despiste).
- Tabelas `ai_*` mantêm-se; `reservation_id` (text) passa a guardar o beds24 booking id;
  coluna `hospitable_property_id` generalizada para id externo (beds24 property id).
- Pré-requisito por propriedade no Beds24: "Inquiry and Requests" = **Import all** + webhook
  configurado (Settings→Properties→Access). Sem isto, mensagens não chegam (verificado hoje:
  default "Ignore" engole tudo).

## Motor de decisão — "sabe ou não sabe"

```
Mensagem guest
   ↓
[Regras duras — HUMANO sempre, nunca auto-responde]
   · preços / disponibilidade / alterações de datas (até o data-grounded existir)
   · reclamações, problemas na estadia, reembolsos, cancelamentos
   · mensagens do Airbnb Support / plataforma
   · pedidos que exigem ação física (early check-in, bagagem, avarias)
   ↓
[O knowledge da propriedade responde a isto?]
   ├─ SIM, informação explícita → AUTO-SEND (só com base nessa informação; nunca inventa)
   └─ NÃO / parcial / ambíguo  → NEEDS_HUMAN (com draft preparado para acelerar)
```

- Contexto do agente: knowledge da propriedade + histórico da conversa + dados da reserva.
  (Knowledge pode ser auto-populado a partir do "Content in Airbnb" do Beds24 — wifi, check-in,
  amenities; dados sensíveis com acesso restrito.)
- Instrução central: responder apenas com informação presente no contexto; senão `NEEDS_HUMAN`.
- **Auditabilidade:** cada auto-resposta regista em que entrada do knowledge se baseou
  (guardado no registo do draft; visível na thread — "baseado em: knowledge › wifi").
- Human-in-the-loop: conversa entra na fila "precisa de humano" (topo do inbox, badge âmbar),
  com draft pronto; bot pausado nessa conversa até humano tratar.
- Humano responde pelo Airbnb → `source: host` via webhook → bot dessa conversa desliga sozinho.
- Controlo: kill-switch global + modo por propriedade (auto / só-drafts / off) + toggle por conversa.
- Rollout recomendado (decisão operacional do Marcelo, não bloqueia o build): 48-72h em só-drafts
  na cobaia para calibrar, depois auto na cobaia, depois as restantes.

## Métricas no monitor (accuracy medida a sério)

- % de auto-respostas não corrigidas por humano nas 24h seguintes
- % de drafts aprovados sem edição vs editados
- Taxa de escalação por propriedade (alta = knowledge incompleto → enriquecer)
- Latência webhook por mensagem (já medida hoje)

## UI — inbox premium (mockup aprovado)

Rota `admin/activity` mantém-se; UI reconstruída de raiz (não é port do CSS do branch).
Layout 3 painéis:

1. **Lista de conversas:** filtros (Todas/Humano/Bot), avatar, preview, estado por conversa
   (pill: "bot ON" verde / "humano ativo" cinza / "respondido pelo bot" / "precisa de humano" âmbar),
   não-lidas, fila humana sempre no topo com destaque âmbar.
2. **Thread:** bolhas guest/host com timestamps + latência webhook; auto-respostas do bot em
   cartão verde com citação do knowledge; drafts em cartão tracejado com Enviar/Editar/Ignorar;
   caixa de resposta manual.
3. **Contexto:** reserva (datas/valor/canal/estado), toggle do bot na conversa (com nota
   "desliga sozinho se um humano responder"), estado do knowledge da propriedade
   (o que está coberto ✓ e o que falta ⚠ — guia a equipa a preencher).

Qualidade: pixel-perfect; dark mode completo (tokens `admin-dark-*` existentes); micro-interações
(draft a surgir, estados de envio); skeleton loading; responsivo mobile (equipa responde do
telemóvel); tipografia/espaçamento consistentes com o backoffice. Implementação usa o skill
frontend-design. Auto-refresh do inbox (30s como o painel beds24; avaliar Supabase Realtime no
plano de implementação).

## Dados, erros e testes

- **Dados:** migrações `ai_*` do branch adaptadas (uma migração nova consolidada de preferência),
  aplicação manual no Supabase — dizer explicitamente quando o ficheiro for criado. IDs externos
  Beds24 como valores simples (text). Zero alterações a tabelas do site público.
- **Erros:** falha Gemini → conversa "por tratar" com badge (nunca silêncio); falha de envio →
  retry + aviso no monitor; webhook idempotente (dedupe por message id, já provado).
- **Testes:** unit no motor de decisão (regras duras + needs_human + citação de knowledge);
  simulação de webhook local; teste real na cobaia (conta "Carolina") antes de ligar auto-send;
  `npx tsc --noEmit` + build de produção; segurança: actions com guard (padrão admin do repo).

## Fora de âmbito

- Agente data-grounded (preços/disponibilidade reais via GET /offers) — fase seguinte, spec própria.
- Fase 2 (onboarding dos ~39 co-hosted via owner portal) — projeto separado; pedir botão ao
  suporte Beds24 imediatamente.
- Telegram/WhatsApp na escalação (choke-point `escalateToHuman` fica preparado, como no design
  data-grounded).
- Reservas diretas do site (continuam com email Resend; mensagens Beds24 são só OTA).

## Riscos

- Payload do webhook em produção pode ter formas não vistas (ex.: mensagens de mais de um booking
  no mesmo evento) — o payload bruto fica sempre gravado e reprocessável.
- Auto-send com hóspedes reais: mitigado pelo modo só-drafts inicial por propriedade + regras
  duras + kill-switch.
- Knowledge incompleto no arranque → escalação alta no início; o painel de knowledge mostra
  lacunas para a equipa preencher (e o auto-populate do Airbnb content ajuda).
- Emails de notificação do Beds24 ainda ativos → Marcelo desliga (senão a equipa recebe spam
  paralelo ao bot).

## Próximos passos

1. Marcelo revê este spec.
2. `superpowers:writing-plans` → plano de implementação detalhado (worktree próprio).
3. Implementar, testar na cobaia, ligar propriedade a propriedade.
