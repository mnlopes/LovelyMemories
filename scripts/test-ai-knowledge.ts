import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { formatKnowledgeWithCitations, type PropertyFact } from "../lib/ai-knowledge";
import type { PropertyKnowledge } from "../lib/ai-messaging";

let failed = 0;
const t = (name: string, cond: boolean) => { if (!cond) { failed++; console.error("FAIL:", name); } else console.log("ok:", name); };

const k: PropertyKnowledge = { listingName: "The Root", wifiName: "root-wifi", wifiPassword: "pw123", checkIn: "15:00" };
const facts: PropertyFact[] = [{ id: "abc-1", topic: "amenities", fact: "Tem berço a pedido", source: "learned" }];
const out = formatKnowledgeWithCitations(k, facts);

t("linha wifi com chave", out.text.includes("[knowledge.wifiPassword] Wi-Fi password: pw123"));
t("linha facto com chave", out.text.includes("[fact:abc-1] Tem berço a pedido"));
t("citations contém chaves", out.citations.includes("knowledge.wifiPassword") && out.citations.includes("fact:abc-1"));
t("campos vazios ausentes", !out.text.includes("doorCode"));

const empty = formatKnowledgeWithCitations(null, []);
t("null property = aviso", empty.text.includes("No property information"));
t("null property = zero citações", empty.citations.length === 0);

process.exit(failed ? 1 : 0);
