import { messagesMatch, channelNormalize } from "../lib/ai-message-match";

/** Testes do comparador de auto-envio (robustez ao emoji→'?' do canal Airbnb/Beds24). */
let failed = 0;
function check(name: string, got: boolean, want: boolean) {
    const ok = got === want;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}  (got=${got} want=${want})`);
}

// Caso do bug: enviámos com 😊, o eco veio com '?'
check("emoji->? tail",
    messagesMatch(
        "Para 3 noites em setembro, de 10 a 13 de setembro, o custo total é de €300 (sem incluir taxas ou taxas da plataforma). Se tiver mais perguntas, estou aqui para ajudar! 😊",
        "Para 3 noites em setembro, de 10 a 13 de setembro, o custo total é de €300 (sem incluir taxas ou taxas da plataforma). Se tiver mais perguntas, estou aqui para ajudar! ?",
    ), true);

// Mensagens sem emoji continuam a casar
check("no-emoji exact", messagesMatch("Olá! Como posso ajudar?", "Olá! Como posso ajudar?"), true);
check("trailing space + ?", messagesMatch("Mais alguma questão ?", "Mais alguma questão ?"), true);

// Uma resposta humana REAL diferente NÃO deve casar (bot deve desligar)
check("real human reply differs", messagesMatch("O check-in é às 15h e sim tem internet", "Sim, podes trazer comida para o alojamento!"), false);

// Guardas
check("null/empty", messagesMatch(null, "x"), false);
check("emoji-only não casa (normaliza para vazio)", messagesMatch("😊", "?"), false);

// Normalização direta
check("normalize strips emoji", channelNormalize("ajudar! 😊") === "ajudar!", true);

if (failed) { console.error(`\n${failed} teste(s) falharam`); process.exit(1); }
console.log("\nTodos os testes passaram.");
process.exit(0);
