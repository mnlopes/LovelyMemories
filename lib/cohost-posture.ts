// lib/cohost-posture.ts
// Postura por conversa do co-host. Ficheiro NORMAL (não 'use server') — tipos exportáveis.
export type BotPosture = 'auto' | 'assist' | 'off';
export type PropertyBotMode = 'off' | 'drafts' | 'auto';

export const BOT_POSTURES: BotPosture[] = ['auto', 'assist', 'off'];

/**
 * Decide o que o bridge faz com uma mensagem de hóspede.
 * skip      → não redige (property off ou conversa off)
 * queue     → redige draft para a fila humana (Assist, ou Auto sem confiança)
 * auto_send → envia sozinho (só property auto + posture auto + decisão auto_send)
 */
export function resolveBotAction(
    propertyMode: PropertyBotMode,
    posture: BotPosture,
    decisionAction: 'auto_send' | 'needs_human',
): 'auto_send' | 'queue' | 'skip' {
    if (propertyMode === 'off' || posture === 'off') return 'skip';
    if (decisionAction === 'auto_send' && propertyMode === 'auto' && posture === 'auto') return 'auto_send';
    return 'queue';
}
