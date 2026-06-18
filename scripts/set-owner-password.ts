import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

/**
 * One-off admin utility: set (or reset) a password for an existing user, bypassing
 * the email/invite flow entirely. Useful when an owner's invite link was consumed by
 * an email scanner (Gmail/Outlook) and they're stuck on "Session Not Found".
 *
 * Usage:
 *   npx -y tsx scripts/set-owner-password.ts <email> [password]
 *
 * If [password] is omitted, a strong temporary one is generated and printed.
 * The account is also force-confirmed (email_confirm) so login works immediately.
 */
async function main() {
    const email = process.argv[2];
    let password = process.argv[3];

    if (!email) {
        console.error('Usage: npx -y tsx scripts/set-owner-password.ts <email> [password]');
        process.exit(1);
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
        console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
        process.exit(1);
    }

    // Generate a readable but strong temp password if none provided: e.g. "Lovely-4827-mkqz"
    if (!password) {
        const digits = Math.floor(1000 + Math.random() * 9000);
        const suffix = Math.random().toString(36).slice(2, 6);
        password = `Lovely-${digits}-${suffix}`;
    }

    const admin = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    // Find the auth user by email (page through, small user base).
    let userId: string | null = null;
    let confirmed = false;
    for (let page = 1; page <= 10; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) {
            console.error('listUsers error:', error.message);
            process.exit(1);
        }
        const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
        if (found) {
            userId = found.id;
            confirmed = !!found.email_confirmed_at;
            break;
        }
        if (data.users.length < 1000) break;
    }

    if (!userId) {
        console.error(`No auth user found for ${email}`);
        process.exit(1);
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true, // force-confirm so they can log in straight away
    });

    if (updErr) {
        console.error('updateUserById error:', updErr.message);
        process.exit(1);
    }

    console.log('\n✅ Password set successfully\n');
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   User ID:  ${userId}`);
    console.log(`   Was confirmed before: ${confirmed ? 'yes' : 'no (now confirmed)'}`);
    console.log('\nNext steps:');
    console.log('  1. Log in at /en/login (or /pt) with the credentials above to verify.');
    console.log('  2. Hand the password to the owner and ask them to change it in the portal.');
    console.log('');
}

main();
