import { datesOverlapStay } from '../lib/reservation-window';

let fail = 0;
const t = (n: string, ok: boolean) => { if (!ok) { console.error(`FAIL ${n}`); fail++; } };
const STAY = ['2026-07-19', '2026-07-23'] as const;

t('mesmo intervalo → true', datesOverlapStay('2026-07-19', '2026-07-23', ...STAY) === true);
t('dentro da estadia → true', datesOverlapStay('2026-07-20', '2026-07-22', ...STAY) === true);
t('sobreposição parcial início → true', datesOverlapStay('2026-07-17', '2026-07-20', ...STAY) === true);
t('sobreposição parcial fim → true', datesOverlapStay('2026-07-22', '2026-07-25', ...STAY) === true);
t('adjacente antes (reqCheckOut = stayCheckIn) → false', datesOverlapStay('2026-07-15', '2026-07-19', ...STAY) === false);
t('adjacente depois (reqCheckIn = stayCheckOut) → false', datesOverlapStay('2026-07-23', '2026-07-26', ...STAY) === false);
t('totalmente antes → false', datesOverlapStay('2026-07-10', '2026-07-14', ...STAY) === false);
t('totalmente depois → false', datesOverlapStay('2026-07-30', '2026-08-02', ...STAY) === false);
t('datas inválidas → false', datesOverlapStay('lixo', '2026-07-23', ...STAY) === false);

console.log(fail === 0 ? 'PASS' : `${fail} failures`);
process.exit(fail === 0 ? 0 : 1);
