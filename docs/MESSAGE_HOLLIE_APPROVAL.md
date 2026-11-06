# Message Hollie — Founder approval package

Status: revised frontend and SQL prepared; backend SQL NOT APPLIED. No disposable SQL has run for this revision. Separate, explicit Founder approval is required before disposable execution; connected project `sqaydpbqycvaictieafk` remains pending until Founder reviews send, reply, privacy and rollback results and separately approves connected execution.

## Revised files and exact checksums

[SHA-256 manifest](message-hollie-checksums.json) lists exact file hashes, including source, SQL, fixtures, test runners, generated SQL and browser evidence.
[Isolated test plan](MESSAGE_HOLLIE_ISOLATED_TEST_PLAN.md) defines destination, inputs, approval gates, expected observations, evidence and cleanup.

| File | Revision |
| --- | --- |
| [Forward SQL](../supabase/proposals/202611060001_message_hollie.sql) | Binds messaging Founder to Hollie's designated auth UUID, validates eligibility and returns the same `founder_id` on every contact grant. |
| [Rollback SQL](../supabase/proposals/202611060001_message_hollie.rollback.sql) | Retains eleven-column contact contract and exact Founder binding; freezes new direct sends without restoring broad legacy access. |
| [messaging.ts](../src/lib/messaging.ts) | Resolves designated identity from server grants; missing/conflicting identity fails closed; Admin is labelled separately. |
| [conversations.ts](../src/lib/conversations.ts) | Only designated Founder/member pair merges direct history across scopes; another Admin's history remains scope-separated. |
| [FloatingAcademyChat.tsx](../src/components/accounts/FloatingAcademyChat.tsx) | Message Hollie and Founder inbox selection use designated identity rather than any authorised Admin. |
| [AcademyMessages.tsx](../src/components/accounts/AcademyMessages.tsx) | Uses designated contact; exposes visible Message Hollie action in Coach's dedicated Messages page and other full member inboxes. |
| [fixtures.sql](../supabase/tests/founder_messaging/fixtures.sql) | 18 synthetic accounts, two eligible Admins; local Founder UUID matches reviewed designation; adult Horse Owner has no Student purpose. |
| [SQL preparation/execution runner](../supabase/tests/founder_messaging/run-message-hollie.cjs) | Prepares 129 assertions, hashes and schema without connection; execution requires separate local approval, explicit forward/rollback hashes and empty loopback test database. |
| [Browser test](../.elmony/message-hollie-browser.cjs) | Two Admins, exact NULL-scope owner payload, unread Founder Messages receipt, exact reply and dedicated Coach Messages entry. |
| [Unit checks](../.elmony/message-hollie-unit.cjs) | Admin ordering, missing/conflicting designation, canonical pair identity, scope preservation and strict grant checks. |

## Founder identity and privacy

Designated account: **Hollie Zietsman**, `auth.users.id = f7c3e52e-4f5e-47d0-8139-b28cb296d526`.
Source: existing [Founder activation](../supabase/activation/202610220001_founder_role.sql), not display name, email, selected dashboard, first contact or Admin role alone.
Forward preflight aborts if this UUID is absent, suspended, unconfirmed, non-adult or lacks authorised durable Admin purpose. It does not change roles or account identity.
Other eligible Admins receive Message Hollie as ordinary members; they gain no Founder messaging directory or unrelated conversation access.

An active account means confirmed email, unsuspended profile and durable authorised purpose. Existing consented, approved Guardian activation remains mandatory for minors. No plan, coaching assignment, link code or separate chat approval is added for Founder contact.
External Coach access to other users retains assignment and existing approval/consent requirements.

One direct conversation per designated Founder/member pair survives dashboard changes. Adult Horse Owner with only Horse Owner purpose uses `student_id = NULL`; durable Students and minors retain canonical safeguarding scope.
Every send rechecks current server grants and table RLS. New messages are unread until recipient opens visible conversation.
Only recipient may record server-generated read receipt; message content/identity/timestamps cannot be rewritten.
SELECT remains limited to active participants and authorised Guardians overseeing linked minors who actually participate; no global Founder/Admin access to private third-party conversations.

## Exact SQL and rollback boundaries

These proposals remain outside automatic migrations and supersede October messaging SQL; do not apply both proposals.
Neither changes saved messages, roles, assignments, plans or Guardian consent records.
Forward transaction checks full baseline policies/schema/permissions and designated identity, locks message table, and aborts on drift.
Confirm private `hka_messaging` is excluded from Data API/GraphQL exposed schemas; absent database settings do not prove exclusion.

Rollback freezes platform-wide Founder direct sends and directory grants while retaining rows, nullable adult history, strict participant/minor-Guardian privacy, recipient-only receipts, approved relationships, private helpers and public contact API including `founder_id`.
It verifies exact installed definitions/owners/ACLs/policies and enabled immutable-message guard against owner-only snapshot; rejects drift, disabled/replica guards and repeat execution.
Retain grant-aware frontend after rollback. Re-enable only through separately reviewed forward SQL.

## Current evidence and unproven results

Production build, TypeScript and scoped ESLint passed; unit checks passed.
[Actual-app browser results](../.elmony/message-hollie-evidence/results.json): **13 passing checks**, six synthetic accounts, two Admins, all remote traffic intercepted, realtime blocked.
A history-only second Admin sorts before Hollie for adult owner. Entire outgoing object is asserted:

```json
{
  "student_id": null,
  "sender_id": "10000000-0000-4000-8000-000000000005",
  "recipient_id": "f7c3e52e-4f5e-47d0-8139-b28cb296d526",
  "body": "Adult Horse Owner exact message to Hollie"
}
```

Browser observes that exact text with unread thread badge in Founder Dashboard → Messages before opening owner thread, then asserts exact reply and refreshed owner receipt.
Coach test follows dedicated Messages navigation and page-level Message Hollie entry, then asserts exact send to designated UUID.
Controlled missing-RPC/denied-send cases deliberately return 404/403 and preserve draft/pending state; no unexpected browser exceptions occurred.
Screenshots and exact routes/payloads are linked in [isolated plan](MESSAGE_HOLLIE_ISOLATED_TEST_PLAN.md).

[SQL preparation evidence](message-hollie-suite-preparation.json): **129 assertions PREPARED_NOT_EXECUTED**, including second-Admin restrictions, owner NULL scope, exact unread receipt/reply, safeguarding, privacy, immutable writes and restrictive rollback.
No SQL parser/database execution, hosted message delivery, live persistence or backend mutation has occurred for this revision.
Intercepted browser state does not prove deployed RLS/JWT handling. Database send/reply/privacy/rollback results remain pending separate disposable approval; committed cross-connection persistence and hosted acceptance remain unproven.

## Separate approvals

**Approval requested now:** run only this exact reviewed revision in a fresh isolated local disposable database, as detailed in [isolated plan](MESSAGE_HOLLIE_ISOLATED_TEST_PLAN.md), and return send, reply, privacy and rollback evidence for Founder review.

**Not authorised:** connected SQL, hosted messages, function deployment, or connected rollout.
Keep connected project pending after local execution until Founder reviews those results and separately approves exact forward SQL/hash for `sqaydpbqycvaictieafk`.
This prepared package and any previous local testing approval do not grant either approval.
