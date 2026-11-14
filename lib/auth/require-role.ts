import 'server-only';
import { getCurrentUserRole } from '@/app/actions/user';

/**
 * Throws unless the signed-in user has one of `roles`. Call it as the first line of any
 * server action that reads or changes privileged data: a server action is a public POST
 * endpoint, so a guard in a layout or a hidden button does not protect it.
 */
export async function requireRole(roles: readonly string[]): Promise<string> {
    const role = await getCurrentUserRole();
    if (!role || !roles.includes(role)) throw new Error('Not authorized');
    return role;
}

/** Roles that may edit properties (same set as upsertProperty in app/actions/property.ts). */
export const PROPERTY_EDITORS = ['super_admin', 'admin', 'editor'] as const;
