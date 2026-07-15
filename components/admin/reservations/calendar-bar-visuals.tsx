import { startOfDay } from "date-fns";
import { Building2, Moon } from "lucide-react";
import { FaAirbnb } from "react-icons/fa";
import { cn } from "@/lib/utils";

/** Parallelogram clip-path (Hospitable-style): diagonal ~9px edge at a real
 *  check-in/check-out; straight edge (0px) when the bar continues past that side. */
export function getBarClipPath(startsBefore: boolean, endsAfter: boolean): string {
    const l = startsBefore ? 0 : 9;
    const r = endsAfter ? 0 : 9;
    return `polygon(${l}px 0, 100% 0, calc(100% - ${r}px) 100%, 0 100%)`;
}

/** Tailwind classes for a reservation bar by status. */
export function getReservationStatusColor(status: string): string {
    switch (status) {
        case "confirmed": return "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600/20";
        case "pending": return "bg-amber-200 hover:bg-amber-300 text-amber-950 border-amber-300/50";
        case "checked-in": return "bg-blue-500 hover:bg-blue-600 text-white border-blue-600/20";
        case "checked-out":
        case "completed": return "bg-slate-400 hover:bg-slate-500 text-white border-slate-500/20";
        default: return "bg-slate-400 text-white border-slate-500/20";
    }
}

/** A confirmed reservation whose checkout is in the past renders as "completed". */
export function effectiveReservationStatus(status: string, checkOut: Date | string): string {
    if (status !== "confirmed") return status;
    const co = startOfDay(new Date(checkOut)).getTime();
    const today = startOfDay(new Date()).getTime();
    return co <= today ? "completed" : status;
}

export const AIRBNB_HATCH = "repeating-linear-gradient(45deg, #ffe4e6, #ffe4e6 6px, #fecdd3 6px, #fecdd3 12px)";
export const BOOKING_HATCH = "repeating-linear-gradient(45deg, #eff6ff, #eff6ff 6px, #dbeafe 6px, #dbeafe 12px)";
export const BLOCK_HATCH = "repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 6px, #e2e8f0 6px, #e2e8f0 12px)";

/** Channel glyphs shared by the Timeline and the Month grid. */
export function ChannelBadge({ kind }: { kind: "airbnb-circle" | "beds24" | "airbnb-box" | "booking-box" }) {
    switch (kind) {
        case "airbnb-circle":
            return (
                <span title="Airbnb" className="flex items-center justify-center size-4 rounded-full bg-white shrink-0">
                    <FaAirbnb className="size-2.5 text-rose-500" />
                </span>
            );
        case "beds24":
            return <span className="rounded bg-white/25 px-1 py-px text-[8px] font-bold uppercase tracking-wider leading-none">Beds24</span>;
        case "airbnb-box":
            return (
                <span className="size-5 rounded-md bg-rose-500 flex items-center justify-center shrink-0 shadow-sm">
                    <FaAirbnb className="size-3 text-white" />
                </span>
            );
        case "booking-box":
            return (
                <span className="size-5 rounded-md bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                    <Building2 className="size-3 text-white" />
                </span>
            );
    }
}

/** Moon (minStay) + € price glyph, shared by the Timeline rail and the Month rail.
 *  align "center": moon absolutely to the left, price centered (Timeline rail cell,
 *  which supplies its own relative/flex-center container).
 *  align "between": moon left, price right in a flex-between row (Month bottom rail). */
export function CalendarDayPrice({
    info, align, priceClassName = "text-[11px]", minStayTitle,
}: {
    info: { price: number | null; minStay: number | null };
    align: "center" | "between";
    priceClassName?: string;
    minStayTitle?: string;
}) {
    const hasMoon = info.minStay != null && info.minStay > 1;
    const hasPrice = typeof info.price === "number";
    if (!hasMoon && !hasPrice) return null;
    return (
        <>
            {hasMoon ? (
                <span
                    title={minStayTitle}
                    className={cn(
                        "flex items-center gap-0.5 text-[8px] font-bold text-[#c4c4c4] dark:text-white/30",
                        align === "center" && "absolute left-1 top-0.5",
                    )}
                >
                    <Moon className="size-2.5" />{info.minStay}
                </span>
            ) : align === "between" ? <span /> : null}
            {hasPrice ? (
                <span className={cn("font-bold tabular-nums text-[#525252] dark:text-white/70", priceClassName)}>
                    €{info.price}
                </span>
            ) : align === "between" ? <span /> : null}
        </>
    );
}
