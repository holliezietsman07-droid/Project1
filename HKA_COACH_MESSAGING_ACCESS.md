# Archived HKA coach assignments and messaging access

**CORRECTION — 2026-10-31:** The Founder-assignment workaround and no-migration recommendation below are withdrawn. Founder/Admin direct messaging must be platform-wide, independent of coaching assignments. External Coach access remains assigned and consent-scoped. Use the corrected messaging section in [HKA_UX_LAUNCH_REPORT.md](HKA_UX_LAUNCH_REPORT.md) and current [HKA_RELEASE_CHECKLIST.md](HKA_RELEASE_CHECKLIST.md). The material below is historical diagnosis, not current setup instructions.

Date: 2026-10-31. Status: **READ-ONLY DIAGNOSIS VERIFIED; LOCAL CONTROLS VERIFIED; LIVE ASSIGNMENT / DELIVERY NOT TESTED.**

This focused review supersedes the Founder-role uncertainty and generic assignment instructions in HKA_UX_LAUNCH_REPORT.md. No live assignment, role change, message, consent decision, RLS change, migration, deployment or other record mutation was made. Supabase project remains `sqaydpbqycvaictieafk`.

## Direct answers

| Question | Observed answer |
| --- | --- |
| Is Founder currently an approved Coach? | Founder is the single **non-suspended admin account**, with an **authorized, active admin account purpose**. There is **no authorized separate coach purpose**. This is valid Founder access, not a pending Coach application. Do not change/downgrade the Founder role to fix messaging. |
| Can Founder act as the academy teaching/messaging contact? | **Yes, under admin permissions.** Live `hka_admin()` recognises the admin role, message INSERT explicitly allows admin senders, and assignment INSERT explicitly permits a coach_id whose profile role is admin. The ordinary `hka_coaches(student)` helper instead requires active coach role, authorized coach purpose and a matching assignment; it is not the route through which Founder gets admin access. |
| Does each Student need an explicit Founder assignment? | **Yes.** Student message INSERT checks that student_id equals the caller and recipient_id occurs as coach_id on that caller's `hka_coach_students` row. There is no automatic “all students can message Founder” exception. Existing messages or role approval alone do not create that row. |
| What is missing now? | Fresh read-only count: **zero hka_coach_students rows**. Thus no current Student has the explicit relationship required for Student-to-Founder/Coach sends. |
| Can Founder manage it from Student Management? | **Yes:** Dashboard → Students → the intended student's **Manage** button opens the existing inline management controls. The dedicated name-linked student profile and the directory's Manage action are distinct destinations; assignment controls live under Manage. |
| Is that interface connected to the existing backend? | **Yes in source and isolated request tests:** explicit submit → existing saveRow → existing Supabase singleton → POST hka_coach_students with exactly student_id and coach_id. A fresh relationship read precedes insertion, errors retain context, and success requires a returned saved row. Real authenticated save is **NOT TESTED**. |
| Is a migration or broader message policy needed? | **No change is needed for the observed missing Founder assignment.** Founder must explicitly choose and approve each real pair through existing controls. No bulk or automatic assignment is justified. |

The current admin-purpose row returned `purpose=admin, status=authorized, is_active=true`; the profile returned `role=admin, suspended=false`. The separate authorized-coach-purpose check returned false. These statements describe the read-only snapshot, not an impersonated Founder login or a successful send.

## Relationship and approval model

There are separate checks for account eligibility, student-specific relationships and guardian consent.

1. **Founder/admin:** the existing assignment policy accepts an admin profile as the teaching contact. After the Founder explicitly links the intended Student to that admin profile, the Student recipient check can match that row. This does not change the Founder's role or grant another person access to minors.
2. **Other Coach account:** account-purpose approval alone is insufficient. Student creates a Coach invitation code under Account Settings → Secure student linking. Coach applies for the Coach purpose and redeems that code using the existing linking form.
3. **Founder reviews the student link:** current live `hka_review_student_link(request_id, approve)` requires Founder access, authorises the coach purpose and handles the student relationship. For an adult Student it inserts the assignment and marks the link approved.
4. **Minor:** the same function marks the request awaiting_guardian instead of inserting the assignment. Current live `hka_guardian_coach_consent(request_id, approve)` requires the caller's approved guardian relationship and non-null consent_at; approval then inserts the coach/student relationship and records guardian_consented_at. Missing guardian approval must not be bypassed.
5. **Coach use:** the live `hka_coaches` helper also requires the Coach role and an authorized Coach purpose. An approved multi-purpose user may need the existing authorised dashboard switch before using Coach views. Founder should remain admin.
6. **Revocation:** AccountRoleSettings already invokes the existing `hka_revoke_student_link` RPC. Source removes the Coach assignment on Coach-link revocation. Actual connected revocation/negative-access acceptance remains NOT TESTED.

Existing UI calls in AccountRoles.tsx use the exact current live RPC names and argument names for Founder link review and guardian Coach consent. None were invoked during this review.

## Safe refinement of the existing assignment interface

The former generic Assign coach form wrote directly to hka_coach_students for either an admin or ordinary Coach profile. The inspected assignment WITH CHECK expression validates admin caller plus target profile roles; it does not itself encode invitation approval or guardian consent. Therefore, the generic form must not be treated as proof of an external Coach's approved relationship.

The existing form was refined without changing server permissions:

- It now clearly offers **Link Founder for messaging**, with actual saved relationship names/status.
- Direct targets are active admin/Founder profiles only. Other coaches continue through existing Founder link approval and guardian-consent RPCs; their approval workflow was not replaced.
- Actor, Student, target, self-pair and duplicate checks run before insert. A fresh saved-link read protects against stale duplicates; a submit lock prevents duplicate requests.
- Suspended targets/Students and unknown records are rejected. Existing assignment choices are disabled instead of appearing available for duplicate creation.
- Loading/read failures prevent assignment; the UI never claims an unsaved relationship exists.
- This is an existing Founder-controlled write entry point for a **future explicit Founder action**. No live submit was performed by this agent.

No third-party Coach is linked automatically. Existing student profiles, guardian links, messages and attachments/history are preserved. Backend enforcement beyond the existing policies was not changed; any desired future policy hardening still needs a separate exact review and Founder approval.

## Messaging contact availability

- Conversation candidate creation now applies the same authorization callback used by the composer. A denied empty contact is not offered as “Start conversation”.
- Existing RLS-visible message history is retained even if the relationship is absent/revoked; these threads are marked **History only** and have no sending composer.
- Actual peer/student IDs remain accurate in historical threads; no self-recipient or artificial conversation is created.
- Student recipient candidates come from real assignment rows, not a list of all academy staff. Known suspended peers are excluded.
- Ordinary Coach send controls additionally require a currently authorized Coach account purpose from existing hka_account_roles.
- Unassigned Students continue to see the explanation that Founder must establish their academy coaching relationship. No technical database error is needed to explain that state.
- Missing staff names remain governed by existing profile privacy. The earlier optional narrow staff-name lookup proposal is separate from assignment eligibility and was not applied.

## Exact Founder action needed

1. Identify the intended **real Student record**, especially where two separate accounts share a name; use the existing dedicated profile, joined date and record context rather than merging accounts.
2. Open **Founder Dashboard → Students → Manage** for that record.
3. In Coaching relationships, confirm no relationship already exists, select the Founder profile, and explicitly choose **Link Founder for messaging** for that Student.
4. Repeat only for separately approved intended pairs. Do not grant all Students or all Coaches access.
5. For any external Coach, use the invitation → Founder student-link approval → required guardian-consent workflow described above instead of the Founder-link form.
6. Separately approve the designated two-account acceptance before sending live test messages or changing/revoking any approved relationship.

No additional Coach-role approval is required merely to retain Founder/admin access as the assigned recipient. No migration, blanket RLS exception or Founder-role conversion is proposed.

## Two-account acceptance after an approved assignment

**All connected steps below remain NOT TESTED.** Use explicitly authorised real accounts and designated records; no credentials/tokens should enter reports.

1. In the approved Founder session, perform the chosen relationship action and verify the returned saved relationship, correct Student and correct Founder. Refresh and reopen Manage to confirm persistence.
2. In a separate authorised Student browser/session, open Messages. Confirm the assigned contact/actual peer, the correct student scope, and absence of unrelated available contacts.
3. With approved real message content, send once. Confirm one stored message with sender=Student, recipient=the assigned Founder, student scope=that same Student; do not use the composite conversation key as student_id.
4. In the Founder account, open that exact thread, verify the received content, and reply to the Student. Refresh both sessions to verify history and exact recipient mapping.
5. Verify unread badges/read receipts only change for the actual recipient after opening the conversation. Check desktop and phone composer/Send accessibility and failed-send draft retention.
6. In an unrelated authorised account, verify the thread/contact is unavailable under its existing permissions. Do not use privileged tools or forged sessions to simulate this.
7. For an external Coach/minor scenario, verify pending/absent guardian consent does not produce an assignment; only the already-approved guardian may consent. With separate approval, test revocation through the existing RPC/UI and confirm sending becomes unavailable while legitimately readable history remains.
8. Record actual positive and negative results separately. Do not certify connected delivery/RLS rejection from local callbacks or a production build.

If the live approved pair still receives 42501, capture the exact non-secret sender/student/recipient mapping in an authorised local diagnostic context, compare the saved assignment and active roles, and inspect the rejecting policy. Do not relax RLS or add a self-conversation to hide the failure.

## Local checks actually run

| Check | Result and scope |
| --- | --- |
| Current Supabase reads | VERIFIED: one active authorized admin purpose, non-suspended admin profile, no authorized separate Coach purpose, zero assignments; live hka_admin/hka_coaches/review/guardian-consent definitions and message/assignment policies inspected. SELECT/metadata only. |
| TypeScript application | `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit` PASS, exit 0. |
| Production build | `node node_modules/vite/bin/vite.js build --outDir .elmony/coach-access-build` PASS, 2,640 modules; existing large-bundle warning only. |
| Source lint | `node node_modules/eslint/bin/eslint.js src --format json --output-file .elmony/coach-access-evidence/lint.json` PASS, 0 errors / 13 existing warnings. |
| Focused assignment/contact unit checks | `node .elmony/coach-access-unit.cjs`: **15 PASS / 0 FAIL**, synthetic Founder eligibility, missing/other/self/suspended/duplicate relationships, denied contacts and retained history. |
| Existing messaging units | `node .elmony/launch-messaging-unit.cjs`: **19 PASS / 0 FAIL**, allowed/denied recipients and consent. |
| Existing conversation/auth/time units | `node .elmony/release-unit-check.cjs`: **23 PASS / 0 FAIL**. |
| Assignment interface request checks | `node .elmony/coach-access-prepare.cjs`, then `node .elmony/coach-access-browser.cjs`: **6 PASS / 0 FAIL**. Actual UI at 1440/390 px; external Coach hidden, saved link visible/disabled, exact s/f POST pair and duplicate-submit lock checked. All Supabase traffic intercepted; POST deliberately returned 403. No live write. |
| Existing composer browser regressions | `node .elmony/launch-message-browser.cjs`: **6 PASS / 0 FAIL**, 1440/768/390/320 px, drafts, consent-denied composer, visibility/read callback and duplicate submission. Synthetic callbacks only. |
| Existing directory regressions | `node .elmony/launch-directory-wrapper.cjs`: **4 PASS / 0 FAIL**, same four widths, distinct record navigation/search. No live records. |

Evidence: `.elmony/coach-access-evidence/`; read-only observations in readonly.json. Browser assignment requests used isolated synthetic Student/Founder IDs, a browser-only session hook stub, and a controlled rejected response. Those results prove request wiring and honest error handling, not authenticated persistence. Intentional intercepted HTTP 403 console entries are recorded separately; zero unexpected browser errors/uncaught exceptions were reported. Phone relationship controls were visually reviewed.

Checkpoint before this work: `.elmony-checkpoints/coach-access-20261031/`.

## Files changed and continuation

Application source:
- `src/components/accounts/OwnerDashboard.tsx`: existing Founder assignment controls and guarded submit.
- `src/components/accounts/ConversationWorkspace.tsx`: candidate authorization and History only labels.
- `src/lib/conversations.ts`: authorization-aware new contacts while preserving read history/peer IDs.
- `src/lib/messaging.ts`: Founder-link validation and known suspended-peer denial.
- `src/hooks/use-messaging.ts`: ordinary Coach purpose approval check through the existing client.

Documentation: this file, HKA_RELEASE_CHECKLIST.md and the latest-review pointer in HKA_UX_LAUNCH_REPORT.md. Local QA files live under .elmony/coach-access-*.

**Next action belongs to Founder:** approve the exact real Student/Founder pair and perform the explicit existing relationship action, then approve two-account acceptance. No database/schema/policy change or deployment is needed to proceed with that specific observed gap.
