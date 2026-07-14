-- Seletor de provider do bot na BD (substitui a env var AI_MESSAGING_PROVIDER como
-- fonte de verdade). NULL = 'auto' (deteção por chave/env). APLICAR MANUALMENTE no
-- dashboard Supabase.

alter table public.ai_messaging_settings
    add column if not exists ai_provider text
    check (ai_provider is null or ai_provider in ('openai', 'gemini'));

-- Garantir a linha singleton (o bridge/decisão lê id=1).
insert into public.ai_messaging_settings (id) values (1) on conflict (id) do nothing;
