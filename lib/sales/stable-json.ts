/**
 * JSON with sorted keys, without undefined values and without empty strings, so two form states that
 * mean the same thing compare equal whatever the key order or an emptied-out text field.
 */
export function stableStringify(value: unknown): string {
    return JSON.stringify(normalise(value));
}

function normalise(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(normalise);
    if (v && typeof v === 'object') {
        const out: Record<string, unknown> = {};
        for (const key of Object.keys(v as Record<string, unknown>).sort()) {
            const item = (v as Record<string, unknown>)[key];
            if (item === undefined || item === '') continue;
            out[key] = normalise(item);
        }
        return out;
    }
    return v;
}
