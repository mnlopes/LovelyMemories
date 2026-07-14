import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { computeCoverage, CHECKLIST_FIELDS } from "../lib/ai-knowledge";
import type { PropertyKnowledge } from "../lib/ai-messaging";

let failed = 0;
const t = (name: string, cond: boolean) => { if (!cond) { failed++; console.error("FAIL:", name); } else console.log("ok:", name); };

t("tem 10 campos", CHECKLIST_FIELDS.length === 10);

// Campo estruturado preenchido → coberto
const k1: PropertyKnowledge = { wifiName: "root-wifi", checkIn: "15:00" };
const c1 = computeCoverage(k1, []);
t("wifiName preenchido", c1.wifiName === true);
t("checkIn preenchido", c1.checkIn === true);
t("wifiPassword vazio", c1.wifiPassword === false);

// Facto ativo de access cobre building/apartmentAccess
const c2 = computeCoverage(null, [{ topic: "access", status: "active" }]);
t("access facto cobre buildingAccess", c2.buildingAccess === true);
t("access facto cobre apartmentAccess", c2.apartmentAccess === true);
t("access facto NÃO cobre wifi", c2.wifiPassword === false);

// Facto PENDING não cobre
const c3 = computeCoverage(null, [{ topic: "parking", status: "pending" }]);
t("facto pending não cobre", c3.parking === false);

// house_rules por facto
const c4 = computeCoverage(null, [{ topic: "house_rules", status: "active" }]);
t("house_rules facto cobre houseRules", c4.houseRules === true);

process.exit(failed ? 1 : 0);
