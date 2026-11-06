# Message Hollie — Founder approval package

Status: frontend prepared; backend SQL NOT APPLIED. Separate, explicit Founder approval of the linked forward SQL is required before any connected-project mutation. This request to prepare SQL is not that approval.

Target: existing connected project `sqaydpbqycvaictieafk`. Latest read-only metadata on 6 November 2026 still shows no `hka_message_contacts`, non-null `hka_messages.student_id`, and legacy assignment-scoped INSERT/global Admin SELECT. Frontend changes alone cannot activate delivery or enforce the proposed privacy rules.

## Exact scripts

- [Forward SQL](../supabase/proposals/202611060001_message_hollie.sql)
- [Restrictive rollback](../supabase/proposals/202611060001_message_hollie.rollback.sql)

These scripts supersede the October messaging proposal, remain outside automatic migrations, and must not be run together with it. Neither script changes existing messages, roles, assignments, plans or guardian consent records. Forward migration is transactional, locks only the message table, checks existing policy expressions and RLS, and aborts on schema/permission drift.

## Intended access

An active messaging account means confirmed email, unsuspended profile, and at least one durable authorised account purpose. Existing activation safeguards for minors still require an approved, consented adult guardian link. Selected dashboard and plan do not determine messaging access. Existing activation consent suffices for Founder contact: no coaching assignment, invitation code, coaching consent or separate chat approval is introduced.

An authorised Founder can initiate a private conversation with any active member. All active members, including external Coaches and Horse Owners, can initiate the same channel to Founder. Founder identity comes from durable authorised Admin purpose, even when using another dashboard.

One conversation per Founder/member pair is assembled from existing message rows; legacy child scopes and current canonical scopes share that pair. Dashboard/purpose changes preserve conversation and draft identity. Each send still rechecks the exact current server contact grant and scope. This reuses `hka_messages`; no parallel conversation store is added.

New messages are inserted with `read_at = NULL`, reach the recipient's existing Messages inbox, and remain unread until the recipient opens the visible conversation. Only the recipient may set a server-generated read timestamp; content, participants and message timestamps cannot be changed. Realtime updates and existing polling refresh inboxes.

SELECT is limited to active participants and authorised guardians overseeing a linked minor who actually participates. No global Founder access to other people's conversations; no access to another guardian's adult private messages. Guardian oversight is read-only and cannot impersonate the child or mark the recipient's messages read.

External Coach access to everyone except Founder retains authorised Coach purpose, saved student assignment and, for minors, approved/unrevoked Coach link plus Founder approval and guardian consent. Other ordinary users cannot browse the member directory. Founder directory entries expose only minimal identity/contact fields for active members; legitimate historical contacts can remain history-only.

## Rollback

Rollback freezes platform-wide Founder direct sends and directory grants. It preserves messages, nullable adult direct scopes, strict participant/minor-guardian privacy, recipient-only read receipts, public contact API, and approved relationship messaging. It deliberately does not restore unsafe global Admin reads or broad legacy UPDATE permissions.

Rollback verifies exact installed function definitions/owners/ACLs, policies and enabled trigger state against an owner-only installation snapshot. It aborts on drift or repeat execution. Retain the current grant-aware frontend; re-enabling direct messaging requires a reviewed forward change.

## Approval and acceptance sequence

1. Review the exact forward and rollback scripts. Confirm `hka_messaging` is excluded from exposed Data API/GraphQL schemas; missing database settings are not evidence of exclusion.
2. Approve an isolated matching-schema SQL run separately if desired. Prepared runner: `node supabase/tests/founder_messaging/run-message-hollie.cjs --prepare-only` only generates SQL/hashes and makes no database connection. Actual execution retains its explicit local-only approval and empty disposable-schema guards.
3. Before live execution, obtain separate Founder approval naming this exact forward file and connected project; recheck metadata and hashes. Apply through the connected SQL tool only after approval.
4. With designated authorised test sessions, send member-to-Founder through Message Hollie; confirm a saved unread row in Founder Dashboard → Messages before opening it, reply as Founder, refresh both accounts, and confirm recipient-only read status. Test Founder initiation for Student, Guardian, Coach and Horse Owner on free/basic/premium accounts.
5. Switch authorised dashboards and reopen floating/full inboxes; require one pair and retained history/draft. Test desktop and 320px mobile layouts, Account Settings and public pages while signed in.
6. Direct API denial cases: anonymous, suspended, unconfirmed, pending/revoked purposes, spoofed sender/scope, pre-read INSERT, body/participant UPDATE, DELETE, unrelated Coach/student, missing/revoked minor activation consent and missing/revoked external Coach consent.
7. Verify participant privacy, linked-minor guardian oversight, no adult-child-scope leakage between guardians, no global Founder read, no cross-role directory for ordinary users, and immediate revocation on next send.
8. Run rollback in isolated environment with existing adult/null-scope messages: no data loss, no new platform direct sends/directory, legitimate history and approved Coach messaging retained; reject altered/disabled guards and policy drift.

Local production build, TypeScript and scoped ESLint passed. Ten actual-app browser checks passed with intercepted Supabase traffic: all four member roles, unread Founder receipt/reply, Founder initiation from a linked inbox, dashboard switching with one thread and retained draft, 320px public entry/expanded inbox, missing-backend handling and denied-send draft retention. Controlled missing-RPC/denied-send cases intentionally returned 404/403; no unexpected browser exceptions occurred.

Evidence: [browser results](../.elmony/message-hollie-evidence/results.json), [fresh read-only metadata](message-hollie-readonly.json), [108 prepared SQL assertions and exact script hashes](message-hollie-suite-preparation.json). SQL suite was generated only; no SQL parser/database execution, live message delivery or backend mutation occurred. Local fixtures do not prove deployed RLS or live persistence. Hosted delivery remains pending separate Founder approval and authorised acceptance sessions.
