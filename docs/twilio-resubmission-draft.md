# SoHo Customer Care — resubmission draft

Status: prepared for the optional-consent implementation. Do not submit until the business-domain booking page and policies match this implementation. Production and DNS have not been changed.

## Campaign description
SoHo Cleaning Group sends transactional customer care SMS messages to customers who separately opt in while booking cleaning services on our website. Messages include booking confirmations, booking status updates, cleaner assignment notifications, payment authorization and payment status updates, additional payment authorization requests, cancellation notices, and service-related support. SMS booking updates are optional. Customers can complete a booking without enrolling in these messages and receive booking updates by email. This campaign does not send promotional messages. One-time phone verification is handled separately through Twilio Verify and does not enroll customers in this campaign.

## Privacy policy URL
https://www.sohocleaninggroup.com/privacy-policy

## Terms URL
https://www.sohocleaninggroup.com/terms-and-conditions

## Message flow
Customers visit https://www.sohocleaninggroup.com/onboarding/user and select a cleaning service. In the Personal step, they enter their contact information. Selecting Send code requests a one-time phone-verification text through Twilio Verify; verification does not enroll the customer in this campaign. A separate SMS booking-update checkbox is labeled Optional and is unchecked by default. Customers actively select it to agree to receive transactional booking and service-related texts from SoHo Cleaning Group. Customers may leave it unchecked and still complete their booking; booking updates are then sent by email. The adjacent disclosure identifies the brand and message purposes, says message frequency varies and message and data rates may apply, provides STOP and HELP instructions, and states that consent is not a condition of purchase. Privacy Policy and Terms & Conditions links are directly beside the consent disclosure. We record the customer's SMS choice, phone number, timestamp and disclosure version with the booking, and send campaign messages only when that booking has recorded consent for the recipient number. Mobile phone numbers, SMS opt-in data and messaging consent are not shared with third parties or affiliates for marketing or promotional purposes. Privacy Policy: https://www.sohocleaninggroup.com/privacy-policy. Terms & Conditions: https://www.sohocleaninggroup.com/terms-and-conditions.

Attach a public screenshot URL showing the entire Personal-step consent disclosure after deployment. Do not include a password-protected Vercel preview as evidence.

## Sample messages
1. SoHo Cleaning Group: Your cleaning is reserved for [DATE] at [TIME]. Your card has been authorized but not charged. Payment will be captured after the cleaning is completed. Reply STOP to opt out or HELP for help.
2. SoHo Cleaning Group: Your booking has been confirmed. A cleaning professional will be assigned soon. Reply STOP to opt out or HELP for help.
3. SoHo Cleaning Group: An additional card authorization of [$AMOUNT] is required for your updated cleaning total of [$TOTAL]. Reason: [REASON]. Review and authorize securely within 24 hours: https://www.sohocleaninggroup.com/authorize-additional/[TOKEN] Reply STOP to opt out or HELP for help.

These samples match the customer notification templates and their new STOP/HELP footer. Keep embedded links checked. START/YES/UNSTOP are Twilio resubscription defaults, not an advertised initial keyword-enrollment flow. Keep Twilio-managed STOP/HELP handling aligned with the Messaging Service.

## HELP wording
SoHo Cleaning Group: For assistance, visit https://www.sohocleaninggroup.com. Reply STOP to unsubscribe. Message and data rates may apply.
