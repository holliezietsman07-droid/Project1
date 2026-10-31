# HKA Founder messaging: pre-approval security revision

> Historical pre-approval review: execution status and local-environment blockers below are superseded by [approved isolated local testing](FOUNDER_MESSAGING_LOCAL_SECURITY_TEST_REPORT.md), which records 137 PASS and 3 FAIL SQL assertions; live deployment remains unauthorised.

Date: 2026-10-31. Connected project: `sqaydpbqycvaictieafk`.

**REVIEW ONLY — migration and rollback remain unapplied. No deployment, SQL mutation, live permission change, account creation, consent change or message write occurred. Not ready to request live Founder approval: isolated database execution and the age/safeguarding decisions below remain open.**

## Review artifacts

- [Revised migration](../supabase/proposals/202610310001_founder_direct_messaging.sql)
- [Revised restrictive rollback](../supabase/proposals/202610310001_founder_direct_messaging.rollback.sql)
- [Read-only live security catalog](founder-messaging-evidence/security-catalog.json)
- [Read-only table/helper metadata](founder-messaging-evidence/metadata.json)
- [Executed source and frontend regression evidence](founder-messaging-evidence/source-checks.json)
- [Prepared database suite and script hashes](founder-messaging-evidence/suite-preparation.json)
- [Current local checks and artifact hashes](founder-messaging-evidence/checks.json)
- [Isolated PostgreSQL runner](../supabase/tests/founder_messaging/run-isolated.cjs) and [synthetic fixtures](../supabase/tests/founder_messaging/fixtures.sql)
- [Executable source regressions](../supabase/tests/founder_messaging/source-checks.cjs)

These proposals remain outside `supabase/migrations`. Nothing automatically applies them.

## Findings and corrections

| Finding | Revision and remaining proof |
| --- | --- |
| 1. Multiple approved roles | Messaging checks durable `hka_account_roles.status='authorized'`, independent of `hka_profiles.role` and `is_active`. This covers Founder, Coach, Guardian and Student purpose checks. New messaging helpers deliberately do not call dashboard-dependent `hka_active`, `hka_admin` or `hka_coaches`; existing global helpers remain unchanged. Source checks passed; database role switching remains unexecuted. |
| 2. Guardian privacy | A participant may read their own history. Additional guardian oversight requires an approved, consented child link **and the child must actually be sender or recipient**. A shared `student_id` on a Coach/Guardian or Founder/Guardian private DM never grants another guardian access. Two guardians may both oversee the child's messages without seeing each other's adult-to-adult DMs. Guardian oversight cannot mark another recipient's messages read or impersonate them. |
| 3. Founder/minor safeguarding | Founder privileges remove the coaching-assignment requirement only. Both participants require confirmed email, an unsuspended profile and an approved account purpose. Every minor or unknown-age account, regardless of selected dashboard or approved purposes, additionally needs a verified adult guardian with an approved, consented link. Founder/minor scope is the child's identity, including minor Horse Owners, preserving oversight. Specific consent-purpose interpretation still needs the safeguarding decision below. |
| 4. Missing birth date | Live `hka_profiles.birth_date` is `date NOT NULL`; signup requires DOB and clients cannot UPDATE it. Approved Student purpose alone is **not adult evidence**: signup authorizes Student purpose for minors too. No trusted independent adult-verification field was found. Known-DOB adults with an assignment require no guardian consent, even when auth metadata lacks DOB; only stored profile DOB is used. NULL/unknown profile age stays consent-gated. An adult known through some separate process but missing DOB cannot safely be distinguished from an unknown-age minor in this schema; this part remains unresolved rather than bypassed. |
| 5. Privileged functions | All new SECURITY DEFINER helpers reside in `hka_messaging`, owned by reviewed `postgres`, with empty search paths and qualified relations. Authenticated callers can execute only caller-bound send/read entry points and the zero-argument contact projection. Arbitrary role, age and relationship helpers remain owner-only. Public `hka_message_contacts()` is SECURITY INVOKER, retaining the existing ten-column API. No anonymous access. Confirm private-schema exposure configuration before approval. |
| 6. Preflight | Captured actual live USING and WITH CHECK text, command, permissiveness and `roles=['authenticated']`. Migration compares these exact definitions under a fixed deparser search path, rejects extra policies/trigger or helper collisions, checks RLS and protected age/role column privileges, and locks the message table before changing it. Policy names/count alone are insufficient. Same-name expression widening and changed role targets are included in prepared negative tests. |
| 7. Rollback | Replaced legacy-policy restoration with a restrictive feature rollback: disable platform-wide new Founder direct messaging and global contact-directory grants while keeping strict participant/child-oversight RLS. Never restores Founder global conversation reads or cross-guardian access. Requires exact installed policy, function definition/owner/ACL and trigger snapshots before changing anything. |
| 8. Isolated database verification | **NOT EXECUTED.** Prepared 98 assertions intended for matching restored HKA schema, with 17 synthetic accounts and actual `authenticated`/`anon` SQL roles. PostgreSQL executables were absent from PATH; Docker daemon was unavailable. No matching full schema-only restore was available. Your restriction also requires separate approval before any isolated SQL mutation. Source checks and successful application compilation do not prove SQL compilation or RLS behavior. |

## Authorization details

A registered but unavailable account remains visible in the Founder directory, with `can_message=false`. Registration never approves a Coach application, activates a suspended or unverified member, or supplies missing guardian consent.

External Coaches still require an authorized Coach purpose and a saved assignment. Minor/unknown-age Coach relationships additionally require an approved, unrevoked Coach link with Founder approval and guardian-consent timestamps. Linked guardians can contact that Coach only through the same authorized child relationship. Ordinary users cannot search the entire directory or initiate arbitrary user-to-user conversations.

History access is separate from new-send permission: an eligible participant keeps their own historical messages after assignment removal. An approved guardian sees child-participant conversations only. Losing all qualifying activation consent blocks the minor/unknown-age account; revoking a particular guardian link removes that guardian's oversight. An adult guardian can still read their own historical private DMs as a participant.

The proposal does not redefine existing account activation globally. For messaging, it preserves email verification, suspension, approved-purpose and minor/unknown-age guardian gates while removing selected-dashboard dependency. Account roles, assignments, guardian links, consent timestamps, messages and other application rows are never rewritten by either proposal.

## Safeguarding and age decisions still required

1. **Founder/minor consent scope:** existing guardian activation consent and oversight are enforced; Coach-specific consent continues to protect external Coach relationships. The existing schema has no separate Founder-DM consent record. Treating activation consent as sufficient for Founder direct messaging is a proposed interpretation, not evidence of a new consent. Founder/safeguarding owner must confirm this interpretation before live approval; if separate messaging consent is required, add an explicit consent workflow under separate review without inventing coaching assignments.
2. **Missing-DOB adults:** confirm the actual authoritative adult-verification source and affected schema/account state. Current live storage cannot contain a NULL DOB. Do not infer adulthood from role approval, dashboard, onboarding JSON or editable auth metadata. Do not use a sentinel DOB. A separate trusted attestation design or properly authorized correction of the real DOB would require its own review; this revision creates neither.
3. **Private schema exposure:** live `pgrst.db_schemas` setting returned NULL, so catalog inspection cannot certify the dashboard-managed Data API/GraphQL exposure list. Confirm `hka_messaging` is absent from both. Migration rejects it if an available server setting explicitly exposes it, but a missing setting is not proof of privacy.
4. **Database behavior:** execute the prepared suite only after isolated-mutation approval and a matching disposable environment are available. Until then SQL syntax, grants, trigger execution, real RLS allow/deny behavior and rollback compatibility remain unproven.

Live profile-column catalog inspection confirmed authenticated UPDATE only for normal editable profile fields (name, timezone, avatar, notification preferences and banner fields); DOB, role and suspension had SELECT only. No profile trigger was reported. The migration checks protected-column privileges again instead of trusting UI restrictions.

5. **Current live privacy exposure:** the captured live SELECT policy still grants platform-wide Admin reads and broad guardian reads by child scope. This source revision cannot remediate live access while the explicit no-mutation restriction remains; do not treat prepared SQL or local frontend changes as a live privacy fix.

## Intentional rollback differences and frontend compatibility

Rollback is a feature freeze, **not restoration of the pre-migration schema**:

- Keep nullable `student_id` so new adult non-Student direct history remains intact. Never delete messages to restore NOT NULL.
- Keep the private helper schema, owner-only RLS-protected installation snapshot, public contact API, immutable-message trigger and recipient-only `read_at` update grant.
- Keep strict message RLS. No global Founder SELECT, cross-guardian SELECT, client DELETE or broad message UPDATE is reintroduced.
- Keep approved assignment/consent messaging and legitimate participant history. Founder direct threads become history-only unless another approved relationship independently permits sending.
- Preserve the contact API's exact columns: `id, full_name, role, role_label, student_id, student_name, relationship, can_message, directory_entry, created_at`.

Retain current grant-driven `useMessaging` and updated `conversations.ts`/`AcademyMessages.tsx`. Clients must honor `can_message=false`, `directory_entry=false` and NULL student scopes; do not restore an old frontend that assumes every DM has a Student ID. An old frontend checkpoint is **not** a compatible rollback requirement.

Focused frontend corrections in this revision:

- Directory availability follows server contact grants, so an authorized Founder using another dashboard retains the messaging directory.
- Direct-thread grouping follows the server's relationship and canonical scope, including explicit NULL. Selected Coach/Guardian dashboard roles cannot change the recipient or create a false Student scope.
- History-only contacts keep canonical scope after rollback.
- A guardian's own Founder contact cannot overwrite the scope of a child's overseen conversation.
- Founder inbox text accommodates feature-disabled contacts. Existing management-profile route gates remain unchanged; selected Founder dashboard is still needed for non-messaging management routes.

The installed-definition snapshot makes rollback fail closed after policy/helper/trigger changes or a prior rollback. It is not a reusable toggle: re-enabling Founder direct messaging requires a separately reviewed forward change.

## Evidence: executed versus prepared

**Executed locally:** 14 source/catalog and actual conversation/React-element regressions passed. Tests cover canonical NULL scopes, Founder on Coach dashboard, Student on Guardian dashboard, history-only rollback contacts, read-only guardian oversight, grant-driven directory display and no directory escalation for an ordinary Coach. Catalog assertions compare embedded policy expressions to the fresh SELECT receipt. These are not SQL execution or full browser acceptance.

**Prepared only:** 98 PostgreSQL assertions cover:

- Complete Founder directory and direct sends/replies without assignments; suspension, unverified email, pending/revoked purposes and missing minor consent denied.
- Adult assigned-Student messaging, minor assigned-Coach consent, unrelated Student/Coach/Horse Owner sends denied.
- Two guardians' private Coach DMs isolated, child/Coach and child/Founder oversight preserved, private Founder/Guardian DMs protected even with child scope.
- Founder, Coach and Guardian account combinations across every approved dashboard choice.
- An adult with authoritative profile DOB and missing auth-metadata DOB remains allowed; a minor cannot claim adulthood through auth metadata.
- Missing-DOB fault injection only in a savepoint after restoring current NOT NULL schema: unknown age denied without consent; account consent alone cannot replace specific Coach consent.
- Sender/scope/read-state spoofing, message-field mutation, deletion and anonymous access denied.
- Assignment/consent revocation, participant history retention, private helper ACLs and public invoker API.
- Same-name RLS expression drift, policy-role drift and extra policies rejected.
- Exact rollback drift check, nullable history preservation, no global Founder private reads, no cross-guardian leakage and retained assigned-Coach sends.
- Fingerprints of **every public HKA application table** immediately before/after migration and immediately before/after rollback. Assertions are prepared; preservation under executed migration remains unproven.

Application type/build/lint receipts and exact file hashes are in `checks.json`. Build output goes to a local `.elmony` directory; nothing is published.

## Running the prepared suite after separate approval

Do not run the proposals against the connected project during this review.

Use a disposable local PostgreSQL database named `hka_messaging_security_<run>`, with the matching **current schema-only** HKA/Supabase schema, grants, functions, constraints, triggers and auth schema restored. A hand-written subset or reconstruction from old migrations does not prove current-schema compatibility. Use no real user rows, production secrets, active outbound hooks or scheduled jobs. Preparing/restoring the database is itself a SQL mutation and also requires approval.

The runner requires explicit `HKA_APPROVE_ISOLATED_SQL=FOUNDER_APPROVED_LOCAL_ONLY` and `HKA_ISOLATED_DATABASE_URL`, rejects non-loopback targets/connection overrides, and refuses populated auth/profile tables. It never reads `.env.local`, imports deployment credentials, restores a schema itself, or calls connected Elmony tools. It uses one outer transaction and final ROLLBACK; any failure exits and connection closure aborts the transaction. The isolated script strips only the proposals' transaction boundaries to preserve atomic test cleanup.

Run `node supabase/tests/founder_messaging/run-isolated.cjs` only under that explicit approval. Its result must be reviewed before seeking separate live-migration approval. Run `--prepare-only` to generate SQL and hashes without connecting to a database. The generated review suite is local at `.elmony/founder-messaging-security-suite.sql`.

After isolated SQL passes, separately authorize designated real-account UI/API acceptance: visible entry, contact search, send handler, stored success/reply/history, honest failure/draft retention, recipient read receipts, multi-role switching and negative direct API access. Neither isolated JWT claims nor local React fixtures prove hosted JWT validation or live delivery.

## Security guidance used

Supabase recommends keeping SECURITY DEFINER functions outside exposed schemas and restricting EXECUTE; elevated functions also need fixed search paths. The public invoker wrapper/private projection follows that boundary. See [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security) and [Supabase database-function guidance](https://supabase.com/docs/guides/database/functions).

Column-level revocations and grants use PostgreSQL's supported column privilege syntax. See [PostgreSQL REVOKE](https://www.postgresql.org/docs/current/sql-revoke.html).
