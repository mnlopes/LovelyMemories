# Beds24 PMS — PONTO DE SITUAÇÃO / HANDOFF

**Última atualização:** 2026-07-13 fim do dia. **Começar por aqui** ao retomar (mesmo noutra conta).
Documentos irmãos: `2026-07-13-beds24-pms-analysis.md` (análise+testes+veredito co-host), `2026-07-13-beds24-phase1-design.md` (design aprovado).

## Estado em uma frase
Fase 1 do PMS Beds24 **em PRODUÇÃO** (acesso só super_admin, sem entrada na sidebar), com o troço webhook **Beds24→nós provado a ~1s**. Falta ligar a cobaia (Virtudes One) ao Airbnb para testar os restantes troços e a dúvida crítica das mensagens.

## O que já está feito ✅
- Análise completa da API v2, testes de escrita/leitura, veredito co-host (só 6 Primary Owner ligáveis; ~39 co-hosted exigem onboarding por owner — Airbnb Teams é beco sem saída).
- Código na branch `main` (mergeado), deployed no Vercel. Ficheiros: `lib/beds24/{client,sync,types}.ts`, `app/api/webhooks/beds24/route.ts`, `app/actions/beds24.ts`, `app/[locale]/admin/beds24/**`, migração `supabase/migrations/20260713200000_beds24_phase1.sql` (aplicada no Supabase), `scripts/check-beds24.ts` (inspetor de tabelas).
- Painel live: **https://www.lovelymemories.pt/{en|pt}/admin/beds24** (só super_admin).
- 6 anúncios Primary Owner importados (connect:none, estado=imported).
- Webhook configurado no Beds24 para Virtudes One + **provado ponta-a-ponta** (reserva teste 89782482 → chegou em ~1s com dados pessoais).

## Credenciais e configuração
- `BEDS24_REFRESH_TOKEN` → em `.env.local` (local) e Vercel env scope **Production**. Não expira se usado a cada 30 dias.
- `BEDS24_WEBHOOK_SECRET` = `efc8403d1a468f61f0620948d96f8d1b1c22c1a9c5eb507a` → `.env.local` + Vercel Production.
- Webhook URL (Beds24 → Settings→Properties→[prop]→Access→Booking Webhook): `https://www.lovelymemories.pt/api/webhooks/beds24`, versão **2 - with personal data**, custom header `x-beds24-secret: <secret>`.
- Domínio real: **www.lovelymemories.pt** (SEM hífen; o hifenizado não existe).
- Conta Airbnb master: `391837499` (Achilleas/Lovely). Beds24 ownerId `171444`. Trial Beds24 expira **~2026-07-27**.

## IDs das 6 propriedades (beds24 propertyId / roomId → airbnb listingId)
- Virtudes One **341090 / 704840** ← **COBAIA** (1652161621003086510)
- Virtudes Two 341089 / 704839 (1652149493924437177)
- The Root 341085 / 704835 (607230809296653833)
- The Alluring (Santa Catarina) 341086 / 704836 (734054353978879876)
- The Terraced Loft (Duque Saldanha) 341087 / 704837 (1543625973258043211)
- Casa Serena Gaia 341088 / 704838 (1639382334426921258)
(propriedade sintética inicial: 341047 — ignorar/apagar)

## PRÓXIMOS PASSOS (por ordem)
1. **[Marcelo] `git push origin main`** no terminal — há 1 commit local por enviar (`50ae07b` fix trim do secret; os meus pushes foram bloqueados pelo classificador). Não urgente (produção já funciona com header com espaço).
2. **Verificar calendário da cobaia:** painel → linha Virtudes One → "calendário" → confirmar que preços/disponibilidade batem com o Airbnb.
3. **Confirmar com o João:** Virtudes One pode ficar em **instant book** (política Airbnb ao ligar por API).
4. **Ligar a cobaia:** painel → Virtudes One → "ligar (cobaia)" (connect: limited = Prices & Availability). Deve aceitar (é Primary Owner). Estado → connected.
5. **Importar reservas existentes** da cobaia (botão que aparece após ligar).
6. **TESTE troço Airbnb→nós:** fazer um bloqueio/alteração no multicalendário do Airbnb do Virtudes One → ver se chega ao painel e em quanto tempo.
7. **TESTE troço nós→Airbnb:** painel → "reserva teste 2027" na cobaia → cronometrar aparecimento no Airbnb → cancelar.
8. **TESTE CRÍTICO mensagens:** de uma conta Airbnb secundária, enviar mensagem como hóspede à reserva → **ver se o webhook dispara** (responde à dúvida que decide a arquitetura do bot). Se não disparar → medir polling (botão "Sync agora"). Testar outbound (responder pelo painel → ver no Airbnb).
9. **Medir uns dias** (abordagem C: webhook vs polling) → decidir qual manter.
10. Depois: repetir ligação nos outros 5; planear Fase 2 (onboarding owners via botão connect).

## Pendências/limpeza
- Apagar reservas de teste no Beds24: 89782482 (Virtudes One 2027) e 89764651 (sintética).
- Cosmético: subtítulo do painel ainda diz "preview only" → mudar para produção/super_admin.
- Apagar o invite code já usado no Beds24 (Marketplace→API).

## ⚠ Emails de erro do Beds24 (17:44, 2026-07-13) — NÃO É BUG NOSSO
Recebidos 6 emails "Airbnb returned an error message for [listing]... The listing is not connected to the requesting client application... migration still in progress — please retry in a while."
Diagnóstico (verificado por API, scripts/diag-beds24.ts): estado de sync LIMPO (todos os 6 sync=none, channels/settings airbnb vazio) — não estamos a empurrar nada. Causa = **migração de app Hospitable→Beds24(Channelsync) no Airbnb ainda a propagar** (removemos Hospitable + ligámos Beds24 hoje). Transitório; deve auto-resolver em minutos–horas (até ~24h). Anúncios OK, hóspedes reservam normal, reserva de teste não foi empurrada. AÇÃO: esperar; NÃO desligar o Beds24. Se persistir >24h → reautorizar no Airbnb ou ticket Beds24. Ferramenta: `npx tsx scripts/diag-beds24.ts`.

## Dúvida crítica ainda em aberto
**O booking webhook do Beds24 dispara quando chega uma mensagem nova de hóspede (sem alteração de reserva)?** Passo 8 responde. Decide se o bot de IA usa webhook ou polling.
