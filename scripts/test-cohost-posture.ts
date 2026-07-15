// scripts/test-cohost-posture.ts — corre com npx tsx; sai 1 se falhar
import { resolveBotAction } from '../lib/cohost-posture';

const cases: Array<[Parameters<typeof resolveBotAction>, ReturnType<typeof resolveBotAction>]> = [
    // property off mata tudo
    [['off', 'auto', 'auto_send'], 'skip'],
    // posture off mata a conversa
    [['auto', 'off', 'auto_send'], 'skip'],
    [['drafts', 'off', 'needs_human'], 'skip'],
    // Assist redige SEMPRE, nunca auto-envia
    [['auto', 'assist', 'auto_send'], 'queue'],
    [['drafts', 'assist', 'needs_human'], 'queue'],
    // Auto só com property auto E posture auto E decisão auto_send
    [['auto', 'auto', 'auto_send'], 'auto_send'],
    [['auto', 'auto', 'needs_human'], 'queue'],
    [['drafts', 'auto', 'auto_send'], 'queue'],
];

let fail = 0;
for (const [args, expected] of cases) {
    const got = resolveBotAction(...args);
    if (got !== expected) { console.error(`FAIL resolveBotAction(${args.join(',')}) = ${got}, expected ${expected}`); fail++; }
}
console.log(fail === 0 ? `PASS ${cases.length}/${cases.length}` : `${fail} failures`);
process.exit(fail === 0 ? 0 : 1);
