// One-off: preenche card_title/summary/why dos drafts pendentes que ainda estão a null.
// Só toca em status='draft' com refs Beds24 (não UUID legacy). npx tsx scripts/backfill-card-meta.ts
import dotenv from 'dotenv'; dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { generateCardMeta, buildCardFallback } from '../lib/ai-card-meta';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: rows, error } = await s.from('ai_message_log')
    .select('id, guest_name, property_code, incoming_message, ai_draft, card_title')
    .eq('status', 'draft')
    .is('card_title', null)
    .not('reservation_ref', 'like', '%-%');
  if (error) throw error;
  console.log(`drafts sem card_title: ${rows?.length ?? 0}`);
  for (const r of rows ?? []) {
    const meta = await generateCardMeta({
      guestMessage: r.incoming_message as string,
      draft: (r.ai_draft as string | null) ?? null,
      guestName: (r.guest_name as string | null) ?? null,
      propertyName: (r.property_code as string | null) ?? null,
    }) ?? buildCardFallback((r.guest_name as string | null) ?? null, r.incoming_message as string);
    await s.from('ai_message_log').update({
      card_title: meta.title, card_summary: meta.summary, card_why: meta.why,
    }).eq('id', r.id);
    console.log(`  ✓ ${r.id} → "${meta.title}"`);
  }
  console.log('done');
}
main().catch(e => { console.error(e); process.exit(1); });
