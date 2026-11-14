'use server';

import { z } from 'zod';
import { PROPERTY_EDITORS, requireRole } from '@/lib/auth/require-role';
import { deleteFeed, insertFeed, listFeedsForAdmin, type AdminFeed } from '@/lib/ical-feeds';
import { validateFeedUrl } from '@/lib/ical-feed-url';

/**
 * Backoffice actions for a property's iCal import links. The links themselves never come
 * back to the browser: the editor sees `masked` and the read status only. To change a link,
 * remove it and add the new one.
 */

const uuid = z.string().uuid();

type Result = { success: true; feeds: AdminFeed[] } | { success: false; error: string };

export async function getPropertyFeeds(propertyId: string): Promise<Result> {
    try {
        await requireRole(PROPERTY_EDITORS);
        const id = uuid.parse(propertyId);
        return { success: true, feeds: await listFeedsForAdmin(id) };
    } catch (e) {
        return { success: false, error: e instanceof Error && e.message === 'Not authorized' ? 'Not authorized' : 'Could not load the calendar links.' };
    }
}

export async function addPropertyFeed(propertyId: string, rawUrl: string): Promise<Result> {
    try {
        await requireRole(PROPERTY_EDITORS);
        const id = uuid.parse(propertyId);
        const check = validateFeedUrl(typeof rawUrl === 'string' ? rawUrl : '');
        if (!check.ok) return { success: false, error: check.error };
        const saved = await insertFeed(id, check.url);
        if (!saved.ok) return { success: false, error: saved.error };
        return { success: true, feeds: await listFeedsForAdmin(id) };
    } catch (e) {
        return { success: false, error: e instanceof Error && e.message === 'Not authorized' ? 'Not authorized' : 'Could not save the calendar link.' };
    }
}

export async function removePropertyFeed(propertyId: string, feedId: string): Promise<Result> {
    try {
        await requireRole(PROPERTY_EDITORS);
        const id = uuid.parse(propertyId);
        const removed = await deleteFeed(id, uuid.parse(feedId));
        if (!removed) return { success: false, error: 'This calendar link was not found.' };
        return { success: true, feeds: await listFeedsForAdmin(id) };
    } catch (e) {
        return { success: false, error: e instanceof Error && e.message === 'Not authorized' ? 'Not authorized' : 'Could not remove the calendar link.' };
    }
}
