# Imóveis à venda (Opção A, Fase 1) — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separador público "Imóveis à venda" (catálogo + página do imóvel com formulário que envia email) e backoffice para gerir os anúncios, com ligação opcional a uma casa gerida e resumo de rendimento automático.

**Architecture:** Tabela própria `sale_listings`, fechada ao público (RLS sem políticas); as páginas públicas leem no servidor com a service role e só colunas públicas. Lógica pura em `lib/sales/*` (testada com `node:test`), leitura privilegiada em `lib/sales/repo.ts` (`server-only`), escrita do backoffice em `app/actions/sales.ts` (cada ação com `requireRole` + módulo `sales`). Formulário de contacto numa rota API com limite de pedidos guardado em hash na tabela `form_rate_limits`.

**Tech Stack:** Next.js 16 App Router, next-intl (en, pt), Supabase (Postgres + Storage), zod 4, react-leaflet 5, Resend (`lib/email.ts`), testes `node:test` via `tsx`.

**Spec:** `docs/superpowers/specs/2026-11-20-sale-listings-design.md` (aprovado a 2026-11-20). Ler o spec antes de cada tarefa: o plano decide ficheiros, nomes e testes; o spec decide o comportamento.

## Global Constraints

- Base de dados única = produção. Nunca criar reservas; nunca enviar emails reais em testes (usar `EMAIL_DRY_RUN=1` da Tarefa 4 ou envio simulado). Anúncios de teste: em rascunho e apagados no fim (linha e ficheiros). Só podem ser publicados temporariamente **antes do deploy da feature** (até lá o site em produção não lê a tabela, por isso ninguém os vê); depois do deploy, nunca.
- Migrações: ficheiro em `supabase/migrations/`, aplicado à mão pelo Marcelo no SQL Editor. A migração desta feature é **aditiva** (só tabelas, bucket e funções novas): aplica-se **antes** do deploy do código que a usa. Dizer sempre ao Marcelo que tem de a aplicar.
- Textos de interface em `messages/en.json` e `messages/pt.json`, chaves em paridade (namespaces novos `Sales` e `AdminSales`; chaves novas `Navbar.forSale`, `AdminSidebar.sales`). Conteúdo dos anúncios só em en/pt (sem `he`).
- `Link`/`redirect`/`useRouter` de `@/i18n/routing`. Datas `YYYY-MM-DD` com `parseDateLocal` (`lib/utils.ts`).
- Ações do servidor: começar com `requireRole(PROPERTY_EDITORS)` e `checkPermission('sales', 'can_edit')`. Helpers com service role que confiam nos argumentos vão para módulos `server-only` em `lib/`, nunca exportados de `app/actions/`.
- Nunca enviar ao browser nem registar: `address_private`, `created_by`, `energy_cert_number`, `energy_cert_path`, dados pessoais do formulário. Coordenadas públicas arredondadas a 3 casas decimais.
- Depois de mexer em RLS/permissões/colunas: `npm run check:exposure` sem FAIL.
- Verificação de cada tarefa com código: `npx tsc --noEmit` sem erros; lint dos ficheiros tocados igual ou melhor que HEAD; `npm run test:sales` verde quando houver testes.
- Commits: preparar os ficheiros da tarefa; **commit só quando o Marcelo pedir**, autor `mnlopes` como nos commits anteriores, mensagem em português terminada com a linha `Co-Authored-By` habitual. Nunca incluir `.claude/launch.json`.
- Não mexer em `legacy-archive/`, `temp-app/`, `scratch/`, `concierge/` (raiz).

## Review Focus

1. **Preço sob consulta:** sem preço, sem €/m², sem rentabilidade; JSON-LD sem `price`; vai para o fim nas ordenações por preço; excluído quando há filtro de preço máximo. → testes nas Tarefas 2, 3 e 5.
2. **Conteúdo só numa língua** (pt preenchido, en vazio ou vice-versa): título, descrição e SEO usam a outra língua, nunca texto vazio. → testes nas Tarefas 2 e 5.
3. **Rascunho ou slug inexistente visitado pelo público:** 404, fora do sitemap e do catálogo; só a equipa com sessão o vê, com aviso "Rascunho" e `noindex`. → Tarefas 7 e 10 (verificação no browser) e teste de `applyFilters` (Tarefa 2).
4. **Abuso do formulário:** o mesmo email/IP repetido é travado (429 com mensagem amigável), a confirmação ao comprador não sai mais de 1 vez por hora por email, o campo escondido devolve um falso sucesso, HTML nos campos sai escapado nos dois emails. → testes na Tarefa 4.
5. **Casa ligada sem dados suficientes** (sem reservas, menos de 3 meses, CSV do Airbnb desatualizado): resumo nulo ou não elegível; a página nunca mostra o resumo nesse caso, mesmo com `show_performance` ligado; o editor avisa. → testes na Tarefa 3.

---

### Task 1: Mockup A atualizado para o cliente

O cliente aprova isto antes de se construir. Mockups em inglês, como os atuais. Opção B fica igual.

**Files:**
- Modify: `app/[locale]/mockups-propertysell/page.tsx` (ecrãs da Opção A)
- Modify: `app/[locale]/mockups-propertysell/_components/AdminShell.tsx` (menu: "Sale listings" no lugar de "Sale leads")
- Modify: `app/[locale]/mockups-propertysell/a/page.tsx`
- Modify: `app/[locale]/mockups-propertysell/a/garden-house-paranhos/page.tsx`
- Modify: `app/[locale]/mockups-propertysell/a/admin/page.tsx` (passa a ser a lista)
- Create: `app/[locale]/mockups-propertysell/a/admin/edit/page.tsx` (editor)
- Create: `app/[locale]/mockups-propertysell/a/_components/ContactBox.tsx` (cliente, só para o mockup)
- Delete: `app/[locale]/mockups-propertysell/a/admin/leads/page.tsx`

- [ ] **Step 1:** Ecrãs da Opção A no índice: "For Sale page", "Property for sale", "Backoffice — sale listings" (`/a/admin`), "Backoffice — edit listing" (`/a/admin/edit`). Texto da opção sem "lead inbox": "…a property page with a contact form that emails the team, and the listings managed in the backoffice."
- [ ] **Step 2:** `grep -rn -i "leads" "app/[locale]/mockups-propertysell"` só pode devolver o comentário de `data.ts`; corrigir todas as outras referências (menu, cartão "3 new leads", separador "Leads · 3").
- [ ] **Step 3:** Catálogo (`a/page.tsx`): etiqueta "Under offer" ao lado de New/Reserved/Sold; um cartão com "Price on request" (sem €/m²).
- [ ] **Step 4:** Página do imóvel: tirar o botão de favoritos e a estatística "Guest rating" (ficam 3: revenue, gross yield, occupancy) e acrescentar a nota de rodapé do spec. Em Documentos fica só "Floor plan (PDF)" e o texto "Energy certificate available on request". Contacto passa para `ContactBox` (cliente): o seletor "Request info / Book a visit" funciona, e em "Book a visit" aparece o campo "Preferred dates and times". O cartão AMI mostra "Licence AMI nº [to confirm]".
- [ ] **Step 5:** Lista do backoffice (`a/admin/page.tsx`): tabela com foto, referência (`LM-V-000N`), título, cidade, preço, estado, Published/Draft, data; filtro por estado; botão "New listing" para `/a/admin/edit`. Dados de `HOMES`.
- [ ] **Step 6:** Editor (`a/admin/edit/page.tsx`, cliente): separadores clicáveis Photos, Info, Sale, Location, Documents, Performance com os campos do spec ("Backoffice → Editor"). Info tem o campo "Linked managed home (optional)" com uma casa escolhida e o botão "Copy data from this home". Performance mostra os números, "Data until <date>" e o interruptor. Descrição só EN/PT. Coluna lateral: Published/Draft, referência automática, pré-visualização do cartão, "View page", "Save", "Publish", e a lista do que falta para publicar.
- [ ] **Step 7: Verificar.** `npx tsc --noEmit` sem erros. Com o servidor local (`preview_start` "dev"), abrir os 4 ecrãs em desktop e telemóvel (375 px): sem erros na consola, sem scroll horizontal, sem "leads".
- [ ] **Step 8:** Preparar commit: `git add "app/[locale]/mockups-propertysell"` (inclui a remoção). Mostrar ao Marcelo os links para enviar ao cliente. **Parar aqui até o cliente aprovar** (as tarefas seguintes ajustam-se ao que ele pedir).

---

### Task 2: Domínio puro — tipos, validação, formatação, filtros, cópia da casa

**Files:**
- Create: `lib/sales/types.ts`, `lib/sales/validation.ts`, `lib/sales/format.ts`, `lib/sales/filters.ts`, `lib/sales/copy-from-property.ts`
- Test: `lib/sales/__tests__/domain.test.ts`
- Modify: `package.json` (script `"test:sales": "npx -y tsx --test lib/sales/__tests__/*.test.ts"`)

**Interfaces:**
- Produces (`types.ts`):
  - `type Localized = { en?: string; pt?: string }`
  - `SALE_STATUSES = ['available','reserved','under_offer','sold'] as const`, `SALE_TYPES = ['apartment','house','building','land'] as const`, `SALE_CONDITIONS = ['new','renovated','good','to_renovate'] as const`, `ENERGY_CLASSES = ['A+','A','B','B-','C','D','E','F','exempt'] as const`, `TYPOLOGIES = ['T0','T1','T2','T3','T4','T5+'] as const`, e os tipos `SaleStatus`, `SaleType`, `SaleCondition`, `EnergyClass`.
  - `type SaleImage = { url: string; alt: Localized; order: number; is_main: boolean }`
  - `type SaleListing` (colunas públicas): `id, reference, slug, property_id: string|null, published: boolean, published_at: string|null, status, price: number|null, price_on_request, negotiable, title, subtitle, description: Localized, features: Localized[], type, typology: string|null, bedrooms, bathrooms: number|null, condition: SaleCondition|null, gross_area, useful_area, plot_area: number|null, year_renovated: number|null, furnished: boolean|null, city, area_label, street: string|null, lat, lng: number|null, nearby: { name: Localized; distance: Localized }[], energy_class: EnergyClass|null, floor_plan_url: string|null, images: SaleImage[], show_performance: boolean, al_license: string|null, created_at, updated_at: string`
  - `type SaleListingPrivate = SaleListing & { address_private: string|null; energy_cert_number: string|null; energy_cert_path: string|null; created_by: string|null }`
  - `PUBLIC_SALE_COLUMNS: string` (lista separada por vírgulas, exatamente os campos de `SaleListing`)
- Produces (`validation.ts`): `saleListingInputSchema` (zod; campos editáveis de `SaleListingPrivate`, sem `id/reference/created_*/updated_at/published_at`); `type PublishProblem = 'title'|'photo'|'type'|'price'|'energy_class'|'city'`; `publishProblems(l: Pick<SaleListing,'title'|'images'|'type'|'price'|'price_on_request'|'energy_class'|'city'>): PublishProblem[]`; `saleInquirySchema` com `{ listingId: uuid, kind: 'info'|'visit', name: 1–120, email: email ≤200, phone?: ≤40, purpose: 'live'|'invest'|'both', message: ≤2000, visitTimes?: ≤300, consent: literal(true), locale: 'en'|'pt', website?: string }`.
- Produces (`format.ts`): `localized(v: Localized|undefined, locale: string): string` (língua pedida, senão a outra, senão `''`); `formatEuro(n: number, locale: string): string` (`€310,000` en / `310 000 €` pt, sem decimais); `pricePerM2(l: Pick<SaleListing,'price'|'price_on_request'|'gross_area'>): number|null`; `isNewListing(publishedAt: string|null, today: string): boolean` (< 30 dias); `daysListed(publishedAt: string|null, today: string): number|null`; `slugify(text: string): string` (minúsculas, sem acentos, `-`); `approxCoord(n: number|null): number|null` (3 casas decimais).
- Produces (`filters.ts`): `type CatalogueSort = 'newest'|'price_asc'|'price_desc'`; `type CatalogueFilters = { type?: SaleType; city?: string; minBedrooms?: number; maxPrice?: number; sort: CatalogueSort }`; `parseFilters(sp: Record<string, string|string[]|undefined>): CatalogueFilters` (valores inválidos ignorados, `sort` por defeito `newest`); `filtersToQuery(f: CatalogueFilters): string`; `applyFilters(list: SaleListing[], f: CatalogueFilters): SaleListing[]`.
- Produces (`copy-from-property.ts`): `copyFromProperty(p: CopySourceProperty): { draft: Partial<SaleListingPrivate>; amenitySuggestions: Localized[] }`, com `CopySourceProperty = { images: {url: string; alt?: Localized; is_main?: boolean; order?: number}[]; bedrooms: number|null; bathrooms: number|null; area: number|null; description: Localized|null; city: string|null; lat: number|null; lng: number|null; address: string|null; amenities: { items?: Localized[] }[]|null }`. Mapa: `images`→`images` (mesmas URLs, `order` reindexado, uma `is_main`), `area`→`gross_area`, `address`→`address_private`, os restantes com o mesmo nome; sugestões = itens das comodidades sem repetidos (comparação sem maiúsculas no `en`).

- [ ] **Step 1: Escrever os testes** (`domain.test.ts`), com estas asserções:
  - `localized({pt:'Casa'}, 'en') === 'Casa'`; `localized({}, 'pt') === ''`.
  - `publishProblems` de um anúncio vazio contém as 6 razões; com `price: null, price_on_request: true` não contém `'price'`; título só em pt chega para `'title'`.
  - `pricePerM2({price: 310000, price_on_request: false, gross_area: 68}) === 4559` (arredondado); com `price_on_request: true` → `null`; com área 0 → `null`.
  - `isNewListing('2026-11-01', '2026-11-20') === true`; `isNewListing('2026-10-01', '2026-11-20') === false`; `isNewListing(null, …) === false`.
  - `slugify('Garden House Paranhos — T1!') === 'garden-house-paranhos-t1'`; `slugify('Casa da Ribeira, Gaia') === 'casa-da-ribeira-gaia'`.
  - `parseFilters({type:'house', minBedrooms:'2', maxPrice:'abc', sort:'zzz'})` → `{type:'house', minBedrooms:2, sort:'newest'}`.
  - `applyFilters`: vendidos ficam sempre no fim; com `sort:'price_asc'` os "sob consulta" vêm depois dos com preço; `maxPrice: 300000` exclui um "sob consulta" e um de 310000; `minBedrooms: 2` exclui um T1; anúncios com `published: false` nunca saem.
  - `copyFromProperty`: `area: 70` → `draft.gross_area === 70`; `address` vai para `address_private`; duas comodidades "Wifi"/"WiFi" dão uma só sugestão; a primeira imagem fica `is_main: true` quando nenhuma o era.
  - `saleInquirySchema.safeParse({...válido, consent: false}).success === false`; email inválido falha; `kind: 'visit'` com `visitTimes` passa.
- [ ] **Step 2:** `npm run test:sales` → falha (módulos não existem).
- [ ] **Step 3:** Implementar os 5 módulos com as assinaturas acima.
- [ ] **Step 4:** `npm run test:sales` → PASS; `npx tsc --noEmit` sem erros.
- [ ] **Step 5:** Preparar commit dos ficheiros da tarefa (`lib/sales/*`, `package.json`).

---

### Task 3: Cálculo do rendimento

**Files:**
- Create: `lib/sales/performance.ts`
- Test: `lib/sales/__tests__/performance.test.ts`

**Interfaces:**
- Consumes: `ownerRevenue`, `OWNER_REPORT_STATUSES` de `lib/owner-revenue.ts`.
- Produces:
  - `type PerfReservation = { check_in: string; check_out: string; status: string; platform: string|null; import_batch_id: string|null; net_amount: number|null; total_price: number|null; city_tax_total: number|null; breakfast_total: number|null; transfer_total: number|null }`
  - `type PerformanceSnapshot = { windowStart: string; windowEnd: string /* exclusivo */; days: number; revenue: number; occupancy: number /* 0..1 */; grossYield: number|null; fullYear: boolean; eligible: boolean /* days >= 90 */; staleDays: number }`
  - `computePerformance(rows: PerfReservation[], opts: { today: string; price: number|null; priceOnRequest: boolean }): PerformanceSnapshot | null`

Regras (do spec, secção "Rendimento"): só linhas com estado em `OWNER_REPORT_STATUSES`; `windowEnd` = o menor entre `today` e o maior `check_out` das linhas com `platform === 'airbnb'` e `import_batch_id` preenchido (sem essas linhas: `today`); `windowStart` = o maior entre `windowEnd − 365 dias` e o menor `check_in`; sem linhas → `null`; receita = soma de `ownerRevenue` das linhas com `check_in` em `[windowStart, windowEnd)`; ocupação = noites distintas dentro da janela ÷ `days`; `fullYear = days >= 365`; `grossYield` só se `fullYear`, `price > 0` e `!priceOnRequest`; `staleDays` = dias entre `windowEnd` e `today`. Datas com `parseDateLocal`/aritmética de dias sem fusos.

- [ ] **Step 1: Escrever os testes**, com `today = '2026-11-20'`:
  - Sem linhas → `null`; só linhas `cancelled` → `null`.
  - Casa só com reservas do site num ano inteiro: `windowEnd === '2026-11-20'`, `days === 365`, `fullYear === true`, `grossYield === revenue / price`.
  - Mesma estadia como reserva do site e como reserva importada nas mesmas noites (sobreposição de 3 noites) → noites contadas uma vez (ocupação = noites distintas / dias).
  - Estadia que começa antes da janela e acaba dentro: só as noites dentro contam para a ocupação; a receita não entra (check-in fora da janela).
  - Última estadia importada do Airbnb com `check_out = '2026-10-12'` → `windowEnd === '2026-10-12'`, `staleDays === 39`.
  - Primeira estadia em `2026-06-01` → `windowStart === '2026-06-01'`, `fullYear === false`, `grossYield === null`, `eligible === true`.
  - Primeira estadia em `2026-10-01` (50 dias) → `eligible === false`.
  - `priceOnRequest: true` com ano inteiro → `grossYield === null`.
  - Linha com `net_amount: 300` e `total_price: 400` conta 300 (regra de `ownerRevenue`).
- [ ] **Step 2:** `npm run test:sales` → falha.
- [ ] **Step 3:** Implementar `computePerformance`.
- [ ] **Step 4:** `npm run test:sales` → PASS. Verificação só de leitura: um script de rascunho no scratchpad que lê as reservas de 2 casas reais com a service role e imprime o resumo (sem gravar nada); valores plausíveis (ocupação entre 0 e 1, receita > 0).
- [ ] **Step 5:** Preparar commit.

---

### Task 4: Emails do pedido, envio em modo de teste e limite de pedidos

**Files:**
- Modify: `lib/email-templates.ts` (exportar `escapeHtml`, linha 11)
- Modify: `lib/email.ts` (modo `EMAIL_DRY_RUN`)
- Create: `lib/sales/emails.ts`, `lib/rate-limit.ts`
- Test: `lib/sales/__tests__/emails.test.ts`

**Interfaces:**
- Produces:
  - `type InquiryEmailData = { kind: 'info'|'visit'; name: string; email: string; phone?: string; purpose: 'live'|'invest'|'both'; message: string; visitTimes?: string; listingTitle: string; reference: string; listingUrl: string }`
  - `saleInquiryTeamEmail(d: InquiryEmailData): { subject: string; html: string }`. Assunto: `🏡 PEDIDO DE VISITA: [Ref: ${reference}] - ${listingTitle}` ou `🏡 PEDIDO DE INFORMAÇÃO: [Ref: ${reference}] - ${listingTitle}`.
  - `saleInquiryBuyerEmail(d: InquiryEmailData, locale: 'en'|'pt'): { subject: string; html: string }`. Assunto en: `Lovely Memories | We received your request [Ref: ${reference}]`; pt: `Lovely Memories | Recebemos o seu pedido [Ref: ${reference}]`. O corpo não repete a mensagem nem o telefone (só nome, imóvel, referência e "respondemos em breve").
  - `hitRateLimit(scope: string, value: string, windowSeconds: number, max: number): Promise<boolean>` em `lib/rate-limit.ts` (`server-only`): `true` = pode passar. Chave = HMAC-SHA256(`${scope}:${value.trim().toLowerCase()}`) com a chave `SUPABASE_SERVICE_ROLE_KEY`; chama a função `hit_rate_limit(p_key text, p_window_seconds int, p_max int) returns boolean` (Tarefa 6) com a service role; em erro devolve `true` e regista só `scope` e a mensagem do erro.
  - `lib/email.ts`: com `process.env.EMAIL_DRY_RUN === '1'`, `sendEmail` não chama a Resend, regista `[email dry-run] <subject> → <domínio do destinatário>` e devolve `{ success: true }`.

- [ ] **Step 1: Escrever os testes:** com `name: '<img src=x onerror=alert(1)>'`, `message: '<script>x</script>'`, `listingTitle: 'A & B'`, os dois `html` não contêm `<img`, `<script` nem `& B` por escapar (contêm `&lt;img`, `&amp; B`); o assunto da equipa muda com `kind`; o email do comprador em pt contém "Recebemos o seu pedido" e não contém o telefone nem a mensagem.
- [ ] **Step 2:** `npm run test:sales` → falha.
- [ ] **Step 3:** Implementar `lib/sales/emails.ts` (visual como os templates atuais de `lib/email-templates.ts`), exportar `escapeHtml`, o modo dry-run em `lib/email.ts` e `lib/rate-limit.ts`.
- [ ] **Step 4:** `npm run test:sales` → PASS; `npx tsc --noEmit` sem erros.
- [ ] **Step 5:** Preparar commit.

---

### Task 5: SEO do anúncio

**Files:**
- Modify: `lib/property-seo.ts` (exportar `placePhrase`)
- Create: `lib/sales/seo.ts`
- Test: `lib/sales/__tests__/seo.test.ts`

**Interfaces:**
- Consumes: `placePhrase(city, locale)` de `lib/property-seo.ts`; `clampDescription` de `lib/seo.ts`; `localized`, `formatEuro` (Tarefa 2).
- Produces:
  - `saleHeadline(l: SaleListing, locale: string): string`. Exemplos que fixam a regra: moradia T1 no Porto → pt `Moradia T1 à venda no Porto`, en `1-Bedroom House for Sale in Porto`; apartamento T0 → pt `Estúdio à venda…`, en `Studio for Sale…`; prédio → `Prédio à venda…` / `Building for Sale…`; terreno → `Terreno à venda…` / `Plot of Land for Sale…`; sem tipologia → só o tipo (`Apartamento à venda…` / `Apartment for Sale…`); sem cidade → sem a frase do local.
  - `saleSeoTitle(l, locale) = \`${título} — ${saleHeadline}\`` (título com fallback de língua).
  - `saleSeoDescription(l, locale): string` com o headline, a área bruta, a classe energética e o preço (ou "Preço sob consulta" / "Price on request"), limitada a 160 com `clampDescription`.
  - `saleImageAlt(l, locale, index: number): string` (`${título} — ${headline em minúsculas}`, e ` (n)` a partir da 2.ª foto).
  - `saleJsonLd(l: SaleListing, locale: string, url: string): Record<string, unknown>`: `@type: 'RealEstateListing'`, `name`, `description`, `url`, `image` (URLs), `datePosted` (`published_at`), `offers: { '@type': 'Offer', priceCurrency: 'EUR', price?, availability }`; `availability` = `https://schema.org/SoldOut` se `sold`, senão `https://schema.org/InStock`; sem `price` quando `price_on_request`.

- [ ] **Step 1: Escrever os testes** com as frases de exemplo acima; título só em pt usado no en; `saleJsonLd` de um "sob consulta" não tem `price`; vendido → `SoldOut`; descrição ≤ 160 caracteres.
- [ ] **Step 2:** `npm run test:sales` → falha.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm run test:sales` → PASS.
- [ ] **Step 5:** Preparar commit.

---

### Task 6: Base de dados, ficheiros e permissões

**Files:**
- Create: `supabase/migrations/20261121100000_sale_listings.sql`
- Modify: `lib/permission-defaults.ts` (módulo `{ id: 'sales', label: 'Sale Listings' }`; `MODULE_DEFAULTS.sales` = admin e editor com `can_view`/`can_edit` true)
- Modify: `scripts/check-public-exposure.ts`

**Interfaces:**
- Produces: tabelas `public.sale_listings` (colunas de `SaleListingPrivate`, Tarefa 2) e `public.form_rate_limits (key text, window_start timestamptz, count int, primary key (key, window_start))`; função `public.hit_rate_limit(p_key text, p_window_seconds int, p_max int) returns boolean`; buckets `sale-listings` (público) e `sale-listings-private` (privado).

Conteúdo da migração (estilo de `20261118100000_locked_dates_private.sql`: `BEGIN/COMMIT`, comentários em português, verificação no fim, instruções para voltar atrás):
- Sequência `sale_listing_ref_seq`; `reference text not null unique default 'LM-V-' || lpad(nextval('sale_listing_ref_seq')::text, 4, '0')`; `slug text not null unique`; `property_id uuid references public.properties(id) on delete set null`; `check` para `status`, `type`, `condition`, `energy_class` com os valores da Tarefa 2; jsonb com defaults `'{}'`/`'[]'`; `published boolean not null default false`; `created_at`/`updated_at` `default now()`.
- `hit_rate_limit`: `SECURITY DEFINER`, `set search_path = public`; janela = `date_bin` de `p_window_seconds`; `insert … on conflict do update set count = count + 1 returning count`; apaga linhas com mais de 1 dia; devolve `count <= p_max`. `REVOKE EXECUTE … FROM public, anon, authenticated; GRANT EXECUTE … TO service_role`.
- RLS ligado nas duas tabelas, sem políticas; `REVOKE ALL … FROM anon, authenticated`.
- Buckets por `insert into storage.buckets (id, name, public) … on conflict do nothing`. Políticas em `storage.objects` para `INSERT`, `UPDATE`, `DELETE` nos dois buckets e `SELECT` no privado: `bucket_id = '…' and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('editor'))`.
- `insert into public.role_permissions (role_name, module_name, can_view, can_edit) values ('admin','sales',true,true), ('editor','sales',true,true), ('owner','sales',false,false) on conflict do nothing`.
- Verificação final: `has_table_privilege` de `anon`/`authenticated`/`service_role` nas duas tabelas e `has_function_privilege` de `anon` na função (esperado false/false/true e false), e as políticas criadas.

`check-public-exposure.ts`: três verificações novas, FAIL se o público consegue: ler `sale_listings`, ler `form_rate_limits`, executar `hit_rate_limit`, ou listar ficheiros em `sale-listings-private`.

- [ ] **Step 1:** Escrever a migração e as alterações de código.
- [ ] **Step 2:** `npm run check:exposure` antes de aplicar: as verificações novas passam (a tabela ainda não existe → "não legível").
- [ ] **Step 3:** Pedir ao Marcelo para aplicar a migração no SQL Editor e mandar o resultado da verificação (esperado: anon/authenticated `false`, service_role `true`).
- [ ] **Step 4:** Depois de aplicada: `npm run check:exposure` sem FAIL; com a service role, `select count(*) from sale_listings` = 0 e `rpc('hit_rate_limit', {p_key:'test', p_window_seconds:60, p_max:2})` → `true, true, false` em três chamadas (apagar a linha `test` no fim).
- [ ] **Step 5:** Preparar commit.

---

### Task 7: Leitura no servidor e ações do backoffice

**Files:**
- Create: `lib/sales/repo.ts` (`server-only`)
- Create: `app/actions/sales.ts` (`'use server'`)

**Interfaces:**
- Consumes: Tarefas 2, 3 e 6; `getSupabaseAdmin` de `lib/supabase.ts`; `requireRole`, `PROPERTY_EDITORS`; `checkPermission` de `app/actions/permissions.ts`; `logActivity` de `lib/audit-log.ts`.
- Produces (`repo.ts`):
  - `getPublishedSaleListings(): Promise<SaleListing[]>` (só `published = true`, colunas `PUBLIC_SALE_COLUMNS`).
  - `getSaleListingBySlug(slug: string, opts?: { includeDrafts?: boolean }): Promise<SaleListing | null>`.
  - `getSalePerformance(l: SaleListing): Promise<PerformanceSnapshot | null>` (lê as reservas da casa ligada; `unstable_cache` com `revalidate: 86400` e tag `sale-perf-<property_id>`; `null` sem `property_id`).
  - `getSalesContact(): Promise<{ amiLicense: string | null; whatsapp: string | null }>` (chave `sales_contact` em `system_settings`).
- Produces (`app/actions/sales.ts`), todas com a guarda das Global Constraints:
  - `listSaleListings(): Promise<SaleListingPrivate[]>`
  - `getSaleListing(id: string): Promise<SaleListingPrivate | null>`
  - `saveSaleListing(id: string, input: unknown): Promise<{ ok: true } | { ok: false; error: string; problems?: PublishProblem[] }>`: `id` é um uuid gerado no browser (insere se não existir, atualiza se existir); valida com `saleListingInputSchema`; se `published` → `publishProblems` vazio, senão devolve `problems`; `published_at` preenchido na primeira publicação; `slug` único (se colidir, acrescenta `-2`, `-3`…); `logActivity` CREATE/UPDATE `SALE_LISTING`; `revalidatePath` do catálogo, da página e do sitemap.
  - `deleteSaleListing(id: string): Promise<{ ok: boolean }>`: apaga a linha e os ficheiros com prefixo `<id>/` nos dois buckets.
  - `searchLinkableProperties(query: string): Promise<{ id: string; slug: string; title: Localized; city: string | null }[]>` (só `is_multi_unit = false`, máx. 10).
  - `getPropertyCopy(propertyId: string): ReturnType<typeof copyFromProperty>`.
  - `previewSalePerformance(propertyId: string, price: number | null, priceOnRequest: boolean): Promise<PerformanceSnapshot | null>` (sem cache).
  - `getEnergyCertUrl(id: string): Promise<string | null>` (URL assinado de 10 minutos do bucket privado).

- [ ] **Step 1:** Implementar os dois ficheiros.
- [ ] **Step 2:** `npx tsc --noEmit` sem erros; `npm run build` sem erros.
- [ ] **Step 3:** No manifesto (`.next/server/server-reference-manifest.json`), as ações expostas de `app/actions/sales.ts` são exatamente as 8 acima e nenhuma de `lib/sales/repo.ts`.
- [ ] **Step 4:** Sem sessão, chamar `listSaleListings` pelo servidor local → erro "Not authorized" (o mesmo método usado no S-3).
- [ ] **Step 5:** Preparar commit.

---

### Task 8: Backoffice — lista e editor (texto, venda, localização)

**Files:**
- Create: `app/[locale]/admin/sales/layout.tsx` (`guardModule('sales', locale, \`/${locale}\`)`), `app/[locale]/admin/sales/page.tsx`, `app/[locale]/admin/sales/new/page.tsx`, `app/[locale]/admin/sales/[id]/page.tsx`
- Create: `components/admin/sales/SaleListingsTable.tsx`, `components/admin/sales/SaleListingEditor.tsx`, `components/admin/sales/SaleInfoTab.tsx`, `components/admin/sales/SaleSaleTab.tsx`, `components/admin/sales/SaleLocationTab.tsx`
- Modify: `components/admin/AdminSidebar.tsx` e `components/admin/AdminBottomNav.tsx` (item `hasAccess('sales')` → `/admin/sales`, ícone `Building2`), `messages/en.json`, `messages/pt.json` (`AdminSidebar.sales`, namespace `AdminSales`)

**Interfaces:**
- Consumes: ações da Tarefa 7; `slugify`, `pricePerM2`, `publishProblems` (Tarefa 2).
- Produces: `<SaleListingEditor initial={SaleListingPrivate | null} id={string} />` com separadores por id `photos | info | sale | location | documents | performance`. As Tarefas 9 acrescentam `photos`, `documents` e `performance` neste mesmo componente.

- [ ] **Step 1:** Lista: tabela com os campos do spec, filtro por estado, "Novo anúncio" (`/admin/sales/new` gera `crypto.randomUUID()` e abre o editor vazio com esse id), abrir para editar. Estilo do backoffice atual (cores e componentes de `/admin/coupons` e `/admin/properties`).
- [ ] **Step 2:** Editor: separadores Informação, Venda e Localização com os campos do spec; slug gerado do título enquanto não for editado à mão; preço/m² calculado; coluna lateral com estado Publicado/Rascunho, referência (depois de guardado), pré-visualização do cartão, "Ver página" (abre `/[locale]/for-sale/<slug>`), "Guardar", "Publicar" e a lista do que falta (`publishProblems`, com textos do `AdminSales`). Separadores Fotos, Documentos e Rendimento aparecem mas dizem "disponível depois de guardar" até a Tarefa 9.
- [ ] **Step 3:** Verificar: `npx tsc --noEmit`; `npm run build`; servidor local com sessão de admin do Marcelo (ele inicia sessão no browser do painel): criar um anúncio de teste em **rascunho**, guardar, voltar a abrir, mudar o estado; tentar publicar sem foto → lista do que falta; um editor sem o módulo `sales` não vê o item nem entra no URL. Apagar o anúncio de teste no fim.
- [ ] **Step 4:** Preparar commit.

---

### Task 9: Backoffice — fotos, documentos, casa ligada, rendimento, definições

**Files:**
- Create: `lib/sales/image-resize.ts` (browser), `components/admin/sales/SalePhotosTab.tsx`, `components/admin/sales/SaleDocumentsTab.tsx`, `components/admin/sales/SalePerformanceTab.tsx`, `components/admin/sales/LinkPropertyPicker.tsx`
- Modify: `components/admin/sales/SaleListingEditor.tsx`, `components/admin/sales/SaleInfoTab.tsx` (picker + "Copiar dados da casa")
- Modify: `app/[locale]/admin/settings/page.tsx` (secção "Vendas": nº AMI e WhatsApp, guardados com `updateSystemSetting('sales_contact', { ami_license, whatsapp })`)
- Modify: `messages/en.json`, `messages/pt.json`

**Interfaces:**
- Consumes: `searchLinkableProperties`, `getPropertyCopy`, `previewSalePerformance`, `getEnergyCertUrl`, `saveSaleListing` (Tarefa 7); `supabase` do browser (`lib/supabase.ts`).
- Produces: `resizeImage(file: File, maxSide = 2400, quality = 0.82): Promise<Blob>` (JPEG; ficheiros mais pequenos ficam como estão).

- [ ] **Step 1:** Fotos: carregar várias (redimensionadas), ordenar, escolher a principal, alt pt/en, apagar (também do bucket). Caminho `sale-listings/<id>/photos/<timestamp>-<aleatório>.jpg`; URL público guardado em `images`.
- [ ] **Step 2:** Documentos: classe energética (botões, inclui "Isento"), nº do certificado, PDF do certificado no bucket privado (`<id>/docs/energy-certificate.pdf`; guarda `energy_cert_path`; botão "Abrir" usa `getEnergyCertUrl`), PDF da planta no bucket público (`floor_plan_url`).
- [ ] **Step 3:** Casa ligada: pesquisa por nome (só casas sem unidades), ligar/desligar; "Copiar dados da casa" pede confirmação se o anúncio já tiver dados, aplica `draft`, e mostra `amenitySuggestions` como caixas para marcar nas características.
- [ ] **Step 4:** Rendimento: com casa ligada, mostra receita, ocupação, rentabilidade (ou "precisa de 12 meses"), "Dados até <data>", aviso quando `staleDays > 60` ("Importe o CSV de ganhos do Airbnb mais recente"); interruptor desativado se `!eligible`; campo nº de licença AL. Sem casa ligada: explicação curta.
- [ ] **Step 5:** Definições: secção "Vendas" visível só para super admin (a página já é).
- [ ] **Step 6:** Verificar no servidor local com o anúncio de teste em rascunho: carregar 2 fotos (uma grande → verificar no bucket que ficou ≤ 2400 px), um PDF de certificado (abrir pelo URL assinado; com uma sessão anónima o URL do bucket privado não abre), ligar a uma casa real e copiar (dados aparecem; a casa não muda), ver o rendimento. Apagar o anúncio de teste (confirmar que os ficheiros desapareceram dos dois buckets). `npx tsc --noEmit`; `npm run build`.
- [ ] **Step 7:** Preparar commit.

---

### Task 10: Catálogo público, menu e sitemap

**Files:**
- Create: `app/[locale]/(main)/for-sale/page.tsx`, `components/sales/SaleCatalogue.tsx` (cliente), `components/sales/SaleCard.tsx`
- Modify: `components/Navbar.tsx` e `components/Footer.tsx` (`{ path: '/for-sale', label: t('forSale') }` depois de "properties"), `app/sitemap.ts` (`'for-sale'` em `STATIC_PATHS`; `saleEntries()` com `inEveryLocale(\`for-sale/${slug}\`, …)` para cada anúncio publicado), `messages/en.json`, `messages/pt.json` (`Navbar.forSale`, `Sales.*`, metadados `PageMeta.forSaleTitle/forSaleDescription`)

**Interfaces:**
- Consumes: `getPublishedSaleListings`, `getSalesContact` (Tarefa 7); `parseFilters`, `filtersToQuery`, `applyFilters`, `formatEuro`, `pricePerM2`, `isNewListing`, `localized` (Tarefa 2); `saleImageAlt` (Tarefa 5); `buildPageMetadata` (`lib/seo.ts`).
- Produces: `<SaleCard listing={SaleListing} locale={string} today={string} />` (reutilizado na Tarefa 11 em "Também pode gostar").

- [ ] **Step 1:** Página do servidor: metadados com `buildPageMetadata({ locale, path: 'for-sale', … })` (o canonical é sempre `/for-sale`, mesmo com filtros no URL); lê os anúncios publicados; passa-os ao `SaleCatalogue` com os filtros de `searchParams`.
- [ ] **Step 2:** `SaleCatalogue`: topo, pesquisa (cidades = as dos anúncios publicados), separadores com contagem (Terrenos só se houver), ordenação; ao mudar, `router.replace` com `filtersToQuery`; lista com `applyFilters`; estado vazio; bloco "Quer vender a sua casa?" → `/contact`. Visual da Opção A aprovada.
- [ ] **Step 3:** `SaleCard` com as etiquetas e campos do spec (vendido: cinzento, sem preço).
- [ ] **Step 4:** Verificar no servidor local: com 0 anúncios publicados, estado vazio e sem erros; com o anúncio de teste publicado temporariamente (despublicar e apagar no fim): aparece no catálogo, os filtros mudam o URL e voltam a funcionar ao recarregar, aparece no `/sitemap.xml` nas duas línguas e desaparece ao despublicar. Menu com "Imóveis à venda" em desktop e telemóvel. `npx tsc --noEmit`; `npm run build`.
- [ ] **Step 5:** Preparar commit.

---

### Task 11: Página do imóvel e formulário de contacto

**Files:**
- Create: `app/[locale]/(main)/for-sale/[slug]/page.tsx`, `components/sales/SaleListingDetails.tsx`, `components/sales/SaleContactForm.tsx` (cliente), `components/sales/SaleAreaMap.tsx` (cliente, react-leaflet, carregado com `dynamic(..., { ssr: false })` como `LocationSection.tsx`), `components/sales/SalePerformance.tsx`
- Create: `app/api/contact-sale/route.ts`
- Modify: `components/property-details/PropertyGallery.tsx` (prop opcional `caption?: string`; quando existe, substitui a linha de hóspedes/quartos no cabeçalho da grelha; `metadata` passa a opcional)
- Modify: `messages/en.json`, `messages/pt.json`

**Interfaces:**
- Consumes: `getSaleListingBySlug`, `getSalePerformance`, `getSalesContact` (Tarefa 7); `getCurrentUserRole` (`app/actions/user.ts`) e `PROPERTY_EDITORS` para os rascunhos; `saleSeoTitle`, `saleSeoDescription`, `saleImageAlt`, `saleJsonLd` (Tarefa 5); `saleInquirySchema` (Tarefa 2); `saleInquiryTeamEmail`, `saleInquiryBuyerEmail`, `hitRateLimit` (Tarefa 4); `SaleCard` (Tarefa 10); `sendEmail` (`lib/email.ts`).
- Produces: `POST /api/contact-sale` com corpo = `saleInquirySchema`; respostas `200 { ok: true }`, `400 { error: 'invalid' }`, `404 { error: 'not_found' }`, `429 { error: 'too_many' }`, `500 { error: 'send_failed' }`.

- [ ] **Step 1:** Página do servidor: `cache()` partilhado entre `generateMetadata` e a página; publicado → normal; rascunho → só se o papel estiver em `PROPERTY_EDITORS`, com faixa "Rascunho — só a equipa vê isto" e `robots: { index: false }`; caso contrário `notFound()`. Metadados com `buildPageMetadata({ path: \`for-sale/${slug}\` })`, título/descrição da Tarefa 5, imagem OG = foto principal; JSON-LD com `saleJsonLd`, serializado como em `blog/[slug]/page.tsx` (`.replace(/</g, '\\u003c')`).
- [ ] **Step 2:** `SaleListingDetails` com todas as secções do spec ("Página do imóvel"): galeria (`PropertyGallery` com `caption`), ficha sem campos vazios, descrição e características com fallback de língua, `SalePerformance` só se `show_performance` e o resumo for elegível, mapa da zona com `approxCoord` (círculo de ~400 m, sem pino), planta, "Certificado energético disponível a pedido", caixa de contacto, cartão AMI só com número, WhatsApp só com número, partilhar, "Também pode gostar" (até 3 publicados e disponíveis, mesma cidade primeiro, com `SaleCard`), barra fixa no telemóvel.
- [ ] **Step 3:** `SaleContactForm`: campos e alternância info/visita do spec; mensagem pré-preenchida com título e referência; vendido → só "Pedir informação" com mensagem sobre imóveis semelhantes; estados de envio, erro e 429 com textos do `Sales`.
- [ ] **Step 4:** `route.ts`, por esta ordem: `saleInquirySchema` (400); campo `website` preenchido → `200` falso sem enviar; cookie `sale-inquiry-submitted` (10 min) → 429; `hitRateLimit('sale-ip', ip, 3600, 5)` e `hitRateLimit('sale-email', email, 86400, 3)` → 429; anúncio publicado pelo `listingId` (404); `sendEmail` à equipa (`to: 'info@lovelymemories.pt'`, `replyTo: email`) → falha = 500; confirmação ao comprador só se `hitRateLimit('sale-confirm', email, 3600, 1)`; cookie; registos só com a referência e o resultado (nunca nome, email, telefone ou mensagem).
- [ ] **Step 5: Testar a rota com `EMAIL_DRY_RUN=1`** no servidor local (nunca sem esta variável), com o anúncio de teste publicado temporariamente: pedido válido → 200 e duas linhas `[email dry-run]` no registo do servidor (equipa e confirmação), sem dados pessoais; segundo pedido com o mesmo email → 200 e só uma linha (sem confirmação); campo `website` → 200 sem linhas; `consent: false` → 400; 6 pedidos do mesmo IP numa hora → o 6.º dá 429; `listingId` de um rascunho → 404. Apagar as linhas de teste de `form_rate_limits` e o anúncio de teste no fim.
- [ ] **Step 6:** Verificar no browser local: página publicada em desktop e telemóvel sem erros na consola; rascunho com sessão → faixa e `noindex`; rascunho sem sessão (janela anónima) → 404; JSON-LD presente e válido; morada exata e nº do certificado ausentes do HTML (procurar no código-fonte da página). `npx tsc --noEmit`; `npm run build`.
- [ ] **Step 7:** Preparar commit.

---

### Task 12: Verificação final e documentação

**Files:**
- Modify: `CLAUDE.md` (uma linha nos Gotchas: anúncios de venda em `sale_listings`, fechada ao público e lida só por `lib/sales/repo.ts`; nunca juntar casas à venda a `properties`)
- Modify: `docs/audits/2026-11-13-auditoria-plataforma.md` (os dois achados da 2026-11-20: escrita no bucket `properties` por qualquer conta; HTML não escapado nos emails do concierge e da newsletter)

- [ ] **Step 1:** `npm run test:sales`, `npm run test:partner-api`, `npm run test:ical` verdes; `npx tsc --noEmit`; `npm run build`; lint dos ficheiros tocados igual ou melhor que HEAD.
- [ ] **Step 2:** `npm run check:exposure` sem FAIL; manifesto de ações revisto (só as 8 ações de vendas como novas).
- [ ] **Step 3:** `select count(*) from sale_listings` = 0 (nenhum anúncio de teste esquecido), buckets novos vazios, `form_rate_limits` sem linhas de teste.
- [ ] **Step 4:** Resumo ao Marcelo: o que foi construído, o que foi verificado e como, a migração aplicada, e os pendentes do cliente (AMI, WhatsApp, autorização dos proprietários para os números). Preparar commit e pedir autorização para commit e push.
