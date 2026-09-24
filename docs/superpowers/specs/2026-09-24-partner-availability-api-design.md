# Partner Availability API (Kitsiva / Kileas) — Design

**Data:** 2026-09-24
**Estado:** aprovado (design) — por implementar
**Parceiro piloto:** Kitsiva (Achilles Kitsikoudis), assistente de viagem IA "Kileas", construído em Replit com agente de IA.

## 1. Objetivo

API **read-only**, **autenticada**, **servidor-a-servidor**, que responde a:

> datas + hóspedes + destino → casas Lovely Memories realmente disponíveis → preço real de reserva direta → imagens/detalhes → URL de reserva direta

Sem expor qualquer dado interno: hóspedes, owners, reservas, notas, credenciais, códigos, URLs iCal, IDs de PMS, moradas exatas ou coordenadas.

Volume inicial: dezenas de pedidos/dia. Tem de aguentar milhares/dia sem redesenho.

## 2. Restrição inviolável: o checkout não é tocado

- `lib/pricing.ts` (`calculateReservationPrice`, `verifyAvailability`, `getUnavailableDates`) **não muda de comportamento**. A única alteração permitida é um comentário por cima de `calculateReservationPrice` a apontar para o espelho e para o script de paridade.
- Nenhum ficheiro do fluxo de reserva/checkout/pagamento (`app/[locale]/(main)/booking/**`, `app/api/bookings/**`, `app/api/webhooks/stripe/**`, `components/PropertyDetails.tsx`, BookingCard) é alterado.
- A fórmula de preço da API vive num ficheiro novo e é validada contra a original por um script de paridade (secção 9).

## 3. Arquitetura

```
Kitsiva backend
   │ POST /api/v1/availability   Authorization: Bearer lm_live_…
   ▼
app/api/v1/availability/route.ts      HTTP: método, parse, códigos de estado, cabeçalhos
   ├─ lib/partner-api/auth.ts         token → hash SHA-256 → partner_api_keys; rate limit; registo
   ├─ lib/partner-api/validate.ts     body → pedido tipado ou erro INVALID_REQUEST
   ├─ lib/partner-api/destinations.ts aliases de destino → lista de cidades
   ├─ lib/partner-api/search.ts       allow-list + cidade + lotação + disponibilidade + preço em lote
   ├─ lib/partner-api/pricing.ts      computeStayPrice(): espelho puro de calculateReservationPrice
   ├─ lib/partner-api/serialize.ts    whitelist campo-a-campo → formato de resposta
   └─ lib/partner-api/types.ts        tipos do contrato (pedido, resposta, códigos)
```

Cada unidade tem uma responsabilidade e é testável isoladamente. `validate`, `destinations`, `pricing` e `serialize` são **funções puras**, sem I/O.

`/api/*` já é ignorado pelo `proxy.ts` (sem next-intl, sem sessão, sem visitor log), por isso não há alterações ao middleware.

### 3.1 Clientes Supabase (privilégio mínimo)

| Uso | Cliente | Porquê |
|---|---|---|
| Casas, `pricing_rules`, `custom_pricing`, RPC `get_unavailable_property_ids` | **anon** (sem sessão, criado no route handler) | A API não consegue ler mais do que o site público já lê. As reservas só passam pela RPC SECURITY DEFINER, que devolve apenas `property_id` |
| `partner_api_keys`, `partner_api_requests` | **service role** (`getSupabaseAdmin`) | Tabelas com RLS ativo e sem políticas: inacessíveis a anon/authenticated |

Todas as queries usam **colunas explícitas**, nunca `select('*')`. Uma coluna sensível adicionada no futuro à tabela `properties` nunca chega à API.

Colunas lidas de `properties`: `id, slug, title, description, city, area, max_guests, bedrooms, bathrooms, images, amenities, parent_id, is_multi_unit, is_active, status, partner_api_enabled`.
Colunas de `property_images`: `url` (e ordem, se existir). Não se lê de `properties` em caso algum: `owner_id, address, lat, lng, ical_import_urls, hospitable_property_id, last_sync_*, sync_status, house_rules, good_to_know, home_truths, check_in, vip_services` e afins.

## 4. Dados (1 migração — aplicar manualmente no Supabase)

Ficheiro: `supabase/migrations/20260924120000_partner_api.sql`

```sql
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS partner_api_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE public.partner_api_keys (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name  text NOT NULL,
  ref_slug      text NOT NULL CHECK (ref_slug ~ '^[a-z0-9-]{2,32}$'),
  key_prefix    text NOT NULL,              -- ex.: 'lm_live_ab12' (visível no admin)
  key_hash      text NOT NULL UNIQUE,       -- SHA-256 hex da chave completa
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);

CREATE TABLE public.partner_api_requests (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key_id        uuid NOT NULL REFERENCES public.partner_api_keys(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  http_status   smallint NOT NULL,
  status        text NOT NULL,              -- SUCCESS | INVALID_REQUEST | RATE_LIMITED | ERROR
  error_code    text,
  result_count  smallint,
  duration_ms   integer
);
CREATE INDEX partner_api_requests_key_time ON public.partner_api_requests (key_id, created_at DESC);

ALTER TABLE public.partner_api_keys     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_api_requests ENABLE ROW LEVEL SECURITY;
-- Sem políticas: só o service role acede.
```

O body do pedido (datas/destino) **não** é guardado. Os pedidos 401 não são registados, porque não há chave a que os associar.

## 5. Contrato

### 5.1 Pedido

`POST /api/v1/availability`
Cabeçalhos: `Authorization: Bearer lm_live_<token>`, `Content-Type: application/json`

```json
{ "check_in": "2026-10-10", "check_out": "2026-10-14", "guests": 4, "destination": "Porto" }
```

Campos desconhecidos são ignorados.

### 5.2 Validação → HTTP 400, `status: "INVALID_REQUEST"`

A ordem de avaliação é a da tabela; devolve-se o primeiro erro.

| `error.code` | Regra |
|---|---|
| `INVALID_BODY` | Body não é JSON-objeto, ou campo obrigatório em falta / de tipo errado |
| `INVALID_DATES` | Formato diferente de `YYYY-MM-DD`, data de calendário inexistente, ou `check_out <= check_in` |
| `CHECK_IN_TOO_SOON` | `check_in <= hoje` (hoje em **Europe/Lisbon**) — espelha a regra da meia-noite do checkout |
| `DATES_TOO_FAR` | `check_in` a mais de 18 meses de hoje |
| `STAY_TOO_LONG` | Mais de 30 noites |
| `INVALID_GUESTS` | Não inteiro, ou fora de 1–16 |
| `UNKNOWN_DESTINATION` | Destino sem alias. `message` lista os válidos |

### 5.3 Destinos

Normalização: minúsculas, sem acentos, sem espaços extra.

| Entrada (aliases) | Cidades (`properties.city`) |
|---|---|
| `porto`, `oporto` | Porto, Gaia |
| `gaia`, `vila nova de gaia`, `vn gaia` | Gaia |
| `algarve` | Algarve |
| `mykonos`, `mikonos` | Mykonos |

A tabela vive em `lib/partner-api/destinations.ts`. Um destino novo é uma linha nessa tabela.

### 5.4 Seleção de casas

Candidatas: `is_active = true`, `status <> 'hidden'`, `partner_api_enabled = true`, **unidade reservável** (`parent_id` não nulo, ou `is_multi_unit = false`; os contentores de edifício nunca entram), `city` numa das cidades do destino, `max_guests >= guests`.

Excluídas **silenciosamente** (sem erro):
- Indisponível nas datas: `property_id` devolvido por `get_unavailable_property_ids(check_in, check_out)`, que junta blocked_dates (incluindo os importados por iCal), reservas não canceladas e locks ativos.
- Sem `pricing_rules`.
- `noites < pricing_rules.min_nights`.

**Falhas da RPC ou das queries de preço → erro 503. Nunca há resultados parciais nem se assume "disponível".**

Ordenação: `total_price` ascendente, com `id` como desempate estável.

### 5.5 Preço — `lib/partner-api/pricing.ts`

`computeStayPrice({ rules, customPrices, checkIn, checkOut, guests })` é um espelho **exato** de `calculateReservationPrice` com `adults = guests`, `children = 0`:

1. `nights = dias(checkOut - checkIn)`
2. Para cada noite: o `custom_pricing` cujo intervalo `start_date <= data < end_date` (primeiro encontrado, mesma ordem da query original); senão `base_price_per_night`
3. Desconto: `>= 28` noites → `monthly_discount_percent`; `>= 7` → `weekly_discount_percent`
4. Taxa turística: `city_tax_per_night ?? 2.00` × guests × `min(nights, 7)`
5. `total = (base − desconto) + cleaning_fee + taxa`, arredondado a 2 casas

Saída: `total_price` = total; `nightly_price_average` = `round2((base − desconto) / nights)`.

Não inclui extras opcionais (pequeno-almoço, transfer) nem cupões.

Carregamento em lote: 1 query a `pricing_rules` `in(property_ids)` e 1 a `custom_pricing` `in(property_ids)` sobrepondo o intervalo. Na chamada, filtra-se por propriedade.

**Nota de fidelidade:** a query original de `custom_pricing` usa `end_date >= check_in AND start_date <= check_out`. A query em lote usa exatamente o mesmo filtro, para o "primeiro encontrado" se comportar igual. Nenhuma das queries tem `ORDER BY`, por isso, se uma casa tiver períodos de `custom_pricing` sobrepostos, a ordem não é garantida em nenhuma delas. O script de paridade reporta essas casas como aviso (não como falha) para serem limpas no admin.

### 5.6 Resposta de sucesso → HTTP 200

```json
{
  "status": "SUCCESS",
  "search": { "check_in": "2026-10-10", "check_out": "2026-10-14", "guests": 4, "destination": "Porto" },
  "currency": "EUR",
  "properties": [
    {
      "id": "3f1c…-uuid",
      "name": "Bonfim Apartment",
      "description": "Modern two-bedroom apartment…",
      "city": "Porto",
      "area_m2": 75,
      "max_guests": 4,
      "bedrooms": 2,
      "bathrooms": 1,
      "total_price": 620.00,
      "nightly_price_average": 140.00,
      "currency": "EUR",
      "main_image": "https://…/1.jpg",
      "images": ["https://…/1.jpg", "https://…/2.jpg"],
      "amenities": ["Wi-Fi", "Kitchen", "Washer", "Air conditioning"],
      "booking_url": "https://www.lovelymemories.pt/en/properties/bonfim-apartment?from=2026-10-10&to=2026-10-14&adults=4&ref=kitsiva"
    }
  ]
}
```

Regras de serialização (`serialize.ts`):
- `search` ecoa os valores **normalizados** do pedido.
- `name`: `title.en`, com fallback para `pt` e depois para o slug.
- `description`: `description.en` (fallback `pt`), sem HTML/markdown, espaços colapsados, cortada a 300 caracteres na fronteira de palavra com `…`.
- `area_m2`: número > 0, senão `null`.
- `images`: coluna JSONB `images` (string ou `{url}`); se vazia, `property_images.url`. Só URLs `https://`, sem duplicados, no máximo 10. `main_image` = a primeira. Sem imagens → `main_image: null`, `images: []` (**nunca** o placeholder do Unsplash que o site usa).
- `amenities`: `items[].en` de todas as categorias, com trim, sem vazios, sem duplicados (case-insensitive), no máximo 30.
- `booking_url`: origem fixa `https://www.lovelymemories.pt` (constante, não vem do pedido), locale `en`, `from`/`to`/`adults` e `ref=<ref_slug da chave>`. A página da propriedade já lê `from`/`to`/`adults` (`components/PropertyDetails.tsx:92-101`) e ignora o `ref`.
- Construído objeto a objeto a partir de campos nomeados. Nunca espalhar (`...`) linhas da BD.

Sem resultados → `SUCCESS` com `"properties": []`.

### 5.7 Outros estados

| HTTP | Body | Quando |
|---|---|---|
| 400 | `INVALID_REQUEST` + código (5.2) | Validação |
| 401 | `{ "status": "UNAUTHORIZED", "error": { "code": "UNAUTHORIZED", "message": "Invalid or missing API token" } }` | Token em falta, formato errado, desconhecido ou revogado. Mensagem sempre igual |
| 405 | `METHOD_NOT_ALLOWED`, com cabeçalho `Allow: POST` | Qualquer método ≠ POST |
| 429 | `RATE_LIMITED`, com `Retry-After: 60` | > 60 pedidos/min por chave |
| 503 | `{ "status": "ERROR", "error": { "code": "AVAILABILITY_UNAVAILABLE", "message": "Availability could not be retrieved at this time" } }` | Falha de BD/RPC, ou kill-switch desligado (`code: "SERVICE_DISABLED"`) |

Todas as respostas: `Content-Type: application/json`, `Cache-Control: no-store`, **sem cabeçalhos CORS**. As mensagens de erro para fora são genéricas; o detalhe (erro Postgres, stack) só vai para `console.error` no servidor.

## 6. Autenticação, rate limit e registo — `lib/partner-api/auth.ts`

- **Formato da chave:** `lm_live_` + 32 caracteres base62 (~190 bits), gerada com `crypto.randomBytes`.
- **Validação:** extrair o Bearer e verificar o formato por regex (senão 401, sem ir à BD); calcular o SHA-256 hex; procurar por `key_hash` com `revoked_at IS NULL`. A pesquisa por hash dispensa comparação em tempo constante.
- **Rate limit:** contar as linhas de `partner_api_requests` da chave com `created_at > now() - 60s`; se forem ≥ 60, devolver 429. É aproximado: pedidos concorrentes podem passar ligeiramente o limite, o que é aceitável para este volume.
- **Registo:** 1 linha por pedido autenticado (inclui 400/429/503) e atualização de `last_used_at`, ambos via `after()` de `next/server`, sem atrasar a resposta. Uma falha no registo nunca afeta a resposta.
- **Kill-switch:** `PARTNER_API_ENABLED` tem de ser `'true'` para a API responder; qualquer outro valor → 503 `SERVICE_DISABLED`. O check é feito antes de qualquer acesso à BD. Por omissão fica desligado, e liga-se explicitamente na Vercel.

## 7. Admin — `/admin/partners`

- Segmento `app/[locale]/admin/partners/` com `layout.tsx` → `guardRoles(["super_admin"])`, e entrada no sidebar sob a mesma condição de super_admin do Settings (`components/admin/AdminSidebar.tsx`), mantendo os dois em sincronia.
- Server actions em `app/actions/partner-api.ts`. **Cada action verifica o `super_admin` por si**, não confia no layout:
  - `listPartnerKeys()`: prefixo, parceiro, ref, criada em, último uso, revogada, pedidos nas últimas 24h. **Nunca o hash.**
  - `createPartnerKey({ partnerName, refSlug })`: devolve a chave completa **uma única vez**.
  - `revokePartnerKey(id)`: define `revoked_at`.
  - `listPartnerProperties()`: casas reserváveis ativas com `partner_api_enabled`, `city`, `max_guests` e `sync_status`.
  - `setPartnerPropertyEnabled(id, enabled)`.
  - `getPartnerApiSummary()`: pedidos nas últimas 24h (todas as chaves), nº de chaves ativas, casas expostas / total de casas reserváveis ativas, e se o kill-switch `PARTNER_API_ENABLED` está ligado.
- **UI** (mockup aprovado em 2026-09-24), com o padrão visual das outras páginas do backoffice:
  - Cabeçalho com o estado da API ("API ativa" / "API desligada", conforme o kill-switch).
  - **Resumo:** 3 números, *Pedidos 24h*, *Chaves ativas* e *Casas expostas (X de Y)*.
  - **API keys:** tabela com parceiro + ref, prefixo mascarado, último uso (relativo), pedidos 24h e ação *Revogar*. As revogadas ficam visíveis, esbatidas e com o badge "Revogada".
  - **Casas expostas a parceiros:** pesquisa por nome/cidade e uma linha por casa (nome · cidade · lotação) com interruptor. As casas com `sync_status = 'failed'` mostram o badge **"iCal com erro"** (aviso, não bloqueia o interruptor), para evitar expor por engano uma casa com o calendário errado. A criação de chave abre um diálogo com a chave, um botão de copiar e o aviso "não voltará a ser mostrada". Revogar pede confirmação.
- As ações de criar, revogar e ligar/desligar são registadas com `logActivity` (`app/actions/audit.ts`), tal como as outras ações de admin. Nunca se regista a chave nem o hash, só o prefixo.
- **i18n:** strings novas em `messages/{en,pt,he}.json` com paridade de chaves.

## 8. Documentação para o parceiro

- `docs/partner-api/README.md`: visão geral, autenticação, exemplo curl, contrato, códigos de erro, destinos, notas (preço = reserva direta sem extras; hóspedes tratados como adultos; chave só no servidor, nos Secrets do Replit).
- `docs/partner-api/openapi.yaml`: OpenAPI 3.1 do endpoint (pedido, todas as respostas, esquemas, securityScheme bearer), para o agente do Replit consumir diretamente.

## 9. Verificação

Não há suite de testes no projeto; a verificação é esta:

1. `npx tsc --noEmit` e `npm run lint` limpos.
2. **Paridade de preço** (`scripts/check-partner-api-price-parity.ts`): para cada casa ativa com `pricing_rules` e vários cenários (2, 5, 7, 10 e 28+ noites; datas dentro e fora de `custom_pricing`; guests 1..max), comparar `computeStayPrice` com `calculateReservationPrice`. Exige **0 diferenças** e sai com código ≠ 0 se houver alguma.
3. **Smoke/segurança** (`scripts/test-partner-api.ts`, contra o dev local com uma chave de teste passada por env):
   - 401 sem token, com token mal formado e com token desconhecido; 405 com GET; cada código 400.
   - Uma pesquisa real: status `SUCCESS`, forma validada campo a campo, `booking_url` com a origem e os parâmetros esperados.
   - **Anti-fuga:** percorrer recursivamente o JSON; nenhuma chave pode estar fora da whitelist do contrato, e nenhum valor pode conter `@`, `ical`, `.ics` ou `hospitable`.
   - O 61.º pedido num minuto devolve 429.
4. **Unidades puras:** `validate` (datas limite, fuso de Lisboa), `destinations` (aliases/acentos) e `serialize` (whitelist, cortes, fallbacks) exercidas pelo smoke script com casos diretos.
5. **E2E no browser:** abrir um `booking_url` devolvido e confirmar as datas e os hóspedes preenchidos, com o total do checkout **igual** ao `total_price`.
6. **Admin:** criar uma chave (usável); revogá-la (passa a dar 401); ligar/desligar uma casa (entra/sai dos resultados); um utilizador não super_admin não acede à página nem às actions.
7. **Checkout intacto:** `git diff` sobre os ficheiros da secção 2 mostra apenas o comentário em `lib/pricing.ts`.

## 10. Rollout

1. Aplicar a migração no Supabase (manual).
2. Deploy, com `PARTNER_API_ENABLED` ainda desligado.
3. No admin, ligar só as casas do piloto com o feed `.ics` confirmado (ver o problema dos URLs iCal partidos).
4. Criar a chave `kitsiva` (ref_slug `kitsiva`).
5. Ligar `PARTNER_API_ENABLED=true` na Vercel e fazer o smoke contra produção.
6. Enviar a chave ao Achilles por canal seguro, com o README e o openapi.yaml.

## 11. Fora de âmbito (V2+)

Filtros (quartos mínimos, comodidades, preço máximo); comodidades normalizadas (`wifi`, `air_conditioning`); gravar o `ref` na reserva (atribuição/comissão); adultos/crianças separados; idiomas pt/he; paginação; cache; allow-list por parceiro; chaves de teste/sandbox separadas.
