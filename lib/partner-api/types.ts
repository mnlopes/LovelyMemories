/**
 * Public contract of the partner availability API (POST /api/v1/availability).
 * Spec: docs/superpowers/specs/2026-09-24-partner-availability-api-design.md
 *
 * Everything in these types is sent to an external partner — never add an
 * internal field here without checking the spec's "no internal data" rule.
 */

export type PartnerApiErrorCode =
    | 'INVALID_BODY'
    | 'INVALID_DATES'
    | 'CHECK_IN_TOO_SOON'
    | 'DATES_TOO_FAR'
    | 'STAY_TOO_LONG'
    | 'INVALID_GUESTS'
    | 'UNKNOWN_DESTINATION';

export type ResponseStatus =
    | 'SUCCESS'
    | 'INVALID_REQUEST'
    | 'UNAUTHORIZED'
    | 'RATE_LIMITED'
    | 'METHOD_NOT_ALLOWED'
    | 'ERROR';

/** A request that passed validation. Dates are YYYY-MM-DD. */
export interface AvailabilityRequest {
    checkIn: string;
    checkOut: string;
    guests: number;
    /** Canonical destination name, e.g. "Porto". */
    destination: string;
    /** `properties.city` values this destination covers, e.g. ["Porto", "Gaia"]. */
    cities: string[];
    nights: number;
}

export interface PartnerProperty {
    id: string;
    name: string;
    description: string;
    city: string;
    area_m2: number | null;
    max_guests: number;
    bedrooms: number;
    bathrooms: number;
    total_price: number;
    nightly_price_average: number;
    currency: 'EUR';
    main_image: string | null;
    images: string[];
    amenities: string[];
    booking_url: string;
}

export interface SuccessResponse {
    status: 'SUCCESS';
    search: { check_in: string; check_out: string; guests: number; destination: string };
    currency: 'EUR';
    properties: PartnerProperty[];
}

export interface ErrorResponse {
    status: Exclude<ResponseStatus, 'SUCCESS'>;
    error: { code: string; message: string };
}
