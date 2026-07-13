-- ============================================================
-- AI guest messaging — consolidated schema (Beds24 transport)
-- Consolidates the ai_* tables originally built across 7 migrations on
-- branch feat/ai-guest-messaging (never applied to production) into a
-- single final-state migration, adapted to run on the Beds24 PMS transport
-- (see 20260713200000_beds24_phase1.sql) instead of the previous provider.
--
-- APPLY MANUALLY in the Supabase SQL editor — creating this file does NOT
-- apply it.
--
-- SECURITY: property_ai_extras and the ai_* tables hold operational
-- secrets (Wi-Fi passwords, door codes) and guest data. RLS is on with
-- staff-only policies (admin/super_admin/editor); the app also reads/writes
-- these tables server-side with the service-role key.
-- ============================================================

-- NOTE: public.properties is NOT touched by this migration (public-site
-- isolation constraint — no ALTERs outside beds24_properties). The internal
-- ↔ external (Beds24) property mapping already lives in
-- beds24_properties.internal_property_id (phase 1, plain uuid, no FK); the
-- app resolves external→internal through that table.

-- ── property_ai_extras: AI-only extras/secrets, keyed off properties ────────
-- Base listing data (name, description, etc.) is read from `properties`;
-- this table holds only the extras the bot needs that `properties` doesn't.
create table if not exists public.property_ai_extras (
    id uuid primary key default gen_random_uuid(),
    property_id uuid not null unique,          -- properties.id — plain value, NO foreign key (isolation)
    wifi_name text,
    wifi_password text,
    door_code text,
    building_access text,
    apartment_access text,
    emergency_contact text,
    gov_form_url text,
    guidebook_url text,
    tips text,
    tone_notes text,                          -- optional per-property tone override
    access_photos jsonb not null default '[]'::jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.property_ai_extras enable row level security;

drop policy if exists "Staff manage property_ai_extras" on public.property_ai_extras;
create policy "Staff manage property_ai_extras"
    on public.property_ai_extras for all to authenticated
    using (exists (
        select 1 from public.profiles
        where id = auth.uid() and role in ('admin', 'super_admin', 'editor')
    ))
    with check (exists (
        select 1 from public.profiles
        where id = auth.uid() and role in ('admin', 'super_admin', 'editor')
    ));

-- ── ai_message_log: drives the admin activity feed + approval queue ─────────
create table if not exists public.ai_message_log (
    id uuid primary key default gen_random_uuid(),
    reservation_ref text,                     -- external (Beds24) booking/reservation reference
    thread_id text,                           -- conversation id (for replying to the right thread)
    property_code text,
    guest_name text,
    channel text default 'airbnb',
    incoming_message text not null,
    ai_draft text,
    sent_message text,
    status text not null default 'draft'
        check (status in ('draft', 'approved', 'sent', 'skipped', 'failed')),
    error text,
    external_event_id text,                   -- webhook event id (idempotency for inbound retries)
    skip_reason text,
    external_message_id text,                 -- external (Beds24) message id (idempotency for sync path)
    decision text
        check (decision in ('auto_sent', 'needs_human', 'hard_rule', 'bot_off')),
    knowledge_citation text,
    auto_sent_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    sent_at timestamptz
);

create index if not exists ai_message_log_status_idx on public.ai_message_log (status);
create index if not exists ai_message_log_created_idx on public.ai_message_log (created_at desc);

-- One row per webhook event id → retries are ignored.
create unique index if not exists ai_message_log_event_id_uidx
    on public.ai_message_log (external_event_id)
    where external_event_id is not null;

-- One draft per external message id (sync path) → re-processing the same message is ignored.
create unique index if not exists ai_message_log_message_id_uidx
    on public.ai_message_log (external_message_id)
    where external_message_id is not null;

alter table public.ai_message_log enable row level security;

drop policy if exists "Staff manage ai_message_log" on public.ai_message_log;
create policy "Staff manage ai_message_log"
    on public.ai_message_log for all to authenticated
    using (exists (
        select 1 from public.profiles
        where id = auth.uid() and role in ('admin', 'super_admin', 'editor')
    ))
    with check (exists (
        select 1 from public.profiles
        where id = auth.uid() and role in ('admin', 'super_admin', 'editor')
    ));

-- ── ai_conversation: mirrors the inbox as a browsable list ───────────────────
-- One row per external (Beds24) reservation/conversation, with the bot's
-- flow state derived per conversation.
create table if not exists public.ai_conversation (
    id uuid primary key default gen_random_uuid(),
    reservation_id text not null unique,      -- external (Beds24) booking id, as text (join key)
    conversation_id text,                     -- external conversation/thread id
    platform text,                            -- airbnb | booking | direct
    external_property_id text,                -- Beds24 property id (text); internal mapping via beds24_properties
    property_name text,
    property_picture_url text,
    guest_name text,
    guest_locale text,
    guest_picture_url text,
    reservation_status text,                  -- normalised bucket: upcoming|staying|past|cancelled|unknown
    raw_status text,                          -- upstream's own status string (for reference)
    check_in date,
    check_out date,
    last_message_at timestamptz,
    last_message_preview text,
    last_message_sender text,                 -- guest | host
    bot_checked_at timestamptz,               -- newest message time the bot has already looked at
    bot_enabled boolean not null default true,-- whether the bot may draft on this conversation
    bot_off_reason text,                      -- escalated | human_replied | manual | null
    bot_off_at timestamptz,
    bot_off_by text,                          -- 'bot' when automatic, else the acting admin's email
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists ai_conversation_last_msg_idx on public.ai_conversation (last_message_at desc);
create index if not exists ai_conversation_status_idx on public.ai_conversation (reservation_status);

alter table public.ai_conversation enable row level security;

drop policy if exists "Staff manage ai_conversation" on public.ai_conversation;
create policy "Staff manage ai_conversation"
    on public.ai_conversation for all to authenticated
    using (exists (
        select 1 from public.profiles
        where id = auth.uid() and role in ('admin', 'super_admin', 'editor')
    ))
    with check (exists (
        select 1 from public.profiles
        where id = auth.uid() and role in ('admin', 'super_admin', 'editor')
    ));

-- ── ai_conversation_message: message thread cache (lazy-filled) ─────────────
create table if not exists public.ai_conversation_message (
    id uuid primary key default gen_random_uuid(),
    reservation_id text not null,              -- joins to ai_conversation.reservation_id
    external_message_id text,                  -- platform/message id for dedupe
    body text,
    sender_type text,                          -- host | guest
    sender_name text,
    source text,                               -- e.g. api (tells us which messages we sent)
    sent_at timestamptz,                       -- message time from upstream
    created_at timestamptz default now(),
    unique (reservation_id, external_message_id)
);

create index if not exists ai_conversation_message_resv_idx
    on public.ai_conversation_message (reservation_id, sent_at asc);

alter table public.ai_conversation_message enable row level security;

drop policy if exists "Staff manage ai_conversation_message" on public.ai_conversation_message;
create policy "Staff manage ai_conversation_message"
    on public.ai_conversation_message for all to authenticated
    using (exists (
        select 1 from public.profiles
        where id = auth.uid() and role in ('admin', 'super_admin', 'editor')
    ))
    with check (exists (
        select 1 from public.profiles
        where id = auth.uid() and role in ('admin', 'super_admin', 'editor')
    ));

-- ── ai_messaging_settings: global bot settings (singleton) ───────────────────
-- Holds the editable brand tone / instructions the AI applies to every draft.
create table if not exists public.ai_messaging_settings (
    id int primary key default 1,
    brand_tone text,                          -- overrides the built-in default tone when set
    updated_at timestamptz default now(),
    constraint ai_messaging_settings_singleton check (id = 1)
);

alter table public.ai_messaging_settings enable row level security;

drop policy if exists "Staff manage ai_messaging_settings" on public.ai_messaging_settings;
create policy "Staff manage ai_messaging_settings"
    on public.ai_messaging_settings for all to authenticated
    using (exists (
        select 1 from public.profiles
        where id = auth.uid() and role in ('admin', 'super_admin', 'editor')
    ))
    with check (exists (
        select 1 from public.profiles
        where id = auth.uid() and role in ('admin', 'super_admin', 'editor')
    ));

-- ── beds24_properties: per-property bot mode ─────────────────────────────────
alter table public.beds24_properties add column if not exists bot_mode text not null default 'off'
    check (bot_mode in ('off', 'drafts', 'auto'));
