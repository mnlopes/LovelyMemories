import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { buildContext } from "../lib/ai-messaging";
import { decide } from "../lib/ai-decision";

(async () => {
    // Virtudes One (cobaia): propriedade 341090 — ligada e com knowledge
    const q = process.argv[2] ?? "Is the apartment available from 2026-09-10 to 2026-09-13? How much would it be?";
    const ctx = await buildContext({ guestMessage: q, externalPropertyId: "341090", history: [] });
    const d = await decide(ctx);
    console.log(JSON.stringify(d, null, 2));
})();
