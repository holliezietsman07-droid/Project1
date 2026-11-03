# HKA Founder messaging deployment readiness

Date: 2026-11-03 UTC. Target: `sqaydpbqycvaictieafk`.

**NO-GO: neither outstanding prerequisite is fully satisfied.** Historical backups cannot recover current messaging; fresh metadata comparison is partial because Elmony limited inspection and the read-only SQL request timed out. No live migration, rollback, application deployment, permission change, account change or application-row mutation was performed. Local disposable restoration was authorised in this request.

| Prerequisite | Outcome |
| --- | --- |
| Current, restorable backup | BLOCKED: latest files are dated 2026-10-26 and omit current messaging and durable-role/link tables. No authenticated export connection is available. |
| Isolated restore | FAIL for historical four-part set on clean PostgreSQL; managed-role prerequisites are absent. No successful recovery is claimed. |
| Fresh schema/policy verification | PARTIAL: seven table definitions, 13 policy expressions and five helper bodies match reviewed evidence; exact role targets, effective grants and remaining catalog checks are unverified. |
| Founder activation | NOT APPROVED. Safeguarding decision, completed recovery proof and authorised hosted acceptance remain gates. |

## Reviewed artifacts remain unchanged

- [Migration](../supabase/proposals/202610310001_founder_direct_messaging.sql): SHA-256 `b0e363dc51e8eae1ec82dad37a6c49ced9d58dcefa9de0d8bfd3f6cc9f51905d`.
- [Restrictive rollback](../supabase/proposals/202610310001_founder_direct_messaging.rollback.sql): SHA-256 `30b4605ba65ac98fb797a8343a58538d8b2f39d14f61261cf49273a877e6c97d`.

Both match the [reviewed compatibility report](FOUNDER_MESSAGING_COMPATIBILITY_CHECK.md) and [review receipt](founder-messaging-evidence/final-compatibility-review.json). No verified incompatibility requiring SQL correction was found in observed metadata; unobserved fields cannot be treated as matching. The existing 183 local security assertions were not repeated or reclassified as full database recovery or hosted acceptance.

## 1. Backup date, coverage and integrity

Inspected existing [backup instructions](../HORSE_MANAGEMENT_BACKUP_PREPARATION.md) and every SQL file in `C:\Users\Hollie\HKA-Private-Backup` and its dated backup directories. [Structural audit and SHA-256 inventory](founder-messaging-readiness-evidence/backup-audit.json) contain filenames, dates, table/column names and aggregate counts only.

| Set | Last file modification, UTC | Parts present |
| --- | --- | --- |
| Root set | 2026-10-24 07:59:02 | roles, schema, data, auth-data |
| pre-horse-organiser-20261026-064025 | 2026-10-26 04:46:48 | roles, schema, data, auth-data |
| pre-document-007-2026-10-26 | 2026-10-26 08:02:04 | schema, data |
| pre-care-008-2026-10-26 | 2026-10-26 09:32:24 | schema, data |
| pre-email-reminders-2026-10-26 | 2026-10-26 14:07:28 | schema, data |

These are filesystem modification times, not independently verified database snapshot times. Latest four-part candidate spans 04:42:48–04:46:48 UTC on October 26; no shared exported snapshot was established. Latest files of any set are more than seven days old at this review.

| Required recovery coverage | Evidence and limitation |
| --- | --- |
| Database schema and data | Historical public schema/functions/policies/grants exist. No current full-database archive, verified provider backup, PITR restore point or common-snapshot manifest is available. |
| Existing messages and read receipts | Every inspected schema lacks `public.hka_messages`; every data file lacks its COPY/INSERT section. Current messages and `read_at` receipts are not recoverable from these sets. |
| Identities and role relationships | Four-part sets contain auth.users/auth.identities data and profile data, including sensitive authentication material. They lack current hka_account_roles schema/data. Auth service configuration and managed auth schema are not supplied by these SQL sets. |
| Guardian consent and coaching assignments | Older hka_guardians and hka_coach_students schemas exist; COPY-based sets record empty relationship tables at their historical point. No current relationship-state proof exists. hka_link_requests and hka_student_link_codes schema/data are absent across all sets. |
| Permissions and database functions | Historical policies, grants and public functions exist. roles.sql alters existing anon/authenticated/authenticator roles rather than provisioning the complete managed role baseline. Current function ACLs, role memberships, signup trigger and storage customisations are not established by these backups. |
| Storage database references | The October 26 four-part data file has two storage.objects metadata rows and hka_files schema/data. Paths and content were not emitted. Current reference completeness is unknown. |
| Storage object files | No matching binary export, object manifest or object hashes found in inspected backup sets. Database metadata alone cannot recreate files. |

The COPY-based data.sql files already contain all 26 auth COPY sections also present in their separate auth-data.sql. Blindly restoring both files would reload overlapping tables, risking duplicate keys or inconsistent identity state. Future restore must select each table exactly once; separate auth-data is not automatically an additional missing part.

All SQL files were readable and SHA-256 hashes were calculated. COPY blocks were terminated. Data dumps carry completion markers; schema/role exports lack that particular marker, which alone is not evidence of truncation. No prior checksum manifests were found, so new hashes establish today's byte fingerprints, **not historical integrity, consistency or restorability**. Schema/data timestamps differ; no common snapshot or current live row comparison was proven.

Existing backup-directory ACL lists only local owner, SYSTEM and Administrators with access; this inspection did not establish disk encryption, off-device retention or all ancestor controls. Original SQL files stayed in their existing private directory. No raw backup data, names, emails, credentials, message content or object paths were copied into project evidence or public logs.

### Why a fresh export could not be created

The linked project matches the target. Its cached pooler URL has **no password**. No database credential key exists in the project environment files inspected, process database-connection environment variables or standard PostgreSQL password file. App public Supabase variables exist and are not missing, but they are not database-export credentials.

No pg_dump, pg_restore, psql or Supabase executable was found on PATH; the already installed Docker PostgreSQL image does supply PostgreSQL tools. The missing prerequisite is an **authorised authenticated export connection or provider backup-download capability**, not another package installation. Elmony's available metadata/SQL tools do not provide a secure backup-file export. Exporting authentication/student rows through chat-returned SQL results would violate the requested handling restriction and was not attempted.

Required user/platform action: make existing authorised database-export access available through a secure local connection/service or Elmony integration flow, or supply a current provider backup through protected local storage. Do not paste passwords, connection URLs with secrets or student records into chat. No credentials were reset or requested from unrelated services.

## 2. Isolated restore rehearsal

[Actual rehearsal receipt](founder-messaging-readiness-evidence/historical-restore-rehearsal.json), executed at **2026-11-03 06:11:08 UTC**, used the latest four-part historical candidate unchanged. This was an actual backup-file attempt, distinct from the synthetic 183-assertion suite.

- PostgreSQL **17.11**, locally cached Supabase postgres image; no download or package installation.
- Disposable container with network **none**, no published ports, no host mounts or Docker volumes, database confined to tmpfs, Docker logging disabled.
- SQL supplied via stdin; raw diagnostics and statements withheld. Only phase status and SQLSTATE were retained.
- Clean initdb target had no auth/storage schemas or Supabase managed roles.
- **roles.sql failed with psql exit 3 / SQLSTATE 42704**: required pre-existing role objects were absent. schema.sql, data.sql and auth-data.sql were not attempted after this failure.
- Container removal was successful and separately confirmed. Production was never a restore target; no authentication/student data reached the failed restore phases.

This shows the supplied set cannot bootstrap a bare PostgreSQL instance by itself. It does **not** establish backup corruption or inability to restore onto an accurately provisioned Supabase baseline. No full schema load, identity load, message preservation, file recovery, login, RTO or RPO was validated.

### Required recovery proof before activation

1. Obtain a **new** dated backup in protected, access-restricted, encrypted local storage. Record target project, UTC snapshot time, PostgreSQL/tool versions, exact exclusions, byte sizes and SHA-256 manifest. Keep credentials outside arguments/logs/repository.
2. Prefer one consistent logical database snapshot covering current public application tables, identities, consent/assignment/link tables, message bodies/receipts, functions, policies, ACLs, sequences and migration history. If tooling separates archives, use a shared snapshot or an explicitly controlled write pause; do not infer consistency from nearby timestamps. Verify actual coverage rather than relying on default CLI exclusions.
3. Inventory managed auth/storage customisations, public helper dependencies, role ownership/membership/default privileges, extensions, publications and settings. Use a matching fully initialised local Supabase baseline for managed schemas. Do not invent placeholder auth tables or broadly grant roles to make restoration appear successful.
4. Preserve storage files separately in private storage with a path/size/content-hash manifest tied to the database snapshot. Restore every referenced object; detect missing/orphaned references. Coordinate object writes with snapshot capture or reconcile their change window.
5. Restore only to a disposable, isolated local target. Suppress outbound services, webhooks and background jobs before importing data. Restore each table once, stop on first error, and retain redacted execution receipts. Explicitly review managed-schema/trigger handling rather than replaying all four old files blindly.
6. Validate primary/foreign keys and sequences, identities-to-profiles, durable role relationships, consent/coach assignments, all message fields and receipts, exact policies/grants/function definitions, signup/storage dependencies and reference-to-file integrity. Use private aggregate fingerprints/counts and authorised controlled login checks; never publish real records.
7. Record successful cleanup, elapsed recovery time, recoverable snapshot point, data/file deltas and any service configuration/key-management limitations. Capture another current cutover recovery point if writes occurred after rehearsal.

Supabase's [backup guidance](https://supabase.com/docs/guides/platform/backups) confirms database backups exclude Storage object bytes. Its [restore guide](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) distinguishes managed-schema customisations and migration history. Provider secrets, encryption keys and service configuration require protected recovery handling; no provider restore or configuration change is authorised here.

## 3. Fresh read-only Supabase comparison

[Raw metadata receipts](founder-messaging-readiness-evidence/fresh-metadata-receipts.json), saved **2026-11-03 06:12:09 UTC**, preserve actual tool results. Helpers do not report database capture timestamps, so that time is receipt-save time. [Machine comparison](founder-messaging-readiness-evidence/fresh-comparison.json) compares complete returned expressions/bodies to the reviewed compatibility snapshot.

| Check | Fresh result |
| --- | --- |
| Connected target | Project sqaydpbqycvaictieafk confirmed through Elmony. |
| Seven public dependency tables | hka_messages, hka_profiles, hka_account_roles, hka_guardians, hka_coach_students, hka_link_requests, hka_student_link_codes present; RLS enabled; ordered column definitions exactly match reviewed snapshot. |
| Messaging columns and age | Seven message columns match; student_id remains NOT NULL before installation. Profile birth_date is DATE NOT NULL. Protected-column update privileges remain unverified. |
| Messaging policy definitions | Exactly three returned policies. Names, SELECT/INSERT/UPDATE commands, permissiveness and full USING/WITH CHECK expressions match reviewed baseline byte for byte. |
| Dependency policies | All 13 returned policies across seven tables match reviewed expressions/commands/permissiveness. |
| Policy role targets | **UNVERIFIED**: metadata helper does not return roles. Previous authenticated targets are historical evidence, not a fresh assertion. |
| Public triggers | No non-internal triggers returned for the seven requested public tables. Internal FK triggers and auth.users signup trigger were not refreshed. |
| Five helper definitions | hka_role, hka_admin, hka_active, hka_teach and hka_view_student definitions match exactly. Owner, direct ACL and effective EXECUTE privileges are omitted by helper. |
| Remaining helper definitions | hka_signup_profile, hka_has_purpose and hka_coaches reads returned **“Elmony context exploration budget reached.”** No retries were made. Names exist in discovery; bodies were not freshly verified. |
| Public installation collision | Discovery lists no public hka_message_% function. Private hka_messaging schema existence is not exposed by discovery and remains unverified. |
| Effective PostgREST exposure | At **06:13:45 UTC**, zero-row GET probes with hka_messaging and an invalid profile both returned **406/PGRST106**. Private schema is rejected by current API profile selection. This response does not enumerate all allowed schemas. |
| Complete grants, owners, constraints, indexes, migration history, auth.uid, auth trigger, GraphQL, role memberships and migration-owner privileges | **UNVERIFIED this turn**; do not reuse earlier passing claims as fresh results. |

[API receipts](founder-messaging-readiness-evidence/fresh-api-exposure.json) contain status/code/message only; no application rows were requested. These probes do not establish GraphQL privacy, hosted JWT validation or actual contact-RPC execution.

One bounded catalog request using an explicit READ ONLY transaction was submitted through authorised Elmony SQL access. It returned **no completion receipt**, timing out after 300 seconds. [Failure receipt](founder-messaging-readiness-evidence/catalog-request-status.json) records the observed outcome; execution success cannot be inferred. There was no retry. The metadata phase stopped rather than bypassing the limit or inventing remaining results.

[Prepared catalog SQL](founder-messaging-readiness-evidence/read-only-catalog-query.sql) preserves the submitted first transaction plus a clearly marked **unexecuted** supplementary transaction for missing dependencies. No proposal or live mutation is embedded. Required access is a working, bounded **read-only catalog session** able to inspect pg_policies roles, grants/ACLs, constraints/indexes, helper owners/bodies, auth trigger/uid, supabase_migrations history, API/GraphQL exposure and migration-owner prerequisites. Elmony must restore that inspection capacity, or an existing authorised database session must return those metadata results securely.

## 4. Compatibility and remaining safeguarding/acceptance gates

No drift was found in observed fields. Full migration compatibility is **not freshly established** until missing catalog fields are verified; no compatibility correction was justified or made.

Frontend retains the existing Supabase singleton and zero-argument hka_message_contacts RPC. Current useMessaging rechecks server contact grants before INSERT, sends nullable student scope for adult peer messages, writes only recipient read_at and handles unavailable RPC/errors without claiming success. [Existing compatibility evidence](FOUNDER_MESSAGING_COMPATIBILITY_CHECK.md) already covers ten-column RPC projection, NULL scope and restrictive rollback controls. No messaging design, authentication stack or client was replaced.

Still required:

- Safeguarding owner must explicitly approve treating existing guardian activation consent as sufficient for Founder/minor direct messaging. There is no separately recorded Founder-DM consent. External Coach consent remains independent and mandatory where applicable.
- Age must use protected authoritative profile DOB, never dashboard role, editable metadata or a sentinel date. Any genuinely missing-DOB adult attestation requires its own reviewed solution; no user correction is authorised here.
- Confirm fresh effective protection against client updates of DOB/role/suspension, private-schema/API boundaries, role targets, owner ACLs and actual hosted migration-owner privileges.
- Full restored Supabase environment and hosted execution differ from the existing partial synthetic fixture; 183 local assertions do not resolve those differences.
- Existing live legacy SELECT expressions still contain broad Admin/guardian access; this report does not remediate live privacy while mutations remain forbidden.
- No authenticated hosted message, receipt write, JWT issuance, role/consent change or browser acceptance occurred. Actual login/role account availability is unproven. Acceptance must use designated authorised test accounts and test conversations; do not change existing students or relationships to manufacture coverage.

### Authenticated acceptance matrix — prepared, not executed

| Identity | Required positive evidence | Required negative evidence |
| --- | --- | --- |
| Founder | Visible inbox/directory; direct send/reply with eligible Student, Coach, Parent and Horse Owner without coaching assignment; durable Founder authority survives dashboard switching. | Cannot read unrelated private adult conversations, impersonate sender, change immutable fields or send to ineligible/suspended/unverified members. |
| Student | Eligible Founder contact; authorised assigned-Coach and consented family messages; own persistent history and own recipient receipt. | Unrelated users/Coaches denied; minor requires qualifying guardian activation plus separate Coach consent for Coach path; cannot mark someone else's receipt. |
| Coach | Assigned adult Student or properly consented minor path; Founder contact and replies; appropriate child-linked Guardian path. | No global directory, unrelated Student or expired/revoked relationship sends; cannot use dashboard switching to gain durable authority. |
| Parent / Guardian | Approved, consented linked-child oversight when child participates; own Founder/Coach conversation privacy. | No other guardian's private adult DMs merely sharing child scope; no child's recipient receipt mutation; revoked link loses oversight. |
| Horse Owner | Eligible adult direct Founder conversation uses NULL student scope; reply/history/read receipt persist. | No arbitrary user-to-user/Coach access; minor or unknown-age account cannot bypass guardian gate through owner purpose. |
| Anonymous / tampered requests | Honest sign-in/error state, retained unsent draft and no false delivery indication. | No contacts/history/sends, sender/scope spoofing, content rewrite, delete or receipt clearing; test only designated test data under separate permission. |

After separately approved activation, exercise visible entry point, contact search/selection, handler, confirmed persisted insert, second authenticated recipient reply, refresh/relogin history, read receipt, realtime or 15-second polling, failed request/draft retention and two-guardian privacy. Record redacted pass/fail receipts; no personal student information in shared evidence. Revocation/suspension fault injection belongs in isolated restoration unless later approval specifically permits controlled test-account changes.

## 5. Controlled activation and recovery plan

**Procedure only: do not execute under this request.**

1. **Close gates.** Require current restorable backup and storage evidence, completed fresh catalog comparison, safeguarding decision, named operator/recovery owner and approved acceptance identities/actions. Review any difference separately; preserve current SQL until correction is independently reviewed.
2. **Obtain explicit Founder approval.** Approval must name target project, exact migration hash, controlled window and permitted post-deployment test writes. If conditional emergency rollback is desired, approval must separately name its hash and failure triggers. No current approval covers those live actions.
3. **Capture cutover baseline.** Coordinate a write pause where feasible; no pause was applied here. Establish approved snapshot point and privately record row/receipt fingerprints, schema/ACLs, storage references and deltas. Recheck catalog immediately before activation; a prior-day report is insufficient.
4. **Execute migration exactly once.** Use reviewed postgres owner, BYPASSRLS/sufficient schema/auth privileges and origin replication mode. Preserve file's BEGIN/COMMIT, five-second lock timeout, 30-second statement timeout, exact policy guards and exposure checks. Do not wrap it in a second transaction, normalise expected policies, bypass a guard or replay other migrations.
5. **Record observed outcome.** Retain explicit execution/commit receipt and deployed artifact hash. Elmony SQL execution does not automatically update CLI migration history; do not fabricate a version record or infer installation solely from history. Inspect actual catalog after an uncertain response before any further action.
6. **Read-only postflight before acceptance.** Expect unchanged application rows/receipts; nullable student_id; exactly three authenticated strict message policies; private postgres-owned helpers; public SECURITY INVOKER ten-column contacts RPC; SELECT/INSERT plus UPDATE(read_at) only for clients; enabled origin-mode immutable-message trigger; protected installation snapshot; private schema absent from effective API/GraphQL exposure. Reconcile fingerprints with any explicitly permitted concurrent writes. Missing evidence is a stop condition.
7. **Run only approved hosted acceptance.** Use matrix above, real session JWTs and designated test conversations. Confirm database/API enforcement, not UI hiding alone. Do not create accounts, adjust consent/roles, delete records, deploy app code or broaden permissions without separate authorisation. Stop on safeguarding failure.
8. **Monitor and hand over.** Keep private recovery evidence, error outcomes and operator receipt. Broad availability requires completed acceptance, accepted remaining limitations and Founder release decision. No website deployment is bundled into database approval.

### Failure handling

- **Preflight, lock or statement failure before COMMIT:** stop. Transaction should abort; inspect catalog and application-data baseline to establish actual state. Do not weaken guards or retry blindly.
- **Timeout or missing commit receipt:** outcome is unknown. Fresh read-only inspection must distinguish uninstalled, fully installed and drifted states before choosing any next action.
- **Post-commit security/acceptance failure:** stop acceptance and involve Founder/recovery owner. Run restrictive rollback only under explicit prior conditional approval or new Founder approval; no emergency mutation authority is inferred.
- **Rollback drift rejection:** stop; inspect exact policy/helper owner/ACL/trigger differences and obtain separate reviewed remediation. Never disable the trigger, modify snapshot, restore legacy RLS or force the script through.
- **Data loss/full recovery:** restrictive rollback is not a database restore. Restore a proven backup first into isolated recovery infrastructure, compare post-snapshot deltas and storage files, and seek separate Founder approval for any production recovery/cutover. Do not overwrite live Supabase. RTO and data-loss window remain unmeasured until rehearsal succeeds.

### Restrictive rollback limitations

The reviewed rollback changes direct_enabled to false while retaining strict RLS, guard trigger, all helpers, contact RPC, installation snapshot, nullable student_id and existing message/receipt history. New platform-wide Founder sends/directory grants stop; approved assignment/family paths and eligible participant history remain. Founder threads can be history-only; frontend must retain can_message/directory_entry and NULL-scope support.

Rollback requires exact installed policies, helper definitions/owners/ACLs and trigger snapshot, including enabled O/origin guard. It rejects drift, disabled/replica guards and a repeated rollback. It does not restore pre-migration schema, global Founder reads, cross-guardian access or an older frontend. Re-enabling Founder direct messaging requires a separately reviewed forward change.

## Founder decision boundary

**Stop: no live database changes are approved.** Current action needed is secure export/recovery access and complete read-only inspection capacity; a successful current restore rehearsal and safeguarding/acceptance decisions must follow.

After all gates close, request explicit approval in this form:

> I approve applying only supabase/proposals/202610310001_founder_direct_messaging.sql, SHA-256 b0e363dc51e8eae1ec82dad37a6c49ced9d58dcefa9de0d8bfd3f6cc9f51905d, to sqaydpbqycvaictieafk in the agreed controlled window after reviewing current backup/recovery and complete fresh catalog evidence. Permitted designated-account acceptance actions and any conditional restrictive rollback approval must be listed explicitly. No existing student/role/consent changes, billing changes or website deployment are included.

This report requests the explicit Founder approval gate; it does not treat silence, local restore permission, earlier security passes or connected-tool access as approval.
