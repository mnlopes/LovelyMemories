// lib/reservation-window.ts — sobreposição de intervalos de datas. Puro; yyyy-MM-dd; checkout exclusivo.
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** true se [reqCheckIn, reqCheckOut) e [stayCheckIn, stayCheckOut) se sobrepõem. */
export function datesOverlapStay(
    reqCheckIn: string, reqCheckOut: string, stayCheckIn: string, stayCheckOut: string,
): boolean {
    if (![reqCheckIn, reqCheckOut, stayCheckIn, stayCheckOut].every((d) => ISO.test(d))) return false;
    // Comparação lexicográfica funciona para yyyy-MM-dd. Sobreposição de meio-abertos:
    // início_A < fim_B && início_B < fim_A.
    return reqCheckIn < stayCheckOut && stayCheckIn < reqCheckOut;
}
