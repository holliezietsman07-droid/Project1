# HKA UX and invitation-only launch review

Current correction: section 1 below supersedes all prior Founder-assignment advice, including [HKA_COACH_MESSAGING_ACCESS.md](HKA_COACH_MESSAGING_ACCESS.md). Founder/Admin direct messaging is platform-wide; approved external Coaches remain restricted to assigned, authorised relationships. Database proposal and rollback are prepared but unapplied.

Date: 2026-10-31. Release decision: **NOT READY — authorised acceptance and Founder actions remain outstanding.**

This report accompanies the latest section of HKA_RELEASE_CHECKLIST.md. IMPLEMENTED means source exists; VERIFIED means the specific local check below passed; BLOCKED and NOT TESTED remain separate from live acceptance. No deployment, database mutation, applied migration, live policy change, course publication, test-account creation, billing change or real message/appointment write occurred; messaging SQL is prepared for separate approval only.

## Recoverability and preserved boundaries

Pre-edit source and release checklist: `.elmony-checkpoints/launch-refinement-20261031/`.
Changed-source hashes and protected-file comparisons: `.elmony/launch-refinement-evidence/change-review.json`.

Read the four-page Professional Website Designer & Quality Control master prompt, approved student and Founder visual references, release checklist, recovery notes, actual routes, Supabase singleton and related source before implementation. Existing logo, uploaded photographs, visual identity, forest green, ivory, antique gold and tagline remain. Auth/session infrastructure, App routes, Supabase client, core academy helpers, coaching time/DST helpers and payment files match the checkpoint byte-for-byte. Existing photo upload, crop, private-image and shared dashboard navigation helper block also matches byte-for-byte. Those preservation statements describe the earlier launch refinement. This correction adds unapplied SQL proposals and the focused route/UI changes documented in section 1; auth/session, existing client, payments and public assets remain preserved.

## 1. Corrected messaging permissions — frontend implemented; database approval pending

The earlier recommendation to assign every Student to Founder for messaging was incorrect and is withdrawn. Founder/Admin messaging is platform-wide and independent of coaching assignments. External Coach messaging remains limited to approved, assigned relationships.

### Correct permission levels

| Account | New conversations and replies | Private history and directory |
| --- | --- | --- |
| Verified, authorised Founder/Admin | Any eligible registered Student, Parent/Guardian, Coach or Horse Owner, without a coaching assignment. | Search all registered user names and role labels, including unavailable accounts with disabled Message actions. Read conversations in which Founder participates; no global read access to private Coach conversations. |
| Approved external Coach | Founder plus assigned Students and their authorised, consented guardians. Minor relationships additionally require the existing approved coach-link and guardian-consent evidence. | No platform directory, unrelated Students, or other Coaches' private conversations. Own historic participant threads remain readable after assignment revocation, while new sends are disabled. |
| Student / Parent / Horse Owner | Founder directly, plus assigned Coaches or explicitly approved family participants where applicable. | Names from authorised contacts/history only. Guardians retain existing consent-based student oversight; viewing never impersonates either participant or marks another recipient's messages read. |

Existing account verification, suspension, authorised active purpose and guardian consent checks remain authoritative through hka_active. A registered but ineligible account is visible only to Founder as unavailable; this does not approve a Coach application or grant access to a minor.

### Read-only backend findings this turn

Connected project: `sqaydpbqycvaictieafk`. The metadata tools confirmed:

- RLS is enabled on messages, profiles, assignments, guardians, account purposes and link requests.
- Message student_id is currently NOT NULL. INSERT binds sender_id to auth.uid(), permits admin sends, but Student replies require an assigned recipient. Founder messages to non-Student accounts also lack a legitimate nullable direct-message scope.
- Existing message SELECT permits participants, admin oversight and approved guardian oversight. UPDATE policy checks recipient identity but does not itself make sender/body/scope immutable.
- Live hka_role verifies email confirmation and non-suspended profile; hka_admin delegates to it. Live hka_coaches requires Coach role, authorised Coach purpose and matching assignment.
- Live hka_has_purpose, account-role/link schemas and guardian-coach-consent function were inspected. Guardian approval inserts the assignment only after the existing consent action.
- Further hka_active, hka_view_student and link-review RPC metadata reads were denied with exploration-budget reached; local migration definitions supplied the remaining implementation context. No SQL execution, row mutation or deployment followed that denial. Before approval/application, re-read those live definitions, table constraints, grants and trigger metadata and compare all three message policy expressions against this proposal.
- Founder status and zero-assignment counts reported earlier are historical observations, not fresh account-row reads or authenticated delivery tests performed this turn. Founder needs no separate Coach purpose or assignment for Founder permissions.

### Frontend behavior

The existing `AcademyMessages → useMessaging → existing academy helpers → Supabase singleton` path is retained.

- hka_message_contacts is the single proposed authenticated contact/name projection. Only Founder gets directory entries for all registered users; ordinary contact selection requires a server can_message grant for the exact peer and student scope. Frontend roles alone never manufacture grants.
- New Message supports name/role search and role labels, Student/Parent/Coach/Horse Owner contacts, disabled unavailable accounts and links to Founder-only user-management profiles.
- `/dashboard/users/:userId` is inside the existing admin AccessGate in App.tsx. Its management profile opens the actual full Founder Messaging workspace with the exact contact parameter. Student Management also has a direct Message student action; the former Link Founder for messaging form was removed.
- Founder/Student direct messages keep the real Student ID, preserving guardian oversight. Founder/Parent and Founder/Coach use null student scope. Horse Owner accounts retain their actual profile identity and role label. Legacy scoped Founder history merges into the same participant pair without rewriting rows.
- Existing WhatsApp-style full workspace and floating Student/Guardian access remain. Guardian launcher is hidden inside full Messages so it cannot cover the composer. Recent timestamps, names, role labels, unread counts and Sent/Read states derive from saved rows.
- Session-bound sender identity, fresh server grants before each send, self-recipient denial, duplicate-submit lock, draft retention, recipient-only read updates, realtime subscription and polling remain. No optimistic fake saved-message or delivery claim was added.
- Until the approved RPC exists, show an approval-pending explanation, preserve available history and disable new sending. Missing RPC/RLS failures never tell users to assign Founder as Coach and never expose raw database errors. This frontend revision must not be released as a completed live messaging fix before the database gate is approved and validated.

### Exact database proposal — NOT APPLIED

Review `supabase/proposals/202610310001_founder_direct_messaging.sql`. It is deliberately outside automatic migrations.

1. Keep RLS enabled and fail if expected policy names/count changed; recheck exact expressions and grants before approval.
2. Make student_id nullable for legitimate direct messages that have no Student, without changing existing messages or relationships.
3. Add private Founder, Coach, guardian and scope helpers; authenticated policy entry points remain caller-bound. Approved Coach eligibility requires actual assignment and approved purpose, plus existing approved/minor-consent link evidence.
4. Add a minimal hka_message_contacts projection returning authorised names, role labels, relationship/scope, availability and registration timestamp. No emails, birthdays, onboarding, profile photos, auth tokens or broad profile-read policy is exposed.
5. Replace all three message policies: participant/consented guardian reads, exact authorised pair INSERT with sender_id=auth.uid(), and recipient-only read-state UPDATE. Founder initiation does not grant external Coaches any global permissions.
6. Add an immutable-message trigger and column UPDATE restrictions: sender, recipient, body, student scope, ID and creation timestamp cannot be changed by a recipient. Insert timestamps and read receipts are server-controlled. No arbitrary sender impersonation or history deletion is permitted.

Only policy entry points and the minimal contacts RPC are executable by authenticated clients; relationship helper functions are private. No existing role, assignment, guardian decision, consent RPC, enrolment, payment, message body or historical row is changed.

### Rollback plan — prepared, not executed

Review `supabase/proposals/202610310001_founder_direct_messaging.rollback.sql` with separate approval. Before application, record current policies, grants, triggers, constraints and frontend revision; abort on drift. Validate proposal and rollback on a disposable database with matching schema and designated local accounts first.

If rollout must be reversed, pause new messaging and restore the compatible frontend revision, then apply the approved rollback transaction. It reinstates the three observed policy expressions and removes the new contact/access functions. It intentionally keeps nullable student_id, column restrictions and the identity/read-state trigger: deleting valid new non-Student conversations or restoring sender-spoofing risks is unacceptable. This is a permission rollback, not destructive full-schema restoration. Existing old INSERT behavior again blocks unassigned Student-to-Founder replies, so release remains gated. Never re-enable NOT NULL while any direct-message row has null student_id.

### Verification and acceptance

Current observed local checks:

| Check | Result | Scope |
| --- | --- | --- |
| `node .elmony/founder-messaging-unit.cjs` | 33 PASS / 0 FAIL | Actual contact preflight/conversation logic, all role scopes, revoked/guardian cases, history/unread/name handling, proposed SQL structural assertions and admin route boundary |
| `node .elmony/founder-release-regression.cjs` | 23 PASS / 0 FAIL | Existing conversation/auth/time regressions with a QA-only TypeScript alias loader |
| `node .elmony/founder-messaging-browser.cjs` | 15 PASS / 0 FAIL | Actual AcademyMessages, useMessaging, composer, directory and management-profile components; 1440, 390 and 320 px; zero browser exceptions, zero console errors and zero remote traffic |
| Application/tooling TypeScript | PASS, exit 0 | tsconfig.app.json and tsconfig.node.json |
| Focused source ESLint | PASS, 0 errors / 0 warnings | Messaging components/services/hooks, management page, dashboards and App routes |
| Final local production build | PASS, 2,642 modules, exit 0 | .elmony/founder-messaging-build; existing bundle-size warning only |

Evidence: `.elmony/founder-messaging-evidence/unit.json`, `browser.json` and desktop/phone screenshots. Fixtures and client/session replacements are confined to QA harnesses under .elmony. Production source continues to use the existing real Supabase client. Synthetic grants and SQL source assertions do not prove database RLS execution.

Changed application files: `src/App.tsx`, `src/pages/Dashboard.tsx`, `src/pages/UserManagementProfile.tsx`, `src/components/accounts/OwnerDashboard.tsx`, `src/components/accounts/ConversationWorkspace.tsx`, `src/lib/conversations.ts`, `src/lib/messaging.ts`. Existing `AcademyMessages.tsx`, `MessageContactsDialog.tsx` and `use-messaging.ts` are reused and verified. Backend proposals, both required launch reports, the archived superseded access report and QA harness/evidence files are also updated. No dependency, auth provider, Supabase client, environment secret, billing implementation or live record was changed.

| Required scenario | Local proof | Live database / cross-account result |
| --- | --- | --- |
| Founder → unassigned Student | Grant preflight and canonical/history tests | NOT TESTED |
| Founder → Parent, Coach, Horse Owner | Scope/preflight tests and actual composer fixture | NOT TESTED |
| Recipients reply to Founder | Student, Parent and Owner real-component fixtures; Coach preflight | NOT TESTED |
| Approved Coach → assigned Student | Grant and authorised-contact fixtures | NOT TESTED |
| Coach → unrelated Student denied | Negative grant and contact-directory fixture | NOT TESTED |
| Unrelated users cannot read history | Proposed participant/guardian SELECT source assertions; no global Coach/Admin read | NOT TESTED; SQL not executed |
| Sender spoofing rejected | Real send handler uses session ID; proposed INSERT/immutable UPDATE source assertions | NOT TESTED; SQL not executed |
| History preserved | Legacy pair merge, revoked history and existing regressions | Reload/persistence NOT TESTED |
| Names, unread, timestamps, states | Unit and real-component fixtures at desktop/phone widths | Realtime/cross-session NOT TESTED |

### Founder approval and test procedure

1. Approve the exact proposal and safe rollback after fresh metadata review and disposable-database policy tests. No per-Student Founder assignment is required. Do not apply or deploy automatically.
2. Authorise designated real accounts and message content separately. Use an unassigned adult Student plus approved Parent, Coach and Horse Owner accounts; use a minor only with existing approved guardian consent.
3. In separate verified sessions, start each Founder conversation from New Message and from its management profile. Send once, reply once, reload both sessions, confirm exact sender/recipient/student scope and saved content, then verify unread/read behavior without marking a different recipient's messages.
4. Use one officially assigned approved Coach/Student pair for permitted messages and one unrelated Student for rejection. Verify a second Coach cannot list/read either private thread, a regular user cannot browse the platform directory, and direct API writes cannot forge sender or alter stored content.
5. Separately approve any consent revocation or relationship mutation used for negative tests. Verify revoked/pending relationships cannot send, and eligible historical participants retain only their legitimate history. No live test messages or assignments were created during this turn.

Remaining blockers: separate Founder database approval; fresh metadata/grant/constraint comparison; disposable SQL execution; and authorised positive/negative cross-account acceptance. No deployment has occurred.


## 2. Student experience — IMPLEMENTED / locally VERIFIED; live preference saves NOT TESTED

- First-time Home displays five purposeful next steps: profile, discipline/level/goals, suitable pathway, real course enrolment and optional coaching request.
- Completion derives from saved profile fields, the current student's `hka_account_roles.onboarding`, actual active enrolments and actual requests/appointments. Cancelled/declined requests and withdrawn/unrelated enrolments do not complete steps.
- The compact rider editor uses the existing `hka_request_account_purpose` RPC and merges saved onboarding fields. It does not introduce tables, local-storage onboarding flags or another profile architecture.
- Returning students see the next actual unfinished published lesson, outstanding course assignments, confirmed coaching, real feedback and achievements. Resume/assignment links target the exact existing CoursePlayer lesson.
- CoursePlayer honours an authorised published `?lesson=` selection; invalid IDs fall back to a real published lesson. Unsaved assignment work prompts before switching lessons or following a page link.
- Empty course catalogue explains that Hollie is preparing the first courses; no courses, enrolments or progress are manufactured.
- Read-only course inspection found **0 published courses, 1 unarchived draft, 2 draft-course modules, 1 draft-course lesson and 0 draft-course assessment questions**. Founder can open the real draft from Home, finish its content and preview it.
- Course Studio adds the sequence Course overview → Modules → Lessons → Assessments (if needed) → Preview → Publish, while retaining existing focused editors, materials, validation and explicit publish controls. **No course was published.**

## 3. Founder daily workspace — IMPLEMENTED / locally VERIFIED; authenticated persistence NOT TESTED

- Home retains the existing personalised banner and adds five genuine linked counts: pending coaching requests, upcoming lessons, submissions needing marking, course drafts and distinct students needing attention.
- Today’s Schedule uses the account timezone, chronological saved appointments and direct appointment links.
- Items Needing Attention links directly to request review, the designated submission feedback editor and the scoped student's messages.
- Quick Actions open New Course, the existing Founder scheduling workflow, Student Directory, or a clear student-selection route for an individual assignment.
- Courses in Preparation opens the selected actual draft. Empty states use genuine query results; unavailable reads show an error instead of false zero counts.
- Coaching pending filter, course draft filter, review tab and student attention filter have real consumers. Compact headings replace the Founder banner outside Home. Sidebar retains one Home destination; no Overview/Switch Dashboard item was restored.
- Founder advanced settings are collapsible without removing fields or changing existing autosave writes. General preferences retain explicit save and now protect unsaved edits.

## 4. Calendar and navigation — IMPLEMENTED / locally VERIFIED; live operations NOT TESTED

- Existing shared calendar and guided booking workflow remain; no replacement calendar was built.
- Dashboard appointment links select the correct saved day/month and open existing permitted appointment actions.
- Founder request links open the exact request; Schedule Lesson opens the existing focused workflow. Pending filters stay inside the existing coaching route.
- Founder-created appointments retain “saved and confirmed”; Student requests retain “pending Founder confirmation”. Selected dates, Back/Cancel, validation, conflict handling and DST conversion remain.
- Timezone labels and new dashboard times use the saved account timezone.
- Duplicate student names were investigated with read-only aggregates: **one matching-name group contains two records with two distinct profile IDs**, created on 21 and 25 October. Neither was merged/deleted. Directory names/statuses remain readable; joined dates distinguish duplicate names; underlying links/search retain exact identity without displaying raw IDs.
- Sidebar uses distinct learning, coaching, messages, horse, achievement and settings icons.
- Existing saved avatar paths/storage/crop helpers are reused across dashboard, account and student profile headers. Live image storage operations were not retested.
- Horse limits now come only from Founder-configured membership rows; hardcoded fallback limits were removed. Unknown limits disable new-profile creation; reached limits preserve records and provide a Founder-contact action. No prices, entitlements or limits were changed.

## 5. Actual local validation

| Command/check | Observed result | Limit |
| --- | --- | --- |
| `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit` | PASS, exit 0 on final source | Application types only |
| `node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit` | PASS, exit 0 | Tooling types |
| `node node_modules/vite/bin/vite.js build --outDir .elmony/launch-refinement-build` | PASS, 2,640 modules, exit 0 | Local output only; existing large-bundle warning |
| `node node_modules/eslint/bin/eslint.js src --format json --output-file .elmony/launch-refinement-evidence/lint.json` | PASS, 0 errors / 13 pre-existing warnings | No new warnings; no autofix |
| `node .elmony/launch-messaging-unit.cjs` | 19 PASS / 0 FAIL | Synthetic allowed/denied recipients, revocation, consent, self denial and error text |
| `node .elmony/launch-workspace-unit.cjs` | 12 PASS / 0 FAIL | Saved progress, account scoping, timezone day, ordering and real count derivation |
| `node .elmony/release-unit-check.cjs` | 23 PASS / 0 FAIL | Existing conversation/auth/time regressions |
| `node .elmony/premium-ux-unit.cjs` | 16 PASS / 0 FAIL | Existing calendar/DST/conflict/boundary regressions |
| `node .elmony/launch-workspace-browser.cjs` | 28 PASS / 0 FAIL | Actual components with synthetic query cache and browser-only useSession stub; all remote traffic intercepted |
| `node .elmony/launch-message-browser.cjs` | 6 PASS / 0 FAIL | Actual message composer; selected-thread reads, duplicate submit lock, retained drafts, failure and denied composer; callback simulation only |
| `node .elmony/launch-calendar-wrapper.cjs` | 23 PASS / 0 FAIL | Existing guided calendar/editor browser regression, adapted to cross-month fixture dates |
| `node .elmony/launch-directory-wrapper.cjs` | 4 PASS / 0 FAIL | Existing directory/profile regression adapted to require hidden technical IDs and target duplicate records through their distinct links |
| `node .elmony/premium-messages-browser.cjs` | 11 PASS / 0 FAIL | Existing message/avatar/crop/focus regressions |
| `node .elmony/premium-course-browser.cjs` | 4 PASS / 0 FAIL | Existing course editor failure retention/preview regression |
| `node .elmony/launch-change-review.cjs` | PASS | 22 intended source files; protected client/auth/routes/time/payment/photo helper boundaries preserved |
| `node .elmony/launch-visual-wrapper.cjs` | PASS | Additional Founder desktop/phone screenshots and grouped settings inspection |

Browser widths: **1440, 768, 390 and 320 px**. New workspace and messaging runs reported zero uncaught exceptions and zero console errors; current calendar/directory/course/avatar runs passed. Screenshots of first-time Student desktop, returning Student phone, Founder desktop/phone and messaging 320 px were visually reviewed.

All browser data/session replacements are confined to local QA harnesses under `.elmony`; they are absent from application source and the production entry point. They do **not** prove real authentication, RLS rejection/delivery, invitation redemption, persistence or cross-account access.

Earlier fixture failures remain historical: the old calendar runner selected a past same-number date across the October/November boundary, and the old directory assertion required technical IDs in visible text. New passing wrappers preserve those interactions while matching the requested behavior. Initial isolated harness failures came from its own denied navigation/preflight handling; the newer passing evidence above supersedes those runs. No corresponding runtime source error remained. Chrome updater process logs are not application-console evidence.

## 6. Files changed

New application files:
- `src/components/accounts/AcademyMessages.tsx`
- `src/components/accounts/FounderDailyWorkspace.tsx`
- `src/components/accounts/RiderPreferencesEditor.tsx`
- `src/components/accounts/StudentHome.tsx`
- `src/hooks/use-messaging.ts`
- `src/hooks/use-unsaved-work.ts`
- `src/lib/messaging.ts`
- `src/lib/dashboard-workspace.ts`

Updated application files:
- `src/components/accounts/ConversationWorkspace.tsx`, `StudentDashboard.tsx`, `OwnerDashboard.tsx`
- `src/components/accounts/CoachingCalendar.tsx`, `CoachingWorkspace.tsx`, `LessonWorkflow.tsx`, `HorseOrganizer.tsx`
- `src/components/SiteLayout.tsx`, `src/hooks/use-academy.ts`, `src/lib/conversations.ts`
- `src/pages/AcademyWorkspace.tsx`, `CoursePlayer.tsx`, `Dashboard.tsx`, `MemberAccountSettings.tsx`

Documentation: `HKA_RELEASE_CHECKLIST.md`, this report. New QA runners/harnesses/results are under `.elmony/launch-*`; checkpoint remains under `.elmony-checkpoints`.

## A. Essential before launch

1. **BLOCKED — Founder database approval:** review the exact secure messaging proposal and rollback in section 1, recheck live metadata and validate SQL on a disposable matching database. Founder messaging needs no coaching assignment. External Coach access still requires the existing approval/assignment/consent workflow.
2. **NOT TESTED — actual cross-account message delivery:** Student → assigned staff and reply; verify exact recipient, read receipt/unread refresh, history after reload, mobile composer, unrelated peer denial, revoked link denial and guardian oversight using specifically authorised accounts/records. No automatic test messages were sent.
3. **NOT TESTED — actual saves:** confirm rider preference persistence after sign-out/sign-in, course access and resume, submission/feedback persistence, Founder scheduling and Student request save/reload/approval with designated records. Live appointment creation remains explicitly unverified.
4. **Founder content action:** finish and preview the existing draft; explicitly approve publication of the first real course when satisfied. Zero published courses prevents meaningful course enrolment/learning acceptance.
5. **Founder decision on contact projection:** the proposed hka_message_contacts RPC includes authorised names/roles and replaces the earlier standalone name-lookup suggestion. Do not broaden profile-table access.
6. **NOT TESTED — invitation-only acceptance:** actual Founder, Student, assigned Coach and approved Guardian/minor checks; profile/avatar/horse save/reopen/limit-denial checks, privacy and negative cross-account access, invitation/approval and deployed-origin authentication. Use existing release checklist gates; do not paste credentials into reports.
7. Founder must review this evidence and separately authorise any database change, real test-record writes, course publication or deployment. No such action is inferred from local passes.

Minimum launch blockers remain secure messaging database approval/validation, a real published course and authorised positive/negative acceptance including persistence. Local UI/source checks do not certify live messaging or launch readiness.

## B. Optional improvements after launch

- Broader assessment previews once real assessments exist; no assessment content was invented.
- Calendar write capabilities for coaches/guardians beyond current permissions, only after a separately approved server/security design.
- Bundle splitting to reduce the existing large-chunk warning.
- Further compact mobile information density and non-essential visual polish, preserving approved photographs and branding.

## Precise continuation

Start with the separate Founder database approval and disposable/live acceptance procedure in section 1, then complete the remaining course/persistence gates in A. No Founder coaching assignment is required. Keep the app unpublished until release gates are signed off; do not apply proposals or deploy automatically.
