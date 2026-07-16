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

export function derivePropertyToday(
    stays: Array<{ check_in: string; check_out: string }>,
    todayISO: string,
): 'occupied' | 'arrives_today' | 'free' {
    if (stays.some((s) => s.check_in === todayISO)) return 'arrives_today';
    if (stays.some((s) => s.check_in < todayISO && s.check_out > todayISO)) return 'occupied';
    return 'free';
}
