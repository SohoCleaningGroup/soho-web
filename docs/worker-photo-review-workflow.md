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

Validation: 27 automated tests passed (10 job workflow, 9 checkout return, 8 SMS consent); TypeScript and focused ESLint passed. Staging schema has RLS enabled with no anon/authenticated table grants and a private photo bucket.

Limits: Reassigning an already accepted job and resending an expired customer review link need an owner-managed follow-up implementation. No automatic payment capture or review timeout default. No customer/cleaner live delivery trial yet.

Recovered earlier state: owner cancellation email and owner email test changes are saved/deployed; user confirmed hello@sohocleaninggroup.com received the test. Earlier BookingAssignment/ServiceReview staging tables have no rows and no corresponding saved branch code; left untouched. New implementation uses JobAssignment/JobPhoto.
