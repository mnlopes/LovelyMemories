"use server";

import { getSupabaseAdmin } from "@/lib/supabase";

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'STATUS_CHANGE' | 'INVITE';
type AuditResource = 'PROPERTY' | 'RESERVATION' | 'USER' | 'SETTINGS' | 'AUTH';
type Severity = 'INFO' | 'WARNING' | 'CRITICAL';

/**
 * Logs an activity to the audit_logs table.
 * Uses Service Role to ensure logs are always written regardless of user RLS.
 */
export async function logActivity(
    actorId: string | null,
    action: AuditAction,
    resource: AuditResource,
    resourceId: string | null = null,
    details: any = null,
    severity: Severity = 'INFO'
) {
    try {
        const adminSupabase = await getSupabaseAdmin();

        const { error } = await adminSupabase
            .from('audit_logs')
            .insert({
                actor_id: actorId,
                action_type: action,
                resource_type: resource,
                resource_id: resourceId,
                details: details,
                severity: severity
            });

        if (error) {
            console.error("AUDIT LOG ERROR: Failed to write log:", error);
        }
    } catch (err) {
        console.error("AUDIT LOG EXCEPTION:", err);
        // We do not throw here to prevent breaking the main user flow if logging fails
    }
}

/**
 * Validates uuid to prevent invalid input syntax errors
 */
function isValidUUID(uuid: string) {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
}

/**
 * Fetch audit logs with optional filtering.
 * Enforces RLS via normal client (or manual check if using admin for some reason, but we prefer normal client).
 * However, since we need to join with profiles for actor details, and profiles might have visibility restrictions,
 * we might need to use admin client but filter carefully manually, OR rely on the RLS policies we just created.
 *
 * Our RLS policies:
 * - Super Admin sees ALL.
 * - Admin sees ALL EXCEPT Super Admin actions.
 *
 * So using a standard authenticated client is SAFER as it respects these policies automatically.
 */
export async function getAuditLogs(filters?: {
    resourceId?: string;
    resourceType?: string;
    startDate?: string;
    endDate?: string;
    onlyAlerts?: boolean;
    limit?: number;
    offset?: number;
}) {
    // 1. Get authenticated user
    // 1. Get authenticated user
    // We rely on standard SSR createServerClient here to ensure we use the User's session (NOT Admin).

    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
                },
            },
        }
    );

    let query = supabase
        .from('audit_logs')
        .select(`
            *,
            actor:actor_id (
                email,
                full_name,
                avatar_url,
                role
            )
        `)
        .order('created_at', { ascending: false });

    if (filters?.onlyAlerts) {
        // Filter specifically for what we consider "Alerts": New Reservations or Critical Errors
        query = query.or('and(resource_type.eq.RESERVATION,action_type.eq.CREATE),severity.eq.CRITICAL');
    }

    if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
    }

    if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
    }

    if (filters?.resourceId) {
        // Validate UUID before query to prevent "invalid input syntax" error
        if (isValidUUID(filters.resourceId)) {
            query = query.eq('resource_id', filters.resourceId);
        } else {
            // If resourceId is not a UUID (e.g. 'pending' or some custom ID), we can still query it if the column is text.
            // Our migration defined resource_id as TEXT, so it IS valid to query non-uuids.
            // BUT if the column was UUID, we would need to check.
            // Checking migration: "resource_id" text. So we are good.
            query = query.eq('resource_id', filters.resourceId);
        }
    }

    if (filters?.limit) {
        query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching audit logs:", error);
        throw new Error("Failed to fetch activity logs");
    }

    return data;
}
