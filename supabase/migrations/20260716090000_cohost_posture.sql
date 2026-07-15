-- supabase/migrations/20260716090000_cohost_posture.sql
-- Postura por conversa: substitui a semântica on/off de bot_enabled.
-- assist = bot redige sempre, humano envia (novo default);
-- auto   = pode auto-enviar (só com beds24_properties.bot_mode='auto');
-- off    = não redige (raro, manual).
alter table public.ai_conversation
    add column if not exists bot_posture text not null default 'assist'
    check (bot_posture in ('auto', 'assist', 'off'));

-- Backfill: off manual continua off; resto vira assist (Auto não está em uso).
update public.ai_conversation
    set bot_posture = case
        when bot_enabled = false and bot_off_reason = 'manual' then 'off'
        else 'assist'
    end;

-- bot_enabled fica DEPRECATED (mantido para rollback fácil; o código deixa de o ler).
comment on column public.ai_conversation.bot_enabled is 'DEPRECATED 2026-07-16: usar bot_posture. Mantido para rollback.';
