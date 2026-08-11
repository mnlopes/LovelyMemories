# Desligar o Beds24 — design

**Data:** 2026-08-11
**Estado:** desenho aprovado, por implementar

## Porquê

Os owners não querem as contas Airbnb deles ligadas a um PMS terceiro. A objeção é
estrutural, não de preço: qualquer substituto (Hospitable, Guesty, Lodgify) exige a
mesma ligação, e a Airbnb não dá API de mensagens a quem não é partner. Logo não há
substituição possível — há desligamento.

Consequência aceite: o **co-host IA de mensagens perde o canal**. Não há inbox, não há
drafts, não há envio. O código fica congelado atrás de uma flag, não apagado, para o
caso de a decisão comercial mudar.

## O que depende do Beds24 hoje

| Consumidor | Ficheiro | Sem Beds24 |
|---|---|---|
| Inbox / co-host IA | `app/actions/ai-inbox.ts`, `lib/beds24/bot-bridge.ts` | morre (é o único canal) |
| Lente de calendário | `components/admin/reservations/MultiCalendarView.tsx`, `components/admin/properties/PropertyCalendarTab.tsx` | volta a iCal |
| Rail de preços / estadia mínima | `app/actions/beds24.ts` (`getBeds24DailyPrices`) | desaparece |
| Ficha de detalhe da reserva | `components/admin/reservations/Beds24BookingDetailSheet.tsx` | não abre |
| Nome do hóspede nas chegadas | `app/actions/overview.ts:127` | chegada aparece sem nome |
| Tool `getCalendar` do agente | `lib/ai-agent-tools.ts:3` | devolve "sem dados" |
| Webhook | `app/api/webhooks/beds24/route.ts` | já portado |
| PMS Lab | `app/[locale]/admin/beds24/` | já portado |

**Não depende e sobrevive intacto:** sync iCal (cron de minuto a minuto), feed de
exportação `/api/ical/[propertyId]`, reservas diretas, Stripe, site público, portal do
owner, Opportunities.

**Não há escrita de disponibilidade para o Beds24.** Os únicos `POST` são ligar canal,
mensagens do bot e a reserva de teste. As reservas diretas bloqueiam o Airbnb pelo nosso
feed iCal, não pelo Beds24 — esse caminho não é afetado.

## Bloqueador operacional

Verificado a 2026-08-11 com `scripts/check-ical-coverage.ts`:

| Casa | iCal | Blocos futuros |
|---|---|---|
| Virtudes 1 | `.ics` OK, sync 18:00 | 10 |
| Virtudes 2 | `.ics` OK, sync 18:00 | 2 |
| The Root | `.ics` OK, sync 17:58 | 11 |
| Casa Serena Gaia | `.ics` OK, sync 18:00 | 15 |
| Santa Catarina / The Alluring | `.ics` OK, sync 18:00 | 9 |
| **Duque de Saldanha / The Terraced Loft** | **ZERO URLs** | **0** |

A Terraced Loft não tem qualquer feed iCal: hoje a ocupação dela só existe via Beds24.
Desligar antes de colar o `.ics` do Airbnb deixa a casa sem bloqueios nenhuns no site
público — overbooking garantido. **É pré-requisito de tudo o resto.**

## Desenho

### 1. A flag

`isBeds24Enabled()` (`lib/beds24/client.ts:11`) passa a:

- `BEDS24_ENABLED === 'false'` → desligado, mesmo com token presente
- caso contrário → comportamento atual (`!!process.env.BEDS24_REFRESH_TOKEN`)

Desligar sem apagar o token é deliberado: manter a credencial permite religar para
diagnóstico sem ter de a ir buscar outra vez ao Beds24.

### 2. Degradar, não rebentar

`assertEnabled()` lança hoje. Todos os consumidores passam a verificar a flag **antes**
de chamar, e devolvem vazio/`null` em vez de propagar erro. Nenhuma superfície do
backoffice pode ficar com um ecrã de erro por causa disto.

### 3. Portões a acrescentar

- `app/actions/overview.ts` — salta as duas consultas `beds24_*`; chegada mostra-se sem nome
- `lib/ai-agent-tools.ts` — `getCalendar` devolve "sem dados" sem tocar na API
- `lib/beds24/bot-bridge.ts` — não envia, não processa
- `app/actions/ai-inbox.ts` — devolve listas vazias
- `MultiCalendarView.tsx` / `PropertyCalendarTab.tsx` / `AnnualCalendarTab.tsx` — o toggle
  de fonte desaparece e a vista fixa em iCal; o rail de preços desaparece
- `Beds24BookingDetailSheet` — barras deixam de ser clicáveis para detalhe Beds24
- `AdminSidebar.tsx` — itens **Beds24** e **Co-Host** escondidos; os `layout.tsx`
  correspondentes devolvem `notFound()` para a guarda não ficar só na UI

### 4. O que não se toca

Tabelas `beds24_*` mantêm os dados (histórico de conversas e reservas fica arquivado).
Nenhuma migração. Nenhum ficheiro apagado.

### 5. Testes

Não há suite de testes no projeto. Verificação = `npx tsc --noEmit`, `npm run build`,
`npm run test:security`, e passagem manual pelo backoffice com a flag a `false` em
localhost antes de ir a produção: `/admin/reservations` (as três vistas), ficha de
propriedade, Overview, e confirmar que Beds24 e Co-Host sumiram da sidebar.

## Sequência operacional

A ordem não é negociável — inverter os passos 1 e 5 causa overbooking.

1. Colar o `.ics` do Airbnb na **Terraced Loft**; correr `npx tsx scripts/check-ical-coverage.ts`
   e confirmar `sync: success` com blocos a aparecer
2. Confirmar que o Airbnb importa o nosso feed `/api/ical/[propertyId]` nas 6 casas —
   senão as reservas diretas deixam de bloquear o Airbnb
3. `BEDS24_ENABLED=false` na Vercel + redeploy
4. Verificar backoffice em produção
5. Airbnb → Definições → Privacidade → Serviços ligados → **Remover acesso** ao
   `Channelsync`. O `Elevate` (ferramenta antiga do cliente) **fica**.
6. Cancelar a subscrição Beds24

Remover a app do Airbnb não afeta os links `.ics` — os feeds de calendário são
independentes das apps ligadas.

## Reversão

`BEDS24_ENABLED=true` + redeploy repõe tudo do nosso lado. Do lado do Airbnb seria
preciso voltar a autorizar o Channelsync e reconectar os 6 anúncios no Beds24.
