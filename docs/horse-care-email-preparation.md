# HKA Horse Care Email Reminders — Inactive Preparation

Prepared 26 October 2026. Nothing in this change deploys a migration, installs an extension, creates or changes a cron job, deploys an Edge Function, sends email, or publishes the website.

## Files

- Modified: supabase/migrations/202610260002_horse_reminder_schedule.sql
- Created: supabase/migrations/202610260010_horse_care_email_delivery.sql
- Created: supabase/functions/horse-care-reminders/index.ts
- Created: supabase/tests/horse_care_email_safety.rollback.sql
- Created: docs/horse-care-email-preparation.md

The complete proposed SQL is the verbatim content of the two migration files above. Migrations 006, 007, and 008 were not changed or replayed.

## Migration hashes

- 202610260002_horse_reminder_schedule.sql
  - SHA-256: D4332FBAFBD407CEAFABC1288BCF6CD5CEE2430FE8AD407325D384D72FA36152
- 202610260010_horse_care_email_delivery.sql
  - SHA-256: 76F7EE92E05702B7E17D251F91E16B2B68919398803DF56D1E28FA5E76B4DFF2

Recalculate both hashes after any review edit; approval must name the exact hashes being deployed.

## Worker and template

Status: prepared locally and inactive.

The server-only worker checks global enable and kill-switch settings before work; authenticates its caller with HKA_REMINDER_WORKER_SECRET; optionally restricts claims to HKA_REMINDER_TEST_EMAIL; atomically claims rows with leases and SKIP LOCKED; rechecks owner, account, confirmed email, horse ownership, both opt-ins, schedule version, appointment status, reminder offset, expiry, and kill switch immediately before sending.

Known Resend acceptance is stored with provider message ID. Persistent schedule identity and delivery state prevent known-success duplicates beyond Resend's idempotency window. Transport errors and HTTP 5xx responses are treated as ambiguous and placed in manual_review rather than retried, preventing an uncertain accepted request from becoming a duplicate. Only explicit 408 and 429 non-acceptance responses retry with bounded backoff.

The HTML and plain-text template use HKA forest green, ivory, and antique gold; include horse, care activity, appointment date, optional time, professional wording, and an authenticated dashboard link to /dashboard/student?section=horses. No private token or horse data is embedded in the URL.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Actual hka_settings structure | PASS | Connected schema has text id and text value with RLS enabled. |
| Existing cron inspection | PASS | pg_cron was not installed; no horse-care job was changed. |
| Inactive migration defaults | PASS | Delivery false and kill switch true; no extension or schedule statement. |
| Student and appointment opt-in | PASS | Preparation, claim, and immediate recheck require both flags. |
| Old and overdue suppression | PASS | Queue creation requires exact local reminder date; claims expire and reject past appointment dates. |
| Completion, deletion, reschedule, opt-out invalidation | PASS | Versioned trigger cancels unsent delivery state and clears obsolete in-app reminders. |
| Cross-student isolation | PASS | Every claim and recheck joins appointment, profile, horse, user, and delivery student IDs. |
| Concurrent claiming | PASS | Row locks use FOR UPDATE SKIP LOCKED plus unique schedule identity and expiring leases. |
| Retry and duplicate controls | PASS | Bounded safe retries, persistent provider acceptance, idempotency key, and manual review for ambiguity. |
| Immediate kill switch | PASS | Checked before preparation, claim, and final eligibility recheck. |
| Worker TypeScript syntax | PASS | TypeScript parser reported no syntax diagnostics. |
| Existing web application build | PASS | Vite production build completed. |
| Rollback SQL execution | NOT TESTED | No local PostgreSQL, Supabase CLI, or Deno runtime is installed in this workspace. |
| Migration execution | NOT TESTED | Deliberately not applied to connected production. |
| Live Resend request | NOT TESTED | Deliberately not sent. |
| Verified Resend domain, sender, and plan | NOT TESTED | Connected Supabase secret names contain no Resend configuration; provider-account metadata is unavailable. |
| Failed prepared-source checks | PASS | None. |

## Remaining blockers

- Confirm a verified HKA sending domain, exact sender address, and that the current Resend plan permits application reminder traffic.
- Configure RESEND_API_KEY, HKA_REMINDER_FROM, HKA_APP_URL, HKA_REMINDER_WORKER_SECRET, and initially HKA_REMINDER_TEST_EMAIL as server secrets without exposing values.
- Review and separately approve the two exact migration hashes, then validate migration 010 and the rollback test in a disposable or staging database.
- Separately approve Edge Function deployment and later scheduler activation. They remain unapproved.
- Database delivery cannot provide mathematical exactly-once behavior after an ambiguous provider acceptance; this design chooses manual review instead of automatic retry for that case.

## One controlled test email

1. Verify the HKA domain and sender in Resend and confirm plan eligibility.
2. Set the five server secrets; set HKA_REMINDER_TEST_EMAIL to the single approved, confirmed test account.
3. Apply only the reviewed migration files in staging first, execute the rollback test, and confirm every assertion passes.
4. After separate approval, apply the reviewed migrations and deploy horse-care-reminders while keeping delivery disabled and kill switch active.
5. On the approved test account, enable profile horse-care email, enable one future appointment, and choose one reminder offset matching the test day.
6. Confirm no other address can be claimed while the allow-list secret is present.
7. Temporarily set delivery enabled true and kill switch false, invoke the function manually once with the worker secret, and do not create a schedule.
8. Confirm exactly one sent delivery row, one Resend message ID, and one correctly branded inbox message.
9. Immediately restore kill switch true and delivery enabled false; retain the allow-list.
10. Review logs, provider acceptance, link access, opt-out behavior, and privacy before separately approving any wider recipient set or scheduler.
