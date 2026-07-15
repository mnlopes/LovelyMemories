# Reservations List — Beds24 source lens + detail sheet

**Date:** 2026-07-15
**Status:** approved
**Scope:** single file — `app/[locale]/admin/reservations/page.tsx` (+ i18n only if a new string is needed)

## Problem

The Reservations **Calendar** view already has the Beds24 source lens: a super_admin
SOURCE toggle (iCal / Beds24), the `applyBeds24Lens` transform, and click-to-open the
`Beds24BookingDetailSheet`. The **List** view has none of this — it renders raw
`reservations`, the SOURCE toggle is hidden outside the calendar view, and no Beds24
detail sheet is mounted. So a super_admin who switches to List loses the Beds24 lens and
cannot open a Beds24 booking.

## Goal

Mirror the Calendar behaviour in the List view. When a super_admin sets SOURCE → Beds24,
the list shows Beds24 bookings for linked properties and clicking one opens the existing
`Beds24BookingDetailSheet`. Beds24 rows are read-only.

## Existing pieces reused (no new server actions)

- `applyBeds24Lens(reservations, blockedDates, preview, decorateBooking)` — `lib/beds24-calendar-lens.ts`.
- Injected Beds24 booking shape (`app/actions/beds24.ts` ~261–323): `id: "b24-<n>"`,
  `beds24_booking_id: number`, `property_id`, `guest_name`, `check_in`, `check_out`,
  `channel`, `status: 'confirmed' | 'new'`, `is_airbnb`, `is_beds24: true`.
- `Beds24BookingDetailSheet` (`beds24BookingId: number | null`) — already used by the Calendar view.
- The SOURCE toggle markup + `toggleBeds24Preview` / `beds24Preview` / `beds24Data` state already exist in `page.tsx`.

## Changes (all in `page.tsx`)

1. **Toggle visibility:** render condition `view === 'calendar' && role === 'super_admin'`
   → `role === 'super_admin'`. Toggle lives in the header, so it persists across List/Calendar.

2. **List data source:** move the `applyBeds24Lens(...)` call above `filteredReservations`
   and derive `filteredReservations` from the lensed reservations (`calendarReservations`)
   instead of raw `reservations`. When the toggle is **off**, the lens returns
   `reservations` unchanged → no behaviour change in the default state.

3. **Row click routing:** new state `selectedBeds24Id: number | null`. In the desktop
   `<tr>` `onClick` and the mobile card `onOpenDetail`: if `reservation.is_beds24` →
   `setSelectedBeds24Id(reservation.beds24_booking_id)`, else the existing
   `setDetailSheetReservation(reservation)`.

4. **Actions column (read-only Beds24):** hide the `...` menu button for `is_beds24` rows
   (render the `-` placeholder like other action-less rows). Beds24 ids are `b24-*`, not
   real reservation uuids, so Delete/History must not be offered.

5. **Mount the sheet:** add
   `<Beds24BookingDetailSheet beds24BookingId={selectedBeds24Id} onClose={() => setSelectedBeds24Id(null)} />`
   next to the existing `ReservationDetailSheet`. Extend the selected-row highlight to also
   match `selectedBeds24Id`.

6. **Status display:** Beds24 rows carry `status: 'confirmed' | 'new'`. Existing
   `effectiveStatus` handles `confirmed` (derives upcoming/checked-in/completed from dates);
   treat `new` as `confirmed` for display so it doesn't fall through to the default badge.

## Non-goals

- No changes to `Beds24BookingDetailSheet` itself.
- No edit/delete/history actions on external Beds24 bookings.
- No new filters. The existing `Airbnb: ON/OFF` filter keeps applying (it also hides
  Airbnb-channel Beds24 rows when OFF — consistent with the calendar).

## Verification

- `npx tsc --noEmit` clean; `npm run build` clean.
- E2E as super_admin (port 3001): Reservations → List → SOURCE → Beds24 → Beds24 rows
  appear → click opens `Beds24BookingDetailSheet`; a site/Airbnb-iCal row opens the normal
  `ReservationDetailSheet`; toggle back to iCal restores the original list; dark mode.
