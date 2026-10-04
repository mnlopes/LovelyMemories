// lib/overview-status.ts — estado derivado das estadias para o Overview. Puro; datas ISO yyyy-MM-dd.
export type StayStatus = 'arrives_today' | 'departs_tomorrow' | 'staying' | 'arrives_soon';

// UTC explícito: parse/format em UTC para evitar que o fuso horário local do
// processo (ex.: Portugal, UTC+1) desloque o dia calculado.
const addDaysISO = (iso: string, n: number): string => {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};

export function deriveStayStatus(checkIn: string, checkOut: string, todayISO: string): StayStatus | null {
    if (checkOut < todayISO) return null;                       // já saiu
    if (checkIn > addDaysISO(todayISO, 7)) return null;         // longe demais
    if (checkIn === todayISO) return 'arrives_today';
    if (checkIn < todayISO) {
        return checkOut === addDaysISO(todayISO, 1) ? 'departs_tomorrow' : 'staying';
    }
    return 'arrives_soon';
}

export type PropertyToday = 'occupied' | 'arrives_today' | 'blocked' | 'free';

// `blocks` = bloqueios manuais do backoffice: a casa não tem ninguém mas também não está à venda.
export function derivePropertyToday(
    stays: Array<{ check_in: string; check_out: string }>,
    todayISO: string,
    blocks: Array<{ check_in: string; check_out: string }> = [],
): PropertyToday {
    if (stays.some((s) => s.check_in === todayISO)) return 'arrives_today';
    if (stays.some((s) => s.check_in < todayISO && s.check_out > todayISO)) return 'occupied';
    if (blocks.some((b) => b.check_in <= todayISO && b.check_out > todayISO)) return 'blocked';
    return 'free';
}

/**
 * Bloco do blocked_dates que fecha datas sem ser uma estadia de hóspede = bloqueio manual
 * (source 'system'). Os "Airbnb (Not available)" do iCal NÃO entram: o Airbnb exporta assim
 * também reservas de outros canais sincronizados, por isso continuam a contar como estadia.
 */
export function isNonGuestBlock(b: { source: string | null }): boolean {
    return b.source === 'system';
}
