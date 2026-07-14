import { beds24Request } from "@/lib/beds24/client";

/**
 * Calendário Beds24 (fonte de verdade para preço/disponibilidade, sync Airbnb).
 * Consumido pela ferramenta getCalendar do agente (lib/ai-agent-tools.ts).
 */

export interface CalendarDay {
    date: string;                 // YYYY-MM-DD
    price: number | null;         // preço da noite (price1)
    available: boolean;
    minStay: number | null;
}

/** Janela máxima defensiva: ≤ 31 noites, ≤ 365 dias à frente (guarda do spec). */
export function clampWindow(startDate: string, endDate: string): { start: string; end: string } | null {
    const start = new Date(startDate + "T00:00:00Z");
    const end = new Date(endDate + "T00:00:00Z");
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return null;
    const maxAhead = new Date(); maxAhead.setUTCDate(maxAhead.getUTCDate() + 365);
    if (start > maxAhead) return null;
    const nights = (end.getTime() - start.getTime()) / 86_400_000;
    if (nights > 31) {
        const capped = new Date(start); capped.setUTCDate(capped.getUTCDate() + 31);
        return { start: startDate, end: capped.toISOString().slice(0, 10) };
    }
    return { start: startDate, end: endDate };
}

type RawCalendarEntry = {
    from?: string; to?: string;
    numAvail?: number; price1?: number; minStay?: number;
};

/**
 * Lê o calendário do quarto e expande os intervalos from/to em dias individuais.
 * NOTA: parse validado contra scripts/probe-beds24-calendar.ts (formato real
 * confirmado idêntico ao assumido: data[0].calendar[] com from/to/numAvail/price1/minStay).
 */
export async function getRoomCalendar(roomId: number, startDate: string, endDate: string): Promise<CalendarDay[]> {
    const win = clampWindow(startDate, endDate);
    if (!win) return [];
    const res = await beds24Request<Array<{ roomId?: number; calendar?: RawCalendarEntry[] }>>(
        "GET", "/inventory/rooms/calendar", {
            query: {
                roomId, startDate: win.start, endDate: win.end,
                includePrices: true, includeMinStay: true, includeNumAvail: true,
            },
            context: "bot",
        },
    );
    const data = (res as { data?: Array<{ calendar?: RawCalendarEntry[] }> })?.data ?? [];
    const entries = data[0]?.calendar ?? [];
    const byDate = new Map<string, CalendarDay>();
    for (const e of entries) {
        if (!e.from) continue;
        const from = new Date(e.from + "T00:00:00Z");
        const to = new Date((e.to ?? e.from) + "T00:00:00Z");
        for (let d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
            const date = d.toISOString().slice(0, 10);
            byDate.set(date, {
                date,
                price: typeof e.price1 === "number" ? e.price1 : null,
                available: (e.numAvail ?? 0) > 0,
                minStay: typeof e.minStay === "number" ? e.minStay : null,
            });
        }
    }
    // Devolve só as NOITES da estadia (end é checkout — exclusivo)
    const out: CalendarDay[] = [];
    const start = new Date(win.start + "T00:00:00Z");
    const end = new Date(win.end + "T00:00:00Z");
    for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
        const date = d.toISOString().slice(0, 10);
        const day = byDate.get(date);
        if (day) out.push(day);
    }
    return out;
}

/**
 * Converte os dias num bloco de FACTOS compacto para o modelo, com a citação
 * que o gate valida. Regra dura do spec: sem dados → texto explícito sem números.
 */
export function summariseCalendar(
    days: CalendarDay[], checkIn: string, checkOut: string,
): { text: string; citation: string } {
    const citation = `calendar:${checkIn}..${checkOut}`;
    const nights = Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000);
    if (!days.length || days.length < nights) {
        return { citation, text: `No calendar data for ${checkIn} to ${checkOut}. Do NOT state any price or availability for these dates.` };
    }
    const unavailable = days.filter((d) => !d.available).map((d) => d.date);
    const lines: string[] = [`Stay ${checkIn} → ${checkOut} (${nights} night(s)):`];
    if (unavailable.length) {
        lines.push(`NOT available — these nights are blocked/booked: ${unavailable.join(", ")}.`);
    } else {
        lines.push(`ALL nights are available.`);
        const prices = days.map((d) => d.price);
        if (prices.every((p): p is number => typeof p === "number")) {
            const total = prices.reduce((a, b) => a + b, 0);
            lines.push(`Nightly prices: ${days.map((d) => `${d.date}=€${d.price}`).join(", ")}.`);
            lines.push(`Total for the stay: €${total} (nightly sum — plus any platform fees/taxes).`);
        } else {
            lines.push(`Prices are not fully known for this range — do NOT quote a total.`);
        }
        const minStayMax = Math.max(...days.map((d) => d.minStay ?? 0));
        if (minStayMax > nights) lines.push(`WARNING: minimum stay for these dates is ${minStayMax} nights — this ${nights}-night stay does NOT meet it.`);
    }
    return { citation, text: lines.join("\n") };
}
