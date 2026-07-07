'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase';

async function getSupabase() {
    const cookieStore = await cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    );
                },
            },
        }
    );
}

export interface OwnerActivityRow {
    id: string;
    name: string;
    email: string;
    /** From Supabase auth — when the account was created. */
    createdAt: string | null;
    /** From Supabase auth — last actual sign-in. Null = never signed in. */
    lastSignInAt: string | null;
    emailConfirmedAt: string | null;
    /** Most recent request logged for this user (visitor_logs) — "last seen". */
    lastSeenAt: string | null;
    /** Seen on the portal within the last 5 minutes. */
    isOnline: boolean;
    neverLoggedIn: boolean;
    hasPendingInvite: boolean;
}

export interface OwnerActivitySummary {
    total: number;
    onlineNow: number;
    activeLast7d: number;
    neverLoggedIn: number;
}

const ONLINE_WINDOW_MS = 5 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Owner portal engagement report (Admin/SuperAdmin only).
 * Merges profiles (who is an owner), Supabase auth (last sign-in, email
 * confirmation), visitor_logs (last request seen → online/offline) and
 * owner_invites (outstanding invite links).
 */
export async function getOwnerActivity(): Promise<{
    rows: OwnerActivityRow[];
    summary: OwnerActivitySummary;
    generatedAt: string;
}> {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    if (!requesterProfile || !['admin', 'super_admin'].includes(requesterProfile.role)) {
        throw new Error('Not authorized');
    }

    const admin = await getSupabaseAdmin();

    const { data: owners, error: ownersError } = await admin
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'owner');
    if (ownersError) throw ownersError;
    const ownerIds = (owners || []).map((o) => o.id);

    // Auth users: last_sign_in_at / email_confirmed_at / created_at
    const authById = new Map<string, { email?: string; created_at?: string; last_sign_in_at?: string; email_confirmed_at?: string }>();
    let page = 1;
    for (;;) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw error;
        data.users.forEach((u) => authById.set(u.id, u as never));
        if (data.users.length < 1000) break;
        page++;
    }

    // Last request per owner from visitor_logs (newest first; first hit per user wins)
    const lastSeenById = new Map<string, string>();
    if (ownerIds.length > 0) {
        const { data: logs } = await admin
            .from('visitor_logs')
            .select('user_id, created_at')
            .in('user_id', ownerIds)
            .order('created_at', { ascending: false })
            .limit(3000);
        (logs || []).forEach((l) => {
            if (l.user_id && !lastSeenById.has(l.user_id)) lastSeenById.set(l.user_id, l.created_at);
        });
    }

    // Outstanding (unexpired, unused) invite links
    const pendingInviteUserIds = new Set<string>();
    const { data: invites } = await admin
        .from('owner_invites')
        .select('user_id')
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString());
    (invites || []).forEach((i) => {
        if (i.user_id) pendingInviteUserIds.add(i.user_id);
    });

    const now = Date.now();
    const rows: OwnerActivityRow[] = (owners || []).map((o) => {
        const au = authById.get(o.id);
        const lastSignInAt = au?.last_sign_in_at || null;
        // A sign-in is also "being seen" — fall back to it when logs were pruned.
        const lastSeenAt = lastSeenById.get(o.id) || lastSignInAt;
        return {
            id: o.id,
            name: o.full_name || '',
            email: o.email || au?.email || '',
            createdAt: au?.created_at || null,
            lastSignInAt,
            emailConfirmedAt: au?.email_confirmed_at || null,
            lastSeenAt,
            isOnline: !!lastSeenAt && now - new Date(lastSeenAt).getTime() < ONLINE_WINDOW_MS,
            neverLoggedIn: !lastSignInAt,
            hasPendingInvite: pendingInviteUserIds.has(o.id),
        };
    });

    rows.sort((a, b) => {
        if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
        const ta = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
        const tb = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
        return tb - ta;
    });

    const summary: OwnerActivitySummary = {
        total: rows.length,
        onlineNow: rows.filter((r) => r.isOnline).length,
        activeLast7d: rows.filter((r) => r.lastSeenAt && now - new Date(r.lastSeenAt).getTime() < SEVEN_DAYS_MS).length,
        neverLoggedIn: rows.filter((r) => r.neverLoggedIn).length,
    };

    return { rows, summary, generatedAt: new Date().toISOString() };
}
