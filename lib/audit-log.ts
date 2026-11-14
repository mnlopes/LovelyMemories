import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase';

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'STATUS_CHANGE' | 'INVITE';
type AuditResource = 'PROPERTY' | 'RESERVATION' | 'USER' | 'SETTINGS' | 'AUTH';
type Severity = 'INFO' | 'WARNING' | 'CRITICAL';

/**
 * Logs an activity to the audit_logs table.
 * Uses Service Role to ensure logs are always written regardless of user RLS.
 *
 * Lives here, not in app/actions/audit.ts: every export of a "use server" file becomes a
 * public POST endpoint once a client component imports that file (audit.ts is imported by
 * ActivityTimeline / NotificationsPopover for getAuditLogs), and this function writes with
 * the service role whatever actor, details and severity it is given — anyone could have
 * forged entries, including CRITICAL alerts in the admin notifications.
 */
export async function logActivity(
    actorId: string | null,
    action: AuditAction,
    resource: AuditResource,
    resourceId: string | null = null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- free-form JSON column
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
