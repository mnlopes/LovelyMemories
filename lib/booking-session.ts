"use client";

/**
 * Utility to manage temporary booking sessions in localStorage.
 * This allows us to have clean URLs like /checkout?code=ABC123 
 * while keeping all booking data (dates, guests, slug) persistent.
 */

export interface BookingSessionData {
    slug: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    infants: number;
    selectedExtras?: {
        breakfast: boolean;
        breakfastDays: number;
        transfer: boolean;
        transferType?: 'one_way' | 'round_trip';
    };
    extraPrices?: {
        breakfast?: number;
        transfer?: number;
    };
    expiresAt: number;
}

const SESSION_KEY_PREFIX = "lovely_booking_";
const EXPIRATION_TIME = 1000 * 60 * 30; // 30 minutes

/**
 * Generates a random uppercase code of specified length.
 */
function generateCode(length: number = 6): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous chars like O, 0, I, 1
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Saves a booking session and returns the generated code.
 */
export function saveBookingSession(data: Omit<BookingSessionData, "expiresAt">): string {
    if (typeof window === "undefined") return "";

    const code = generateCode();
    const sessionData: BookingSessionData = {
        ...data,
        expiresAt: Date.now() + EXPIRATION_TIME
    };

    localStorage.setItem(`${SESSION_KEY_PREFIX}${code}`, JSON.stringify(sessionData));

    // Clean up old expired sessions while we are at it
    cleanupExpiredSessions();

    return code;
}

/**
 * Retrieves a booking session by code.
 */
export function getBookingSession(code: string): BookingSessionData | null {
    if (typeof window === "undefined" || !code) return null;

    const raw = localStorage.getItem(`${SESSION_KEY_PREFIX}${code}`);
    if (!raw) return null;

    try {
        const data: BookingSessionData = JSON.parse(raw);
        if (Date.now() > data.expiresAt) {
            localStorage.removeItem(`${SESSION_KEY_PREFIX}${code}`);
            return null;
        }
        return data;
    } catch (e) {
        return null;
    }
}

/**
 * Removes expired sessions from localStorage.
 */
function cleanupExpiredSessions() {
    if (typeof window === "undefined") return;

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(SESSION_KEY_PREFIX)) {
            try {
                const data = JSON.parse(localStorage.getItem(key) || "");
                if (Date.now() > data.expiresAt) {
                    localStorage.removeItem(key);
                }
            } catch (e) {
                localStorage.removeItem(key!);
            }
        }
    }
}
