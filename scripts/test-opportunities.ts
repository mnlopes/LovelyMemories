// scripts/test-opportunities.ts — npx tsx; exit 1 em falha
import { findGaps, mergeIntervals } from '../lib/opportunities';

let fail = 0;
const t = (n: string, ok: boolean) => { if (!ok) { console.error(`FAIL ${n}`); fail++; } };

const opts = { fromISO: '2026-07-16', toISO: '2026-09-14', maxGapNights: 3 };

// gap de 1 noite entre duas reservas
{
    const g = findGaps({ p1: [{ start: '2026-07-15', end: '2026-07-18' }, { start: '2026-07-19', end: '2026-07-22' }] }, opts);
    t('1 gap de 1 noite', g.length === 1 && g[0].nights === 1 && g[0].gapStart === '2026-07-18' && g[0].gapEnd === '2026-07-19');
}

// same-day turn (check-out = próximo check-in) → sem gap
{
    const g = findGaps({ p1: [{ start: '2026-07-15', end: '2026-07-18' }, { start: '2026-07-18', end: '2026-07-22' }] }, opts);
    t('same-day turn → 0 gaps', g.length === 0);
}

// gap de 4 noites (> max 3) → excluído
{
    const g = findGaps({ p1: [{ start: '2026-07-15', end: '2026-07-18' }, { start: '2026-07-22', end: '2026-07-25' }] }, opts);
    t('gap 4 noites excluído', g.length === 0);
}

// gap de 3 noites (= max) → incluído
{
    const g = findGaps({ p1: [{ start: '2026-07-15', end: '2026-07-18' }, { start: '2026-07-21', end: '2026-07-24' }] }, opts);
    t('gap 3 noites incluído', g.length === 1 && g[0].nights === 3);
}

// gap no passado (antes de fromISO) → excluído
{
    const g = findGaps({ p1: [{ start: '2026-07-10', end: '2026-07-12' }, { start: '2026-07-13', end: '2026-07-15' }] }, opts);
    t('gap no passado excluído', g.length === 0);
}

// gap fora da janela (depois de toISO) → excluído
{
    const g = findGaps({ p1: [{ start: '2026-09-20', end: '2026-09-23' }, { start: '2026-09-24', end: '2026-09-27' }] }, opts);
    t('gap fora da janela excluído', g.length === 0);
}

// reservas sobrepostas → fundidas, sem gap
{
    const g = findGaps({ p1: [{ start: '2026-07-15', end: '2026-07-20' }, { start: '2026-07-18', end: '2026-07-25' }] }, opts);
    t('sobrepostas → sem gap', g.length === 0);
}

// só uma reserva → sem gap (precisa de ocupação dos dois lados)
{
    const g = findGaps({ p1: [{ start: '2026-07-15', end: '2026-07-18' }] }, opts);
    t('uma reserva → sem gap', g.length === 0);
}

// ordenado por data, várias casas
{
    const g = findGaps({
        pA: [{ start: '2026-07-20', end: '2026-07-22' }, { start: '2026-07-23', end: '2026-07-25' }], // gap 22
        pB: [{ start: '2026-07-16', end: '2026-07-18' }, { start: '2026-07-19', end: '2026-07-21' }], // gap 18
    }, opts);
    t('ordenado por gapStart', g.length === 2 && g[0].gapStart === '2026-07-18' && g[1].gapStart === '2026-07-22');
}

// mergeIntervals: dois blocos que se tocam fundem-se num só
{
    const m = mergeIntervals([{ start: '2026-07-15', end: '2026-07-18' }, { start: '2026-07-18', end: '2026-07-22' }]);
    t('merge toca → 1 intervalo', m.length === 1 && m[0].start === '2026-07-15' && m[0].end === '2026-07-22');
}

console.log(fail === 0 ? 'PASS' : `${fail} failures`);
process.exit(fail === 0 ? 0 : 1);
