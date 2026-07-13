// Beds24 API v2 types — only the fields we actually consume.
// Raw payloads are always preserved in the `raw` JSONB columns.

export interface Beds24ApiEnvelope<T> {
    success: boolean;
    type?: string;
    count?: number;
    pages?: { nextPageExists: boolean; nextPageLink: string | null };
    data?: T[];
    error?: string;
    code?: number;
}

export interface Beds24Booking {
    id: number;
    propertyId: number;
    roomId?: number;
    status?: string;
    subStatus?: string;
    arrival?: string;      // date
    departure?: string;    // date
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    numAdult?: number;
    numChild?: number;
    price?: number;
    commission?: number;
    channel?: string;
    referer?: string;
    apiSource?: string;
    apiReference?: string;
    bookingTime?: string;
    modifiedTime?: string;
    cancelTime?: string | null;
    [key: string]: unknown;
}

export interface Beds24Message {
    id: number;
    bookingId: number;
    propertyId?: number;
    roomId?: number;
    source?: 'guest' | 'host' | 'system' | 'internalNote';
    message?: string;
    time?: string;
    read?: boolean;
    [key: string]: unknown;
}

export interface Beds24WebhookPayload {
    timeStamp?: string;
    booking?: Beds24Booking;
    messages?: Beds24Message[];
    infoItems?: unknown[];
    invoiceItems?: unknown[];
    retries?: number;
    [key: string]: unknown;
}

export interface Beds24CalendarDay {
    from: string;
    to: string;
    numAvail?: number;
    minStay?: number;
    maxStay?: number;
    override?: string;
    price1?: number | null;
    [key: string]: unknown;
}

export type SyncVia = 'webhook' | 'polling' | 'manual';

export interface Beds24RequestOptions {
    query?: Record<string, string | number | boolean | Array<string | number> | undefined>;
    body?: unknown;
    /** For beds24_api_log.context: poll | action | webhook | auth */
    context?: string;
}
