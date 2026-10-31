# HKA messaging: isolated local security test report

Date: 2026-10-31. Authorisation: disposable local PostgreSQL testing only.

**Overall: FAIL — 137 of 140 SQL assertions passed; three failures identify one rollback drift defect. Do not request live deployment approval until corrected and retested.** Both submitted SQL scripts compiled and executed successfully, including their unchanged transaction boundaries in a separate committed local cycle. No live migration, live mutation, permission change or deployment occurred.

## Evidence and execution

Canonical run: `1793455069470`; [machine-readable receipt](founder-messaging-evidence/isolated-run.json).

| Execution | Result |
| --- | --- |
| Existing migration/permission suite | **PASS: 98/98** |
| Additional adversarial cases | **FAIL: 30 PASS, 3 FAIL / 33** |
| Separate committed migration/send/rollback cycle | **PASS: 9/9** |
| Total SQL assertions | **137 PASS, 3 FAIL / 140** |
| Source/catalog/conversation regressions | **PASS: 14/14**; [receipt](founder-messaging-evidence/source-checks.json) |
| JavaScript harness parsing | **PASS: 7 files** |
| Application compilation | **PASS**; output confined to `.elmony/founder-local-security-build`, not published |
| Disposal | **PASS**; test container removed, including its local data |

Raw SQL output: [baseline policies](founder-messaging-evidence/docker-1793455069470-baseline-policies.log), [98-case suite](founder-messaging-evidence/docker-1793455069470-suite.log), [adversarial cases](founder-messaging-evidence/docker-1793455069470-additional-cases.log), [transaction cleanup](founder-messaging-evidence/docker-1793455069470-transaction-cleanup.log), [committed migration](founder-messaging-evidence/docker-1793455069470-committed-migration.log), [committed send](founder-messaging-evidence/docker-1793455069470-committed-send.log), [committed rollback](founder-messaging-evidence/docker-1793455069470-committed-rollback.log), and [post-rollback assertions](founder-messaging-evidence/docker-1793455069470-committed-rollback-checks.log).

Older numbered logs represent earlier local harness iterations; the canonical run above supersedes their execution status. The submitted migration and rollback were not edited.

## Isolation and fixture provenance

- PostgreSQL **17.11**, using pre-existing image `public.ecr.aws/supabase/postgres:17.11.0.003`; exact image/container IDs are in the receipt.
- Local Docker named-pipe daemon; remote Docker-host overrides refused. Container network `none`, no published ports, no host bind mounts, PostgreSQL data under disposable `/tmp`.
- Only a generated `hka_messaging_security_<run>` database was used. There were **17 synthetic accounts**, reserved `example.invalid` email addresses and synthetic message bodies. No real account rows, passwords, student conversations or deployment credentials were read or copied.
- Connected Supabase tools were used only for read-only table/function metadata. No SQL execution or deployment tools were called.
- The existing 98-case suite and adversarial suite each ran inside an outer transaction that rolled back. The separate committed cycle then executed both complete proposal files unchanged, preserving their own BEGIN/COMMIT statements. Container removal disposed of that committed synthetic data.
- Fingerprints compare every reconstructed public HKA table **and synthetic auth.users** immediately before/after migration and rollback. No unexpected row changes occurred.

## Coverage outcomes

| Requirement | Result and evidence |
| --- | --- |
| Founder messaging without coach assignments | **PASS.** Sends and replies with Students, Coaches, Guardians, Horse Owners and consented minors; NULL student scope supported for adult non-Students. |
| Founder privacy | **PASS.** Founder cannot read unrelated private Coach/Guardian or Coach/Student threads before or after rollback. |
| Assigned Coach restrictions | **PASS.** Assigned adult Student allowed; unrelated Student and spoofed child scopes denied; assignment revocation prevents new sends while participant history remains. |
| Minor Coach consent | **PASS.** Assignment alone insufficient: approved, unrevoked link plus Founder-approval and guardian-consent timestamps required. Individually missing timestamps/status rejected. |
| Multiple Guardians | **PASS.** Both Guardians can oversee child-participant Coach/Founder messages. Neither can read the other's private adult-to-adult Coach DM. Child-scoped Founder/Guardian adult DM remains private. Pending/revoked Guardian loses oversight. |
| Account activation | **PASS.** Suspended, email-unverified, pending-purpose and revoked-purpose accounts blocked. Suspended Guardians cannot activate the child; another valid approved Guardian preserves activation. |
| Multi-role permissions | **PASS.** Durable authorised purposes survive every approved dashboard choice for Founder, Coach and Guardian. Revoked Founder purpose cannot preserve direct privileges through another approved role. |
| Founder/minor and minor Horse Owner | **PASS for implemented gates.** Approved adult Guardian/activation consent required regardless of dashboard; consent revocation denies Founder sends. Business interpretation of consent remains pending below. |
| Known adult with missing auth-metadata DOB | **PASS.** Authoritative profile DOB allows assigned-Coach messaging without guardian consent. Editable auth-metadata DOB cannot turn a minor into an adult. |
| Missing authoritative profile DOB | **PASS for fail-closed restriction.** Controlled local NOT NULL relaxation demonstrates unknown age remains consent-gated; approved Student purpose alone insufficient. This does not establish a missing-DOB adult exception. |
| Sender identity and message state | **PASS with enabled guard.** Sender spoofing, fabricated read receipts, message-field changes, deletion and whitespace bodies denied; creation/read timestamps use server time; oversight cannot mark another recipient's message read. |
| Contact API and helper privileges | **PASS locally.** Public API remains invoker; privileged helpers retain postgres ownership and empty search paths; arbitrary role helper, anonymous schema/API and client snapshot access denied; caller-bound send helper refuses impersonation. |
| Migration preflight | **PASS.** Same-name SELECT/INSERT expression widening, changed role targets and added permissive policy rejected. Reconstructed baseline policies match the embedded exact definitions. |
| Restrictive rollback | **PASS under expected installation state.** No global Founder reads or cross-Guardian exposure; NULL-scope history preserved; independent Coach/family messaging continues. Accidental anonymous SELECT/body UPDATE grants removed. |
| Rollback drift checks | **PARTIAL.** Helper ACL/owner/body changes, missing trigger and replay rejected; **disabled trigger not detected**. |
| Data preservation | **PASS within reconstructed fixture scope.** Profiles, roles, messages, assignments, Guardian consents, link records and synthetic auth users retain identical fingerprints across both SQL scripts. |

## Failing finding: disabled trigger survives rollback

**Reproduced defect, three assertions failing:**

1. `rollback rejects disabled immutable-message trigger`
2. `rollback does not leave immutable-message trigger disabled`
3. `rollback preserves read-receipt immutability after disabled-trigger drift`

The installation snapshot and rollback preflight compare `pg_get_triggerdef()` text. In the tested database, disabling `hka_message_guard_write` changes `pg_trigger.tgenabled` without changing that definition text. Consequently, rollback preflight accepts the changed installation and full rollback leaves the guard disabled.

The synthetic reproduction first marks the child's message read, disables the guard as the database owner, executes the full rollback, and then switches to the real `authenticated` recipient role. That recipient can set `read_at=NULL`, contrary to the promised immutable read state. The test explicitly observes the disabled trigger and cleared receipt before reverting its savepoint.

**Threat prerequisite:** prior privileged trigger disabling. This does not show that an ordinary client can disable the trigger or read unrelated conversations; the privacy assertions still pass. It demonstrates that the rollback's promised fail-closed installation check misses meaningful trigger-state drift.

**Required correction before deployment review:** snapshot/compare trigger enable state as well as its definition, and reject rollback if the required message guard is absent or not in its reviewed enabled state. Revise the proposal files under separately authorised correction scope, then rerun these failing cases and the complete suite against the new hashes. No SQL proposal was changed during this testing-only authorisation.

## Remaining approval gates and limits

1. **Rollback defect:** correct and retest the trigger-state check above.
2. **Founder/minor consent scope:** database tests establish enforcement of existing activation consent and oversight, not that this consent legally/operationally authorises Founder direct messaging. Safeguarding owner must confirm that interpretation or require a separate approved consent workflow.
3. **Missing-DOB adults:** current profile schema requires DOB; there is no established independent adult-attestation field. Testing confirms safe unknown-age restrictions. An adult exception cannot be certified without an authoritative verification source and separately reviewed implementation.
4. **Private schema exposure:** SQL ACL tests pass, but dashboard-managed Data API/GraphQL exposure is not reproduced here. Confirm `hka_messaging` is absent from exposed schemas before any live approval.
5. **Schema fidelity:** seven messaging-related tables were reconstructed from fresh read-only column/policy metadata, same-day captured constraints/grants and repository SQL. Six helper bodies were refreshed; `hka_coaches` and `hka_has_purpose` came from repository migration after the read-only connector reached its exploration limit. `auth.users`/`auth.uid()` are minimal local Supabase-compatible fixtures; the ancillary `hka_files` table is a policy dependency stub. This is **not a complete current Supabase schema restore** and cannot prove unrelated triggers, extensions or application tables.
6. **Hosted acceptance:** browser entry points, PostgREST/GraphQL schema configuration, real JWT issuance/validation, realtime delivery and designated real-account UI/API acceptance remain untested. Local claims with actual SQL `authenticated`/`anon` roles prove database policy behavior, not hosted identity validation.
7. **Live deployment remains unauthorised.** No request for live approval is made while these gates remain open.

## Reproduction and artifact identity

[Docker runner](../supabase/tests/founder_messaging/run-docker.cjs), [schema reconstruction](../supabase/tests/founder_messaging/local-schema.cjs), [synthetic fixtures](../supabase/tests/founder_messaging/fixtures.sql), [additional adversarial cases](../supabase/tests/founder_messaging/additional-cases.cjs), [disabled-trigger reproduction](../supabase/tests/founder_messaging/disabled-trigger-cases.cjs), [committed cycle](../supabase/tests/founder_messaging/committed-cycle.cjs), and [read-only metadata receipt](founder-messaging-evidence/local-schema-metadata.json).

Run the Docker harness only within valid local-testing approval, with `HKA_APPROVE_ISOLATED_SQL=FOUNDER_APPROVED_LOCAL_ONLY`, using `node supabase/tests/founder_messaging/run-docker.cjs`. It prepares the existing suite, verifies local Docker isolation, constructs synthetic schema/accounts, executes tests, records failures, removes its container, and exits nonzero while the defect persists. It never imports project env files or contacts Supabase.

Unchanged proposal SHA-256 values:

- Migration: `86a4c991c4db732863a10fd89c03d51a0c21c86a0b76ea2107a1138b936f6026`
- Rollback: `9e32f84be1051552e32eb58c03d999ccf9165730040fcb749f89409da0a1f941`

Exact tested harness, fixture, metadata and generated-suite hashes are recorded in the canonical receipt; [current status](founder-messaging-evidence/isolated-status.json) supersedes the earlier unexecuted status.
