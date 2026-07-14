import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { matchesHardRule } from "../lib/ai-decision";

let failed = 0;
const t = (name: string, cond: boolean) => { if (!cond) { failed++; console.error("FAIL:", name); } else console.log("ok:", name); };

// NEGOCIAÇÃO/decisões — continuam a escalar SEMPRE
t("desconto pt", matchesHardRule("Fazem desconto para uma semana?") !== null);
t("discount en", matchesHardRule("Can you do a discount on the price?") !== null);
t("cheaper", matchesHardRule("any chance of a cheaper rate?") !== null);
t("mudar datas", matchesHardRule("Podemos mudar as datas da reserva?") !== null);
t("reclamação", matchesHardRule("O ar condicionado não funciona, isto é inaceitável") !== null);
t("reembolso", matchesHardRule("I want a refund") !== null);
t("cancelar", matchesHardRule("Quero cancelar a reserva") !== null);
t("early checkin", matchesHardRule("Can we check in early at 11am?") !== null);
t("bagagem", matchesHardRule("Podemos deixar as malas antes do check-in?") !== null);

// INFORMATIVAS — passam ao agente (que tem dados reais)
t("preço informativo passa", matchesHardRule("Qual é o preço para 3 noites em setembro?") === null);
t("price question passes", matchesHardRule("How much would 3 nights in September cost?") === null);
t("disponibilidade passa", matchesHardRule("Está livre de 20 a 23 de agosto?") === null);
t("availability passes", matchesHardRule("Is it available next weekend?") === null);
t("wifi passa", matchesHardRule("Qual é a password do wifi?") === null);
t("berço passa", matchesHardRule("Tem berço para bebé?") === null);
t("estacionamento passa", matchesHardRule("Where can I park?") === null);

process.exit(failed ? 1 : 0);
