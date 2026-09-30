# Staging security check — 2026-09-30

Scope: replacement staging Supabase project oaarnwczslhbpfxchygu only. No live database, DNS, or live payment changes.

Security Advisor returned no ERROR or WARN notices. Twelve INFO notices describe intentionally server-only tables with RLS enabled and no browser policies. All public application tables have RLS enabled. The job-completion-photos bucket is private.

Six older tables still had default grants to anon/authenticated. Removed these unnecessary grants; Next.js handlers access application data through server-side Prisma, and storage uses the server-only service-role client. Applied:

```sql
BEGIN;
REVOKE ALL PRIVILEGES ON TABLE
  public."AdditionalAuthorization", public."Booking", public."BookingSlotHold",
  public."Payment", public."ProfessionalProfile", public."UserProfile"
FROM anon, authenticated;
COMMIT;
```

Verification: public tables without RLS = 0; remaining anon/authenticated table grants = 0. Deployed availability API returned HTTP 200 with success:true, capacity:1, estimatedDurationMinutes:120 and travelBufferMinutes:60 after the permission change.

Launch work still pending: a real staging friend referral booking, completion/capture and original-customer reward redemption; Twilio campaign approval/service SMS rollout; separate production environment, migrations, credentials and webhook/DNS cutover plan. Test referral records should not be copied wholesale into production. Any commitment to honor a tester's code should be handled explicitly.
