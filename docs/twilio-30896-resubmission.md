# Twilio 30896 correction and resubmission

Campaign in the rejection email: CM35abb18edf8becb6a9a856b783b9e0c3 (CUSTOMER_CARE).

The reviewer visited https://www.sohocleaninggroup.com/onboarding/user, encountered a phone-verification code, and could not submit the opt-in form. The email requests a compliant opt-in page and requires a clear message_flow, website URL, privacy policy, terms, and any hosted screenshots needed to review the flow.

## Implemented correction

- Public `/sms-consent` form: no login, OTP, booking or payment required to save the SMS choice.
- Unchecked optional checkbox, named brand and transactional/customer-care message purposes.
- Message frequency, message/data rates, STOP, HELP and no-condition-of-purchase disclosures.
- Prominent Privacy Policy and Terms links and non-sharing statement.
- Server records consent or decline, normalized phone, name, email, timestamp, source, version and full disclosure. Invalid submissions fail; no text is sent by this endpoint.
- Signed, HTTP-only, 30-minute session carries the explicit choice into booking. Booking phone verification remains separate. Changing the number, email or country code clears messaging consent. Customers can decline texts and receive email.
- Consent audit table is RLS-enabled with public/anon/authenticated access revoked.
- Existing booking checkbox is a second opt-in path and remains in the message_flow description.

## Before resubmitting

Publish this change to the site customers actually use. Verify the production form, real persistence, policy links, STOP/HELP configuration and the current campaign's samples. Do not claim staging URLs are already live production URLs. The live domain returned 404 for `/sms-consent` on October 2 before this change. The original production `main` branch is older than replacement staging; do not promote all staging changes merely to publish this page.

Ask the owner for the developer's Twilio support-ticket response and incorporate any additional specific reviewer instructions. Ticket wording has not yet been supplied.

## Message flow draft (use only after the stated URLs work)

Customers of SoHo Cleaning Group opt in to transactional customer-care SMS by visiting https://www.sohocleaninggroup.com/sms-consent, entering their name, email and US mobile number, voluntarily checking an unchecked checkbox agreeing to texts about their bookings, service updates, cleaner assignment, payment authorization/status and cancellations, and selecting “Save my SMS preference.” The form displays the brand, “Message frequency varies,” “Message and data rates may apply,” “Reply STOP to opt out or HELP for help,” and “Consent is not a condition of purchase.” Customers may leave the box unchecked and continue booking with email updates. The preference is saved immediately without a login, SMS verification code, booking or payment. It does not send an SMS. With the customer's explicit selection, the choice carries into booking in the same browser for 30 minutes and can be changed before checkout. Service texts begin only after a booking with a verified phone number.

Customers may also opt in directly on https://www.sohocleaninggroup.com/onboarding/user by checking its optional SMS checkbox, with the same disclosures, before completing booking. Selecting “Send code” only requests a one-time verification text and does not enroll customers in booking-update SMS. Phone verification is separate from customer-care consent. Neither providing a number nor receiving a verification code alone enrolls a customer in this campaign.

Privacy Policy: https://www.sohocleaninggroup.com/privacy-policy
Terms & Conditions: https://www.sohocleaninggroup.com/terms-and-conditions
The Privacy Policy states that mobile numbers and SMS consent are not shared with third parties or affiliates for marketing or promotional purposes. There is no marketing enrollment in this flow.

## Sample messages to check against Console

SoHo Cleaning Group: Your cleaning is reserved for October 9 at 10:00 AM. Your card has been authorized but not charged. Reply STOP to opt out or HELP for help.

SoHo Cleaning Group: Your cleaner has been assigned for your upcoming cleaning. Contact us if you need to update access instructions. Reply STOP to opt out or HELP for help.

These are customer-care samples; do not substitute OTP-only samples for this campaign or claim unsupported keyword/offline opt-in methods.

## Evidence to include

A public URL showing the full consent form (checkbox initially unchecked, button and policy links), plus a screenshot of the successful save screen. If booking remains gated by verification, also host screenshots showing that booking's complete consent disclosure and the separate Send code instruction. The public form lets reviewers complete opt-in independently.

## Validation

Production build (webpack, local dependency symlink workaround), TypeScript, focused ESLint, and 14 consent/notification tests pass. Staging migration applied with RLS and revoked public role privileges. Security advisor reports only informational entries for server-only RLS tables, no warnings/errors.
