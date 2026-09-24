import { createHash, randomBytes } from 'node:crypto';

/**
 * Partner API keys: `lm_live_` + 32 base62 chars (~190 bits of entropy).
 * Only the SHA-256 hash is stored. A fast hash is fine here: the keys are
 * long random secrets, not human passwords, so brute force is not a concern.
 */

export const KEY_PREFIX = 'lm_live_';
const TOKEN_LENGTH = 32;
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
export const API_KEY_PATTERN = /^lm_live_[0-9A-Za-z]{32}$/;

export function generateApiKey(): string {
    let token = '';
    while (token.length < TOKEN_LENGTH) {
        for (const byte of randomBytes(64)) {
            // Rejection sampling: 248 = 62 * 4, so byte % 62 stays uniform.
            if (byte < 248 && token.length < TOKEN_LENGTH) token += ALPHABET[byte % 62];
        }
    }
    return KEY_PREFIX + token;
}

export function hashApiKey(key: string): string {
    return createHash('sha256').update(key, 'utf8').digest('hex');
}

/** Non-secret identifier shown in the admin, e.g. "lm_live_ab12". */
export function displayPrefix(key: string): string {
    return key.slice(0, KEY_PREFIX.length + 4);
}

/** Returns the key from an `Authorization: Bearer <key>` header, or null if absent/malformed. */
export function extractBearer(header: string | null): string | null {
    if (!header) return null;
    const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
    if (!match) return null;
    return API_KEY_PATTERN.test(match[1]) ? match[1] : null;
}
