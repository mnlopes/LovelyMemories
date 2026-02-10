import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Safely parses YYYY-MM-DD or ISO strings into local Date objects at midnight.
 * Avoids the UTC-shift problem inherent in 'new Date(string)'.
 */
export function parseDateLocal(dateStr: string | Date | null | undefined): Date | undefined {
    if (!dateStr) return undefined;

    let year: number, month: number, day: number;

    if (dateStr instanceof Date) {
        year = dateStr.getFullYear();
        month = dateStr.getMonth() + 1;
        day = dateStr.getDate();
    } else if (typeof dateStr === 'string') {
        // Extract only the date part YYYY-MM-DD
        const datePart = dateStr.split('T')[0];
        const parts = datePart.split('-').map(Number);
        if (parts.length < 3) return undefined;
        [year, month, day] = parts;
    } else {
        return undefined;
    }

    if (!year || !month || !day) return undefined;
    return new Date(year, month - 1, day);
}
