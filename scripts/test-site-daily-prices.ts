import { buildSiteDailyPrices } from "../lib/site-daily-prices";

let failed = 0;
function assert(cond: boolean, msg: string) {
    if (!cond) { console.error("FAIL:", msg); failed++; } else { console.log("ok:", msg); }
}

const custom = [{ start_date: "2026-07-11", end_date: "2026-07-13", price_per_night: 210 }];
// range 10 (incl) .. 13 (excl) => days 10, 11, 12
const out = buildSiteDailyPrices(180, 2, custom, "2026-07-10", "2026-07-13");

assert(Object.keys(out).length === 3, "three days, endDate exclusive");
assert(out["2026-07-10"].price === 180 && out["2026-07-10"].minStay === 2, "day 10 = base price + min_nights");
assert(out["2026-07-11"].price === 210, "day 11 = custom override (start inclusive)");
assert(out["2026-07-12"].price === 210, "day 12 = custom override");
assert(out["2026-07-13"] === undefined, "day 13 excluded (override end_date exclusive AND range end exclusive)");

const noBase = buildSiteDailyPrices(null, 3, [], "2026-07-10", "2026-07-11");
assert(noBase["2026-07-10"].price === null && noBase["2026-07-10"].minStay === 3, "no base -> price null, minStay kept");

console.log(failed === 0 ? "\nALL PASS" : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
