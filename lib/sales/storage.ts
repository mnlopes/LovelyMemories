// Pure helpers for the files of a sale listing in Supabase Storage.

const PUBLIC_MARKER = '/object/public/sale-listings/';

/**
 * Storage path (inside the public `sale-listings` bucket) of a URL, only when the file belongs to
 * this listing's own folder. Photos copied from a managed home live elsewhere and give null, so
 * they are never deleted from Storage.
 */
export function ownedStoragePath(url: string, listingId: string): string | null {
    const at = url.indexOf(PUBLIC_MARKER);
    if (at < 0) return null;
    const raw = url.slice(at + PUBLIC_MARKER.length).split('?')[0].split('#')[0];
    let path: string;
    try {
        path = decodeURIComponent(raw);
    } catch {
        return null;
    }
    if (!path.startsWith(`${listingId}/`) || path.includes('..')) return null;
    return path;
}

export const floorPlanPath = (listingId: string) => `${listingId}/docs/floor-plan.pdf`;
export const energyCertPath = (listingId: string) => `${listingId}/docs/energy-certificate.pdf`;
/** Extra documents, in the private bucket. */
export const saleDocumentPath = (listingId: string, docId: string) => `${listingId}/docs/${docId}.pdf`;
/** True when a private-bucket path belongs to this listing's documents folder. */
export const isOwnDocPath = (path: string, listingId: string) =>
    path.startsWith(`${listingId}/docs/`) && !path.includes('..') && path.endsWith('.pdf');
export const newPhotoPath = (listingId: string) =>
    `${listingId}/photos/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
