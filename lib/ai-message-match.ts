/**
 * Deteção robusta de "esta mensagem foi enviada por nós (bot/painel)".
 *
 * O canal Airbnb (via Beds24) NÃO devolve as mensagens byte-a-byte no webhook:
 * emojis e outros caracteres não-ASCII vêm substituídos por '?'. Exemplo real:
 *   enviámos:  "…estou aqui para ajudar! 😊"
 *   eco:       "…estou aqui para ajudar! ?"
 * Por isso um `sent_message === echo` falha e o bot é lido como "humano respondeu"
 * (desliga-se na conversa). Comparamos por uma forma NORMALIZADA: sem emoji/
 * pictogramas, sem '?', espaços colapsados, minúsculas.
 */
export function channelNormalize(s: string): string {
    return s
        .normalize('NFC')
        // emoji, símbolos, setas, dingbats, variation selectors, ZWJ
        .replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}]/gu, '')
        .replace(/\?/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

/**
 * True se `a` e `b` são a mesma mensagem depois de normalizar o round-trip do
 * canal. Exige forma normalizada não-vazia para não casar mensagens só-emoji.
 */
export function messagesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
    if (!a || !b) return false;
    const na = channelNormalize(a);
    const nb = channelNormalize(b);
    return na.length > 0 && na === nb;
}
