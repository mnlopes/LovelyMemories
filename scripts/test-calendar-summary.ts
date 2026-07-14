import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { summariseCalendar, type CalendarDay } from "../lib/beds24/calendar";

let failed = 0;
const t = (name: string, cond: boolean) => { if (!cond) { failed++; console.error("FAIL:", name); } else console.log("ok:", name); };

const days: CalendarDay[] = [
    { date: "2026-09-10", price: 110, available: true, minStay: 2 },
    { date: "2026-09-11", price: 110, available: true, minStay: 2 },
    { date: "2026-09-12", price: 150, available: true, minStay: 2 },
];
// Estadia 10→13 set = 3 noites (13 é checkout, não é noite dormida)
const ok = summariseCalendar(days, "2026-09-10", "2026-09-13");
t("todas disponíveis", ok.text.includes("ALL nights are available"));
t("total 370", ok.text.includes("370"));
t("citation", ok.citation === "calendar:2026-09-10..2026-09-13");

const daysBlocked: CalendarDay[] = [
    { date: "2026-09-10", price: 110, available: true, minStay: 2 },
    { date: "2026-09-11", price: null, available: false, minStay: null },
    { date: "2026-09-12", price: 150, available: true, minStay: 2 },
];
const blocked = summariseCalendar(daysBlocked, "2026-09-10", "2026-09-13");
t("indisponível assinalado", blocked.text.includes("NOT available") && blocked.text.includes("2026-09-11"));
t("sem total quando bloqueado", !blocked.text.includes("Total"));

const missing = summariseCalendar([], "2026-09-10", "2026-09-13");
t("sem dados = sem números", missing.text.includes("No calendar data") && !/\d+\s?€|€\s?\d+/.test(missing.text));

process.exit(failed ? 1 : 0);
