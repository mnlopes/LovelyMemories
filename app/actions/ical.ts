"use server";

import { requireRole, PROPERTY_EDITORS, ADMINS } from '@/lib/auth/require-role';
import { syncAllProperties, syncOneProperty } from '@/lib/ical-sync';

// Backoffice buttons for the iCal import. Every export here is a public POST endpoint, so each
// checks the caller's role first; the engine itself is in lib/ical-sync.ts (server-only), and
// the robot's run is reached only through the cron route.

/** "Sync now" on one property. */
export async function syncPropertyICal(propertyId: string) {
    try {
        await requireRole(PROPERTY_EDITORS);
    } catch {
        // Same shape as the engine's failure results, so callers keep their narrowing.
        return { success: false, error: 'Not authorized', propertyId } as Awaited<ReturnType<typeof syncOneProperty>>;
    }
    return syncOneProperty(propertyId);
}

/** "Sync all" in the backoffice. */
export async function syncAllPropertiesICal() {
    try {
        await requireRole(ADMINS);
    } catch {
        return { success: false as const, error: 'Not authorized' };
    }
    return syncAllProperties();
}
