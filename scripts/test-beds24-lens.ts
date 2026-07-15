import { applyBeds24Lens } from "../lib/beds24-calendar-lens";

let failed = 0;
function assert(cond: boolean, msg: string) {
    if (!cond) { console.error("FAIL:", msg); failed++; } else { console.log("ok:", msg); }
}

const reservations = [
    { id: "r1", property_id: "P", is_airbnb: true },   // linked airbnb res -> dropped when preview on
    { id: "r2", property_id: "P", is_airbnb: false },  // direct site res -> kept
    { id: "r3", property_id: "Q", is_airbnb: true },   // other property, not in preview -> kept
];
const blocks = [
    { id: "b1", property_id: "P", source: "airbnb_booking", start_date: "2026-07-05", end_date: "2026-07-09" }, // covered -> dropped
    { id: "b2", property_id: "P", source: "airbnb_booking", start_date: "2026-08-01", end_date: "2026-08-04" }, // NOT covered -> kept
    { id: "b3", property_id: "P", source: "owner",          start_date: "2026-07-05", end_date: "2026-07-09" }, // manual -> kept
];
const preview = {
    internalPropertyIds: ["P"],
    bookings: [{ id: "k1", property_id: "P", check_in: "2026-07-05", check_out: "2026-07-09", is_beds24: true }],
};

// preview null -> identity
const idn = applyBeds24Lens(reservations, blocks, null);
assert(idn.reservations === reservations && idn.blockedDates === blocks, "null preview returns inputs unchanged");

const out = applyBeds24Lens(reservations, blocks, preview);
assert(!out.reservations.some(r => r.id === "r1"), "linked is_airbnb reservation dropped");
assert(out.reservations.some(r => r.id === "r2"), "direct reservation kept");
assert(out.reservations.some(r => r.id === "r3"), "other-property reservation kept");
assert(out.reservations.some(r => r.id === "k1"), "beds24 booking injected");
assert(!out.blockedDates.some(b => b.id === "b1"), "covered airbnb block dropped");
assert(out.blockedDates.some(b => b.id === "b2"), "uncovered airbnb block kept");
assert(out.blockedDates.some(b => b.id === "b3"), "manual block kept");

const dec = applyBeds24Lens(reservations, blocks, preview, (b) => ({ ...b, property_name: "X" }));
assert(dec.reservations.find(r => r.id === "k1")?.property_name === "X", "decorator applied to injected bookings only");
assert(!("property_name" in (dec.reservations.find(r => r.id === "r2") as any)), "decorator not applied to existing reservations");

console.log(failed === 0 ? "\nALL PASS" : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
