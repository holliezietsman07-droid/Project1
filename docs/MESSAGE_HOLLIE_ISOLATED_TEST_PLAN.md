# Message Hollie: isolated test plan

Status: PREPARED, NOT EXECUTED. Separate Founder approval is required before creating test schema, inserting fixtures, applying forward SQL, or running rollback in any disposable database. Connected project `sqaydpbqycvaictieafk` remains pending.

## Exact review artifacts

Use [SHA-256 manifest](message-hollie-checksums.json), [forward proposal](../supabase/proposals/202611060001_message_hollie.sql), [rollback](../supabase/proposals/202611060001_message_hollie.rollback.sql), [runner](../supabase/tests/founder_messaging/run-message-hollie.cjs), [prepared suite](../.elmony/message-hollie-security-suite.sql), and [schema reconstruction](../.elmony/message-hollie-local-schema.sql). The [preparation receipt](message-hollie-suite-preparation.json) distinguishes source proposal, synthetic executable migration, suite and schema hashes.

The live proposal deliberately contains `REPLACE_WITH_HOLLIE_AUTH_USER_UUID`: Founder has not supplied their designated Auth UUID. This token aborts execution; it is never replaced by an arbitrary Admin, name, email, browser state or first directory row. Before connected approval, insert Founder-confirmed UUID, regenerate hashes, and obtain approval of that exact bound file.

The isolated suite substitutes only `f1000000-0000-4000-8000-000000000001`, creates 18 synthetic accounts including a second authorised Admin, and never modifies the reviewed proposal. Browser fixtures use separate `10000000-...` IDs; neither set identifies a real account.

## Approval scope requested

Approve only the exact manifest-listed schema and generated suite on one newly created local disposable PostgreSQL 17 database named `hka_messaging_security_<run_id>`. Scope includes synthetic schema setup, send/reply/privacy checks, fault-injection savepoints, restrictive rollback, raw result capture, and removal of that disposable database. It does not authorise connected-project SQL, deployments, real accounts/messages, importing application rows, or changing live permissions.

Provide or identify the approved local disposable target separately; no credentials belong in these artifacts. No approval is inferred from environment variables or prior runs.

## Execution after separate approval

1. Record Founder approval, target name, database engine/version, run ID and current hashes. Verify local loopback endpoint, empty disposable database and absence of remote forwarding; use a local container with external networking disabled. Do not use the October Docker runner, which targets a superseded proposal.
2. Apply only the hashed schema reconstruction to that empty disposable database as postgres, with psql startup files disabled and stop-on-error enabled. This schema-only reconstruction uses saved read-only metadata and synthetic auth helpers; it is not a full Supabase clone.
3. Run `node supabase/tests/founder_messaging/run-message-hollie.cjs` only within this explicit approval. Runner requires `HKA_APPROVE_ISOLATED_SQL=FOUNDER_APPROVED_LOCAL_ONLY` and `HKA_ISOLATED_DATABASE_URL` identifying loopback postgres on the approved `hka_messaging_security_*` database. It rejects other hosts, names, users and connection overrides, strips libpq environment overrides, and rejects pre-existing application/auth rows.
4. Require all 128 assertions to pass. Generated suite uses one outer transaction and rolls its fixtures/migration/rollback back at completion. Capture stdout, stderr, exit status and assertion count; the runner writes `docs/message-hollie-isolated-run.json`. Preserve failure evidence and stop on unexpected errors.
5. Capture exact contacts, unread saved row, recipient-only read receipt, reply and row fingerprints before/after rollback. Review every denial, schema/ACL drift rejection and retained history. Do not treat earlier October results or mocked browser traffic as results for this revision.
6. Remove only the verified, approved disposable database/container; record cleanup. Present send, reply, privacy and rollback results to Founder. Keep connected project pending until those results are reviewed and a separate connected-project approval names final bound SQL and hash.

Preparation-only command `node supabase/tests/founder_messaging/run-message-hollie.cjs --prepare-only` writes local schema/suite/receipt and never opens a database connection.

## Required assertions

- Designated Founder is account 1 on every authorised dashboard; Admin 18 never inherits Founder status, global directory access or unrelated history.
- Member/second Admin contacts identify account 1 only. Revoking or suspending account 1 never redirects to Admin 18.
- Adult Horse Owner has only Horse Owner purpose despite Student presentation role: exact recipient 1, `student_id=NULL`, exact body `Adult Horse Owner exact message to Hollie`. Reject invented self Student scope and Admin 18 recipient.
- Founder receives that exact row with `read_at=NULL`; exact NULL-scoped reply `Hollie exact Horse Owner reply` reaches Horse Owner unread. Only recipient marks their own receipt.
- Founder has no global access to other participants' messages; unrelated Admin/Coach/member reads and sends fail. Guardian oversight remains limited to linked minor participants; adult private conversations remain private.
- Existing Coach assignments, minor activation consent, guardian links and revocations remain enforced; bodies/participants/timestamps/deletes and forged read INSERTs remain denied.
- Rollback rejects changed Founder UUID/function/ACL, altered policies and trigger drift; valid rollback preserves row fingerprints, exact NULL-scope history and authorised Coach messaging while disabling direct sends/directory. Admin 18 gains no access after rollback.

## Browser proof and remaining limits

Run [browser harness](../.elmony/message-hollie-browser.cjs) against local Vite on port 8080. All HTTPS traffic is intercepted, websocket connections to Supabase are blocked, and accounts/messages are in memory. Fixture data places another Admin before Hollie and models adult Horse Owner NULL scope. Every outgoing payload must match exact sender, recipient, scope and body.

Require visible Message Hollie entry, exact Horse Owner send, unread Horse Owner row inside Founder Dashboard → Messages before opening that thread, exact Founder reply and Horse Owner refresh, second Admin's Message Hollie behavior, and actual Coach sidebar Messages navigation followed by its dedicated Message Hollie button and exact send. Retain dashboard-switch, mobile, missing-backend and denied-send/draft checks.

[Browser receipt](../.elmony/message-hollie-evidence/results.json) and screenshots are local UI proof only. Real RLS execution, hosted JWT validation, deployed RPC behavior, persistence, realtime delivery and actual Founder-account acceptance remain unproven until separately authorised testing. No connected release follows automatically from any passing local result.
