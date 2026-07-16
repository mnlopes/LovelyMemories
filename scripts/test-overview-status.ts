// scripts/test-overview-status.ts — npx tsx; exit 1 em falha
import { deriveStayStatus, derivePropertyToday } from '../lib/overview-status';

let fail = 0;
const t = (n: string, ok: boolean) => { if (!ok) { console.error(`FAIL ${n}`); fail++; } };
const today = '2026-07-16';

t('chega hoje', deriveStayStatus('2026-07-16', '2026-07-19', today) === 'arrives_today');
t('sai amanhã', deriveStayStatus('2026-07-14', '2026-07-17', today) === 'departs_tomorrow');
t('em estadia', deriveStayStatus('2026-07-14', '2026-07-21', today) === 'staying');
t('chega em breve', deriveStayStatus('2026-07-18', '2026-07-22', today) === 'arrives_soon');
t('fora de janela (passado)', deriveStayStatus('2026-07-01', '2026-07-10', today) === null);
t('fora de janela (>7d)', deriveStayStatus('2026-07-30', '2026-08-02', today) === null);
t('sai HOJE ainda ocupada até checkout → staying', deriveStayStatus('2026-07-14', '2026-07-16', today) === 'staying');

t('ocupada', derivePropertyToday([{ check_in: '2026-07-14', check_out: '2026-07-21' }], today) === 'occupied');
t('chega hoje', derivePropertyToday([{ check_in: '2026-07-16', check_out: '2026-07-19' }], today) === 'arrives_today');
t('livre', derivePropertyToday([{ check_in: '2026-07-20', check_out: '2026-07-22' }], today) === 'free');
t('vazio → livre', derivePropertyToday([], today) === 'free');

console.log(fail === 0 ? 'PASS' : `${fail} failures`);
process.exit(fail === 0 ? 0 : 1);
