import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { matchesHardRule } from "../lib/ai-decision";

let failed = 0;
const t = (name: string, cond: boolean) => { if (!cond) { failed++; console.error("FAIL:", name); } else console.log("ok:", name); };

// Regras duras — têm de escalar
t("preço pt", matchesHardRule("Qual é o preço para dezembro?") !== null);
t("price en", matchesHardRule("Can you do a discount on the price?") !== null);
t("datas", matchesHardRule("Podemos mudar as datas da reserva?") !== null);
t("reclamação", matchesHardRule("O ar condicionado não funciona, isto é inaceitável") !== null);
t("reembolso", matchesHardRule("I want a refund") !== null);
t("cancelar", matchesHardRule("Quero cancelar a reserva") !== null);
t("early checkin", matchesHardRule("Can we check in early at 11am?") !== null);
t("bagagem", matchesHardRule("Podemos deixar as malas antes do check-in?") !== null);

// Perguntas informativas — NÃO são regra dura (seguem para o LLM)
t("wifi passa", matchesHardRule("Qual é a password do wifi?") === null);
t("berço passa", matchesHardRule("Tem berço para bebé?") === null);
t("estacionamento passa", matchesHardRule("Where can I park?") === null);

process.exit(failed ? 1 : 0);
