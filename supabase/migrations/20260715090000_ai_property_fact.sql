-- ── ai_property_fact: factos livres por propriedade (knowledge escalável) ────
-- Fontes: manual (equipa), learned (learning loop, entra pending), imported
-- (import inicial Beds24). Só factos 'active' alimentam o agente.
create table if not exists public.ai_property_fact (
    id uuid primary key default gen_random_uuid(),
    external_property_id text not null,        -- Beds24 property id (text) — join com beds24_properties
    topic text not null default 'general',     -- amenities | access | parking | house_rules | area | general | …
    fact text not null,                        -- uma afirmação verificável, autocontida
    source text not null default 'manual'
        check (source in ('manual', 'learned', 'imported')),
    status text not null default 'active'
        check (status in ('active', 'pending', 'rejected')),
    learned_from text,                          -- reservation_id da conversa de origem (auditoria)
    reviewed_by text,                           -- email do admin que aprovou/rejeitou
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists ai_property_fact_prop_status_idx
    on public.ai_property_fact (external_property_id, status);
create index if not exists ai_property_fact_pending_idx
    on public.ai_property_fact (status, created_at desc);

alter table public.ai_property_fact enable row level security;

drop policy if exists "Staff manage ai_property_fact" on public.ai_property_fact;
create policy "Staff manage ai_property_fact"
    on public.ai_property_fact for all to authenticated
    using (exists (
        select 1 from public.profiles
        where id = auth.uid() and role in ('admin', 'super_admin', 'editor')
    ))
    with check (exists (
        select 1 from public.profiles
        where id = auth.uid() and role in ('admin', 'super_admin', 'editor')
    ));
