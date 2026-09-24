# Lovely Memories — Partner Availability API

Read-only API that returns Lovely Memories properties available for given dates, with the real direct-booking price and a direct booking link.

Machine-readable spec: [`openapi.yaml`](./openapi.yaml) (OpenAPI 3.1).

## Authentication

Every request needs a Bearer token issued by Lovely Memories:

```
Authorization: Bearer lm_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

- **Server-to-server only.** Keep the token in your server's secret store (e.g. Replit Secrets) and call the API from your backend. Never ship it to a browser or mobile app.
- The API sends no CORS headers, so browsers can't call it directly.
- Limit: 60 requests per minute per key.

## Request

`POST https://www.lovelymemories.pt/api/v1/availability`

```bash
curl -X POST https://www.lovelymemories.pt/api/v1/availability \
  -H "Authorization: Bearer $LOVELY_MEMORIES_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"check_in":"2026-10-10","check_out":"2026-10-14","guests":4,"destination":"Porto"}'
```

| Field | Type | Rules |
|---|---|---|
| `check_in` | string | `YYYY-MM-DD`, from tomorrow (Lisbon time), at most 18 months ahead |
| `check_out` | string | `YYYY-MM-DD`, after `check_in`, stay of at most 30 nights |
| `guests` | integer | 1–16 |
| `destination` | string | One of the destinations below (case and accents ignored) |

### Destinations

| Destination | Also accepted | Includes |
|---|---|---|
| Porto | Oporto | Porto and Gaia |
| Gaia | Vila Nova de Gaia, VN Gaia | Gaia |
| Algarve | — | Algarve |
| Mykonos | Mikonos | Mykonos |

## Response

`200 SUCCESS` — only properties that are actually available, cheapest first. An empty list means nothing is available for those dates.

```json
{
  "status": "SUCCESS",
  "search": { "check_in": "2026-10-10", "check_out": "2026-10-14", "guests": 4, "destination": "Porto" },
  "currency": "EUR",
  "properties": [
    {
      "id": "3f1c2a9e-5b7d-4e1a-9c3f-2d8b6a4e1f00",
      "name": "Bonfim Apartment",
      "description": "Modern two-bedroom apartment…",
      "city": "Porto",
      "area_m2": 75,
      "max_guests": 4,
      "bedrooms": 2,
      "bathrooms": 1,
      "total_price": 717.00,
      "nightly_price_average": 150.00,
      "currency": "EUR",
      "main_image": "https://…/1.jpg",
      "images": ["https://…/1.jpg", "https://…/2.jpg"],
      "amenities": ["Wi-Fi", "Kitchen", "Washer"],
      "booking_url": "https://www.lovelymemories.pt/en/properties/bonfim-apartment?from=2026-10-10&to=2026-10-14&adults=4&ref=kitsiva"
    }
  ]
}
```

### Field notes

- `id` — stable UUID; use it to recognise the same property across searches.
- `total_price` — the full direct-booking price for the stay: nights (with seasonal prices and weekly/monthly discounts) + cleaning fee + tourist tax. All guests are counted as adults. Optional extras (breakfast, transfer) and coupons are not included.
- `nightly_price_average` — accommodation only (after discount) ÷ nights. Excludes cleaning fee and tax.
- `area_m2` — property size in m², or `null`.
- `main_image` — first image, or `null` if the property has none.
- `booking_url` — opens the property page with dates and guests pre-filled. The final price and availability are confirmed again at checkout.

## Errors

| HTTP | `status` | `error.code` | When |
|---|---|---|---|
| 400 | `INVALID_REQUEST` | `INVALID_BODY` | Body isn't a JSON object, or a field is missing or has the wrong type |
| 400 | `INVALID_REQUEST` | `INVALID_DATES` | Bad date format, impossible date, or `check_out` not after `check_in` |
| 400 | `INVALID_REQUEST` | `CHECK_IN_TOO_SOON` | `check_in` is today or in the past |
| 400 | `INVALID_REQUEST` | `DATES_TOO_FAR` | `check_in` more than 18 months ahead |
| 400 | `INVALID_REQUEST` | `STAY_TOO_LONG` | More than 30 nights |
| 400 | `INVALID_REQUEST` | `INVALID_GUESTS` | `guests` not an integer between 1 and 16 |
| 400 | `INVALID_REQUEST` | `UNKNOWN_DESTINATION` | We don't operate there (tell the user "no properties there", not "fully booked") |
| 401 | `UNAUTHORIZED` | `UNAUTHORIZED` | Missing, invalid or revoked token |
| 405 | `METHOD_NOT_ALLOWED` | `METHOD_NOT_ALLOWED` | Use POST |
| 429 | `RATE_LIMITED` | `RATE_LIMITED` | Over 60 requests/minute — wait for `Retry-After` seconds |
| 503 | `ERROR` | `AVAILABILITY_UNAVAILABLE` | Temporary problem — retry later |
| 503 | `ERROR` | `SERVICE_DISABLED` | API temporarily disabled |

Error body:

```json
{ "status": "INVALID_REQUEST", "error": { "code": "INVALID_DATES", "message": "check_out must be after check_in" } }
```

Retry only on `429` and `503`. `400` and `401` won't succeed on retry.
