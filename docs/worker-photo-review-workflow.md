# Worker assignment and cleaning photo review — staging

Implemented on staging/vercel-replacement. Live site/DNS are unchanged.

- Open a booking in admin, select an approved worker and email their job invitation.
- Worker opens a private expiring link, accepts or declines. Acceptance marks the booking assigned; owner gets an email.
- Accepted worker sees the address, contact and booking notes; uploads up to 12 photos from their job page. Camera photos are resized; server decoding strips GPS/EXIF and stores JPGs in a private bucket.
- Worker selects Cleaning nearly done — send review. Requires at least one photo. Customer receives an email with a separate private link, photos and Everything looks good / Something needs attention buttons.
- Attention needs a written note. Feedback appears in admin and owner receives an email. Worker can upload follow-up photos and request another review.
- Customer approval records the response but does not capture payment. Admin manually captures payment after approval. Managed jobs cannot be marked completed or captured before approval; older bookings without an assignment retain their existing behavior.
- Worker links last 14 days and can be renewed by owner. Customer review links last 14 days. Photos use 10-minute signed view URLs. Private pages skip analytics and send no-referrer/noindex/no-store headers.
- New workflow sends emails only. Twilio texts remain on hold; owner SMS number is still unconfirmed. Existing booking notification behavior remains separate.

Deployment: fec8142d5c09596430d28e0215705a210fcd02c9, Vercel dpl_EXB3YAaN34ffPPjHjPkEXSC3V4K2 READY (Preview).

BLOCKED: deployed valid-photo upload returned Photo storage is unavailable. Staging NEXT_PUBLIC_SUPABASE_URL points to oaarnwczslhbpfxchygu; server key setting predates that URL update. Needs correct staging server key verified/configured and upload retest. Supabase browser is signed out; secure sign-in request was aborted. No keys were changed.

Validation: 27 automated tests passed (10 job workflow, 9 checkout return, 8 SMS consent); TypeScript and focused ESLint passed. Staging schema has RLS enabled with no anon/authenticated table grants and a private photo bucket.

Limits: Reassigning an already accepted job and resending an expired customer review link need an owner-managed follow-up implementation. No automatic payment capture or review timeout default. No customer/cleaner delivery trial yet. Runtime worker page and admin panel rendered; invalid image returned 400 and unauthenticated admin mutation returned 401. Valid photo upload failed as above. Disposable QA records were removed.

Recovered earlier state: owner cancellation email and owner email test changes are saved/deployed; user confirmed hello@sohocleaninggroup.com received the test. Earlier BookingAssignment/ServiceReview staging tables have no rows and no corresponding saved branch code; left untouched. New implementation uses JobAssignment/JobPhoto.
