# Message Hollie — revised Founder approval package

Status: revised frontend and mocked browser checks passed; all SQL remains UNAPPLIED. Connected project `sqaydpbqycvaictieafk` stays pending until Founder reviews send, reply, privacy and rollback results and separately approves the final bound SQL.

## Review files and checksums

- [Exact forward proposal](../supabase/proposals/202611060001_message_hollie.sql)
- [Exact restrictive rollback](../supabase/proposals/202611060001_message_hollie.rollback.sql)
- [SHA-256 manifest for revised files and test inputs](message-hollie-checksums.json)
- [Isolated test plan and requested approval scope](MESSAGE_HOLLIE_ISOLATED_TEST_PLAN.md)
- [128-assertion preparation receipt](message-hollie-suite-preparation.json)
- [Generated isolated SQL suite](../.elmony/message-hollie-security-suite.sql)
- [Generated schema-only reconstruction](../.elmony/message-hollie-local-schema.sql)
- [Local browser results and exact outgoing requests](../.elmony/message-hollie-evidence/results.json)

Scripts remain outside automatic migrations and supersede the October messaging proposal. Do not execute both proposals. No database SQL, connected messages, deployments, role changes or application-row access occurred in this revision.

## Designated Founder binding

Founder now means one explicitly bound Supabase Auth UUID, checked against active, verified adult account and durable authorised Admin purpose. Other Admins remain ordinary messaging participants. Suspension or revocation of designated Founder disables contact instead of selecting another Admin.

Founder has not supplied their designated Auth UUID. Forward proposal contains `REPLACE_WITH_HOLLIE_AUTH_USER_UUID` in the owner-only `hka_messaging.founder_id()` helper. This unresolved token aborts execution, with no Admin/name/email fallback. Supply the correct Auth UUID, then regenerate and review final hashes before connected approval. No synthetic fixture ID is suitable for that binding.

The private contacts implementation and public invoker wrapper now return eleven columns: existing ten plus `founder_id uuid`. Shared UI selects Hollie by this server designation, independent of role/order; conflicting or absent designation fails closed. Generic Admin accounts no longer receive Founder floating controls or cause unrelated conversations to merge as Founder threads. Rollback retains this contract and verifies exact installed identity helper definition/owner/ACL using the installation snapshot.

## Revised source and test files

- [messaging.ts](../src/lib/messaging.ts): shared designated-contact selection and distinct Admin label.
- [conversations.ts](../src/lib/conversations.ts): direct-thread identity follows designated Founder rather than every Admin.
- [FloatingAcademyChat.tsx](../src/components/accounts/FloatingAcademyChat.tsx): designated Founder controls and precise Hollie recipient.
- [AcademyMessages.tsx](../src/components/accounts/AcademyMessages.tsx): same designation and visible dedicated Message Hollie entry; preserves Messages route when Coach enters through hash navigation.
- [Browser harness](../.elmony/message-hollie-browser.cjs): two Admins with another Admin listed first; exact outgoing requests, adult Horse Owner NULL scope, unread Founder inbox row, exact reply, refreshed Horse Owner receipt, and Coach sidebar → Messages → dedicated Message Hollie entry.
- [Source/conversation regressions](../.elmony/message-hollie-unit.cjs): both Admin orders, absent/conflicting designation, scoped non-Founder Admin history and existing privacy/grant checks.
- [Isolated SQL runner](../supabase/tests/founder_messaging/run-message-hollie.cjs): 18 synthetic accounts including another Admin, exact Horse Owner payload/unread/reply assertions, designated-Founder revocation/suspension, no fallback, identity-drift rollback rejection and restrictive rollback checks.

Shared October fixtures/runners and existing Supabase client are reused without replacing the backend. The revised runner extends fixtures in memory and generates separate November artifacts; the October runner does not exercise this revision.

## Corrected adult Horse Owner proof

Browser fixture has only Horse Owner purpose and an adult date of birth; its Student dashboard role does not create Student messaging scope. Exact outgoing insert is:

```json
{
  "student_id": null,
  "sender_id": "10000000-0000-4000-8000-000000000005",
  "recipient_id": "10000000-0000-4000-8000-000000000001",
  "body": "Adult Horse Owner exact message to Hollie"
}
```

Browser verifies all four fields, then finds the exact saved message with NULL scope and NULL read receipt. Founder overview shows five unread messages. Inside Founder Dashboard → Messages, Horse Owner conversation displays exact body and unread count 1 while another thread is open. Only opening Horse Owner thread marks that message read. Exact Founder reply retains NULL scope, targets Horse Owner and remains unread until Horse Owner opens it after refresh.

[Unread Founder inbox screenshot](../.elmony/message-hollie-evidence/founder-horse-owner-unread.png) · [Coach dedicated Messages screenshot](../.elmony/message-hollie-evidence/coach-dedicated-message-hollie.png).

These observations use intercepted, in-memory Supabase responses. They prove current local UI/SDK request behavior, not database persistence, deployed RLS, real Auth identities or hosted delivery.

## Completed local checks and pending database proof

Production build, project TypeScript, scoped ESLint and source/conversation regressions passed on revised frontend. All 13 local browser cases passed, including two Admins, Horse Owner unread/reply and Coach dedicated Messages flow. Expected missing-backend and denied-send responses were 404/403; no unexpected browser exceptions occurred.

Preparation generated 128 SQL assertions plus schema SQL and hashes without opening a database connection. No SQL parser/database execution or new rollback result exists for these revised scripts. Earlier October database results are historical and cannot approve this revision. [Previous read-only metadata](message-hollie-readonly.json) is retained as dated context, not a fresh inspection.

## Separate approval gates

1. Review exact files, hashes and isolated plan. Approve disposable SQL testing separately, naming its local target and manifest; approval covers synthetic setup, send/reply/privacy/rollback assertions and cleanup only.
2. Execute only after that approval, retain full results and cleanup receipt, then present results for Founder review.
3. Resolve actual Founder UUID, rehash final bound proposal and recheck current connected schema/policies plus private-schema exclusion.
4. Keep connected project pending until Founder reviews all send, reply, privacy and rollback evidence and grants separate approval naming final SQL hash and connected project. Hosted real-account acceptance requires its own authorised sessions.

No approval is inferred from this preparation request, an environment flag, mocked browser success or earlier tests.
