-- supabase/migrations/20260716100000_cohost_push_subscriptions.sql
create table if not exists public.cohost_push_subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    endpoint text not null unique,
    p256dh text not null,
    auth text not null,
    created_at timestamptz not null default now()
);
alter table public.cohost_push_subscriptions enable row level security;
-- Acesso só via service role (actions); sem policies para authenticated.
