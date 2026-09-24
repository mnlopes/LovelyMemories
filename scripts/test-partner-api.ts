/**
 * Partner API smoke + leak test against a running server.
 *
 *   PARTNER_API_BASE=http://localhost:3001 npx tsx scripts/test-partner-api.ts
 *
 * Creates a temporary key directly in the DB (service role), runs the checks,
 * and deletes the key (and its request logs, via cascade) at the end.
 * Requires PARTNER_API_ENABLED=true on the target server.
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { generateApiKey, hashApiKey, displayPrefix } from '../lib/partner-api/keys';

const BASE = process.env.PARTNER_API_BASE || 'http://localhost:3001';
const URL_ = `${BASE}/api/v1/availability`;
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const ALLOWED_KEYS: Record<string, string[]> = {
    root: ['status', 'search', 'currency', 'properties', 'error'],
    search: ['check_in', 'check_out', 'guests', 'destination'],
    error: ['code', 'message'],
    property: ['id', 'name', 'description', 'city', 'area_m2', 'max_guests', 'bedrooms', 'bathrooms', 'total_price',
        'nightly_price_average', 'currency', 'main_image', 'images', 'amenities', 'booking_url'],
};
const FORBIDDEN_VALUE = /\bical\b|\.ics\b|hospitable|[\w.+-]+@[\w-]+\.[a-z]{2,}/i;

let failures = 0;
function check(name: string, cond: boolean, detail = '') {
    console.log(`${cond ? '✅' : '❌'} ${name}${cond ? '' : ' — ' + detail}`);
    if (!cond) failures++;
}

function isoInDays(days: number) {
    return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

async function call(body: unknown, token?: string, method = 'POST') {
    const res = await fetch(URL_, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: method === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    });
    const json = await res.json().catch(() => null);
    return { res, json };
}

function scanForLeaks(value: unknown, ctx: keyof typeof ALLOWED_KEYS, path: string, problems: string[]) {
    if (Array.isArray(value)) {
        value.forEach((v, i) => scanForLeaks(v, ctx, `${path}[${i}]`, problems));
        return;
    }
    if (typeof value === 'string') {
        if (FORBIDDEN_VALUE.test(value)) problems.push(`${path} has a forbidden value: ${value.slice(0, 60)}`);
        return;
    }
    if (typeof value !== 'object' || value === null) return;
    for (const [k, v] of Object.entries(value)) {
        if (!ALLOWED_KEYS[ctx].includes(k)) problems.push(`${path}.${k} is not in the contract`);
        const next = k === 'search' ? 'search' : k === 'error' ? 'error' : k === 'properties' ? 'property' : ctx;
        if (Array.isArray(v) && (k === 'images' || k === 'amenities')) {
            v.forEach((s, i) => typeof s === 'string' && FORBIDDEN_VALUE.test(s) && problems.push(`${path}.${k}[${i}] forbidden value`));
        } else {
            scanForLeaks(v, next, `${path}.${k}`, problems);
        }
    }
}

async function main() {
    const key = generateApiKey();
    const { data: keyRow, error } = await admin.from('partner_api_keys')
        .insert({ partner_name: 'Smoke test', ref_slug: 'smoke-test', key_prefix: displayPrefix(key), key_hash: hashApiKey(key) })
        .select('id').single();
    if (error || !keyRow) throw new Error(`could not create temp key: ${error?.message}`);

    const valid = { check_in: isoInDays(30), check_out: isoInDays(33), guests: 2, destination: 'Porto' };

    try {
        // Auth
        check('401 without token', (await call(valid)).res.status === 401);
        check('401 with malformed token', (await call(valid, 'lm_live_short')).res.status === 401);
        check('401 with unknown token', (await call(valid, generateApiKey())).res.status === 401);
        const get = await call(null, key, 'GET');
        check('405 on GET with Allow: POST', get.res.status === 405 && get.res.headers.get('allow') === 'POST');

        // Validation
        const cases: [string, unknown, string][] = [
            ['INVALID_BODY (not JSON)', '{nope', 'INVALID_BODY'],
            ['INVALID_BODY (missing field)', { ...valid, guests: undefined }, 'INVALID_BODY'],
            ['INVALID_DATES', { ...valid, check_out: valid.check_in }, 'INVALID_DATES'],
            ['CHECK_IN_TOO_SOON', { ...valid, check_in: isoInDays(-1), check_out: isoInDays(2) }, 'CHECK_IN_TOO_SOON'],
            ['DATES_TOO_FAR', { ...valid, check_in: isoInDays(600), check_out: isoInDays(603) }, 'DATES_TOO_FAR'],
            ['STAY_TOO_LONG', { ...valid, check_out: isoInDays(62) }, 'STAY_TOO_LONG'],
            ['INVALID_GUESTS', { ...valid, guests: 0 }, 'INVALID_GUESTS'],
            ['UNKNOWN_DESTINATION', { ...valid, destination: 'Lisbon' }, 'UNKNOWN_DESTINATION'],
        ];
        for (const [name, body, code] of cases) {
            const { res, json } = await call(body, key);
            check(`400 ${name}`, res.status === 400 && json?.status === 'INVALID_REQUEST' && json?.error?.code === code, `got ${res.status} ${JSON.stringify(json)}`);
        }

        // Success — exercise every known destination, not just Porto.
        const destinations = ['Porto', 'Gaia', 'Algarve', 'Mykonos'];
        for (const destination of destinations) {
            const { res, json } = await call({ ...valid, destination }, key);
            check(`200 SUCCESS (${destination})`, res.status === 200 && json?.status === 'SUCCESS', `got ${res.status} ${JSON.stringify(json)}`);
            check(`Cache-Control: no-store (${destination})`, res.headers.get('cache-control') === 'no-store');
            check(`no CORS header (${destination})`, res.headers.get('access-control-allow-origin') === null);
            check(`search echoes normalized destination (${destination})`, json?.search?.destination === destination);
            const props = (json?.properties ?? []) as any[];
            console.log(`   ${destination}: ${props.length} properties returned`);
            if (props.length === 0) {
                console.warn(`⚠️  No properties returned for ${destination} — turn on at least one property there in /admin/partners to test the property shape.`);
            }
            for (const p of props) {
                check(`property ${p.id} booking_url`, typeof p.booking_url === 'string'
                    && p.booking_url.startsWith('https://www.lovelymemories.pt/en/properties/')
                    && p.booking_url.includes(`from=${valid.check_in}`) && p.booking_url.includes(`to=${valid.check_out}`)
                    && p.booking_url.includes('adults=2') && p.booking_url.includes('ref=smoke-test'));
                check(`property ${p.id} numeric prices`, typeof p.total_price === 'number' && typeof p.nightly_price_average === 'number' && p.total_price > 0);
                check(`property ${p.id} capacity`, p.max_guests >= valid.guests);
            }
            const sorted = props.every((p, i) => i === 0 || props[i - 1].total_price <= p.total_price);
            check(`sorted by total_price (${destination})`, sorted);

            // Leak scan over the whole body
            const problems: string[] = [];
            scanForLeaks(json, 'root', '$', problems);
            check(`anti-leak: only contract fields, no forbidden values (${destination})`, problems.length === 0, problems.join('; '));
        }

        // Rate limit: ~16 requests already logged (auth + validation + 4 destinations); fire until 429 or 70 more.
        let got429 = false;
        for (let i = 0; i < 70 && !got429; i++) {
            const r = await call({ ...valid, destination: 'Lisbon' }, key);
            if (r.res.status === 429) {
                got429 = r.res.headers.get('retry-after') === '60' && r.json?.error?.code === 'RATE_LIMITED';
            }
            await new Promise(r2 => setTimeout(r2, 50)); // let after() write the log row
        }
        check('429 RATE_LIMITED with Retry-After: 60', got429);
    } finally {
        await admin.from('partner_api_keys').delete().eq('id', keyRow.id);
    }

    if (failures) {
        console.error(`\n❌ ${failures} check(s) failed`);
        process.exit(1);
    }
    console.log('\n✅ All partner API checks passed');
}

main().catch(err => { console.error(err); process.exit(1); });
