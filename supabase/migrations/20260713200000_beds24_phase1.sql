-- ============================================================
-- Beds24 PMS — Fase 1 (branch feat/beds24-pms)
-- Tabelas 100% novas e isoladas. SEM foreign keys, triggers ou
-- alterações a tabelas existentes. A produção não conhece isto.
-- Acesso: apenas service role (RLS ativa, sem policies).
-- ============================================================

-- 1. Config/estado singleton: token em cache, créditos, flags
create table if not exists beds24_config (
  id int primary key default 1 check (id = 1),
  access_token text,
  access_token_expires_at timestamptz,
  credit_limit numeric,
  credit_remaining numeric,
  credit_resets_at timestamptz,
  webhook_enabled boolean not null default true,
  polling_enabled boolean not null default false,
  last_poll_at timestamptz,
  last_poll_modified_from timestamptz,
  updated_at timestamptz not null default now()
);

-- 2. Mapa de propriedades: Beds24 <-> Airbnb <-> (opcional) interna
create table if not exists beds24_properties (
  id bigserial primary key,
  beds24_property_id bigint not null unique,
  beds24_room_id bigint not null,
  airbnb_listing_id text,
  airbnb_user_id text,
  name text not null,
  role text,                                  -- primary_owner | primary_co_host | co_host | synthetic
  sync_state text not null default 'none',    -- none | imported | connected
  is_cobaia boolean not null default false,
  internal_property_id uuid,                  -- valor simples, SEM foreign key (isolamento)
  currency text,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Reservas vindas do Beds24 (upsert por beds24_booking_id)
create table if not exists beds24_bookings (
  id bigserial primary key,
  beds24_booking_id bigint not null unique,
  beds24_property_id bigint not null,
  beds24_room_id bigint,
  status text,
  sub_status text,
  arrival date,
  departure date,
  guest_first_name text,
  guest_last_name text,
  guest_email text,
  guest_phone text,
  num_adult int,
  num_child int,
  price numeric,
  commission numeric,
  channel text,
  api_source text,
  api_reference text,
  booking_time timestamptz,
  modified_time timestamptz,
  cancel_time timestamptz,
  first_seen_via text,                        -- webhook | polling | manual
  first_seen_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now(),
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_beds24_bookings_prop_arrival
  on beds24_bookings (beds24_property_id, arrival);
create index if not exists idx_beds24_bookings_modified
  on beds24_bookings (modified_time desc);

-- 4. Mensagens de hóspedes (o teste crítico da Fase 1)
create table if not exists beds24_messages (
  id bigserial primary key,
  beds24_message_id bigint unique,
  beds24_booking_id bigint not null,
  beds24_property_id bigint,
  source text,                                -- guest | host | system | internalNote
  message text,
  message_time timestamptz,
  read boolean,
  first_seen_via text,                        -- webhook | polling | manual
  first_seen_at timestamptz not null default now(),
  latency_ms bigint,                          -- message_time -> first_seen_at
  raw jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_beds24_messages_booking
  on beds24_messages (beds24_booking_id, message_time desc);

-- 5. Log de webhooks recebidos (medição de latência A/B)
create table if not exists beds24_webhook_events (
  id bigserial primary key,
  received_at timestamptz not null default now(),
  payload_timestamp timestamptz,              -- timeStamp do payload Beds24
  latency_ms bigint,                          -- payload_timestamp -> received_at
  event_type text,                            -- booking | unknown
  beds24_booking_id bigint,
  beds24_property_id bigint,
  processed boolean not null default false,
  processing_error text,
  payload jsonb not null
);
create index if not exists idx_beds24_webhook_events_received
  on beds24_webhook_events (received_at desc);

-- 6. Log de chamadas API (custo de créditos por chamada)
create table if not exists beds24_api_log (
  id bigserial primary key,
  called_at timestamptz not null default now(),
  method text,
  endpoint text,
  status int,
  request_cost numeric,
  credit_remaining numeric,
  duration_ms int,
  context text,                               -- poll | action | webhook | auth
  error text
);
create index if not exists idx_beds24_api_log_called
  on beds24_api_log (called_at desc);

-- RLS: ativa em tudo, sem policies => só o service role acede
-- (todo o acesso é server-side via getSupabaseAdmin())
alter table beds24_config enable row level security;
alter table beds24_properties enable row level security;
alter table beds24_bookings enable row level security;
alter table beds24_messages enable row level security;
alter table beds24_webhook_events enable row level security;
alter table beds24_api_log enable row level security;

-- Linha singleton de config
insert into beds24_config (id) values (1) on conflict (id) do nothing;
