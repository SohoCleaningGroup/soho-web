# Isolated staging Preview check — 2026-09-29

This branch deploys to the `soho-cleaning-replacement` Vercel project's Preview environment. Its database connection is set by branch-scoped `DATABASE_URL` and `DIRECT_URL` secrets. Never place credentials in this repository.

The isolated Supabase staging project is `oaarnwczslhbpfxchygu`. Its `public."BookingSlotHold"` table exists. Test the booking availability API after a fresh Git deployment to confirm the runtime connection.

Production deployment, DNS, live payments, and Lucy are outside this staging check.
