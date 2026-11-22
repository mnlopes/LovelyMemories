/**
 * What can an anonymous visitor read? — a READ-ONLY check against the live database.
 *
 *   npm run check:exposure
 *
 * Uses ONLY the public anon key (the one every visitor has in the site's JavaScript) and
 * only SELECTs. It never writes and never prints row contents: it reports counts and
 * PASS/FAIL. Run it after every change to RLS policies, grants or table columns.
 *
 * Background: the 2026-11-13 audit found `profiles` (34 accounts with email/phone/role) and
 * every Airbnb calendar link readable with this key. See docs/audits/2026-11-13-auditoria-plataforma.md.
 */
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', quiet: true } as never);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
    process.exit(2);
}

// No session, no service role: exactly what a visitor's browser has.
const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

type Status = 'PASS' | 'FAIL' | 'WARN';
const results: { status: Status; check: string; detail: string }[] = [];
const report = (status: Status, check: string, detail: string) => results.push({ status, check, detail });

/** A private table must return an error or zero rows to the anon key. */
async function mustBeClosed(table: string) {
    const { count, error } = await anon.from(table).select('*', { count: 'exact', head: true });
    if (error) return report('PASS', table, `closed (${error.code || error.message || 'denied'})`);
    if (!count) return report('PASS', table, 'no rows visible');
    report('FAIL', table, `${count} rows readable by anyone`);
}

/** A column that must not be readable (or must no longer exist) on a public table. */
async function columnMustBeHidden(table: string, column: string) {
    const { error } = await anon.from(table).select(column).limit(1);
    if (error) return report('PASS', `${table}.${column}`, `not readable (${error.code || error.message})`);
    const { count } = await anon.from(table).select('id', { count: 'exact', head: true }).not(column, 'is', null);
    report('FAIL', `${table}.${column}`, `readable by anyone (${count ?? '?'} rows with a value)`);
}

async function main() {
    // Personal data and secrets: must be closed.
    for (const table of [
        'profiles',
        'property_ical_feeds',
        'reservations',
        'coupons',
        'visitor_logs',
        'partner_api_keys',
        'partner_api_requests',
        'owner_invites',
        'system_settings',
        'audit_logs',
        'ai_conversation',
        'ai_conversation_message',
        'ai_message_log',
        'cohost_push_subscriptions',
        'import_history',
    ]) {
        await mustBeClosed(table);
    }

    // Secret column that used to live on the public properties table.
    await columnMustBeHidden('properties', 'ical_import_urls');

    // The public sync error message must never carry a link (it would carry the token).
    {
        const { data, error } = await anon.from('properties').select('last_sync_error').not('last_sync_error', 'is', null);
        if (error) report('PASS', 'properties.last_sync_error', `not readable (${error.code})`);
        else {
            const withLink = (data ?? []).filter((r: { last_sync_error: string | null }) => /https?:\/\//i.test(r.last_sync_error ?? '')).length;
            report(withLink ? 'FAIL' : 'PASS', 'properties.last_sync_error', withLink ? `${withLink} messages contain a link` : 'no links in public error messages');
        }
    }

    // Audit S-9: a lock's session id lets anyone release or take over that guest's 15-min lock.
    // Closed by migration 20261118100000_locked_dates_private.sql.
    {
        const { count, error } = await anon.from('locked_dates').select('session_id', { count: 'exact', head: true });
        if (error) report('PASS', 'locked_dates.session_id', 'not readable');
        else report('FAIL', 'locked_dates.session_id', `${count ?? 0} rows readable — apply 20261118100000_locked_dates_private.sql`);
    }

    // Sale listings: exact address, certificate data and contact-form counters stay server-side.
    // Closed by migration 20261121100000_sale_listings.sql (until applied: table "not readable").
    // Both tables are empty after the migration, so a count would PASS on a broken REVOKE:
    // any successful read (even `[]`) is a FAIL.
    {
        const { error } = await anon.from('sale_listings').select('id').limit(1);
        if (error) report('PASS', 'sale_listings', `not readable (${error.code || error.message})`);
        else report('FAIL', 'sale_listings', 'readable by anyone — apply 20261121100000_sale_listings.sql');
    }
    {
        const { error } = await anon.from('form_rate_limits').select('key').limit(1);
        if (error) report('PASS', 'form_rate_limits', `not readable (${error.code || error.message})`);
        else report('FAIL', 'form_rate_limits', 'readable by anyone — apply 20261121100000_sale_listings.sql');
    }

    // The rate-limit function is for the server only; a visitor could burn other people's limits.
    {
        const { data, error } = await anon.rpc('hit_rate_limit', { p_key: 'exposure-check', p_window_seconds: 60, p_max: 1 });
        if (error && (error.code === '42501' || error.code === 'PGRST202')) report('PASS', 'rpc hit_rate_limit', `not callable (${error.code})`);
        else if (error) report('FAIL', 'rpc hit_rate_limit', `unexpected error (${error.code || error.message}) — expected 42501 or PGRST202`);
        else report('FAIL', 'rpc hit_rate_limit', `callable by anyone (returned ${JSON.stringify(data)}) — apply 20261121100000_sale_listings.sql`);
    }

    // The private bucket (energy certificates) must not be listable with the public key.
    {
        const { data, error } = await anon.storage.from('sale-listings-private').list();
        if (error) report('PASS', 'storage sale-listings-private', `not listable (${error.message || 'denied'})`);
        else if (!data || data.length === 0) report('PASS', 'storage sale-listings-private', 'no files visible');
        else report('FAIL', 'storage sale-listings-private', `${data.length} entries listable by anyone`);
    }

    const width = Math.max(...results.map((r) => r.check.length));
    for (const r of results) console.log(`${r.status.padEnd(4)}  ${r.check.padEnd(width)}  ${r.detail}`);
    const failed = results.filter((r) => r.status === 'FAIL').length;
    console.log(failed ? `\n${failed} FAIL — something private is readable with the public key.` : '\nAll private data closed to the public key.');
    process.exit(failed ? 1 : 0);
}

main().catch((e) => {
    console.error('Check could not run:', e instanceof Error ? e.message : e);
    process.exit(2);
});
