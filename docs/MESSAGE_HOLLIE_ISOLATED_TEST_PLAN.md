# Message Hollie — isolated test plan

Status: NOT EXECUTED; separate Founder approval required before any disposable-database SQL.
Connected project `sqaydpbqycvaictieafk` remains pending Founder review of send, reply, privacy and rollback results, followed by a separate connected-project approval.

## Revision and identity

Review [forward SQL](../supabase/proposals/202611060001_message_hollie.sql), [rollback](../supabase/proposals/202611060001_message_hollie.rollback.sql) and [SHA-256 manifest](message-hollie-checksums.json).
The manifest records exact file bytes; its own hash is provided with the approval question.
Recompute hashes before any approved execution; stop if any input differs.

Hollie is bound to auth UUID `f7c3e52e-4f5e-47d0-8139-b28cb296d526`, already designated in [Founder activation](../supabase/activation/202610220001_founder_role.sql).
The proposed preflight requires this account to be confirmed, unsuspended, adult and durably authorised as Admin; display name, dashboard and other Admin accounts cannot select another recipient.
No identity, role or account changes are included.

## Destination and isolation

Use a fresh local Docker container named `hka-message-hollie-review-<run-id>`, local Docker daemon only, database `hka_messaging_security_20261106_designated_founder`.
PostgreSQL image: cached `public.ecr.aws/supabase/postgres:17.11.0.003`; record actual image ID/digest.
Require `--pull=never`, `--network none`, no published ports, no host bind mounts, temporary database storage, and a unique review label before SQL.
If image or local daemon is unavailable, report that blocker; never switch to hosted SQL.
Inspect container name, label, network, mounts and image before applying any SQL; stop on mismatch.
Use container-local `psql -X --no-password --set=ON_ERROR_STOP=1` over loopback via `docker exec -i`, never the connected SQL tool.

No live auth users, rows, tokens, secrets or environment files are imported.
The local schema is a synthetic reconstruction of the relevant previously inspected catalog, not a full Supabase restore.
Its source snapshot and generator are hashed in the manifest; catalog freshness, hosted JWT validation, PostgREST/GraphQL exposure and realtime remain separate acceptance gates.
18 synthetic accounts include designated Founder (fixture 1) and a second eligible Admin (fixture 18).
Only synthetic local fixture 1 reuses Hollie's identity UUID to exercise exact forward SQL unchanged; its name/email/profile are invented test data.

## Approval-gated sequence

1. **Confirm exact inputs and destination.** Verify manifest, generated schema and suite hashes; record explicit Founder approval for disposable execution only. Safe preparation is `node supabase/tests/founder_messaging/run-message-hollie.cjs --prepare-only`; it writes generated artifacts and makes no database connection.
2. **Establish isolated baseline.** Apply `.elmony/message-hollie-local-schema.sql` to the fresh named database; require empty `auth.users` and `hka_profiles`. Capture PostgreSQL/image versions and baseline catalog assertions. This SQL step is not authorised yet.
3. **Exercise revised forward/send/reply/privacy.** Execute exact `.elmony/message-hollie-security-suite.sql` against that database, with stop-on-error. The suite encloses synthetic fixtures, drift cases, forward SQL, role-scoped sends/replies, privacy checks and restrictive rollback in one outer transaction, ending with ROLLBACK. Expect exactly 129 PASS assertions and zero unhandled SQL errors; assertions outside that count also abort on failure.
4. **Review rollback evidence.** Require unchanged application-row fingerprints around forward and rollback, retained NULL-scope adult messages, designated identity, participant history, guardian oversight and approved Coach sends; direct grants disabled, directory removed, immutable guard enabled, read receipts protected. Policy/disabled/replica-trigger drift must be rejected. Verify outer transaction restored empty auth/profile tables and removed test/messaging schemas; capture cleanup result. These are transaction-scoped database tests; committed persistence across separate connections remains unproven.
5. **Return results for Founder review.** Retain exact input hashes, SQL output, assertion count, image ID, synthetic account list, send/reply payloads, privacy denials, rollback fingerprints and cleanup result. Destroy only the uniquely labelled disposable container after evidence capture. Do not apply connected SQL, deploy functions or claim hosted delivery. Connected work remains pending until Founder reviews send, reply, privacy and rollback results and separately approves the exact connected revision.

The optional native-psql runner additionally requires `HKA_APPROVE_ISOLATED_SQL=FOUNDER_APPROVED_LOCAL_ONLY`, an approved loopback `HKA_ISOLATED_DATABASE_URL` named `hka_messaging_security_*`, and explicit `--approved-migration-sha256` / `--approved-rollback-sha256` matching current files.
Those flags are execution guards, not evidence of user approval; never set them before approval.
Do not use October `run-docker.cjs` / `run-isolated.cjs`: they target the superseded proposal.

## Required cases

| Area | Required observation |
| --- | --- |
| Two Admins | Only fixture 1 is Founder; fixture 18 can contact Hollie but has no member directory, unrelated sends or private Founder-thread reads; no promotion when Hollie's Admin purpose is revoked. |
| Adult Horse Owner | Durable Horse Owner purpose only; authorised contact scope is NULL; exact body `Adult Horse Owner exact message to Hollie`, sender fixture 9, recipient fixture 1; invented Student scope rejected. |
| Unread receipt and reply | Exact owner row visible to Founder with `read_at IS NULL` before opening; only recipient records read timestamp; exact reply `Hollie exact Horse Owner reply` reaches owner unread with NULL scope. |
| Privacy | Participants only; authorised linked-minor Guardian oversight read-only; no second-guardian access to adult private threads; no global Founder/Admin reads; no unrelated external Coach access. |
| Eligibility | Suspended, unconfirmed, pending/revoked purpose and missing/revoked minor activation consent denied; assigned Coach consent requirements retained; no plan restrictions or chat approval. |
| Write integrity | Forged sender/scope/pre-read insert, content/participant/timestamp updates and deletes denied; only recipient read receipts permitted. |
| Dashboard continuity | Durable purposes survive selected-dashboard changes; browser confirms one Founder/member pair and retained draft; other Admin history remains scope-separated. |
| Rollback | All application rows preserved, NULL history retained, new direct sends/directory frozen, approved relationships retained; disabled/replica guards and policy drift rejected. |

## Browser evidence already obtained

[Browser results](../.elmony/message-hollie-evidence/results.json): 13 passing actual-app checks, six synthetic accounts, two Admins.
All remote traffic was intercepted and realtime blocked; no connected SQL or messages were written.

The adult Horse Owner's contact response places a history-only second Admin before Hollie. The test asserts the entire outgoing object, including explicit `student_id: null`, exact sender, designated recipient and body.
It observes the exact body and unread badge in `/dashboard/admin?section=messages` before opening the owner thread, then checks exact reply and refreshed owner receipt.

Coach test clicks the visible dedicated Messages navigation and page-level **Message Hollie** entry, reaches `/dashboard/coach?section=messages&contact=f7c3e52e-4f5e-47d0-8139-b28cb296d526` and asserts the exact outgoing payload.
Screenshots: [Founder unread owner thread](../.elmony/message-hollie-evidence/founder-horse-owner-unread.png), [Coach dedicated Messages](../.elmony/message-hollie-evidence/coach-dedicated-message-hollie.png).

Intercepted browser results prove UI routing, handlers and displayed mock state; they do not prove SQL enforcement, hosted delivery, real JWTs or live persistence.
No disposable SQL has run for this revision; [suite preparation](message-hollie-suite-preparation.json) remains PREPARED_NOT_EXECUTED.
