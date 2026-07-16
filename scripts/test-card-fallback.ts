// scripts/test-card-fallback.ts — npx tsx; exit 1 em falha
import { buildCardFallback } from '../lib/ai-card-meta';

let fail = 0;
const t = (name: string, ok: boolean) => { if (!ok) { console.error(`FAIL ${name}`); fail++; } };

const a = buildCardFallback('Maria', 'Olá! A que horas posso fazer o check-in? E qual é a password do wifi?');
t('title = 1ª linha truncada', a.title === 'Olá! A que horas posso fazer o check-in?'.slice(0, 44));
t('summary = preview', a.summary.startsWith('Olá! A que horas posso'));
t('why null', a.why === null);

const b = buildCardFallback(null, 'linha1 com um texto mesmo muito longo que ultrapassa claramente os quarenta e quatro caracteres\nlinha2');
t('só 1ª linha', !b.title.includes('linha2'));
t('trunca com ellipsis', b.title.length <= 45 && b.title.endsWith('…'));

const c = buildCardFallback('X', '   ');
t('mensagem vazia → título default', c.title === 'Nova mensagem');

console.log(fail === 0 ? 'PASS' : `${fail} failures`);
process.exit(fail === 0 ? 0 : 1);
