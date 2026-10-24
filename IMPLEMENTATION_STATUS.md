# HKA Equestrian — Web: implementation status

## Stage 4B Step 2 founder activation execution — 24 October 2026

- **Result — ABORTED, NOT ACTIVATED:** connected project sqaydpbqycvaictieafk and target Auth UUID f7c3e52e-4f5e-47d0-8139-b28cb296d526 matched the approval. Preflight verified Hollie Zietsman was confirmed, active, unsuspended and role student; project totals were three Auth users, three profiles, zero administrators and zero prior founder-activation audit entries.
- **Approved artifact — EXACT MATCH:** supabase/activation/202610220001_founder_role.sql retained approved SHA-256 EA017676B64E9B1C00822F84C2C6129DD7823BF1627AECA282B1E1DF60B8443B and targeted only the approved student-to-admin change plus its audit entry.
- **Execution failure:** the exact approved transaction raised Unexpected existing role: postgres because the PL/pgSQL variable name current_role collided with PostgreSQL CURRENT_ROLE. The exception occurred before UPDATE and INSERT; PostgreSQL aborted and rolled back the transaction.
- **Preservation and access:** no account, permission, profile, learning-history or other record changed. Hollie remains student, no administrator exists, Owner Dashboard remains inaccessible, and ordinary students remain excluded from administrator features by the unchanged role functions, RLS and application gate.
- **Required next action:** correct the prepared activation artifact and obtain fresh explicit approval before any retry; this turn stopped without attempting a different SQL operation.

## Stage 4B Step 2 founder activation approval packet — 24 October 2026

- **Status — PREPARED, NOT EXECUTED:** no role, permission, account, profile, learning, or other database record was changed during this review.
- **Connected project and identity — VERIFIED:** project sqaydpbqycvaictieafk contains existing Auth UUID f7c3e52e-4f5e-47d0-8139-b28cb296d526 joined one-to-one to active, email-confirmed, unsuspended adult profile Hollie Zietsman (masked email h***************@gmail.com). Current role is student; three Auth users and three profiles remain, with zero administrators.
- **Exact proposed role change:** public.hka_profiles.role for UUID f7c3e52e-4f5e-47d0-8139-b28cb296d526 changes from student to admin, followed by one hka_audit entry: Owner-approved founder bootstrap: administrator role assigned. No account is created, no UUID changes, and no other profile is targeted.
- **Approved artifact boundary:** [supabase/activation/202610220001_founder_role.sql](supabase/activation/202610220001_founder_role.sql), SHA-256 EA017676B64E9B1C00822F84C2C6129DD7823BF1627AECA282B1E1DF60B8443B. Its transaction locks and revalidates the exact profile, name, confirmed Auth identity, active status, and expected student/admin starting role before changing only role and writing the audit record. Any mismatch aborts and rolls back.
- **Record preservation:** Auth user, profile ID, name, birth date, timezone, suspension state, membership, avatar, notification preferences, creation timestamp, identity, learning history, horses, files, and every other existing record remain untouched. Transaction contains no account creation, deletion, replacement, or update to another UUID.
- **Privilege boundary — VERIFIED:** authenticated and anonymous roles have no UPDATE privilege on hka_profiles.role; anonymous cannot call hka_set_role. Authenticated users can reach hka_set_role, but its security-definer body requires the caller already be admin, rejects self-change, restricts roles, and audits successful changes. Signup accepts only student or guardian and coerces any other requested role to student, so ordinary students cannot self-elevate.
- **Access effect:** existing admin role supplies administrator and coaching permissions through hka_admin, hka_teach, and related RLS helpers. Application maps admin to Founder · Owner · Head Coach, routes /dashboard to /dashboard/admin, passes the admin-only access gate, and renders OwnerDashboard after profile refresh or next authenticated session.
- **Approval gate:** reply exactly **Approve Stage 4B Step 2 founder activation** to authorize this exact artifact against project sqaydpbqycvaictieafk. Until then, activation remains unexecuted.

## Stage 4B Step 1 production deployment — 24 October 2026

- **Deployment — SUCCEEDED:** the unchanged supabase/migrations/202610220002_stage4b_operations.sql transaction was applied to connected Supabase project sqaydpbqycvaictieafk. The deployed artifact matched approved SHA-256 AC159ACB0C6126FA408FB4FF518FABA4C5E8043A8400A26D36C27CC702B3D76E.
- **Pre-deployment gates — PASS:** connected project ID matched approval. All four verified off-repository backups remained readable at their recorded sizes and SHA-256 hashes: schema.sql, roles.sql, data.sql, and auth-data.sql.
- **Database verification — PASS:** four Stage 4B tables exist with RLS enabled; all 12 migration-scope policies, four indexes, two triggers, seven secured functions, and validated appointment-overlap constraint are present. New tables expose zero anonymous privileges. All seven security-definer functions have fixed empty search paths and zero anonymous execution; trigger functions are not directly executable by authenticated users, while five intended RPC/file helpers are.
- **Permission verification — PASS:** authenticated users may update allow-listed profile and horse fields but cannot update profile role, membership tier, or horse ownership. There are zero unvalidated public foreign keys and zero profile/Auth orphans.
- **Data preservation — PASS:** pre/post counts match: three Auth users, three profiles, and unchanged zero-row counts for Storage objects and existing courses, enrolments, progress, horses, training records, files, appointments, submissions, attempts, and transactions. All three profiles remain students; administrator count remains zero. Founder/Owner elevation was not executed.
- **Scope:** no website source, design, logo, horseshoe icon, existing feature, or founder activation file was changed.

## Final backup restoration verification — 24 October 2026

- **Evidence source:** successful command results are preserved in local Codex session log C:\Users\Hollie\.codex\sessions\2026\10\24\rollout-2026-10-24T10-39-31-01a16d10-ab9f-7130-b620-2823a8df83be.jsonl, principally ordinals 398, 405, 428, 458, 465, 472, 486, 493, 623, 658, 667, 674, 681 and 688 (08:52–09:01 UTC). Earlier failed compatibility attempts in the same log are superseded by the successful version-matched run described below.
- **Backup artifacts:** C:\Users\Hollie\HKA-Private-Backup contains readable, nonzero schema.sql (85,811 bytes; SHA-256 BC0BB6BC9AADD70CCAA193910998599417BF790C4028F8D649657DF3B3A98A09), roles.sql (370 bytes; 168A95A9C745AF5ED4679751F90419AC9DC434240A213B03E32A06D5664C2308), data.sql (24,292 bytes; 9D6BB5857DB65A6FA2EC6D6060BFDC3E15125C54653A58D8799F0B99213F3765) and auth-data.sql (13,855 bytes; D4478FBD160F25FDD928A89AD788B0BA6C1A2B486D946496F08CD46EC5DB7468). Tests mounted this directory read-only; no backup was copied into the repository or uploaded.
- **Database restoration — PASS:** disposable, network-isolated Supabase PostgreSQL 17.11 restored the production schema and 30 data tables containing 13 rows with ON_ERROR_STOP enabled and SQLSTATE empty. Auth data subsequently restored three users. Backup-to-restore row comparisons passed, including identical three-user Auth extracts.
- **Authentication recovery — PASS:** official GoTrue v2.197.0 initialized the version-compatible Auth schema as supabase_auth_admin (82 Auth migrations; 35 auth.users columns). auth-data.sql then restored successfully: three users, zero duplicate IDs, zero case-insensitive duplicate emails, zero identity orphans, zero unvalidated Auth foreign keys and zero generated-confirmation mismatches. Restored user, password-material and identity counts matched the backup, and GoTrue restarted healthy.
- **Duplicate-account checks — PASS:** both backup exports contained the same three Auth users; each export had zero internal duplicate IDs, while the expected three IDs and three emails overlapped between data.sql and auth-data.sql. The version-compatible restored database confirmed zero duplicate IDs and emails.
- **Stage 4B migration security — PASS in isolation:** current supabase/migrations/202610220002_stage4b_operations.sql executed with exit code 0 against the restored disposable database. Post-migration checks found zero unvalidated foreign keys, zero HKA tables without RLS, 12 Stage 4B policies, zero anonymous privileges on new tables, zero unsafe Stage 4B security-definer functions, zero profile/Auth orphans, student admin access denied and privileged grants secure. Current migration fingerprint is SHA-256 AC159ACB0C6126FA408FB4FF518FABA4C5E8043A8400A26D36C27CC702B3D76E; its 22 October modification time predates the test.
- **Cleanup — PASS:** disposable Stage 4B and Auth containers and internal Auth network were removed. Follow-up inspection found none remaining; all four source backups remained present at their original sizes.
- **Production readiness:** corrected Stage 4B migration is ready for explicit production approval. This evidence substantiates recoverability and isolated security behavior, not live execution; live schema, preserved record counts, grants, RLS, booking conflicts and student flows must be verified after deployment. Remaining bounded risks are documented below. Founder/Owner role activation remains a separate approval and must not accompany this migration.
- **Approval gate:** no live SQL has been executed. Apply only after the owner explicitly replies **Approve Stage 4B Step 1 migration**.

## Stage 4B activation preparation checkpoint — 23 October 2026

- **Dashboard adjustment:** Student Dashboard Horses tab now uses a custom current-colour horseshoe SVG in the existing 16 px icon box with unchanged spacing, label, tab value and navigation behavior. No other dashboard icon or navigation control changed.
- **Migration state:** connected project sqaydpbqycvaictieafk still exposes Stage 4 objects only; hka_horse_records, hka_owner_availability, hka_coaching_requests, hka_announcements and Stage 4B RPCs remain absent. No SQL, migration, role or data mutation was executed.
- **Permission safety:** ordinary students cannot change role: hka_set_role is executable by authenticated users but enforces administrator status, blocks self-change and audits changes; signup accepts only student or guardian. membership_tier is not deployed yet. Existing horse RLS requires both old and new student_id to equal auth.uid(), preventing ownership transfer despite the current broad UPDATE grant. The migration additionally revokes table-level and explicit column UPDATE grants, then allow-lists only safe profile and horse fields. All four new tables enable RLS before authenticated grants.
- **Fresh read-only compatibility check:** migration is additive and transactional, contains no DELETE or TRUNCATE, and preserves Auth identities, profiles, learning rows and Storage metadata. Live hka_horses has the required UNIQUE (id, student_id), and hka_training_records depends on it through FOREIGN KEY (horse_id, student_id). RLS is enabled on profiles, horses and training records. btree_gist is available; the migration execution role can create it in the extensions schema. hka-private exists, is private, and currently contains zero objects. Live counts are 3 profiles and zero courses, enrolments, progress rows, horses, training records and file records. This 23 October checkpoint's backup gap was resolved by the verified 24 October restoration audit above.
- **Backup status (superseded):** this 23 October finding was resolved on 24 October. The four off-repository logical backups and isolated restoration evidence are verified in the audit above; no backup or credential was written into this repository.
- **Manual backup procedure:** immediately before approval, record a Dashboard Database Backups or PITR restore timestamp if the project plan provides one. Otherwise create encrypted off-repository Supabase CLI exports for roles, schema and data using the project connection string; include and verify Auth data and any supported supabase_migrations history. Separately inventory and download every private hka-private object using Supabase Storage S3 access, CLI or authenticated Dashboard downloads, then compare object count, paths, sizes and checksums to Storage metadata. Supabase documents that database backups exclude Storage objects: https://supabase.com/docs/guides/platform/backups and https://supabase.com/docs/guides/storage/management/download-objects.
- **Recovery procedure:** prefer restoring the recorded platform backup or PITR point. For logical recovery, restore roles, schema and data into an isolated replacement project using the official Supabase backup/restore sequence, restore supported migration history, restore private objects to matching bucket paths, verify RLS and object counts, then test existing student sign-in and learning access before any cutover: https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore.
- **Founder checkpoint:** existing prepared activation targets verified Auth UUID f7c3e52e-4f5e-47d0-8139-b28cb296d526, checks the matching confirmed, active Hollie Zietsman profile, accepts only the expected student/admin starting role, changes that existing profile to admin once and records an audit event. It creates no account, uses no email-based authorization and remains unexecuted.
- **Readiness and exact remaining steps:** after backup artifacts and recovery evidence are verified, obtain explicit Approval 1 and apply the unchanged 202610220002_stage4b_operations.sql; verify remote grants, RLS, booking conflicts, private Storage and student flows; then obtain separate explicit Approval 2 and apply 202610220001_founder_role.sql; verify only the existing UUID became admin; finally test Owner Dashboard student/progress, authoring, assessments, calendar, lesson requests, horse records, memberships, AI Studio, settings and announcements. Paid services remain inactive.
- **Branding, auth and checks:** logo file and source reference remain unchanged (SHA-256 29827C18B0D0A115F35CCBACB83FDB15B47CEB51756841CD06A936D63C637462). Existing Supabase Auth UI, singleton client, session monitor, route guards and student accounts were not altered. TypeScript, focused Student Dashboard lint and production build pass; build retains only the existing bundle-size advisory. Credentialed student sign-in and authenticated horseshoe screenshot still require manual live testing.


## Stage 4B security repair — 22 October 2026

- **Status:** local migration corrected and not deployed; no live schema, record, permission, role or migration-history change was made.
- **Migration history:** independent catalog search found auth.schema_migrations, realtime.schema_migrations and storage.migrations only. No Supabase CLI or application migration ledger exists, so deployed state remains determined from live objects; every Stage 4B table, function and added column remains absent.
- **Live grants:** authenticated currently has table-level SELECT, INSERT, UPDATE and DELETE on hka_horses, making every current horse column updateable at the privilege layer. hka_profiles has SELECT plus column-only UPDATE for full_name, timezone and avatar_path. hka_files has SELECT, INSERT and DELETE with no UPDATE privilege. anon has none of these grants.
- **Permission repair:** 202610220002_stage4b_operations.sql now revokes hka_horses table-level UPDATE and all explicit horse-column UPDATE grants before granting only name, details, photo_path, birth_year, breed, sex, identification, height_hands, discipline and training_goals. student_id, id and created_at cannot be updated by authenticated clients. Profile revocation still excludes membership_tier, role, suspended, birth_date, id and created_at; file metadata remains non-updateable.
- **RLS and ownership:** RLS is enabled on hka_horses, hka_profiles and hka_files. Existing horse writes remain limited to the active student who owns the row; profile updates remain self-only; file insert/delete policies retain owner and purpose checks. Existing UI horse updates use only the newly allow-listed columns, so functionality remains compatible. Existing administrator visibility and server-authorised functions are unchanged.
- **Constraints and data:** live hka_horses has PRIMARY KEY (id), UNIQUE (id, student_id), and its student foreign key; hka_training_records already depends on the composite unique key. Current counts are 3 profiles and zero horses, files, appointments and AI drafts; duplicate horse pairs, invalid file shapes, invalid AI categories and scheduled appointment overlaps are all zero.
- **Backup (superseded 24 October):** on 22 October no local backup had been verified. The later off-repository four-file backup and successful isolated restoration are now substantiated in the 24 October audit above; database backups still exclude stored file objects, which require separate export when any exist.
- **Validation:** transaction boundaries, function delimiters, permission ordering and live dependencies pass focused checks; application TypeScript passes. Corrected migration SHA-256 is AC159ACB0C6126FA408FB4FF518FABA4C5E8043A8400A26D36C27CC702B3D76E. Supabase CLI, psql and Docker are unavailable locally, so a full isolated PostgreSQL DDL execution remains unverified.
- **Readiness:** security correction is prepared, but deployment remains blocked until a recoverable database export and separate Storage-object backup are created and recorded. Founder elevation and Stage 5 remain untouched.

## Stage 4B final migration safety review — 22 October 2026

- **Status:** corrected migration is prepared but not deployed; owner-role elevation remains untouched. Connected project: sqaydpbqycvaictieafk.
- **Corrected — membership:** migration now revokes table-level and all column-level profile UPDATE grants before regranting only full_name, timezone, avatar_path and notification_preferences. role, suspended, birth_date and membership_tier remain unavailable to students. The Free-tier horse trigger now locks the profile row before counting, preventing concurrent limit bypass.
- **Corrected — calendar:** confirmed appointments are owner/admin-write-only. Approval serialises per coach and a GiST exclusion constraint independently rejects overlapping scheduled lessons. Rescheduling updates the existing appointment only after owner approval. Confirmed-lesson cancellation becomes cancellation_requested and requires the new owner-only review RPC; student requests cannot alter appointment identifiers or booking details.
- **Corrected — files:** horse-file metadata references hka_horses with deletion restricted, replacement constraints preserve avatar, material, submission and certificate shapes, and no browser UPDATE grant was added for horse_id. Storage remains in private bucket hka-private behind authenticated metadata policies.
- **Corrected — cleanup:** unrelated TypeScript fragment after COMMIT was removed. Student and owner controls now match cancellation and rescheduling approval states.
- **Already safe:** live hka_horses has UNIQUE (id, student_id). Live compatibility counts are 3 profiles, 0 horses, 0 files, 0 scheduled appointments, 0 duplicate horse pairs, 0 invalid file shapes and 0 appointment overlaps. hka_profiles RLS is enabled; authenticated has no table UPDATE and cannot update id, birth_date, role, suspended or created_at. Public signup cannot assign admin, and hka_set_role remains admin-only, audited and self-change-blocked.
- **Preservation:** migration contains no DELETE, TRUNCATE or replacement of existing records. New columns use compatible defaults; all schema work is wrapped in one transaction. Existing photographs, assignments, certificates and horse records therefore remain intact.
- **Recovery:** confirm a Supabase backup/PITR restore point immediately before execution and record its timestamp. Any pre-COMMIT failure rolls back automatically. After COMMIT, prefer PITR/backup restore; do not run a destructive down migration after Stage 4B accepts data.
- **Verification:** remote catalog, grants, constraints, bucket privacy and aggregate compatibility were inspected read-only. TypeScript, focused lint and production build pass. Migration structure/delimiters validate and SHA-256 is D52FFE2D60292A91A0324AE4F0427F617C2237ADE7401AFDA4FE1AD228954AA6. No isolated PostgreSQL instance is available locally, so no full DDL dry run was performed against live production under the no-deploy boundary.
- **Remaining risk:** backup/PITR availability and timestamp require confirmation immediately before deployment; role-specific RLS and concurrent-booking behavior require post-migration verification with controlled accounts. No critical compatibility conflict was found.
- **Readiness:** ready for separate explicit Step 1 approval after backup/PITR confirmation. Step 2 owner elevation remains separately blocked.

## Superseded Stage 4B Step 1 migration approval packet — 22 October 2026

- **Status:** read-only review complete; migration has not been executed.
- **Connected Supabase project:** sqaydpbqycvaictieafk, confirmed live through project metadata immediately before this report.
- **Exact SQL awaiting approval:** [supabase/migrations/202610220002_stage4b_operations.sql](supabase/migrations/202610220002_stage4b_operations.sql). Approval applies to that file exactly; any later edit requires renewed review. SHA-256: F73C2EF3D3CCFDCD712B39028A1EAE171F251287FE6F561C66E87A13D0D8E686.
- **Existing tables altered:** hka_profiles adds membership_tier and notification_preferences; hka_horses adds photo_path, birth_year, breed, sex, identification, height_hands, discipline, and training_goals; hka_files adds horse_id and replaces its purpose/shape constraint, insert policy, and file-access helpers; hka_ai_drafts expands its category constraint.
- **New tables:** hka_horse_records, hka_owner_availability, hka_coaching_requests, and hka_announcements. All four enable RLS before authenticated access is granted.
- **Other database objects:** four indexes; horse-limit and coaching-update triggers; hka_self_enrol_free and hka_approve_coaching_request authenticated RPCs; updated hka_file_read and hka_file_write; scoped grants and policies.
- **Existing-data preservation:** migration is additive and transactional. It contains no account, profile, student, course, enrolment, progress, submission, assessment, file, horse, or learning-row deletion. Existing profiles receive free membership and notification defaults; existing horses receive optional/null or empty-string detail defaults. Remote pre-migration state remains three Auth users and three profiles, with the previously audited learning-data counts unchanged.
- **Failure rollback:** because the script is wrapped in begin/commit, any SQL error rolls back the complete migration automatically.
- **Backup before execution:** capture a Supabase database backup or point-in-time recovery marker immediately before approval execution, and export affected existing tables plus policies/functions. Record the backup timestamp and confirm restore availability before applying SQL.
- **Post-commit rollback:** preferred recovery is restoring the pre-migration backup/PITR point. A manual compensating rollback is safe only before Stage 4B receives production data; it must first export Stage 4B rows, then drop the four new tables, four indexes, two triggers, four Stage 4B functions, added columns, grants/policies, and restore prior hka_files, file helper, and hka_ai_drafts definitions. Do not reuse the Stage 4 rollback file; it targets a different migration.
- **Privilege safety:** remote hka_signup_profile accepts only student or guardian and coerces every other request to student. Remote hka_set_role requires an existing administrator, rejects self-modification, restricts accepted roles, and audits changes. Step 1 does not assign any user role.
- **Remaining risks requiring post-migration verification:** live RLS/grant behavior is not proven until migration runs; concurrent Free-tier horse inserts can race past the count-based limit; coaching approval does not independently assert that assigned_coach currently has coach/admin role; every active authenticated member can read owner availability; manual rollback becomes data-destructive after Stage 4B use. These are bounded operational/security risks, not self-assigned-admin paths.
- **Approval gate:** reply exactly **Approve Stage 4B Step 1 migration** to authorize execution of the linked SQL against project sqaydpbqycvaictieafk. Step 2 owner elevation remains separately blocked until Step 1 succeeds and is verified.

## Stage 4B Version 18 read-only activation verification — 22 October 2026

### Five-task audit
1. Student Dashboard: locally complete. Course access, progress, coaching requests, horse records, achievements and profile controls are wired to existing Supabase data. Stage 4B-only queries stay inactive until schema activation.
2. Owner Dashboard: locally complete. Live academy operations remain available, while coaching, availability and announcement queries now stay inactive before Stage 4B activation instead of producing missing-table console errors.
3. Academy Workspace: locally complete. Existing course, module, lesson, assessment, review and private draft tools are preserved. Private material uploads now use the established storage path constraint.
4. Stage 4B database layer: reviewed and repaired locally, but not applied. Horse-file constraints now explicitly allow private horse records while retaining owner, student and horse linkage checks.
5. Founder activation: prepared but not applied. The reviewed existing account is bound by authenticated user ID to the existing admin role, which the interface presents as Founder, Owner and Head Coach.

### Current verification
- TypeScript, focused source lint and production compilation pass for Student Dashboard, Owner Dashboard and Academy Workspace. No active compilation or integration error was found; Vite reports only its existing bundle-size advisory.
- Pre-activation Stage 4B queries remain gated until the profile exposes the approved schema, so absent pending tables do not create active dashboard errors.
- Connected project sqaydpbqycvaictieafk still has Stage 4 and not Stage 4B: the four new tables and three Stage 4B operational RPCs are absent, as expected before approval.
- Read-only verification identified Hollie Zietsman at Auth user ID f7c3e52e-4f5e-47d0-8139-b28cb296d526, masked email h***@gmail.com. The account is email-confirmed, active, has signed in, is not suspended and currently has role student.
- The account is suitable for Founder, Owner and Head Coach access because it is an existing confirmed adult profile bound to the reviewed immutable Auth UUID. The application maps these operational permissions to the existing admin role.
- Current preservation baseline is 3 Auth users, 3 profiles, and zero enrolments, progress rows, submissions, horses, private files or AI drafts. No read-only verification changed these counts.

### Pending migration review
- Adds membership and notification fields to profiles; adds horse detail fields; creates private horse records, owner availability, coaching requests and announcements; extends private-file metadata; adds indexes, RLS policies, grants, triggers and narrowly callable RPCs.
- Existing accounts and learning records are not deleted or replaced. Existing profiles receive free membership and default notification values. Existing horses receive empty optional detail defaults. Stage 3 and Stage 4 records remain in place.
- Students can update only approved personal/profile fields, own horse records and limited states on their own coaching requests. They cannot update role or suspension columns.
- Public signup still accepts only student or guardian. Role elevation remains restricted to administrator-only hka_set_role; that function also blocks administrators from changing their own access.
- Founder bootstrap is a one-time, UUID-bound database-owner action with identity, confirmation, suspension and current-role checks. It contains no email-based or browser-side administrator check and records an audit event.

### Approval required and remaining work
- Approval 1: apply supabase/migrations/202610220002_stage4b_operations.sql. This adds two profile columns, nine horse/file columns, four RLS-enabled tables, constrained authenticated grants, private-file policy extensions, two trigger functions, two callable RPCs and four indexes. It deletes no account, student, course, learning or submission row.
- Approval 2: after migration success, separately apply supabase/activation/202610220001_founder_role.sql. It validates the exact reviewed Auth UUID, confirmed and unsuspended identity and expected current role, changes only that profile role from student to admin, then writes one audit record. Founder, Owner and Head Coach are UI responsibilities represented by this existing admin role, not new self-selectable roles.
- Public registration cannot grant admin or coach: hka_signup_profile accepts only student or guardian and coerces every other request to student. Authenticated users have column-limited profile updates that exclude role and suspended. hka_set_role requires an existing admin and rejects self-modification.
- Neither approval has been assumed and no remote permission, role or schema write was made. After approval, remote RLS, private storage, booking-conflict and role-specific browser flows still require live verification.
- Requested decision: approve migration and founder elevation separately, or approve migration only. No privileged action will run without that explicit choice.


## Stage 4B implementation — 22 October 2026

### Completed locally
- Replaced the student summary with persistent course catalogue/enrolment, progress, coaching requests, confirmed schedule, private horse profiles and records, authorised achievements, feedback history, avatar/profile and notification controls.
- Added Founder/Owner/Head Coach operations for live overview statistics, student progress and course access, development plans, coach assignments, coaching approvals, conflict-aware calendar management, membership visibility, shared horse records, announcements and academy settings.
- Extended the academy workspace with course editing, modules, lesson reordering, private lesson materials, assessment questions and answer keys, coach marking, and all requested editable HKA AI Studio draft categories. AI provider generation remains inactive because no secure AI configuration exists.
- Added a role-gated, read-only student preview that never impersonates a student or enables student mutations.
- Prepared supabase/migrations/202610220002_stage4b_operations.sql with additive tables/columns, RLS, private horse-file rules, Free one-horse enforcement, safe free-course self-enrolment, coaching request approval and overlap checks. It has not been deployed.

### Identity and approvals
- Connected project remains sqaydpbqycvaictieafk.
- Existing authenticated owner candidate is Hollie Zietsman, user ID f7c3e52e-4f5e-47d0-8139-b28cb296d526, masked email h***@gmail.com, current role student, active and recently signed in.
- No account was created and no role, permission, database row or deployed schema was changed.
- Explicit owner approval is required before applying the Stage 4B migration and separately before changing this existing user from student to administrator.
- Current remote baseline contains 3 profiles and zero courses, enrolments, horses, appointments or submissions.

### Current testing state
- TypeScript check passes and ESLint reports zero errors with the same eight existing warnings.
- Build was not run because this task expressly prohibits rebuilding the website.
- Remote role, persistence, upload, booking-conflict and end-to-end browser tests remain pending the approved migration and authorised administrator role; no success was simulated.

## Stage 4 database deployment — 22 October 2026

### Deployment
- Confirmed connected Supabase project sqaydpbqycvaictieafk matches the HKA app environment and contains the expected Stage 3 schema.
- Confirmed Stage 4 was absent before deployment. The reviewed migration contains no table, column, account or record deletion; policy replacements occur inside one transaction.
- Established an equivalent rollback path in supabase/rollback/202610220001_stage4_lms.rollback.sql. It reverses only Stage 4 objects and extensions and is intentionally owner-approved emergency tooling because running it after live Stage 4 use would remove Stage 4-only records.
- Applied supabase/migrations/202610220001_stage4_lms.sql once as a single transaction. Execution completed successfully.

### Observed remote state
- All seven LMS tables now exist: hka_modules, hka_questions, hka_answer_keys, hka_attempts, hka_responses, hka_review_allowances and hka_ai_drafts. RLS is enabled on every table.
- All 21 intended columns exist across the five Stage 3 extensions: hka_courses, hka_lessons, hka_progress, hka_submissions and hka_assessments.
- Both RPCs exist: hka_duplicate_course and hka_submit_attempt. New tables expose the expected 14 policies; grants restrict anonymous users to active pathway and published course catalogue reads.
- Before and after counts match exactly: two auth users, two student profiles, and zero courses, lessons, progress rows, submissions, assessments and guardian links. Existing accounts, roles and records remained unchanged.

### Testing limits
- Schema, RLS enablement, policy definitions, grants, RPC presence and record preservation were verified remotely.
- A non-mutating student and anonymous role probe timed out before returning results; it used session-local role settings inside an explicit rollback transaction and created no test records.
- Course creation, lesson saving, quiz submission, progress persistence, coach review and parent access remain untested end to end because the project currently has only two student roles and no course data, coach, administrator or guardian test account. No roles or production records were changed to manufacture a passing test.

## Stage 4 repair and verification — 22 October 2026

### Application repair
- Inspected src/pages/CoursePlayer.tsx around the reported line before broader checks. Current source contains complete JSX identifiers and balanced assessment markup; both TypeScript and Vite parse it successfully.
- The reported Vite error could not be reproduced from the saved source. Production build passed, then the stale preview was restarted once. Fresh preview logs contain no compile or runtime errors.
- Learning Pathways rendered in headless Chrome at desktop width. The protected CoursePlayer route rendered the branded sign-in redirect for an unauthenticated visitor, proving route loading and access control; authenticated lesson interaction remains untested without an enrolled student session and Stage 4 schema.
- ESLint reports zero errors and eight existing warnings: six shadcn Fast Refresh warnings plus two existing SessionContext hook/Fast Refresh warnings. Vite reports only the existing large-bundle advisory.
- No Stage 1–3 page, photograph, branding, account, authentication record or course record was removed.

### Pre-deployment remote database audit
- Before approved deployment, connected project sqaydpbqycvaictieafk had the Stage 3 schema only. Existing tables and policies retained their Stage 3 RLS protections.
- Stage 4 tables, columns and RPCs were absent, confirming the failed transaction committed no partial Stage 4 changes.
- Exact earlier failure: migration transport corrupted PostgreSQL function delimiters, producing SQLSTATE 42601 at hka_duplicate_course; it was not an authentication, data or RLS failure.
- Supabase migration history was unavailable remotely, so object and policy metadata provided the authoritative pre-deployment status.
- No database write was made during the repair turn.

### Prepared migration repair
- supabase/migrations/202610220001_stage4_lms.sql now uses named $stage$ function delimiters and explicitly drops every Stage 4 policy before recreating it, making policy replay idempotent.
- Proposed migration remains transactional: add non-destructive Stage 4 columns, create new LMS/assessment/allowance/draft tables with RLS, add scoped grants and policies, then install duplicate-course and server-side assessment RPCs.
- Migration was not applied during the repair turn; it was subsequently applied after owner approval as recorded above.

### Stage 4 functional status
- Implemented in code: pathway catalogue, protected course player, account-backed progress, private assignments, quiz attempts, automatic objective scoring contract, coach review workspace, Premium allowance schema and private AI Studio draft workspace.
- Role-based end-to-end workflows remain untested because controlled coach, administrator and guardian sessions and seeded course data are unavailable.


## Stage 4 implementation — 22 October 2026

### A. Course and lesson management
- Added dedicated pathway catalogue routes while preserving the five published pathway names, existing imagery and public design.
- Added an authorised course workspace for coach and administrator roles: create draft courses, set pathway, level, duration, eligibility and membership access, add lesson, quiz or assignment drafts, preview records, publish/unpublish, duplicate and archive.
- Added persistent schema for course metadata, modules, lesson objectives, draft/publication state and safe duplication in `supabase/migrations/202610220001_stage4_lms.sql`.
- Existing private `hka-private` storage remains unchanged and protected. Student assignment uploads use the original file without image transformation, accept the existing allow-list and enforce the existing 50 MB limit.
- Module assignment, drag-and-drop reordering and coach-facing course material upload controls remain incomplete in the UI; database support and ordering fields are prepared.

### B. Student learning and assessments
- Added protected course player with lesson navigation, account-backed completion, resume progress, written assignments and private image/PDF/video submissions.
- Added quiz rendering for multiple choice, true/false and written responses, save-and-resume attempts, submission history records and server-side automatic scoring RPC.
- Answer keys live in a separately protected table and are never selected by the student UI. Objective explanations are returned only after submission; written, practical and riding-video work remains pending human review.
- Student dashboard now displays per-course completion progress and resume links.
- No placeholder courses or educational lessons were published.

### C. Coach feedback, parents and Premium preparation
- Added coach review queue with score, comments, approve/feedback/resubmission decisions; coach results use existing student notifications and guardian visibility.
- Preserved existing guardian consent and role RLS. Approved guardians can continue reading authorised student progress and feedback; nothing is made public.
- Added future Premium review allowance records with two included personal reviews per period and usage counters. No payments, membership page changes or entitlements were activated.
- Review allowance charging and automatic monthly provisioning remain intentionally disconnected until the existing billing model is approved for Stage 4 activation.

### D. HKA AI Studio
- Added authorised HKA AI Studio with riding lesson, horse care, assessment and competition template builders, private draft saving, editing, reopening and text download.
- Horse-care templates explicitly state they are educational and not veterinary advice.
- No AI provider or paid API was detected or activated. Current builder labels output as a template draft, not AI-generated content; secure provider-backed generation, regeneration and direct student/course assignment remain pending owner approval and credentials.

### E. Integration status and verification
- Application TypeScript check, production build and ESLint completed successfully. Existing eight non-blocking framework warnings remain.
- Initial Stage 4 execution failed on a transport-altered SQL delimiter and rolled back cleanly; the corrected transaction was later reviewed, approved and applied successfully.
- Live role-based workflows remain untested because the project has no coach, administrator or guardian test roles and no course data; no production roles or records were altered for testing.
- Required owner action: explicitly approve replay of `supabase/migrations/202610220001_stage4_lms.sql` against connected project `sqaydpbqycvaictieafk`, then provide controlled student, guardian, coach and administrator test sessions for role-by-role integration testing.

 

## Stage 3 registration-rate investigation — 21 October 2026

### Findings
- Connected project sqaydpbqycvaictieafk returned healthy public Auth settings: email/password sign-up is enabled, phone sign-up is disabled and mailer_autoconfirm is false. Email verification therefore remains required; no security setting was disabled or weakened.
- The reported email rate limit exceeded response matches Supabase email-dispatch throttling rather than a database, profile-trigger or client-configuration failure. Supabase currently documents a combined default limit of two Auth emails per hour for its built-in SMTP service.
- Public Auth settings do not expose the configured SMTP host, so custom-versus-default SMTP cannot be proved from the client API. The very low observed threshold is consistent with Supabase's default service. Owner action is required to confirm this under Supabase Authentication > Emails > SMTP Settings; no external Auth setting was changed during this investigation.
- Recent Auth inspection found two accounts: pa***@gmail.com, created 13:11 UTC, remains unconfirmed and has a profile; 
a***@gmail.com, created 13:12 UTC, was confirmed at 13:13 UTC and has signed in. This proves registration created records before or around the reported failure, but the failing address cannot be attributed without its full test email.

### Registration safeguards completed
- Replaced only the sign-up account-detail step with the existing branded inputs and direct Supabase signUp call so provider errors can be translated safely.
- Added synchronous duplicate-submit locking, disabled controls while sending, password confirmation, a completed-registration lock and a 60-second retry pause after email throttling.
- Added friendly rate-limit guidance: wait and try later, and check the inbox before submitting again. Existing sign-in, recovery, verification, routes, dashboards, branding and account metadata are preserved.

### Production email recommendation and owner action
- Recommended provider: Postmark custom SMTP, using a dedicated authentication subdomain and sender. It is transactional-email focused and is listed as a supported Supabase SMTP option. Verify the sending domain and configure SPF, DKIM and DMARC before production.
- Configure credentials only in Supabase Authentication > Emails > SMTP Settings, keep email confirmation enabled, leave current limits unchanged until normal traffic is measured, and disable provider link tracking for confirmation links.
- After SMTP configuration or the current cooldown expires, test one new controlled address through registration, confirmation and sign-in; avoid repeated resend attempts. References: https://supabase.com/docs/guides/auth/auth-smtp and https://supabase.com/docs/guides/deployment/going-into-prod.

### Tested
- Public Auth configuration endpoint returned HTTP 200 with sign-up enabled, email enabled and email auto-confirm disabled.
- Connected database inspection verified recent Auth users and corresponding hka_profiles without exposing full addresses.
- No live registration email was triggered during diagnosis, avoiding another quota event or unnecessary account.
- TypeScript application check, focused ESLint and production build passed after the registration changes.

## Stage 3 continuation — 21 October 2026

### Completed
- Confirmed connected Supabase project contains deployed Stage 3 academy tables, role functions, RLS policies and private storage structures from `supabase/migrations/202610210001_stage3_academy.sql`.
- Connected existing sign-up, sign-in, verification resend, password reset and password update screens to the shared Supabase client and application session provider.
- Added protected `/dashboard` routing with role destinations for student, parent or guardian, coach and administrator accounts.
- Added role-aware dashboard navigation and RLS-backed summaries for learning, coaching, horses, achievements, linked students, submissions, enrolment requests and academy records.
- Updated shared desktop and mobile account navigation to show dashboard and sign-out actions for authenticated members.
- Preserved public designs, photographs, logo, branding, membership plans and payment behavior. Stage 4 work was not started.

### Unfinished or externally dependent
- Browser end-to-end registration, email confirmation, password recovery and all four role sessions require real test accounts and delivered Supabase emails; no credentials or account roles were invented.
- Founder bootstrap, coach and administrator role assignment, guardian linking, course authoring and member data entry remain operational setup tasks using the deployed secure backend.
- Preview runtime was unavailable at `127.0.0.1:8080`; it was not restarted because this continuation explicitly prohibited restarting or rebuilding the project.

### Tested
- TypeScript application check passed with `pnpm exec tsc --noEmit -p tsconfig.app.json`.
- ESLint passed with zero errors; eight existing Fast Refresh and hooks warnings remain non-blocking.
- Static route review confirmed visible sign-in and sign-up entry points, password reset and update routes, protected dashboard index, role redirects, role guards, failure states and shared Supabase client usage.
- Connected Supabase metadata inspection confirmed all dashboard tables and required auth role functions are present remotely.

Scope: Stage 1 public website, with original photographs in Home, About and Learning Pathways and the uploaded logo in the shared header and footer. Restored saved photograph version c41a2e72efaa7216f9ae7c904733db48ac0071df on 21 October 2026, preserving Stage 1 design baseline fb062122df32f315934f15fbd3d3c86d2bde68e2. Existing routes, copy, palette and section design retained; header accommodates the complete logo. This remains a public preview, not a connected academy or production release.

## Implemented
- Home, Learning Pathways, Memberships, About, Sign in, Sign up and Password reset in the existing React/Vite app.
- Shared navigation, mobile menu, footer, route titles, skip link, hash navigation and branded not-found page.
- Confirmed HKA identity, five pathways, exact USD monthly packages and Premium limits.
- Supplied founder note unchanged; original photographs fill the existing Home, About and Learning Pathways frames.
- Uploaded logo replaces the text wordmark in the shared header and footer, with its full artwork, colours, lettering and aspect ratio preserved.
- Photos use proportional CSS cropping and positioning; the logo uses uncropped proportional sizing. Removed the old photo hover brightness filter. Image-load failures show an accessible fallback without collapsing the frame.
- Disabled account forms and checkout with accurate availability explanations. No accounts, sessions, records, emails, payments or entitlements are simulated.
- Existing React Router and shadcn components reused; no dependencies added.
- Existing Supabase/Stripe scaffolding retained without use in the public application. Legacy payment-success URL redirects to membership information.
- Original specification retained in PROJECT_BRIEF.md; Stage 1 execution instructions retained in WEB_BUILD_PLAN.md.

## Original asset placement
All five uploaded files are kept under public/images/ with their original filenames and unchanged bytes.

| Original upload | Placement |
| --- | --- |
| 20260227_131818.jpg | Home founder section and About portrait |
| IMG_5698.jpg | Home hero; Riding and Competition cards on Home and Learning Pathways |
| IMG_5697.JPG | Horse Care and Young Riders cards on Home and Learning Pathways |
| IMG_5696.JPG | Equestrian Knowledge cards on Home and Learning Pathways |
| ChatGPT Image Oct 19, 2026, 06_52_32 PM.png | Shared header and footer on every public route |

The four photographs are reused across the seven existing slots; no replacement or generated imagery was introduced. Photo paths, intrinsic dimensions and crop positions remain centralised in src/lib/hka-content.ts.

## Tested
Rechecked 21 October 2026; latest browser results recorded at 06:34 UTC.

The active source had reverted to the blank starter. Recovered the completed Stage 1 website and its original asset placements from saved project history, without redesigning or reconstructing its pages. All recovered source and image files match the saved photograph version; only this status report adds new content. The saved browser-data lockfile was restored and matches the dependencies used for the checks below.

- Production: pnpm run build passed.
- Development: pnpm run build:dev --outDir .elmony/development-build passed.
- App types: pnpm exec tsc --noEmit -p tsconfig.app.json passed.
- Config types: pnpm exec tsc --noEmit -p tsconfig.node.json passed.
- Lint: pnpm run lint passed with zero errors and six existing Fast Refresh warnings in unchanged shadcn components.
- Browserslist: neither fresh build emitted the outdated-browser-data warning. Restored the saved pnpm browser-data refresh: caniuse-lite 1.0.30001817 and browserslist 4.29.4. pnpm why confirmed these installed versions; the restored lockfile matches node_modules/.pnpm/lock.yaml byte for byte. pnpm install --offline --lockfile-only --frozen-lockfile --ignore-scripts passed. No new dependencies, downloads or further data update were needed.
- Integrity: all five SHA-256 hashes match the uploaded originals in public/images/, production dist/images/ and HTTP-served image responses; every asset returned HTTP 200.
- Headless Chrome: 16 checks passed across 1440px desktop, 1024px laptop, 768px tablet, 390px phone and 320px small phone viewports. All seven public routes plus the not-found route remained reachable.
- Every photo and both logos decoded successfully at every tested width. Declared and intrinsic dimensions match; photographs fill existing frames, logos retain their original proportions, and no colour filter, opacity change, horizontal overflow or header/navigation collision was found.
- Desktop and phone screenshots of Home, About, Learning Pathways and footer were visually reviewed; header logo remains readable and complete on phone and desktop.
- Navigation, browser back/forward, pathway links, anchor focus, keyboard skip link and mobile menu focus/escape/navigation checks passed.
- Existing package copy, disabled account/payment controls, FAQ and founder note checks passed unchanged.
- Simulated image-request failure displayed the accessible fallback inside the existing frame; restoring access loaded the original photograph again.
- Latest browser run recorded zero unexpected runtime/console errors and no external service/image requests. Its result replaces older diagnostic output.
- Repeatable check: node .elmony/stage-one-check.cjs. Evidence: .elmony/stage-one-results.json, .elmony/photos-*.png and .elmony/hka-*.png.

## Running preview
- Development website is running at http://127.0.0.1:8080/; HTTP 200 and browser-rendered routes confirmed.
- Restart command: pnpm dev --host 127.0.0.1 --port 8080 --strictPort.
- No external publication or production deployment performed; public Stage 1 is ready for review.

## Blocked / external dependencies
- Account/backend workflows require Stage 2 authorisation and the single Supabase connection, schema, policies, auth configuration and verified founder bootstrap.
- Lesson assets, learning programmes and events await founder-supplied published content.
- Live DPO payments require Stage 4 and merchant activation, server secrets, service identifiers, USD charge/settlement approval, account-holder consent and explicit DPO approval for the proposed third-party USD bank settlement in Zambia. Recurring billing requires merchant enablement and explicit customer consent. Terms, fees and refund/cancellation policies require confirmation.
- Dormant Stripe starter code is not wired to public routes and must not be deployed or enabled for HKA. No payment provider is connected by Stage 1.

## Not started (intentional stage boundary)
- Stage 2: real authentication and recovery email delivery, private profiles, date typing/picker validation, searchable IANA timezones, protected roles, guardian verification and shared backend policies.
- Stage 3: connected member/parent/founder areas; content and photo management, lessons, assignments, uploads, marking, horses, private threads, consultation booking and event calendar.
- Stage 4: backend-controlled membership periods, allowances, expiry and DPO hosted checkout/verification.
- Stage 5: private-workflow/privacy testing, deployment, backup and operating-cost handover.
- Native clients, store publishing, paid accounts and public deployment are not authorised in this run.

## Next concrete stage
Connect the single shared Supabase backend in Stage 2; implement and verify authentication, private profiles, protected founder access and guardian privacy before exposing member tools. Reuse src/integrations/supabase/client.ts. Never grant privileges from a browser-provided email.
