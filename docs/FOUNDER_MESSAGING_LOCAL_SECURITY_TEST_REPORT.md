# HKA messaging: isolated local security test report

## Current final compatibility retest — 2026-11-03

**PASS: 183/183 SQL assertions, 0 failures**, canonical disposable run `1793681834711` (108 migration/access/drift + 59 adversarial + 16 committed-cycle). Both complete proposal files are unchanged from the reviewed correction and pass against freshly captured hosted policy/dependency metadata.

All three current live policies target **authenticated**, with exact commands, permissiveness, USING and WITH CHECK expressions matching preflight. The earlier PUBLIC record is not the current baseline. Strict role drift checks remain intact; all three PUBLIC-target mutations are rejected locally.

Effective PostgREST exposure is **public, graphql_public**, confirmed by actual read-only 406/PGRST106 responses; hka_messaging is excluded. GraphQL resolver extension is absent and its public wrapper is a disabled-extension stub. Hosted owner privileges, auth UID/signup trigger, 19 recorded migration versions, seven required tables, 52 constraints and eight helpers were inspected read-only.

Local fixture corrections remove excess authenticated helper EXECUTE, refresh constraints/helpers and reproduce the original SELECT IN parse tree without weakening exact catalog comparison. Two real local SQL contact projections pass seven current frontend contract checks each; 14 source/React checks and production build pass; 11 harness files parse. Message/history/receipt fingerprints remain identical; enabled guard and all Founder/Coach/Student/Guardian restrictions remain effective. Container removed.

[Full compatibility findings and complete policy definitions](FOUNDER_MESSAGING_COMPATIBILITY_CHECK.md) · [hosted snapshot](founder-messaging-evidence/hosted-compatibility-snapshot.json) · [canonical execution receipt](founder-messaging-evidence/isolated-run.json) · [fixture comparison](founder-messaging-evidence/compatibility-comparison.json).

No live application rows, RLS or settings changed; no migration, rollback or deployment was applied to hosted Supabase. Hosted authenticated delivery/browser acceptance and safeguarding approval remain separate release gates.

## Historical trigger-correction report — 2026-10-31

The original report below retains historical run IDs and limitations. Current policy/dependency/exposure results and current execution totals above supersede overlapping historical claims.

Date: 2026-10-31. Authorisation: local proposal corrections and disposable local PostgreSQL retesting only.

**Overall: PASS — 173 of 173 SQL assertions passed; 0 failed. All three previously failed assertions now pass.** The migration and restrictive rollback were corrected locally and executed with their complete BEGIN/COMMIT boundaries in separate local sessions. No live Supabase changes or application deployment occurred. Hosted acceptance and the remaining release gates below are still open.

## Evidence and execution

Canonical corrected run: `1793456045139`; [machine-readable receipt](founder-messaging-evidence/isolated-run.json). PostgreSQL 17.11; 17 synthetic accounts.

| Execution | Result |
| --- | --- |
| Existing migration/permission suite | **PASS: 98/98** |
| Expanded adversarial cases | **PASS: 59/59** |
| Separate committed migration/rejection/rollback cycle | **PASS: 16/16** |
| Total SQL assertions | **173 PASS, 0 FAIL / 173** |
| Complete rollback with a pre-existing disabled guard | **PASS: rejected as expected**, psql exit 3; subsequent assertions verify no feature/data changes |
| Source/catalog/conversation regressions | **PASS: 14/14**; [receipt](founder-messaging-evidence/source-checks.json) |
| JavaScript harness parsing | **PASS: 7 files**; the modified adversarial file was checked again after its SQL fixture correction |
| Application compilation | Not rerun for this SQL/test/documentation correction; prior compilation result remains historical |
| Disposal | **PASS**; disposable container removed, including local PostgreSQL data |

Raw SQL output: [98-case suite](founder-messaging-evidence/docker-1793456045139-suite.log), [59 adversarial cases](founder-messaging-evidence/docker-1793456045139-additional-cases.log), [transaction cleanup](founder-messaging-evidence/docker-1793456045139-transaction-cleanup.log), [committed migration](founder-messaging-evidence/docker-1793456045139-committed-migration.log), [committed sends and trigger metadata](founder-messaging-evidence/docker-1793456045139-committed-send.log), [expected disabled-trigger rejection](founder-messaging-evidence/docker-1793456045139-committed-disabled-rollback-rejected.log), [rejection preservation checks](founder-messaging-evidence/docker-1793456045139-committed-rejection-checks.log), [normal committed rollback](founder-messaging-evidence/docker-1793456045139-committed-rollback.log), and [post-rollback metadata/receipt/privacy checks](founder-messaging-evidence/docker-1793456045139-committed-rollback-checks.log).

Historical run `1793455069470` recorded 137 PASS / 3 FAIL; its raw logs remain as the original defect evidence. Intermediate retest `1793455981924` stopped at an SQL quoting error in a newly added tampered-function fixture (126 assertions passed before that error); the fixture was corrected and the entire suite rerun successfully above. It was not a passing run. Both disposable containers were removed.

## Isolation and fixture provenance

- PostgreSQL **17.11**, using pre-existing image `public.ecr.aws/supabase/postgres:17.11.0.003`; exact image/container IDs are in the receipt.
- Local Docker named-pipe daemon; remote Docker-host overrides refused. Container network `none`, no published ports, no host bind mounts, PostgreSQL data under disposable `/tmp`.
- Only a generated `hka_messaging_security_<run>` database was used. There were **17 synthetic accounts**, reserved `example.invalid` email addresses and synthetic message bodies. No real account rows, passwords, student conversations or deployment credentials were read or copied.
- This correction/retest used no connected Supabase tools or network requests. Existing captured metadata was reused; all SQL execution occurred only inside the disposable local container.
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
| Rollback drift checks | **PASS.** Helper ACL/owner/body drift, missing/disabled/replica/ALWAYS/altered triggers, unsafe matching snapshot and replay rejected. Final catalog checks tested for both scripts. |
| Data preservation | **PASS within reconstructed fixture scope.** Profiles, roles, messages, assignments, Guardian consents, link records and synthetic auth users retain identical fingerprints across both SQL scripts. |

## Resolved finding: disabled guard accepted by rollback

The original three failed assertions shared one root cause: `pg_get_triggerdef()` does not contain `pg_trigger.tgenabled`. A disabled trigger therefore matched the prior definition-only snapshot.

| Original assertion | Expected | Original observation | Corrected retest |
| --- | --- | --- | --- |
| `rollback rejects disabled immutable-message trigger` | Preflight rejects disabled guard | Accepted (`was_rejected=false`) | **PASS:** rejected (`true`) |
| `rollback does not leave immutable-message trigger disabled` | Failed rollback attempt aborts; safe guard retained | Guard remained disabled (`D`) | **PASS:** attempted transaction aborts and returns to `O`; normal rollback also retains `O` |
| `rollback preserves read-receipt immutability after disabled-trigger drift` | Authenticated recipient cannot clear existing receipt | `read_at=NULL` was accepted | **PASS:** clearing raises SQLSTATE `42501`; complete row fingerprints remain identical |

The second/third regression cases now exercise the corrected failure contract: disable plus rollback runs in a subtransaction, expected rejection aborts that attempt, then normal rollback runs with the reviewed guard enabled. Separately, the committed test disables the guard in a prior session and runs the **complete rollback file** unchanged; psql exits 3 at preflight. A later session proves the direct feature and all rows are unchanged and the prior disabled state remains `D`. The test owner explicitly restores `O` before testing normal rollback. Rejecting unsafe drift does not silently repair a previously disabled installation.

### Local correction

- Both proposal files capture/compare trigger name, exact `pg_get_triggerdef()` text and `tgenabled` in the owner-only snapshot.
- Rollback additionally requires the exact reviewed `BEFORE INSERT OR UPDATE ... FOR EACH ROW ... guard_write()` wiring and `tgenabled='O'`, independently of the snapshot. Missing, disabled, replica-only, ALWAYS or altered wiring fails closed. A snapshot changed to match disabled state still fails.
- Both scripts verify actual catalog state before COMMIT, while holding the message-table lock. Final checks also compare the guard function definition, owner and ACL with the installation snapshot.
- Origin-mode execution is required (`session_replication_role='origin'`) so a replication session cannot bypass an ordinary enabled guard.
- Existing guard logic, strict participant/child-oversight RLS and recipient-only column grants remain. Rollback only freezes the direct feature and resets client grants; it never restores global Founder reads or cross-Guardian access.
- Synthetic fixtures now include a pre-existing receipt at `2020-01-01 00:00:00+00`. Whole-table fingerprints (including `auth.users`) cover migration, rejected rollback and successful rollback. An authenticated recipient's denied clear leaves that exact timestamp unchanged.

### Additional regression evidence

The expanded suite verifies missing/disabled/changed triggers, helper-definition/owner/ACL drift, unsafe matching snapshots, replica bypass, and each script's final checks. After rollback, authenticated updates to body, id, student scope, sender, recipient and creation time are denied **even with deliberately widened UPDATE grants** inside a reverted test savepoint, proving the retained guard is effective in addition to column ACLs.

The actual metadata query `SELECT tgname,tgenabled,pg_get_triggerdef(oid) FROM pg_trigger ...` returns `hka_message_guard_write | O | CREATE TRIGGER ... BEFORE INSERT OR UPDATE ...` after committed migration and after normal committed rollback. Full outputs are linked above.

Founder sends/replies without assignments, assigned-Coach/minor-consent restrictions, Student restrictions, both Guardians' oversight/privacy, revoked/suspended/unverified cases, NULL-scope history and restrictive rollback all pass in the full rerun. The committed cycle also proves rejected rollback preserves feature state and every row, then verifies normal rollback blocks new Founder direct sends without restoring unrelated conversation access.

## Remaining approval gates and limits

1. **Rollback defect resolved locally:** 173/173 SQL assertions pass against the revised hashes below. This closes the local correction gate only.
2. **Founder/minor consent scope:** database tests establish enforcement of existing activation consent and oversight, not that this consent legally/operationally authorises Founder direct messaging. Safeguarding owner must confirm that interpretation or require a separate approved consent workflow.
3. **Missing-DOB adults:** current profile schema requires DOB; there is no established independent adult-attestation field. Testing confirms safe unknown-age restrictions. An adult exception cannot be certified without an authoritative verification source and separately reviewed implementation.
4. **Private schema exposure:** SQL ACL tests pass, but dashboard-managed Data API/GraphQL exposure is not reproduced here. Confirm `hka_messaging` is absent from exposed schemas before any live approval.
5. **Schema fidelity:** seven messaging-related tables were reconstructed from fresh read-only column/policy metadata, same-day captured constraints/grants and repository SQL. Six helper bodies were refreshed; `hka_coaches` and `hka_has_purpose` came from repository migration after the read-only connector reached its exploration limit. `auth.users`/`auth.uid()` are minimal local Supabase-compatible fixtures; the ancillary `hka_files` table is a policy dependency stub. This is **not a complete current Supabase schema restore** and cannot prove unrelated triggers, extensions or application tables.
6. **Hosted acceptance:** browser entry points, PostgREST/GraphQL schema configuration, real JWT issuance/validation, realtime delivery and designated real-account UI/API acceptance remain untested. Local claims with actual SQL `authenticated`/`anon` roles prove database policy behavior, not hosted identity validation.
7. **Live deployment remains unauthorised.** No request for live approval is made while these gates remain open.

## Reproduction and artifact identity

[Docker runner](../supabase/tests/founder_messaging/run-docker.cjs), [schema reconstruction](../supabase/tests/founder_messaging/local-schema.cjs), [synthetic fixtures](../supabase/tests/founder_messaging/fixtures.sql), [additional adversarial cases](../supabase/tests/founder_messaging/additional-cases.cjs), [disabled-trigger reproduction](../supabase/tests/founder_messaging/disabled-trigger-cases.cjs), [committed cycle](../supabase/tests/founder_messaging/committed-cycle.cjs), and [read-only metadata receipt](founder-messaging-evidence/local-schema-metadata.json).

Run the Docker harness only within valid local-testing approval, with `HKA_APPROVE_ISOLATED_SQL=FOUNDER_APPROVED_LOCAL_ONLY`, using `node supabase/tests/founder_messaging/run-docker.cjs`. It prepares the existing suite, verifies local Docker isolation, constructs synthetic schema/accounts, executes tests, records failures, removes its container, and exits nonzero if a required phase/assertion fails. The expected disabled-trigger rejection is recorded as a successful negative test, with its nonzero psql exit and error retained. It never imports project env files or contacts Supabase.

Corrected, locally tested proposal SHA-256 values:

- Migration: `b0e363dc51e8eae1ec82dad37a6c49ced9d58dcefa9de0d8bfd3f6cc9f51905d`
- Rollback: `30b4605ba65ac98fb797a8343a58538d8b2f39d14f61261cf49273a877e6c97d`

Exact tested harness, fixture, metadata and generated-suite hashes are recorded in the canonical receipt; [current status](founder-messaging-evidence/isolated-status.json) supersedes the earlier unexecuted status.
