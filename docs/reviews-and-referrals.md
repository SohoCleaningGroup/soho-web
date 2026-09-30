# Staging review follow-up and referrals

Scope: `staging/vercel-replacement`; replacement Preview database only. No production DNS changes.

When an admin marks a booking Completed, the final service email invites every completed customer to leave an honest Google review at https://g.page/r/CcebMKcdVpKsEBM/review. Reviews have no financial incentive. The approved SMS wording is prepared in `getCompletionReviewSms` but has no sending call. Existing service texts retain their existing consent and sending behavior.

The completion email also includes a private referral rewards page. That page shows a public friend booking link/code and a private reward code. Only the friend link is intended for sharing. The private code requires the customer's original email and verified phone at checkout. Private pages have no analytics, no indexing, no caching, and no outgoing referrer headers.

Give 10%, Get 10%: a new friend receives 10% off cleaning services on their first booking. Add-ons are excluded; each discount is capped at $30. One code per booking; no combined discounts or cash value. Self-referrals are blocked by email, verified phone and normalized household address. Previous non-cancelled bookings and first-clean reservations prevent another friend discount.

A referral reward is earned after BOTH admin completion and payment capture. Original payment must be paid, with no pending/authorized/refunded payments. Completion and capture may occur in either order. Each friend's booking earns one reward; one available reward is reserved per reward checkout under a database lock and unique source constraint. Checkout expiration and unpaid cancellation release reservations. Checkout time alone does not release a referral: Stripe expiration confirmation is required, avoiding races with successful payments. Admins must cancel stale unpaid bookings to release their claims. The admin Referral view lists the latest 100 claims, statuses, discounts and associated bookings. Booking details show the discount; Stripe authorization and default capture totals already include it.

## Test flow

Public staging booking URL:
https://soho-cleaning-replacement-git-staging-vercel-replacement-amerk.vercel.app/onboarding/user

Share this public link with testers. Do not share admin credentials or private worker/review/rewards links. Testers use their own contact details and receive real test emails/verification codes. Stripe card `4242 4242 4242 4242`, any future expiry, any three-digit CVC, in the test checkout only. No real card details.

1. Complete a normal test booking, cleaner acceptance/photos, customer approval, admin completion and capture. Open the referral rewards link in the final email.
2. Give a different new tester the friend link. Apply the prefilled code on the Review step. Verify a 10% service discount up to $30, with add-ons unaffected.
3. Abandon checkout and return to the site. Apply the code again; confirmed expired checkout releases the reservation.
4. Complete friend checkout. Confirm a pending entry in Admin → Referrals. Completing without capture must not earn a reward. Capture then earns it (or reverse the order).
5. Use the private reward code with the original customer's email/verified phone. Complete that booking; confirm one reward redeemed. Duplicate use, self-referral, and a previous customer using a friend code are rejected.

Only new Completed transitions send the new final email. Existing completed jobs are not automatically emailed again. Payment receipts remain separate from the completion thank-you email.

Migration `20260930180000_referral_program` adds server-only account/use tables with RLS and no browser grants. Apply only to the replacement staging database before deploying this branch. Keep the migration pending for any eventual production rollout.
