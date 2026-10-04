// Display state of an import_history row. A batch that never left "processing"
// (crash/timeout of the old importer) is treated as failed so the team re-imports it.
const STUCK_AFTER_MS = 10 * 60 * 1000;

export type ImportDisplayStatus = 'completed' | 'processing' | 'failed';

export function getImportDisplayStatus(item: { status: string; imported_at: string }): ImportDisplayStatus {
    if (item.status === 'completed') return 'completed';
    if (item.status === 'failed') return 'failed';
    const age = Date.now() - new Date(item.imported_at).getTime();
    return age > STUCK_AFTER_MS ? 'failed' : 'processing';
}
