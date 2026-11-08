# Message Hollie: actual local execution results

Completed 2026-11-08T08:39:43.948Z. **142 SQL assertions PASS, 0 SQL assertions FAIL; 13 preview checks PASS, 0 preview checks FAIL.**

Connected Supabase project **sqaydpbqycvaictieafk remains pending separate Founder approval** after review of these send, reply, privacy and rollback results. No connected database changes, hosted messages or deployments occurred.

This report supersedes the historical NOT EXECUTED/local-approval-pending status in MESSAGE_HOLLIE_APPROVAL.md and MESSAGE_HOLLIE_ISOLATED_TEST_PLAN.md for local testing only. Original approval manifest and all 24 approved files remain byte-for-byte unchanged.

## Confirmed target and input gate

- Container: hka-message-hollie-review-1794127174038.
- Database: hka_messaging_security_20261106_designated_founder.
- Local Docker endpoint: npipe:////./pipe/dockerDesktopLinuxEngine.
- Cached image: public.ecr.aws/supabase/postgres:17.11.0.003.
- Image ID/digest: sha256:7374d196da7e301512cc5329e18040e0f7bb856287b323777cdadecccbc6c7e4.
- Isolation verified before SQL: network none, no published ports, no host binds, temporary /tmp storage only, read-only root filesystem; --pull=never.
- Fresh database had no public tables/auth schema before reconstruction; auth.users, hka_profiles and hka_messages remained empty before fixtures.
- Relevant HKA columns/defaults, constraints, helper definitions/owners/ACLs and RLS policies matched reviewed catalog reconstruction; schema checks passed.
- All 24 original manifest entries matched SHA-256 and byte counts before SQL and again after execution.

[Pre-SQL target/hash gates](message-hollie-review-20261108/pre-execution-gates.json) | [Container inspection](message-hollie-review-20261108/container-inspection.json) | [Schema parity log](message-hollie-review-20261108/schema-parity.log)

## Exact reviewed SQL files

| File | SHA-256 | Bytes |
| --- | --- | ---: |
| [202611060001_message_hollie.sql](../supabase/proposals/202611060001_message_hollie.sql) | 44e987828a138e6c784761e684e8f18c24fb855ee8222d7eb678e33d92e47173 | 22323 |
| [202611060001_message_hollie.rollback.sql](../supabase/proposals/202611060001_message_hollie.rollback.sql) | 194f577577150ded4795f64246659d394e693279df5fa3b3d3d74718747e68a0 | 6406 |

The committed cycle executed both exact files with their original BEGIN/COMMIT boundaries in separate PostgreSQL connections. Their captured execution copies match the original manifest hashes.

## Actual case results

| Case | Actual result |
| --- | --- |
| Reviewed forward/rollback suite | PASS: 129/129 assertions, including drift rejections, safeguarding, sender/scope forgery, immutable content and recipient-only receipts. |
| Designated Founder with two eligible Admins | PASS: only f7c3e52e-4f5e-47d0-8139-b28cb296d526 is Founder; second Admin has no global directory or replacement designation. |
| Wrong recipient protection | PASS: adult Horse Owner insert addressed to second Admin was denied with insufficient_privilege; normal insert addressed to Hollie succeeded. |
| Second Admin privacy | PASS: owner message and Founder reply invisible to second Admin before and after committed rollback; attempted receipt update affected zero rows. |
| Adult Horse Owner send | PASS: only Horse Owner purpose, student_id NULL, exact body and designated recipient; invented Student scope denied. |
| Founder unread receipt and reply | PASS: exact owner row arrived read_at NULL, Founder marked it read, exact reply persisted unread to owner across independent connections. |
| Rollback history | PASS: every application-row fingerprint identical before/after rollback, including private contents and receipts; both participants retained exact NULL-scope history. |
| Rollback restrictions | PASS: new Founder direct sends/directory disabled, no broad Admin reads restored, approved Coach relationships and immutable-message guard retained. |
| Transaction cleanup | PASS: reviewed transaction restored empty accounts/messages and removed test/messaging schemas before committed cycle. |
| Disposable cleanup | PASS: uniquely labelled final container removed and absence confirmed. |
| Coach dedicated Messages preview | PASS: visible Messages navigation, page-level Message Hollie, designated contact selection and exact successful send. |
| Founder Dashboard Messages preview | PASS: exact Horse Owner body and unread thread badge observed before opening, followed by exact reply and owner receipt. |

SQL fixture accounts: 18 synthetic accounts, including two authorised Admins; fixture 1 reuses reviewed Founder UUID with invented local profile/email. Browser fixture accounts: six, including two Admins. SQL and browser account IDs intentionally differ.

One initial container startup attempt did not become ready before database creation or any SQL; [original infrastructure result](message-hollie-review-20261108/startup-attempt.json) retained. That container was subsequently confirmed absent. This is not counted as a failed SQL or preview assertion; final isolated run passed all cases.

## Persisted exact message observations

Owner row observed in Founder SQL session before opening:

~~~json
{
  "id": "a24901a0-80e9-40ba-b048-175f9a7d03dd",
  "student_id": null,
  "sender_id": "f1000000-0000-4000-8000-000000000009",
  "recipient_id": "f7c3e52e-4f5e-47d0-8139-b28cb296d526",
  "body": "Adult Horse Owner exact message to Hollie",
  "read_at": null,
  "created_at": "2026-11-08T08:39:41.832416+00:00"
}
~~~

Reply row observed in Horse Owner SQL session across a new connection:

~~~json
{
  "id": "eaaacc37-9cbd-45df-9132-69b7c24c7b3c",
  "student_id": null,
  "sender_id": "f7c3e52e-4f5e-47d0-8139-b28cb296d526",
  "recipient_id": "f1000000-0000-4000-8000-000000000009",
  "body": "Hollie exact Horse Owner reply",
  "read_at": null,
  "created_at": "2026-11-08T08:39:41.848854+00:00"
}
~~~

[Send/unread/reply log](message-hollie-review-20261108/committed-owner-send-founder-reply.log) | [Reply receipt log](message-hollie-review-20261108/committed-reply-receipt.log) | [Rollback fingerprints/privacy log](message-hollie-review-20261108/committed-rollback-history-privacy.log)

## Preview observations

Coach path: /dashboard/coach?section=messages&contact=f7c3e52e-4f5e-47d0-8139-b28cb296d526.

~~~json
{
  "student_id": null,
  "sender_id": "10000000-0000-4000-8000-000000000004",
  "recipient_id": "f7c3e52e-4f5e-47d0-8139-b28cb296d526",
  "body": "Coach dedicated Messages exact send"
}
~~~

[Coach dedicated Messages screenshot](../.elmony/message-hollie-review-20261108/browser/coach-dedicated-message-hollie.png) | [Founder unread screenshot](../.elmony/message-hollie-review-20261108/browser/founder-horse-owner-unread.png) | [13 actual preview results](../.elmony/message-hollie-review-20261108/browser/results.json)

Actual app routing, Supabase SDK calls and UI handlers were exercised with intercepted synthetic responses; HTTPS requests and realtime were isolated from hosted writes. Expected missing-RPC (404) and denied-send (403) cases passed and retained draft/pending states; no unexpected browser exceptions occurred.

## Evidence and scope

[Consolidated machine-readable results](message-hollie-review-20261108/results.json) | [Database phase results and assertion names](message-hollie-review-20261108/database-results.json) | [Original approval checksums](message-hollie-checksums.json) | [Execution artifacts SHA-256 manifest](message-hollie-review-20261108/checksums.json)

Production build, app TypeScript check and existing messaging unit checks passed. No app implementation or approved SQL was changed; added isolated Docker runner and evidence wrapper only.

This verifies real local PostgreSQL enforcement and persistence against the reviewed relevant HKA schema reconstruction, plus separate browser UI behavior. It does not prove hosted auth/JWT handling, PostgREST/GraphQL exposure, realtime, full-database compatibility or connected end-to-end delivery. No current connected catalog refresh was performed. These remain connected acceptance items under separate Founder approval.

Catalog snapshot timestamp: 2026-11-03T04:46:34.427264+00:00.
