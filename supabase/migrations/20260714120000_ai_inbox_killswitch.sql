-- Kill-switch global do bot (a spec exige; a consolidada não o tinha).
-- APLICAR MANUALMENTE no dashboard Supabase.

alter table public.ai_messaging_settings
    add column if not exists bot_globally_enabled boolean not null default true;

-- Garantir a linha singleton (o bridge lê id=1).
insert into public.ai_messaging_settings (id) values (1) on conflict (id) do nothing;
