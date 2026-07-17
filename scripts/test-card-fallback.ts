// scripts/test-card-fallback.ts — npx tsx; exit 1 em falha
import { buildCardFallback } from '../lib/ai-card-meta';

let fail = 0;
const t = (name: string, ok: boolean) => { if (!ok) { console.error(`FAIL ${name}`); fail++; } };
const GREETING_PREFIX = /^(ol[áa]|oi|bom dia|boa tarde|boa noite|hello|hi|hey)\b/i;

const a = buildCardFallback('Maria', 'Olá! A que horas posso fazer o check-in? E qual é a password do wifi?');
t('saudação descartada, assunto no título', a.title === 'A que horas posso fazer o check-in?');
t('summary = preview (mensagem completa)', a.summary.startsWith('Olá! A que horas posso'));
t('why null', a.why === null);

// Saudação + frase seguinte longa: antes ficava só "Olá!"; agora mostra o assunto truncado.
const d = buildCardFallback('X', 'Olá! A password do wifi não está a funcionar, podem ajudar?');
t('não fica só saudação', d.title !== 'Olá!' && !GREETING_PREFIX.test(d.title));
t('mostra o assunto', d.title.startsWith('A password do wifi'));

const b = buildCardFallback(null, 'linha1 com um texto mesmo muito longo que ultrapassa claramente os quarenta e quatro caracteres\nlinha2');
t('só 1ª linha', !b.title.includes('linha2'));
t('trunca com ellipsis', b.title.length <= 45 && b.title.endsWith('…'));

const c = buildCardFallback('X', '   ');
t('mensagem vazia → título default', c.title === 'Nova mensagem');

console.log(fail === 0 ? 'PASS' : `${fail} failures`);
process.exit(fail === 0 ? 0 : 1);
