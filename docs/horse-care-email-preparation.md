# HKA Horse Care Email Reminders — Inactive Preparation

Prepared 26 October 2026. Nothing in this change deploys a migration, installs an extension, creates or changes a cron job, deploys an Edge Function, sends email, or publishes the website.

## Files

- Modified: supabase/migrations/202610260002_horse_reminder_schedule.sql
- Modified: supabase/migrations/202610260010_horse_care_email_delivery.sql
- Modified: supabase/functions/horse-care-reminders/index.ts
- Modified: supabase/tests/horse_care_email_safety.rollback.sql
- Modified: docs/horse-care-email-preparation.md

The complete proposed SQL is the verbatim content of the two migration files above. Migrations 006, 007, and 008 were not changed or replayed.

## Migration hashes

- 202610260002_horse_reminder_schedule.sql
- SHA-256: 3D7B597433876EAC5CEA0A847340617C7EA955137BAC259E4D7980C7F5FBCC16
- 202610260010_horse_care_email_delivery.sql
- SHA-256: 83B6E7DAAC1130EA835FD96FAA3B7250E7440A933CB569019745E3A9BFB5881A

Recalculate both hashes after any review edit; approval must name the exact hashes being deployed.

## Worker and template

Status: prepared locally and inactive.

The server-only worker checks global enable and kill-switch settings before work. It requires both the service-role credential in the `apikey` header and HKA_REMINDER_WORKER_SECRET; both remain server-side. Browser users, user JWTs, missing credentials, and unauthenticated callers fail the in-handler authorization check. HKA_REMINDER_TEST_EMAIL is mandatory: a missing or malformed value stops the run, and the same single address is enforced during database claim, eligibility recheck, and the atomic transition to dispatching.

Supabase's supported service-to-service mode uses `verify_jwt = false` and a secret key in the `apikey` header, with authorization enforced in the handler. Required deployment configuration is `[functions.horse-care-reminders] verify_jwt = false`; the worker then independently compares the server-only service-role key and worker secret. No `supabase/config.toml` change is included because project rules reserve that file for Elmony deployment configuration. References: [Supabase authorization headers](https://supabase.com/docs/guides/functions/auth-headers) and [securing Edge Functions](https://supabase.com/docs/guides/functions/auth).

Claimed work records the exact confirmed recipient. A separate atomic transition records `dispatch_started_at` immediately before the provider request. Expired pre-dispatch claims may be reclaimed; expired work after dispatch begins moves permanently to `manual_review`. This remains protective after Resend's 24-hour idempotency window.

Known Resend acceptance is stored only when the response contains a UUID-format provider message ID and the database state update succeeds. The worker checks every RPC error and result. If acceptance is known but the sent-state update fails, it records the provider ID in `manual_review`; if even that hold fails, the row remains `dispatching` and lease-expiry reconciliation moves it to manual review. Transport failures, HTTP 408/409, HTTP 5xx, malformed success responses, and other ambiguous outcomes are never blindly retried. Only explicit HTTP 429 rejection is eligible for bounded retry.

The HTML and plain-text template use HKA forest green, ivory, and antique gold; include horse, care activity, appointment date, optional time, professional wording, and an authenticated dashboard link to /dashboard/student?section=horses. No private token or horse data is embedded in the URL.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Actual hka_settings structure | PASS | Connected schema has text id and text value with RLS enabled. |
| Existing cron inspection | PASS | pg_cron was not installed; no horse-care job was changed. |
| Inactive migration defaults | PASS | Delivery false and kill switch true; no extension or schedule statement. |
| Error-code validation source check | PASS | Migration uses `^[a-z0-9][a-z0-9_.:-]{0,79}$`; rollback test accepts a safe code and rejects newline and uppercase values. |
| Resend ID validation source check | PASS | Sent transition requires a UUID-format provider ID in worker and database. |
| Mandatory one-address control | PASS | Missing/malformed test email stops worker and database claim; claim and pre-dispatch checks require exact current confirmed email. |
| Interruption-state design | PASS | Pre-dispatch expired claims retry; dispatch-started expirations become manual review; sent/provider IDs remain persistent beyond 24 hours. |
| Student and appointment opt-in behavior | NOT TESTED | Disposable rollback assertions were added, but no disposable PostgreSQL/Supabase runtime is available here. |
| Ownership and confirmed-email behavior | NOT TESTED | Disposable rollback assertions were added; database execution remains pending. |
| Reschedule, completion and deletion behavior | NOT TESTED | Trigger transitions are exercised in rollback SQL; database execution remains pending. |
| Date and timezone behavior | NOT TESTED | Fixed Africa/Lusaka conversion and local-day assertions are prepared but not executed. |
| Atomic claim and expired-lease behavior | NOT TESTED | SKIP LOCKED, duplicate-claim, pre-dispatch reclaim and dispatch ambiguity assertions are prepared but not executed. |
| Missing test-recipient behavior | NOT TESTED | Database exception and allow-list assertions are prepared but not executed. |
| Provider acceptance/database-recording failure | NOT TESTED | Wrong-lease failure plus provider-ID manual hold is prepared but not executed. |
| Kill-switch behavior | NOT TESTED | Disabled preparation and immediate pre-dispatch rejection assertions are prepared but not executed. |
| Worker TypeScript syntax | PASS | TypeScript parser reported no syntax diagnostics. |
| Existing web application build | PASS | Vite production build completed. |
| Rollback SQL execution | NOT TESTED | No local PostgreSQL, Supabase CLI, or Deno runtime is installed in this workspace. |
| Migration execution | NOT TESTED | Deliberately not applied to connected production. |
| Live Resend request | NOT TESTED | Deliberately not sent. |
| Verified Resend domain, sender, and plan | NOT TESTED | Connected Supabase secret names contain no Resend configuration; provider-account metadata is unavailable. |
| Failed prepared-source checks | PASS | None. |

## Remaining blockers

- Confirm a verified HKA sending domain, exact sender address, and that the current Resend plan permits application reminder traffic.
- Configure RESEND_API_KEY, HKA_REMINDER_FROM, HKA_APP_URL, HKA_REMINDER_WORKER_SECRET, and mandatory HKA_REMINDER_TEST_EMAIL as server secrets without exposing values.
- Confirm deployment uses the prepared per-function `verify_jwt = false` setting and that the server-to-server caller supplies both the service-role `apikey` credential and worker secret; do not expose either to browser code.
- Review and separately approve the two exact migration hashes, then validate migration 010 and the rollback test in a disposable or staging database.
- Separately approve Edge Function deployment and later scheduler activation. They remain unapproved.
- Database delivery cannot provide mathematical exactly-once behavior after an ambiguous provider acceptance; this design chooses manual review instead of automatic retry for that case.

## One controlled test email

1. Verify the HKA domain and sender in Resend and confirm plan eligibility.
2. Set the five server secrets; set HKA_REMINDER_TEST_EMAIL to the single approved, confirmed test account. Confirm only this function uses the prepared `verify_jwt = false` service-to-service configuration.
3. Apply only the reviewed migration files in staging first, execute the rollback test, and confirm every assertion passes.
4. After separate approval, apply the reviewed migrations and deploy horse-care-reminders while keeping delivery disabled and kill switch active.
5. On the approved test account, enable profile horse-care email, enable one future appointment, and choose one reminder offset matching the test day.
6. Confirm no other address can be claimed while the allow-list secret is present.
7. Temporarily set delivery enabled true and kill switch false, invoke the function server-to-server once with the service-role `apikey` header and worker secret, and do not create a schedule.
8. Confirm exactly one sent delivery row, one Resend message ID, and one correctly branded inbox message.
9. Immediately restore kill switch true and delivery enabled false; retain the allow-list.
10. Review logs, provider acceptance, link access, opt-out behavior, and privacy before separately approving any wider recipient set or scheduler.
