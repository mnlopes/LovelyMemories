# Beds24 API v2 — Análise e plano para PMS profissional

**Data:** 2026-07-13
**Estado:** Análise concluída; a aguardar conta de teste Beds24 para validação.
**Objetivo:** Substituir o sync iCal (e potencialmente o Hospitable) por uma integração Beds24 API v2, transformando o backoffice do Lovely Memories num PMS/channel manager profissional — dados completos e corretos, sync rápido (push), onboarding automático de owners, e UI premium (nível Awwwards, pixel perfect).

---

## 1. O que é o Beds24 (e o que não é)

- **Não é** a API do Airbnb diretamente. É um channel manager certificado (parceiro oficial de software do Airbnb "Preferred Plus" e Booking.com) que faz de ponte: nós ligamos ao Beds24 via API v2, o Beds24 liga ao Airbnb/Booking pela API oficial deles.
- Resultado prático: acesso completo a reservas, calendários, preços, mensagens e reviews do Airbnb **sem precisarmos de certificação própria** (inviável para a nossa dimensão).
- Existe guia oficial exatamente para o nosso caso: [PMSs: How to connect to Beds24 and use Airbnb via API V2](https://wiki.beds24.com/index.php/PMSs:_How_to_connect_to_Beds24_and_use_Airbnb_via_API_V2). Suporta white-label (owners nunca veem o Beds24).

**Referências:**
- Spec OpenAPI: `https://beds24.com/api/v2/apiV2.yaml` (Swagger UI em `https://beds24.com/api/v2/`)
- Wiki API v2: `https://wiki.beds24.com/index.php/Category:API_V2`
- Wiki Webhooks: `https://wiki.beds24.com/index.php/Category:Webhooks`

## 2. Autenticação

1. Painel Beds24: **(SETTINGS) MARKETPLACE > API** → gerar **invite code** (manual, uma vez; expira em 24h). Escolhem-se os **scopes** neste momento (não mudam depois — para mudar, novo invite code).
2. `GET /authentication/setup` (header `code`) → devolve `token` (24h) + `refreshToken`.
3. `GET /authentication/token` (header `refreshToken`) → novos tokens de 24h.
4. Refresh tokens **não expiram** se usados a cada 30 dias. Suporta whitelist de IPs no invite code.
5. Header em todas as chamadas: `token: {token}`.

**Scopes necessários para nós:** `bookings`, `bookings-personal` (mensagens + dados do hóspede), `bookings-financial` (valores/comissões), `inventory`, `properties`, `channels`. Métodos por scope: `read:` / `write:` / `all:`.

**Diagnóstico:** `GET /authentication/details` mostra scopes e estado do token.

## 3. Limites (créditos)

- **100 créditos / 5 min por conta** (default). Upgrade: €10/mês → 200; expansível por ticket.
- Custo dinâmico por request; headers de resposta: `X-RequestCost`, `X-FiveMinCreditLimit-Remaining`, `X-FiveMinCreditLimit-ResetsIn`.
- Limite é **por conta** (tokens partilham); sub-contas têm limites separados.
- POST: máx ~1MB payload, 10.000 itens top-level por request.
- **Regra de design:** chamadas em bulk (múltiplos IDs/itens por request) + webhooks. Nunca migrar o padrão atual de polling por propriedade ao minuto.

## 4. Mapa de endpoints relevantes

| Endpoint | Estado | Uso para nós |
|---|---|---|
| `GET /bookings` | estável | Reservas completas (hóspede, datas, preço, comissão, canal, status, cancelamento). Filtros incl. `modifiedFrom` para reconciliação |
| `POST /bookings` | estável | Criar/alterar reservas — **empurrar reservas diretas do site para bloquear o Airbnb** (substitui o export iCal) |
| `GET/POST/PATCH /bookings/messages` | estável | Ler/enviar mensagens de hóspedes (só reservas OTA), marcar como lidas. Anexos: Airbnb jpeg/png/gif; Booking jpeg/png; VRBO +pdf. `source`: `guest`/`host`/`system`/`internalNote`; host tem `authorOwnerId` |
| `GET /bookings/invoices` | Alpha | Faturas por reserva |
| `GET/POST /inventory/rooms/calendar` | estável | **Bidirecional**: preços por dia (até 16 níveis), minStay/maxStay, numAvail, `override: "blackout"`, limites por canal |
| `GET /inventory/rooms/availability` | estável | Disponibilidade check-in/out por data |
| `GET /inventory/rooms/offers` | estável | Preço calculado para datas específicas (útil para o agente data-grounded) |
| `GET/POST /properties` (+rooms) | Beta | Criar/ler propriedades e quartos no Beds24 |
| `GET /channels/airbnb/users` | Beta | Contas Airbnb ligadas |
| `GET /channels/airbnb/listings` | Alpha | Listings de um user Airbnb (dados ricos do próprio Airbnb) |
| `POST /channels/airbnb` | Alpha | **Import automático**: `importAsNewProperty`, `importToExistingProperty`, `connectToExistingRoom`, `disconnectRoom`; opções `connect: none/inventory/limited/full`, `importBlockedDates`, `importBookings` |
| `GET /channels/airbnb/reviews` | Beta | Reviews Airbnb (máx 100/chamada, por roomId) |
| `POST /channels/booking` + `/reviews` | Alpha | Equivalente Booking.com |
| `/channels/stripe*` | Alpha | Não precisamos — mantemos o nosso Stripe direto |
| `POST /organizations/users` | Coming soon | — |

## 5. Webhooks

- **Booking webhook V2** (POST JSON): configurado por propriedade em Settings > Properties > Access, com payload completo — booking (todos os campos), `infoItems`, `invoiceItems`, `messages[]`, `retries`. Versões: `one`, `twoNoPersonalData`, `twoWithPersonalData`. Suporta headers customizados (autenticação do nosso endpoint).
- **Latência: assíncrono, atraso médio ~1 minuto.** Não é notificação instantânea. Precisa sempre de reconciliação periódica como rede de segurança.
- Disparo: alterações que afetam disponibilidade (status, arrival, departure, roomId, unitId, roomQty) — mudança de ex.º apelido não dispara.
- **Auto Action webhooks**: disparam por eventos/tempos do ciclo da reserva (não por mensagens recebidas).
- **Inventory webhook**: dispara quando inventário/preço muda (Settings > Marketplace > Webhooks).
- Estado: webhook bookings marcado **Alpha**.

### ⚠ Questão crítica em aberto
**O webhook dispara quando chega uma mensagem nova de hóspede?** A wiki (best practices) diz que sim ("use webhooks to be notified as soon as a new message/booking arrives"); a spec diz que só alterações de disponibilidade disparam. **Validar com conta de teste ou ticket ao suporte.** Se não disparar → fallback: polling `GET /bookings/messages?filter=unread` (como o sync de 3 min atual do Hospitable), com atenção aos créditos.

## 6. Mapeamento ao sistema atual

| Área | Hoje | Com Beds24 |
|---|---|---|
| Import reservas Airbnb | Cron 1 min puxa .ics → `blocked_dates` (sem nome/valor) | Webhook push + `GET /bookings` → reservas reais na BD com hóspede, valores, canal |
| URLs iCal errados (32 propriedades) | Equipa cola .ics à mão | Owner autoriza conta Airbnb no Beds24 uma vez → import por API |
| Export p/ Airbnb | Feed `/api/ical/[propertyId]` que o Airbnb puxa | `POST /bookings` no Beds24 → bloqueio via API (quase imediato) |
| Preços | Não sincronizamos | `POST /inventory/rooms/calendar` bidirecional |
| Mensagens + bot AI | Hospitable (webhook + polling 3 min); `source` uniforme "platform" — deteção de resposta humana impossível | `/bookings/messages`; `source` distingue guest/host/system + `authorOwnerId` — **pode desbloquear a deteção de resposta humana** (validar se distingue app Airbnb vs API) |
| Reviews | — | Airbnb + Booking reviews por API |
| Pagamentos | Stripe direto | Mantém-se (ignorar `/channels/stripe`) |

O pipeline AI (Gemini, bot on/off, escalation, monitor, `escalateToHuman`) mantém-se — muda só o transporte (`lib/hospitable-api.ts` → futuro `lib/beds24.ts`).

## 7. Riscos

1. **Webhook de mensagens** — ver §5 (crítico para o bot).
2. **Maturidade Alpha** em `POST /channels/airbnb` e no webhook de bookings (breaking changes improváveis mas possíveis; Alpha = usável).
3. **Envio de mensagens só para reservas OTA** — reservas diretas continuam com email Resend (já existe).
4. **Webhooks não garantidos** → cron de reconciliação (~15 min, `modifiedFrom`) obrigatório.
5. **Créditos**: medir `X-RequestCost` real com o nosso volume na conta de teste antes de dimensionar.
6. **Transição dupla fonte de verdade** (iCal + Beds24 em paralelo) → migração faseada, propriedade a propriedade, com flag na BD.
7. **Preço Beds24**: desde ~€8.40/mês + €0.55/mês por ligação de canal por quarto (+ white label €19/mês se quisermos). Simular na calculadora para ~30+ propriedades.

## 7b. Co-hosting — limitação do Airbnb e soluções (verificado 2026-07-13)

Fonte: [Connect Airbnb Account](https://wiki.beds24.com/index.php/Connect_Airbnb_Account)

**Limitação (regra do Airbnb, não do Beds24; aplica-se a qualquer channel manager):** co-hosts não podem ligar nem desligar listings via API — só o owner (host principal) pode autorizar a ligação. A Lovely não pode ligar propriedades co-hosted com a conta Airbnb da Lovely.

**Soluções oficiais do Beds24:**
1. **"Connect with Airbnb Account" button** (para portfólios grandes; pedir ao suporte Beds24): botão usado pelos owners **fora do Beds24** — podemos embebê-lo no nosso portal do owner; o owner autoriza sem nunca entrar no Beds24. ← opção preferida.
2. **Subconta Beds24 por owner** — owner entra só para clicar "Connect with Airbnb". Bónus: cada subconta tem limite de créditos próprio (100/5min cada).
3. Owner liga ele próprio a conta ao Beds24.
4. Transferência de conta do owner (irrealista).

**Consequências práticas:**
- OAuth é sempre interativo (login Airbnb do owner + "Allow") — uma vez por owner; tudo o resto (listings, import, mapping, calendário, reservas, mensagens) é por API. Não é preciso criar propriedades à mão no dashboard Beds24.
- Mensagens saem em nome do owner (correto no modelo co-host).
- Listings API ficam **instant book por default** (política Airbnb) — confirmar com owners; exceção "request only" possível via suporte, mas incompatível com estar noutras OTAs com instant book.
- Confirmação da wiki: iCal pode demorar **até 24h**; API aplica em **<1 minuto** e traz dados completos (nome, preço, nº hóspedes, email).
- Se usarmos subcontas: o token principal não acede a subcontas por default — precisa de "Allow linked properties" no invite code ou estrutura de organização. Validar na conta de teste.

## 7c. Só UMA app de PMS por conta Airbnb (descoberto no teste, 2026-07-13)

Ao tentar "Connect with Airbnb" na conta principal (João, 45 anúncios), o Airbnb recusou com: *"Só pode autorizar uma aplicação de gestão de propriedade para gerir a sua conta."* A conta já tem o **Hospitable** ligado (bot de mensagens).

**Implicações:**
- Beds24 e Hospitable são **mutuamente exclusivos na mesma conta Airbnb** — a migração da conta principal é um **cutover** (desligar Hospitable → ligar Beds24), não uma coexistência.
- NÃO desligar o Hospitable durante a fase de testes — o bot de mensagens em produção/teste depende dele.
- Testes com Airbnb fazem-se com **conta de um owner** (sem Hospitable) — que é, aliás, o fluxo real de produção para as propriedades co-hosted (§7b).
- Verificar apps ligadas: Airbnb → Conta → Privacidade e partilha → Serviços conectados.
- Plano de cutover da conta principal (quando o Beds24 estiver provado): janela de baixo movimento; desligar Hospitable; ligar Beds24; reimportar reservas (`importBookings`); redirecionar o pipeline do bot para o transporte Beds24; validar mensagens outbound antes de reativar o bot.

## 8. Arquitetura proposta (alto nível — a refinar antes de implementar)

- `lib/beds24.ts` — cliente com gestão de token (refresh 24h guardado em `system_settings` ou tabela própria), retry, bulk helpers, logging de créditos.
- `app/api/webhooks/beds24/route.ts` — recebe booking webhooks (validar via custom header secreto), upsert de reservas.
- Tabela de mapping: propriedade Lovely ↔ Beds24 `propertyId`/`roomId` ↔ `airbnbListingId`.
- Cron de reconciliação (15 min) com `GET /bookings?modifiedFrom=` — substitui o cron de 1 min do iCal.
- Push de reservas diretas: hook no fluxo de checkout → `POST /bookings`.
- Mensagens: adaptador de transporte para o pipeline AI existente.
- Owner portal: calendário passa a mostrar reservas reais (nomes, valores) em vez de blocos iCal anónimos.
- **UI:** backoffice PMS premium — calendário multi-propriedade (timeline), inbox unificado, painel de reservas — nível Awwwards, pixel perfect, clean. Design a fazer com o skill de frontend-design quando chegarmos à fase de UI.

## 9. Checklist de validação com a conta de teste

Quando a conta Beds24 existir, validar por esta ordem:

- [ ] 1. Criar invite code com todos os scopes → `GET /authentication/setup` → guardar refresh token. Confirmar `GET /authentication/details`.
- [ ] 2. Criar propriedade de teste (`POST /properties`) com um quarto e preço (necessário para inventory endpoints funcionarem).
- [ ] 3. Ligar uma conta Airbnb de teste/real → `GET /channels/airbnb/users` + `/listings` → `POST /channels/airbnb` com `importAsNewProperty` + `importBlockedDates` + `importBookings`. Verificar qualidade dos dados importados.
- [ ] 4. Configurar booking webhook V2 (com custom header) para um endpoint nosso (pode ser um webhook.site primeiro) → criar/alterar uma reserva → medir latência e inspecionar payload.
- [ ] 5. **Teste crítico:** enviar mensagem como hóspede (conta Airbnb secundária) → verificar se o webhook dispara. Se não: medir custo de `GET /bookings/messages?filter=unread` para polling.
- [ ] 6. Enviar mensagem via `POST /bookings/messages` → confirmar entrega no Airbnb + verificar `source`/`authorOwnerId` de mensagens enviadas pela app Airbnb vs API (deteção de resposta humana).
- [ ] 7. `POST /inventory/rooms/calendar` (preço + minStay + blackout) → confirmar propagação ao Airbnb e tempo que demora.
- [ ] 8. `POST /bookings` (reserva direta simulada) → confirmar bloqueio no Airbnb.
- [ ] 9. Registar `X-RequestCost` de cada tipo de chamada → dimensionar créditos para 30+ propriedades.
- [ ] 10. `GET /channels/airbnb/reviews` — ver formato.
- [ ] 11. Co-host: pedir ao suporte Beds24 o botão "Connect with Airbnb Account" (embed no owner portal) e testar o fluxo de autorização com um owner real ou conta de teste.
- [ ] 12. Se usarmos subcontas por owner: validar acesso do token principal via "Allow linked properties" / organização, e confirmar que os créditos são de facto por subconta.

Só depois disto: spec de design detalhada (brainstorming + writing-plans) e plano de migração faseado.

## 9b. Resultados dos testes de API (2026-07-13, conta trial)

Conta Beds24 trial criada; `ownerId: 171444`; 14 dias de trial. Invite code (`lovely-pms-test`, todos os scopes `all:`) trocado com sucesso por refresh token. Refresh token guardado no scratchpad da sessão (não no repo). Validado:

- ✅ **Auth**: `GET /authentication/setup` → token (24h) + refresh token (permanente). `GET /authentication/details` confirma scopes `all:bookings/bookings-personal/bookings-financial/inventory/properties/accounts/channels`, `validToken:true`.
- ✅ **GET /properties**: funciona. Existe 1 propriedade de teste `id:341047` "New Property", `propertyType:hotel`, **currency USD (mudar para EUR)**, com 1 quarto `id:704744` "Room 1" (double, qty 1). Preços a zero (por configurar).
- ✅ **GET /bookings**: vazio (count 0), como esperado.
- ✅ **GET /channels/airbnb/users**: vazio — nenhuma conta Airbnb ligada a esta conta trial (esperado; ligação Airbnb testa-se depois com conta de owner).
- ✅ **Créditos**: cada GET custou **1 crédito** (`X-Request-Cost: 1`). Header `X-Five-Min-Limit-Remaining` desce a partir de 100; reset em ~5min. Nomes reais dos headers: `X-Request-Cost`, `X-Five-Min-Limit-Remaining`, `X-Five-Min-Limit-Resets-In` (não os `X-FiveMinCreditLimit*` da spec).
- ⚠ **`linkedProperties:false`** no token (property access = "All owned by account"). Para a arquitetura de subcontas por owner (§7b/§7c) será preciso um invite code com "Allow linked properties" / estrutura de organização. Validar quando testarmos subcontas.

**Testes de ESCRITA validados (2026-07-13, todos na propriedade 341047 / room 704744, custo ~1 crédito cada):**
- ✅ `POST /properties`: propriedade mudada para **EUR**, nome "Lovely PMS Test Villa", cidade Póvoa de Varzim. Resposta devolve `modified` com os campos alterados.
- ✅ `POST /inventory/rooms/calendar`: preço €120, minStay 3, numAvail 1 para 1-10 ago; blackout 11-12 ago. Read-back confirma tudo (blackout → numAvail 0).
- ✅ `POST /bookings` (criar): reserva direta simulada `id:89764651` (Joao Teste, 5-8 ago, €360, confirmed). Nota: campo `referer:"Direct"` foi normalizado para `"API"` pelo Beds24.
- ✅ Reserva **bloqueia disponibilidade** automaticamente: `GET /availability` mostra 5-7 ago `false`, checkout 8 ago `true`. Prova o ciclo que substitui o export iCal.
- ✅ `POST /bookings` (modificar): estender checkout para 9 ago — `modified` confirmado.
- ✅ `GET /inventory/rooms/offers`: dentro da janela com preço devolve oferta calculada `{offerId:1, price:360, unitsAvailable:1}` (3 noites × €120). **Fora da janela com preço → vazio.** Esta é a base para o agente data-grounded (preço+disponibilidade reais).
- ✅ `GET /accounts`: 1 conta `id:171444` username "lovelymemories". Sem subcontas ainda.
- ✅ `GET /bookings/messages`: vazio (só funciona para reservas OTA — confirmado).

**Estado atual da conta de teste:** 1 reserva de teste ativa (89764651, 5-9 ago). Propriedade limpa e configurada em EUR.

**Ainda por testar (não dependem de Airbnb):** Webhook de reservas + medir latência real (precisa de endpoint público = preview Vercel), criar subconta com linked properties. **Dependem de Airbnb (conta de owner):** import listings, mensagens reais + dúvida do webhook de mensagens, reviews.

## 9c. Ligação Airbnb à conta REAL — resultado (2026-07-13)

Hospitable removido da conta Airbnb do João (não estava em produção — o código do bot só vive no branch `feat/ai-guest-messaging`, nunca em `main`; confirmado por `git ls-tree main`). Beds24 ligado à conta real (aparece no Airbnb como app **"Channelsync"**). Conta em estado "Unused" no Beds24 (ligada, nada mapeado — seguro).

**Descoberta crítica (via `GET /channels/airbnb/listings`):** a conta Airbnb `391837499` (Achilleas/Lovely Memories) tem **45 anúncios no calendário mas a API só expõe 6 para ligação** — todos `sync:none`:
1. The Root - Downtown Premium Loft (id 607230809296653833)
2. The Alluring - Santa Catarina 2BR (id 734054353978879876)
3. The Terraced Loft - Bonfim (id 1543625973258043211)
4. Casa Serena Gaia - Pool+Gym+Sauna+River (id 1639382334426921258)
5. Virtudes Two - Unesco (id 1652149493924437177)
6. Virtudes One - Unesco (id 1652161621003086510)

**Interpretação:** os 6 são os anúncios em que a Lovely é **host principal**; os outros ~39 são **co-hosted** e NÃO aparecem (regra Airbnb, §7b). Confirma quantitativamente que:
- 6 propriedades migram a partir da conta master.
- ~39 exigem onboarding individual via conta do owner → **o botão "Connect with Airbnb" embebido no owner portal é a peça central da migração**, não opcional.

`GET /channels/airbnb/listings` devolve dados ricos do Airbnb (amenities, wifi, fotos, capacidade, morada, smartlock…) — útil para popular conteúdo/knowledge do PMS e do bot. Custo 1 crédito.

**Próximo teste crítico (mensagens + webhook):** pode agora fazer-se num destes 6 anúncios reais. Requer primeiro o endpoint de webhook público (branch preview Vercel) para responder à dúvida "webhook dispara com mensagem nova?". Mapping de UM anúncio (sync "Prices & Availability", nunca "Everything"); preferir importar do Airbnb→Beds24 (não empurrar Beds24 vazio→Airbnb).

## 9d. Teste de ligação co-host — VEREDITO (2026-07-13)

A UI "View Listings" do Beds24 mostra os ~45 anúncios com coluna **Role** (3 níveis: Primary Owner ×6, Primary Co-Host ~×25, Co-Host ~×14) e botão "Import as new" em todos. Nota: `GET /channels/airbnb/listings` só devolve os 6 Primary Owner — a UI vê mais do que a API expõe para ligação.

**Teste empírico no "Hut C" (Co-Host puro, despublicado, listing 45119007):**
- ✅ **Import** (`importAsNewProperty`, `connect:"none"`) → funcionou perfeitamente: propriedade 341066/quarto 704792 criados com preço (€110), moeda EUR, políticas, descontos, custom fields (wifi, cleaning fee €45, pet fee €100). **Import é permitido para co-hosts.**
- ❌ **Ligação** (Sync Type "Prices and Availability" + Update na UI) → **RECUSADO pelo Airbnb**: *"You can't API connect this listing. Only the owner of the listing, or the owner of a team that the listing has been shared with can connect a listing."*

**Conclusões:**
1. Co-hosts podem IMPORTAR (ler) mas não LIGAR (sync). Limitação da wiki confirmada empiricamente.
2. **Pista nova — Airbnb Teams:** a mensagem de erro refere que o *"owner of a team that the listing has been shared with"* PODE ligar. Se os owners partilharem os anúncios com uma equipa Airbnb da Lovely (Professional Hosting Tools), a Lovely poderia ligar tudo a partir da conta master — alternativa potencial ao onboarding por owner no Beds24. **INVESTIGAR: como funcionam Airbnb Teams + sharing de listings + se co-hosting atual é convertível em team sharing.**
3. Teste ao role "Primary Co-Host" (The Gild, 693891606219861591, despublicado): importado como propriedade 341067/quarto 704793. **Ligação: também IMPOSSÍVEL** — na UI de Mapping, o listing do The Gild aparece "Not connected" e o dropdown "Connect" só oferece os 6 anúncios Primary Owner. O Airbnb nem expõe anúncios Primary Co-Host para ligação (não chega a dar erro; simplesmente não estão disponíveis).

**MATRIZ FINAL (2026-07-13):** Import = OK para todos os roles. Ligação/sync = SÓ Primary Owner (6 anúncios). Primary Co-Host e Co-Host não podem ligar de todo. Migração dos ~39 co-hosted: (a) owner autoriza a própria conta (botão embebido no owner portal), ou (b) investigar Airbnb Teams (ver §9d ponto 2).

**Descoberta adicional — "Content in Airbnb" (getlisting):** mesmo para anúncios co-hosted (sem sync), a ligação dá **leitura TOTAL do conteúdo** do anúncio: descrições completas, amenities com metadata (marcas, TV, café), wifi (rede+password), check-in/out e tipo (lockbox), guest controls (pets/fumo/crianças/eventos), listing expectations, fees em micros (cleaning €45, pet €100 no Hut C), descontos 7d/28d, host_fee_percent, fotos todas, quartos/camas. Três usos:
1. **Knowledge base do bot de IA auto-populada** para as 45 propriedades (resolve o pendente "fill property knowledge" do projeto ai-guest-messaging).
2. **`host_roles` identifica o user_id do OWNER de cada anúncio co-hosted** → permite construir automaticamente a tabela de migração anúncio→owner→autorização necessária, e agrupar anúncios por owner no onboarding.
3. Dados financeiros/pricing para o backoffice (fees, descontos, políticas).
⚠ Contém dados sensíveis (wifi passwords, moradas exatas) — acesso restrito na nossa BD. Equivalente programático: `GET /channels/airbnb/listings?airbnbUserId=…&airbnbListingId=…`.

⚠ PERIGO IDENTIFICADO na UI: o dropdown "Connect" de qualquer quarto oferece os 6 listings Primary Owner — é possível mapear por engano um quarto ao anúncio ERRADO (ex.: The Gild → Virtudes 1 live), o que empurraria disponibilidade errada para um anúncio publicado. No PMS final, o mapping tem de ser sempre validado programaticamente (roomId ↔ airbnbListingId corretos), nunca escolhido à mão de uma lista.

Estado das propriedades de teste no Beds24: 341047 (sintética), 341066 Hut C (import, Not Connected), 341067 The Gild (import, ligação por testar).

## 9e. Investigação Airbnb Teams — conclusão (2026-07-13)

Fontes: Airbnb Help 970 (agora redireciona para co-hosts), Help 2513 (team permissions), threads da comunidade (2020-2025), artigo da Hospitable sobre "listing admin".

**Contexto histórico:** o Airbnb removeu o acesso API a co-hosts em ~2020, deliberadamente, empurrando gestores profissionais para Teams (requisitos: 6+ anúncios + professional hosting tools).

**Como as Teams funcionam na prática:**
- O team owner tem permissões totais e **é dono de qualquer anúncio criado por membros da equipa**.
- Funciona bem quando o gestor **cria os anúncios de raiz na conta dele** (foi assim que outros PMs resolveram).
- **BECO SEM SAÍDA para anúncios existentes de owners:** um owner com anúncio ativo não pode simplesmente "partilhar com a equipa" de uma empresa de gestão — a regra "You can join a team as long as you aren't currently hosting" impede-o; nem o suporte do Airbnb encontrou caminho num caso documentado. Transferir o anúncio de conta = perder histórico/reviews e cancelar reservas. Irrealista.
- **Confirmação da indústria:** a Hospitable resolve o MESMO problema com o fluxo "invite the listing admin" — o owner (listing admin) liga a própria conta Airbnb ao PMS. Hospitable e Beds24 convergem na mesma solução → é o padrão da indústria, não uma limitação do Beds24.

**Decisões que daqui resultam:**
1. Migração dos ~39 co-hosted: **botão "Connect with Airbnb" do Beds24 embebido no owner portal** (per-owner OAuth). Caminho único viável. Pedir o botão ao suporte Beds24.
2. **Política para o futuro:** novas propriedades angariadas devem ser listadas na conta master da Lovely (como as 6 Primary Owner) em vez de co-hosting na conta do owner — dá controlo API total desde o dia 1.
3. Teams só se tornariam relevantes se a Lovely criasse anúncios de raiz — irrelevante para o parque atual.

## 9f. FASEAMENTO APROVADO (2026-07-13, decisão do Marcelo)

**Fase 1 — As 6 Primary Owner primeiro:** construir e provar o pipeline completo (ligação, sync calendário/preços, reservas, mensagens, webhook, backoffice) apenas com os 6 anúncios de que a Lovely é dona: The Root, The Alluring, The Terraced Loft, Casa Serena Gaia, Virtudes One, Virtudes Two. Ambiente: branch preview Vercel + tabelas aditivas.

**Fase 2 — Escalar para os ~39 co-hosted:** só depois de a Fase 1 estar OK e a funcionar. Onboarding via botão "Connect with Airbnb" (pedir ao suporte Beds24) embebido no owner portal; usar `host_roles` dos imports para mapear anúncio→owner e agrupar convites.

## 10. Decisões já tomadas

- 2026-07-13: análise aprovada pelo Marcelo; vai criar conta de teste Beds24. Avançamos passo a passo em cima deste documento.
- Stripe mantém-se direto (não usar `/channels/stripe`).
- Hospitable continua em uso até o Beds24 provar messaging (validação §9.5–9.6).
