# HKA Founder messaging: final compatibility check

Date: 2026-11-03. Connected project: `sqaydpbqycvaictieafk`.

**PASS for the requested read-only compatibility review and isolated local retest. All three live policies target `authenticated`, and their commands, permissiveness and complete expressions match the migration preflight. No proposal SQL correction is necessary.** Neither proposal was applied to live Supabase; no live records, RLS, configuration or application deployment changed.

## Verified live policy snapshot

Captured from `pg_policies` under a fixed `pg_catalog,public` search path. [Full hosted snapshot](founder-messaging-evidence/hosted-compatibility-snapshot.json), [exact read-only queries](founder-messaging-evidence/hosted-readonly-queries.sql) and [raw connector receipts](founder-messaging-evidence/hosted-tool-receipts.json) preserve the evidence. SQL transactions explicitly use READ ONLY; metadata helpers inspect definitions only.

| Policy | Command | Roles | Permissiveness |
| --- | --- | --- | --- |
| hka_messages_insert | INSERT | authenticated | PERMISSIVE |
| hka_messages_read | SELECT | authenticated | PERMISSIVE |
| hka_messages_update_read | UPDATE | authenticated | PERMISSIVE |

Complete catalog definitions below include both expressions and SQL NULLs; escaped newlines are rendered as standard JSON string escapes.

```json
[
  {
    "cmd": "INSERT",
    "qual": null,
    "roles": [
      "authenticated"
    ],
    "tablename": "hka_messages",
    "permissive": "PERMISSIVE",
    "policyname": "hka_messages_insert",
    "schemaname": "public",
    "with_check": "((sender_id = auth.uid()) AND (hka_admin() OR (hka_teach(student_id) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT g.guardian_id\n   FROM hka_guardians g\n  WHERE ((g.student_id = hka_messages.student_id) AND (g.status = 'approved'::text) AND (g.consent_at IS NOT NULL)))))) OR ((student_id = auth.uid()) AND (recipient_id IN ( SELECT cs.coach_id\n   FROM hka_coach_students cs\n  WHERE (cs.student_id = auth.uid())))) OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1\n   FROM hka_profiles p\n  WHERE ((p.id = auth.uid()) AND (p.role = 'guardian'::text)))) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT cs.coach_id\n   FROM hka_coach_students cs\n  WHERE (cs.student_id = hka_messages.student_id)))))))"
  },
  {
    "cmd": "SELECT",
    "qual": "(((auth.uid() = sender_id) OR (auth.uid() = recipient_id)) OR hka_admin() OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1\n   FROM hka_profiles p\n  WHERE ((p.id = auth.uid()) AND (p.role = 'guardian'::text))))))",
    "roles": [
      "authenticated"
    ],
    "tablename": "hka_messages",
    "permissive": "PERMISSIVE",
    "policyname": "hka_messages_read",
    "schemaname": "public",
    "with_check": null
  },
  {
    "cmd": "UPDATE",
    "qual": "(recipient_id = auth.uid())",
    "roles": [
      "authenticated"
    ],
    "tablename": "hka_messages",
    "permissive": "PERMISSIVE",
    "policyname": "hka_messages_update_read",
    "schemaname": "public",
    "with_check": "(recipient_id = auth.uid())"
  }
]
```

The earlier `TO PUBLIC` record conflicts with this current catalog. It must not replace the verified baseline. The migration keeps the exact `actual.roles IS DISTINCT FROM ARRAY['authenticated']::name[]` check: no PUBLIC/authenticated alternative, superset allowance or expression normalization was added. Exact policy count, names, commands, permissiveness, USING and WITH CHECK comparisons remain intact. Local negative tests now reject PUBLIC targets on **each** of the three policies, anonymous/superset targets, changed UPDATE expressions, removed/renamed policies and changed command/permissiveness.

[Migration](../supabase/proposals/202610310001_founder_direct_messaging.sql) and [restrictive rollback](../supabase/proposals/202610310001_founder_direct_messaging.rollback.sql) remain byte-for-byte identical to the reviewed trigger-state correction:

- Migration SHA-256: `b0e363dc51e8eae1ec82dad37a6c49ced9d58dcefa9de0d8bfd3f6cc9f51905d`
- Rollback SHA-256: `30b4605ba65ac98fb797a8343a58538d8b2f39d14f61261cf49273a877e6c97d`

## Hosted dependencies and API exposure

- All seven required public tables exist with RLS enabled, owner `postgres` and FORCE RLS false. All column definitions were refreshed and match the previous captured column fixtures. Authoritative profile DOB is DATE NOT NULL; authenticated cannot update DOB, role or suspension.
- Refreshed **52 constraints**, current message/account-role indexes, all 13 policies across those tables, and all eight relevant public helper definitions, owners and direct EXECUTE ACLs. Six previously captured helper bodies are unchanged; `hka_coaches` and `hka_has_purpose` now have fresh hosted definitions instead of repository-only fallbacks.
- Live message grants are authenticated SELECT/INSERT plus UPDATE(read_at). There are no non-internal triggers on the seven public tables. The enabled origin-mode `auth.users.hka_auth_profile` trigger invokes `hka_signup_profile()`. The hosted `auth.uid()` expression accepts either JWT subject setting used by the local shim. [Auth/role/trigger metadata](founder-messaging-evidence/hosted-auth-dependencies.json).
- All **19 local migration versions** are recorded in hosted migration history; Founder proposal version `202610310001` is absent. Relevant dependencies include base academy tables (202610210001), messaging (202610260010), profile banners (202610280001), durable roles/link consent (202610280002), invitation crypto correction (202610280003) and signup active-purpose correction (202610290001). History entries establish recorded versions; fresh catalog comparison establishes current relevant definitions. No historical migration was replayed.
- `hka_messaging` schema and all public `hka_message_%` functions are absent, so there is no existing-installation collision. Proposed migration creates them only after separate approval.
- Both SQL API GUCs return NULL, and no role/database `pgrst.*` overrides were recorded. These NULLs alone do **not** prove schema privacy. Read-only GET requests with an invalid Accept-Profile and with `hka_messaging` both returned **406/PGRST106**, explicitly advertising only **public, graphql_public**. Therefore the private schema is absent from the current effective PostgREST exposure list. [Actual HTTP evidence](founder-messaging-evidence/hosted-api-exposure.json).
- `pg_graphql` is not installed. `graphql` contains zero functions; the single `graphql_public.graphql` wrapper returns “pg_graphql extension is not enabled.” Its actual definition was inspected without invoking it. There is no active GraphQL resolver to expose the proposed private helpers in the captured configuration. [Wrapper receipt](founder-messaging-evidence/hosted-graphql-dependency.json).
- Hosted `postgres` is NOSUPERUSER/BYPASSRLS; local test `postgres` is superuser. Read-only checks confirm hosted schema creation, public USAGE/CREATE, auth USAGE, SELECT on auth user ID/email confirmation and EXECUTE on auth.uid; session replication mode is origin. [Owner privilege evidence](founder-messaging-evidence/hosted-migration-privileges.json). Non-superuser local execution remains an explicit fixture difference.

The API exposure result proves current configuration, not a promise that later settings cannot change. The migration retains its explicit-exposure guard, private helper ACLs and invoker-only public wrapper.

## Isolated execution and frontend compatibility

Canonical run **1793681834711**, PostgreSQL **17.11**, 17 synthetic accounts: **183 SQL assertions PASS, 0 FAIL** (108 migration/access/drift + 59 adversarial + 16 committed-cycle). [Execution receipt](founder-messaging-evidence/isolated-run.json).

- Complete migration and rollback files ran unchanged, with their own BEGIN/COMMIT boundaries in separate sessions.
- Disabled-trigger rollback failed at preflight with expected psql exit 3; feature state and every existing message/receipt remained unchanged. Normal rollback retained enabled `O` guard, sender/content immutability, receipt protection, participant-only history and assigned/consented Coach/family messaging.
- All three original failed assertions pass, alongside Founder, Coach, Student and Guardian restrictions, consent/revocation checks and unrelated-conversation denials.
- Fingerprints of every reconstructed public HKA table and synthetic auth.users match across migration, rejected rollback and normal rollback. Existing non-null receipt timestamps and NULL-scope direct history survive.
- Container used local named-pipe Docker, network `none`, no published ports/bind mounts and disposable PostgreSQL storage; removed successfully.

The current frontend calls zero-argument `hka_message_contacts` through the existing Supabase singleton and consumes `id, full_name, role, role_label, student_id, student_name, relationship, can_message, directory_entry, created_at`. It inserts sender/recipient/body with nullable student scope and updates only recipient read receipts. Source wiring remains reachable through guarded Founder, Student, Coach and Parent dashboard message panes and shared messaging components.

A new harness feeds **actual local authenticated SQL results** into production `canSendMessage` and `buildConversations`: 16 contact rows after migration, three after rollback; seven contract checks per projection pass. Exact ten-column names/types, nullable adult-peer scope, canonical thread display, persisted history, rollback-disabled reply/directory controls, missing-RPC pending state and self-send denial all pass. Raw projections: [after migration](founder-messaging-evidence/docker-1793681834711-frontend-contract-migration.log), [after rollback](founder-messaging-evidence/docker-1793681834711-frontend-contract-rollback.log). Additional source/React regressions: **14/14 PASS**.

Hosted RPC HEAD currently returns **404**, consistent with the catalog showing no public messaging function. Frontend already handles missing RPC as approval pending; live direct messaging is not claimed operational before installation. No authenticated hosted send, receipt mutation, JWT issuance, realtime delivery or browser acceptance was attempted.

Current production application build passed (2,642 modules); [build receipt](founder-messaging-evidence/compatibility-build.json). All 11 harness files parse; [parsing receipt](founder-messaging-evidence/compatibility-harness-parsing.json).

## Fixture differences and limits

| Difference | Treatment |
| --- | --- |
| Prior local fixture granted authenticated EXECUTE on hka_has_purpose; live grants owner/service_role only | Corrected; fresh helper ACLs are recreated and checked for all eight helpers. |
| Two helper bodies previously came from repository SQL without fresh metadata | Now taken directly from hosted catalog; previously captured six bodies are unchanged. |
| Prior link-code constraints were hand-reconstructed; secondary indexes omitted | Fresh constraints and relevant indexes now drive reconstruction. |
| Reparsing SELECT's deparsed nested OR flattens its parse tree and changes catalog text | Recreate original participant IN expression; exact post-reconstruction pg_policies equality is required. Migration drift detection remains unchanged. |
| Minimal auth.users/auth.uid fixtures, synthetic non-login roles and superuser local migration owner | Local claim behavior is equivalent for exercised subjects; hosted identity service, complete auth schema, role memberships and non-superuser migration execution are not reproduced. Hosted owner is BYPASSRLS and owns required tables. |
| Only seven messaging-related public tables plus minimal hka_files policy dependency | Complete unrelated app/storage schema and non-message service_role table ACLs are not restored; no claim of full Supabase equivalence. |
| No PostgREST/auth/realtime/storage services inside local container | Effective hosted PostgREST exposure inspected separately; actual authenticated hosted delivery/browser acceptance remains unproven. |
| Real messages, identities and consents excluded | Preservation proven on synthetic history/receipts only; no live rows were read or changed. |

[Machine comparison](founder-messaging-evidence/compatibility-comparison.json) records exact policy matches, artifact hashes, dependency comparisons and fixture corrections. Raw schema/suite/committed logs are listed in the canonical execution receipt. Earlier fixture-generation failures belong to earlier run IDs and are superseded by this complete passing run; the canonical disabled-guard rejection log intentionally contains an ERROR and exit 3 because rejection is the required result.

## Founder decision boundary

Requested compatibility work is complete. Prepared scripts retain all reviewed protections and need no policy-role revision. Hosted application installation/deployment remains unauthorised. Existing safeguarding consent interpretation and separately authorised designated-account acceptance remain release gates; current live legacy policy behavior is unchanged. Review this snapshot, unchanged proposal hashes, isolated evidence and remaining fixture limits before any final Founder approval.
