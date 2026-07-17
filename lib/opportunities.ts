import { differenceInCalendarDays, parseISO } from 'date-fns';

/**
 * Motor puro da feature Opportunities (gap-nights). Sem I/O — dado a ocupação por casa,
 * encontra as "noites órfãs": sequências curtas de noites livres presas entre duas
 * reservas (ocupação imediatamente antes E depois), difíceis de vender sozinhas.
 *
 * Totalmente testável com datas inventadas (scripts/test-opportunities.ts).
 */

/** Intervalo de ocupação [check-in, check-out) em ISO 'yyyy-MM-dd'. check-out é a saída (não é noite). */
export interface Interval {
    start: string;
    end: string;
}

export interface Gap {
    propertyId: string;
    /** Primeira noite livre (= dia do check-out anterior). */
    gapStart: string;
    /** Próximo check-in (primeira noite ocupada de novo). */
    gapEnd: string;
    /** Noites livres no gap = gapEnd − gapStart. */
    nights: number;
}

export interface FindGapsOptions {
    /** Início da janela (hoje) — gaps a começar antes disto são ignorados. */
    fromISO: string;
    /** Fim da janela (hoje + N dias). */
    toISO: string;
    /** Máximo de noites para contar como oportunidade (órfãs curtas). */
    maxGapNights: number;
}

// Datas ISO 'yyyy-MM-dd' comparam-se lexicograficamente (zero-padded), por isso a
// ordenação/limites usam comparação de strings; a contagem de noites usa date-fns.
function nightsBetween(fromISO: string, toISO: string): number {
    return differenceInCalendarDays(parseISO(toISO), parseISO(fromISO));
}

/**
 * Funde intervalos sobrepostos ou que se tocam (check-out = próximo check-in, o
 * "same-day turn" não deixa gap) e devolve os intervalos ordenados e limpos.
 */
export function mergeIntervals(raw: Interval[]): Interval[] {
    const sorted = raw
        .filter((i) => i.start && i.end && i.start < i.end)
        .sort((a, b) => a.start.localeCompare(b.start));
    if (sorted.length === 0) return [];
    const merged: Interval[] = [{ ...sorted[0] }];
    for (let i = 1; i < sorted.length; i++) {
        const cur = merged[merged.length - 1];
        const nxt = sorted[i];
        if (nxt.start <= cur.end) {
            if (nxt.end > cur.end) cur.end = nxt.end;
        } else {
            merged.push({ ...nxt });
        }
    }
    return merged;
}

export function findGaps(
    occupancyByProperty: Record<string, Interval[]>,
    { fromISO, toISO, maxGapNights }: FindGapsOptions,
): Gap[] {
    const gaps: Gap[] = [];
    for (const [propertyId, raw] of Object.entries(occupancyByProperty)) {
        const merged = mergeIntervals(raw);
        if (merged.length < 2) continue; // precisa de ocupação dos dois lados
        for (let i = 0; i < merged.length - 1; i++) {
            const gapStart = merged[i].end;        // dia do check-out = primeira noite livre
            const gapEnd = merged[i + 1].start;    // próximo check-in
            const nights = nightsBetween(gapStart, gapEnd);
            if (nights < 1 || nights > maxGapNights) continue;
            if (gapStart < fromISO || gapStart > toISO) continue;
            gaps.push({ propertyId, gapStart, gapEnd, nights });
        }
    }
    gaps.sort((a, b) => a.gapStart.localeCompare(b.gapStart) || a.propertyId.localeCompare(b.propertyId));
    return gaps;
}
