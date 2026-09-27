# SoHo booking scheduling staging checkpoint — 2026-09-27

Scope: replacement/staging only. Production/live site was not modified.

## Implemented

- Capacity-aware booking checks (defaults to one cleaner/crew slot).
- Temporary checkout slot holds to prevent concurrent double booking.
- Stripe Checkout expires before its associated hold can become stale.
- Expired Stripe Checkout sessions release their hold.
- Cancelled and completed bookings do not consume scheduling capacity.
- Live availability endpoint for the booking form.
- Unavailable time slots are shown before checkout.
- Duration-aware scheduling by service type, home size, square footage, and supported add-ons.
- Estimated service duration is persisted with the booking.
- 60-minute default travel/reset buffer between jobs (configurable).
- Cleaning itself must finish by 6:00 PM.
- Weekends are unavailable in both the UI and server-side validation.
- Database hold table has RLS enabled and no public client policy.

## Current staging defaults

- CLEANING_BOOKING_CAPACITY=1
- CLEANING_TRAVEL_BUFFER_MINUTES=60
- Operating days: Monday-Friday
- Operating hours: 8:00 AM-6:00 PM
- Checkout hold/session window: 30 minutes (hold outlives session by 5 minutes)

## Promotion gate

Do not promote to production until the replacement preview passes:
1. live availability query
2. same-slot conflict
3. overlapping duration conflict
4. late-day duration cutoff
5. weekend rejection
6. expired-hold cleanup
7. Stripe test checkout/webhook booking creation
