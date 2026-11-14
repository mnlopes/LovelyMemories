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

    // Known, lower-risk exposure (audit S-9): checkout locks expose their session id.
    {
        const { count, error } = await anon.from('locked_dates').select('session_id', { count: 'exact', head: true });
        if (error) report('PASS', 'locked_dates.session_id', 'not readable');
        else report('WARN', 'locked_dates.session_id', `${count ?? 0} rows readable (known issue S-9)`);
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
