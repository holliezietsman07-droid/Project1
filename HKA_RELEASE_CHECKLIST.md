# HKA release checklist

Current compatibility revision (2026-11-03): [FOUNDER_MESSAGING_COMPATIBILITY_CHECK.md](docs/FOUNDER_MESSAGING_COMPATIBILITY_CHECK.md), with full hosted policy definitions, fixture differences and actual evidence in [FOUNDER_MESSAGING_LOCAL_SECURITY_TEST_REPORT.md](docs/FOUNDER_MESSAGING_LOCAL_SECURITY_TEST_REPORT.md). This status supersedes historical prepared/unexecuted, failed and 173-assertion messaging results below.

**Local messaging security: PASS — 183 PASS / 0 FAIL** (108 migration/access/drift + 59 adversarial + 16 committed-cycle assertions), run `1793681834711`; [machine-readable evidence](docs/founder-messaging-evidence/isolated-run.json). All three former failures pass. Fresh hosted policies match strict authenticated preflight; proposal/rollback hashes unchanged. Two actual SQL contact projections pass current frontend contracts; source/React regressions 14/14, harness parsing 11/11 and current production build pass.

- [x] Local migration and rollback record trigger name, exact definition and actual `pg_trigger.tgenabled`.
- [x] Require reviewed `O` state and origin execution independently of the snapshot; missing/disabled/altered guards and unsafe matching snapshots rejected.
- [x] Both scripts revalidate actual trigger/function state before COMMIT.
- [x] Complete rollback file rejected pre-existing disabled guard in a separate session (expected psql exit 3), preserving feature state and every synthetic row/receipt.
- [x] Normal committed rollback retained enabled/effective guard; recipient receipt clearing and identity/content changes denied.
- [x] Founder, assigned Coach, Student and Guardian restrictions, unrelated-thread privacy, legitimate sends/oversight and message/receipt preservation passed.
- [x] Disposable PostgreSQL 17.11 container used only 17 synthetic accounts, network disabled, no ports/bind mounts; removed after testing.
- [x] Read-only live pg_policies confirms all three policies target authenticated; exact preflight assumptions retained, PUBLIC/superset drift rejected.
- [x] Confirm current effective API exposure: public, graphql_public only; private messaging schema excluded; GraphQL wrapper is disabled-extension stub.
- [x] Inspect current migration dependencies, auth/signup trigger, helper ACLs, seven table schemas, 52 constraints and 19 recorded migration versions.
- [x] Reproduce exact hosted policies locally; correct fixture ACL/parse-tree differences; current frontend consumes real local contact rows before/after rollback.
- [ ] Confirm safeguarding consent interpretation; establish trusted missing-DOB adult evidence only if an exception is required; retain documented full-schema/auth-service/non-superuser test limits.
- [ ] Hosted authenticated JWT/send/receipt/browser and designated-account acceptance remain unverified; separate explicit approval is required for live mutations or deployment.

Revised proposals remain unapplied to live Supabase. No live database changes or application deployment occurred. Overall release decision remains **NOT READY**.


Historical status (2026-10-31): **NOT READY**. Current compatibility results above supersede overlapping evidence; safeguarding, authorised hosted acceptance, Founder migration approval and content actions remain outstanding.

## Corrected Founder and Coach messaging — 2026-10-31

**Founder/Admin direct messaging is platform-wide. External Coach messaging is assignment-scoped.** Earlier recommendations to assign every Student to Founder are withdrawn. Full current permissions, exact proposal, rollback, limitations and account test procedure: [HKA_UX_LAUNCH_REPORT.md](HKA_UX_LAUNCH_REPORT.md#1-corrected-messaging-permissions--frontend-implemented-database-approval-pending).

- [x] Founder New Message directory, name/role search, direct management-profile entry, recent conversations, timestamps and unread/Sent/Read states implemented in existing messaging workspace.
- [x] Student/Parent/Horse Owner and approved Coach use authorised server contact grants; Founder contact requires no coaching assignment.
- [x] Removed Link Founder for messaging action; external Coach invitation, approval and guardian-consent workflows remain.
- [x] Preserved existing Supabase singleton, private history, sender binding, draft retention, read receipts and floating messaging access.
- [x] Exact database proposal prepared at `supabase/proposals/202610310001_founder_direct_messaging.sql`, outside automatic migrations; corrected and tested locally, not applied to live Supabase.
- [x] Safe permission rollback prepared beside proposal; it preserves nullable direct-message history and identity/update hardening.
- [ ] **Founder approval required:** review exact SQL and rollback after fresh live helper/grant/trigger/constraint/policy comparison; metadata exploration limit prevented all requested definitions from being re-read.
- [x] Executed the corrected complete proposed SQL and spoofing/private-history/guard-state tests against a disposable reconstructed messaging schema: 173 PASS / 0 FAIL. Schema-fidelity and hosted acceptance limits remain in the local security report.
- [ ] After separate database approval, verify Founder → unassigned Student, Parent, Coach and Horse Owner; each recipient can reply without a Founder coaching assignment.
- [ ] Verify approved assigned Coach send, unrelated Student denial, no global Coach directory and no access to another Coach's private conversation.
- [ ] Verify direct API sender spoofing and content/scope mutation rejection; guardian consent/oversight, revoked relationships, saved history, names, unread and read state with authorised accounts.
- [ ] Separate Founder approval for designated live messages, relationship/consent mutations and eventual deployment.

Earlier application check results (not rerun for this SQL-only correction): 33 messaging/source checks, 23 existing regressions and 15 real-component browser checks PASS; application/tooling TypeScript, focused lint and final local production build PASS. Browser fixtures had zero exceptions, console errors or remote traffic. Full evidence and limits are in the UX report. All live cross-account messaging and live database execution remain **NOT TESTED**; local SQL execution now passes as recorded above. Current UI explains approval pending until the secure contact RPC is approved and installed; no fake success or automatic assignment exists.

The following launch entries are historical evidence. Their assignment-based Founder workaround, standalone optional name RPC and old next-task directions are superseded by this section. Other course, account and release gates still apply.

## Historical invitation-only launch refinement — 2026-10-31

This section supersedes overlapping historical UI descriptions below. Full root-cause analysis, exact optional SQL proposal, changed files, observed test commands/results, approval boundaries and Essential/Optional launch work: [HKA_UX_LAUNCH_REPORT.md](HKA_UX_LAUNCH_REPORT.md).

Checkpoint: `.elmony-checkpoints/launch-refinement-20261031/`. Source review: `.elmony/launch-refinement-evidence/change-review.json`. No database mutation, migration, RLS change, billing change, real message/appointment/test record creation, course publication or deployment occurred.

| Priority | Implementation and verification | Remaining acceptance |
| --- | --- | --- |
| Messaging | **IMPLEMENTED / VERIFIED locally:** one guarded insert path, exact student/peer IDs, no self-recipient workaround, assigned contacts, per-thread drafts, duplicate-send lock, recipient-only read receipts, unread refresh, honest errors, retained history and unobstructed composer. Founder/Student/Coach/Guardian/scoped student pages reuse existing Supabase client. | **SUPERSEDED:** historical live policy restricted Student replies to assigned recipients. The correct fix is the separate Founder/Coach permission proposal above; Founder assignments and standalone optional name RPC are no longer requested. Database approval and live cross-account delivery/read/persistence remain **NOT TESTED**. |
| First-time Student | **IMPLEMENTED / VERIFIED locally:** five saved-data checklist steps, discipline/level/goals/pathway editor using existing role RPC, real empty catalogue, returning-student resume/assignment/feedback/coaching cards, exact lesson deep links and unsaved-work protection. | Saved preference round-trip, real enrolment/submission/access and cross-login persistence **NOT TESTED** with authorised accounts. |
| Founder workspace / courses | **IMPLEMENTED / VERIFIED locally:** linked real counts, timezone-aware chronological schedule, exact request/submission/appointment/message actions, actual draft links, quick actions, functional attention/draft/pending/review filters and compact non-Home headings. | Read-only counts: **0 published courses, 1 draft, 2 modules, 1 lesson, 0 questions**. Founder must finish, preview and explicitly publish real content. Authenticated marking/scheduling/publication and reload acceptance **NOT TESTED**. |
| Guided calendar | **IMPLEMENTED / VERIFIED locally:** preserved shared calendar and selected-date workflow, exact saved appointment/request deep links, Founder-confirmed vs Student-pending wording, saved timezone, existing DST/conflict validation and roles. | Live appointment creation, request approval, concurrency, persistence and cross-role positive/negative access remain **NOT TESTED** until designated records/accounts are approved. |
| Directory / profile / navigation / settings / horses | **IMPLEMENTED / VERIFIED within local scope:** distinct sidebar icons, one Founder Home, readable directory/record links without visible technical IDs, same existing avatar paths/helpers, compact account heading, grouped Founder settings, unsaved preference protection and configured-only horse limits. Duplicate-name inspection confirmed **2 distinct records**; nothing merged/deleted. | Actual image/storage/settings/horse saves, configured-limit denial and all role-bound walkthroughs **NOT TESTED**. Horse-limit behavior was type/source checked; not certified through a live account. |

### Latest actual local checks

- Application and tooling TypeScript: **PASS**, exit 0.
- Local production build to `.elmony/launch-refinement-build`: **PASS**, 2,640 modules; existing large-bundle warning only.
- Source lint: **PASS**, 0 errors / 13 pre-existing warnings.
- Unit checks: **70 PASS / 0 FAIL** — messaging 19, saved-data/workspace 12, existing conversation/auth/time 23, calendar/boundary 16.
- Browser checks: **76 PASS / 0 FAIL** — workspace 28, messaging 6, calendar 23, directory 4, existing message/avatar 11 and course editors 4. Widths: 1440, 768, 390, 320 px. New workspace/message runs reported zero uncaught exceptions/console errors.
- Additional Founder desktop/phone screenshot and grouped-settings checks **PASS**; selected Student/Founder/message screenshots visually reviewed.
- Protected routes, auth/session, Supabase singleton, core academy/time helpers, payment files and existing photo-operation helper block match checkpoint byte-for-byte.
- These are synthetic/callback/local component checks, **not actual authenticated end-to-end acceptance**. Test commands, paths, fixture boundaries and superseded historical fixture failures are recorded in the full report.

### A. Essential before launch

- [ ] **BLOCKED:** Founder reviews and separately approves the secure messaging SQL/rollback above. Only external Coach access requires assignment/consent; Founder contact does not.
- [ ] **NOT TESTED:** authorised Student ↔ assigned staff delivery/read/reload and unrelated/revoked/guardian/minor negative-access tests.
- [ ] **NOT TESTED:** rider preference persistence, actual enrolment/resume, submission/feedback, selected-date appointment/request saves/reopen/reload and permitted role actions.
- [ ] **Founder action:** complete and preview the real draft, then explicitly authorise first-course publication.
- [ ] **Founder decision:** approve the minimal authorised contact/name projection as part of the messaging proposal; the old standalone name RPC is superseded.
- [ ] **NOT TESTED:** invitation/account/deployed-origin acceptance and live image/horse/settings operations; obtain designated accounts/records and separate real-write approval.
- [ ] Separate Founder release/deployment approval after gates pass. Do not deploy from this refinement.

### B. Optional after launch

- Broader assessment previews after real assessments exist.
- Additional coach/guardian calendar write capability only after separate server/security approval.
- Bundle splitting and further non-essential mobile density refinements.

**Next task:** separate Founder approval, fresh metadata comparison and disposable SQL validation, then authorised positive/negative messaging acceptance; proceed through remaining release gates without automatic deployment.



## Premium app-style UX refinement — 2026-10-29

Latest local implementation review: **PARTIAL — local checks PASS; authenticated acceptance BLOCKED / NOT TESTED.** This section describes the current refinement and supersedes overlapping UI implementation descriptions below. Release remains **NOT READY**. No deployment, SQL mutation, migration, policy change, billing modification or live test-record write occurred.

### Review, checkpoint and preserved boundaries

Read the four-page Professional Website Designer & Quality Control master prompt in design-references, current architecture, existing calendar/request helpers, relevant scheduling/guardian/horse policy definitions in migrations and this checklist before editing. Recoverable pre-edit source/checklist copy: `.elmony-checkpoints/premium-ux-20261029/`. Changed-source hashes and byte counts: `.elmony/premium-ux-evidence/change-review.json`.

Existing React Router routes, AccessGate, SessionContext, Supabase singleton and academy persistence helpers remain byte-identical to the checkpoint. Payment helpers, memberships, prices and horse limits were preserved. Supabase source, migrations and hosted settings were not edited or applied. Production output was directed to `.elmony/premium-ux-build`; existing deployment was not changed.

### 1. Calendars updated

| Calendar / role | Current implementation | Evidence and acceptance boundary |
| --- | --- | --- |
| Founder/Admin coaching | Shared spacious branded month grid; Today/month controls; selected day/today; confirmed, pending, teaching and blocked markers. Date opens action dialog for scheduling, publishing availability, blocking time and reviewing that day's appointments. Three-stage review/save editors use existing tables/RPCs. Appointment details expose Founder reschedule/cancel; pending requests retain approval, alternative, decline/keep and cancellation-review paths. | Shared calendar, scheduling student selection, overlap rejection, availability/block callbacks and modal behavior PASS locally. Actual Founder saves, persisted appointments, alternatives, rescheduling, cancellation, concurrent conflict rejection and notification effects **NOT TESTED** without authorised session/approved data. |
| Student coaching | Same calendar opens Request a Lesson immediately. Selected date is filled; time starts blank. Lesson type/format/duration → date/time and optional location/goals → review → actual pending request save. Only returned teaching windows produce selectable suggestions; absent visibility produces preferred-time proposal, never fabricated availability. Existing status-only reschedule/cancellation transitions retained. | Four-width date selection, validation, Back/value retention, pending review, controlled save failure and successful injected callback PASS. Real request save/approval/persistence **BLOCKED** by authorised session and designated records. |
| Authorised Coach | Same calendar reached from existing Coaching schedule navigation. Client restricts lessons to own coaching identity and authorised assigned students. No scheduling/availability write controls are exposed beyond the existing Founder-only capability. | Source and static boundary checks PASS; generic read-only calendar interactions PASS. Actual coach roster/row visibility, live permissions and rejection **NOT TESTED**. |
| Parent/Guardian | Same calendar reached from Appointments. Client scopes rows to current guardian's approved, consented child links. Existing capability has no guardian lesson-request insert service; calendar explains student/Founder request route rather than presenting an unsupported submit button. | Source link/consent filtering and generic read-only interactions checked. Actual verified-family visibility and negative child-access tests **NOT TESTED**. Guardian request creation is intentionally unavailable under preserved permissions. |
| Horse owner / horse care | Existing Care Schedule uses shared calendar in care mode, preserving date-only records and current horse binding. Future date opens focused care planner; saved care appointment opens existing edit/reschedule fields. Care legend shows care status rather than teaching/booking features. No new horse lesson-booking capability introduced. | Integration/type review and shared calendar/dialog checks PASS. Actual CarePlanner, selected-horse fields, reminder settings, profile/document saves and storage persistence **NOT TESTED** with an authorised horse account. |

Timezone helpers preserve member timezone across browser timezone and midnight boundaries, reject impossible dates, past/reversed ranges and missing/repeated daylight-saving wall times. Published time suggestions are bounded to selected day and exclude known blocked/confirmed overlaps. Fresh appointment/window reads precede scheduling writes; existing approval RPCs and server constraints remain authoritative. Local checks do not establish concurrency or live RLS acceptance.

### 2. Forms and workflow refinements

- Student lesson requests and Founder lesson creation, rescheduling, approval, alternatives and teaching/block windows use three-stage dialogs with retained step values and explicit review.
- Course Studio new-course/details, module creation, lesson creation and assessment-question creation use focused action cards and dialogs. Existing module/lesson lists, ordering, publishing, duplication, archiving, private materials and previews remain reachable. Cancelling New course retains prior course selection.
- Individual development plans, student assignments and feedback use focused editors; selecting a submission opens its feedback stage directly. Authorised submitted-file viewing remains available in student profiles and Course Studio review queue.
- Horse profile creation and ownership-checked profile editing, private document upload and care planning/editing use focused dialogs. Existing fields, sex/height validation, reminder options, document attachment, care history, photo operations and membership limits remain.
- Account-purpose onboarding is focused behind Add account purpose, showing existing role-specific fields. Existing secure linking and approval RPCs remain; invitation form safely retains its DOM form across async completion.
- Profile settings and course-content editors share responsive dialog styling and unsaved-change confirmation. Existing save/error behavior remains; fields persist after failed saves. Shared forms prevent duplicate submissions, disable controls while saving, retain focus and use full-height mobile surfaces. Profile success notice no longer overlays an active editor.

These are implementation changes, not certification of connected save behavior. No field or live record was discarded to shorten a form.

### 3. Navigation and controls removed

Removed redundant Founder sidebar Overview item and bottom-left Switch Dashboard control. Dashboard home remains single sidebar home destination; old overview URL still resolves. Distinct Founder Student Preview and Academy workspace remain. Role switching remains available through existing authorised account menus/RPC, and collapsed sidebar links retain accessible names.

### 4. Interaction audit and actual results

| Affected controls | Result actually demonstrated | Unverified operation |
| --- | --- | --- |
| Calendar days, selected date, Today/month navigation, appointment details and pending display | **PASS** synthetic component browser tests at 1440, 768, 390 and 320 px; no horizontal overflow; desktop/mobile screenshots reviewed. | Role-bound live appointments and cross-account visibility. |
| Lesson Continue/Back/Cancel, Escape, keep/discard draft, selected date/time, student selection, review/submit | **PASS** retained input, focus restoration, native validation, honest pending wording, failed-save retention and injected success callback. | Real server insert/update/RPC success, persisted status, reload and recipient visibility. |
| Founder availability/block editors | **PASS** desktop and phone review/callback tests, reversed-range rejection and known confirmed-lesson block conflict. | Real availability publication/editing and enforcement under current live policies. |
| Course module/lesson Edit, Cancel, Save and author preview selection | **PASS** four widths; four intentional intercepted HTTP 403 responses retain edited input and show real error text; unsaved cancellation confirmed. | Real author create/edit/upload/publish, reopened data and authorised student consumption. |
| Student directory/search, stable duplicate-name IDs, profile/Back and Manage | **PASS** actual components with isolated anonymous query-cache records at four widths, zero remote requests. | Authorised real student directory and individual record changes. |
| Message thread selection, exact reply recipient callback, mobile Back, floating popup | **PASS** isolated two-coach regression fixtures at four widths; historical self-row exclusion preserved. | Actual send/delivery/read state and participant/guardian enforcement. |
| Avatar/photo menu, dismissal, view/remove failure/retry, crop and keyboard focus | **PASS** isolated existing regressions at four widths, controlled storage responses only. | Real photo upload/removal/private access. |
| Founder sidebar and existing role routes | **PASS** source/static checks for removed controls, preserved Student Preview/switch RPC and byte-identical route guards; collapsed-link labels reviewed. | Authenticated Founder collapse/menu/role switching in actual role session. |
| New horse/profile/account-purpose/assignment editors and account settings | **PASS** source integration, type/build checks and shared-editor dirty/failure/focus tests. | Actual role-bound component walkthroughs and real save/reopen/cancel/permission operations **NOT TESTED**. |

### 5. Current verification evidence

- Application TypeScript: `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit` **PASS**, exit 0.
- Production bundle: `node node_modules/vite/bin/vite.js build --outDir .elmony/premium-ux-build` **PASS**, 2,632 modules; existing large-chunk warning remains.
- Source lint: **PASS**, 0 errors / 13 existing warnings; `.elmony/premium-ux-lint.json`.
- Targeted calendar/time/conflict/client-boundary runner: **16 PASS / 0 FAIL**; `.elmony/premium-ux-unit.cjs` and `.elmony/premium-ux-evidence/unit-results.json`. Includes empty availability, overlap/adjacency, cancellation, reschedule exclusion, invalid duration, bounded long windows, timezone rollover, DST gap/fold and preserved guards.
- Existing pure conversation/auth/calendar regressions: **23 PASS / 0 FAIL**, `.elmony/release-unit-check.cjs` and its current `.elmony/release-evidence/unit-results.json`. Synthetic records/storage only.
- Latest calendar/guided-editor browser run: **23 PASS / 0 FAIL**, completed **2026-10-29 14:26:13 UTC**; `.elmony/premium-ux-final-browser.cjs`, `.elmony/premium-ux-harness.tsx` and `.elmony/premium-ux-evidence/browser-results.json`. Zero remote requests, uncaught exceptions or fresh console errors. This newer passing run supersedes earlier cached fixture-run results.
- Course browser regressions: **4 PASS / 0 FAIL**, `.elmony/premium-course-browser.cjs` and `.elmony/premium-course-evidence/browser-results.json`; expected intercepted 403 failures only, zero remote writes.
- Messages/avatar browser regressions: **11 PASS / 0 FAIL**, `.elmony/premium-messages-browser.cjs` and `.elmony/premium-messages-evidence/browser-results.json`; no uncaught exceptions or console errors.
- Directory/profile browser regressions: **4 PASS / 0 FAIL**, current `.elmony/milestone1-directory-browser-check.cjs` and `.elmony/milestone1-directory-evidence/browser-results.json`; zero remote requests/exceptions.
- Visual review: current calendar desktop/320 px, request review 390 px and availability review 390 px screenshots in `.elmony/premium-ux-evidence/`. These are labelled isolated fixtures, not authenticated screenshots.

### 6. Exact remaining acceptance and continuation

**Do not mark these features launch-complete from code or fixture results.** Minimum external blocker remains designated authorised Founder, Student, Coach, Guardian/linked-child and horse-owner sessions plus specific approval for isolated live test records. Credentials/tokens must not be posted in chat or evidence.

Resume controlled acceptance with LA1 authentication, then LA2-LA6 using the prior explicit identity/write gates. For this refinement specifically:
1. In Founder session, open Coaching and exercise day action, schedule/publish/block, reopen exact rows, approve/request alternative, reschedule and cancel an isolated lesson; verify fresh calendar/reload and conflict rejection.
2. In Student session, request on selected future date, verify only pending saved state, Founder approval and refreshed appointment; test status-only reschedule/cancellation and failed operation retention.
3. In assigned Coach and verified Guardian sessions, prove positive visibility of the same designated appointment and negative visibility after revoked/unrelated links; no new write powers are implied.
4. Open Course Studio, selected student assignment/feedback, selected-horse profile/document/care and account-purpose/profile editors in real authorised sessions; test retained values, Cancel without writes, returned saved IDs and reopened persisted data. These actual authenticated editor walkthroughs remain **NOT TESTED**.
5. If guardian request creation or coach scheduling/availability writes are desired beyond current permissions, obtain separate Founder approval for server capability/policy work first. Student-readable published teaching windows also require a separately approved existing-policy review; preferred-time proposals work within current scope.

No production deployment is authorised. Earlier live acceptance and release blockers below remain in force where not superseded by the local implementation/evidence above.


## Controlled live acceptance - 2026-10-29

This section supersedes overlapping earlier status entries and the earlier instruction to stop before controlled acceptance. Recovery implementation is preserved; no redesign or application source edits were made. HKA_RECOVERY_STATUS.md, this checklist and all four pages of the Professional Website Designer & Quality Control master prompt were read before testing.

### Execution and actual evidence

- Target: connected Supabase project `sqaydpbqycvaictieafk`; local app origin `http://127.0.0.1:8080`. This is local code against real Supabase, not a deployed-origin test.
- Runner: `.elmony/live-acceptance-check.cjs`; machine evidence: `.elmony/live-acceptance-evidence/read-only-results.json`, latest complete run 12:34:01-12:34:15 UTC (14:34 SAST); homepage Sign in was clicked and opened the actual auth dialog.
- Evidence consistency review passed via `.elmony/live-acceptance-review.cjs`; receipt: `review-results.json`. Current app TypeScript check (`tsc -p tsconfig.app.json --noEmit`) also exited 0; no application source changed.
- **25 narrowly scoped checks PASS / 0 FAIL**: visible sign-in entry, existing singleton client/anonymous state, nine protected-route redirects, eight genuine anonymous table denials, empty unpublished-course response, public auth settings, two sign-in viewport checks, zero attempted remote writes and zero uncaught exceptions.
- All requests used the app's existing Supabase client and actual network. No fixtures, impersonated roles, forged sessions, service credentials or mocked successful operations were used. The isolated anonymous browser does not establish whether the Founder is signed into a separate, inaccessible browser.
- Direct anonymous reads of `hka_profiles`, `hka_account_roles`, `hka_messages`, `hka_enrolments`, `hka_progress`, `hka_coaching_requests`, `hka_appointments` and `hka_files` each returned HTTP 401 / PostgreSQL `42501`. This demonstrates anonymous denial only.
- `hka_courses?published=eq.false` returned HTTP 200 and zero rows. That observation is PASS for no rows exposed, but **NOT TESTED** for hiding a known test draft: no authorised positive control or designated draft was supplied.
- Public auth settings returned HTTP 200: email enabled, signup enabled, email autoconfirm disabled. Email delivery, credentials, redirect allowlists and recovery are not proven by these settings.
- Nine routes redirected anonymous visitors to visible `/sign-in`: Founder/student dashboards, their message/coaching sections, Academy Workspace, account settings and a course deep link using a nonexistent placeholder UUID. No real student identity was opened.
- Desktop 1440x1000 and phone 390x844 sign-in screenshots were visually reviewed; no horizontal overflow. Screenshots: `anonymous-sign-in-1440.png` and `anonymous-sign-in-390.png` in the evidence directory.
- Eight fresh console resource errors correspond exactly to the eight deliberately requested real HTTP 401 denials; zero network failures and zero uncaught JavaScript exceptions. No unexpected runtime failure was found in the exercised anonymous flow. Authenticated runtime remains untested.
- Project metadata and five live function definitions were read, not executed: `hka_admin`, `hka_view_student`, `hka_manage_course`, `hka_file_read`, `hka_approve_coaching_request`. Definitions show admin/relationship/author/file gates and Founder coaching approval/conflict checks; this is inspection, not behavioural permission acceptance. Raw receipts: `metadata-results.json`.
- Current table-policy/bucket inspection is **NOT TESTED**: first read-only SELECT failed with SQL `0A000` (UNION ordering); the corrected request was blocked by Elmony's uncertain-action guard. Neither returned policy/bucket rows. Project/function metadata was subsequently inspected; no third SQL attempt, write, migration, policy change or deployment was requested. Prior recovery policy observations remain historical evidence only.
- No live sign-in/signup/recovery attempt, application-record mutation, storage write, payment operation or deployment occurred. Unknown credentials were not guessed and existing student records were not modified.

### Authorised identities, data and approval gate

**BLOCKED:** no designated account IDs, authenticated role sessions, controlled inboxes or Founder approval for specific record changes were supplied. An input request is pending for these items; no passwords or tokens should be posted in chat or evidence.

Use F = authorised existing Founder, S = purpose-created test student, C = approved test coach/author assigned only to S, and O = separate unrelated test student. Founder must identify these accounts and the permitted test relationships. Existing real student accounts remain read-only; do not repurpose or modify existing student records for testing. If purpose-created identities do not exist, their creation and verification need Founder approval first.

Before any write, record Founder identity, approval timestamp, exact test account/course/slot IDs (or approved creation count), allowed fields/actions, audience and retention/cleanup decision. Approval for one workflow does not approve other writes. Use a unique `HKA-ACCEPT-<approved-run-id>` marker and record returned IDs after approved creates. Do not delete or rewrite messages/history, restore settings or clean up test content without the corresponding approval.

For each approved operation: record actor, route/action, timestamp, returned ID/status and expected values; reload/reopen in a fresh query and the recipient session, compare persisted values, then perform authorised negative checks with O against the same known record. Record denial response and an authorised reread proving the target stayed unchanged. Empty lists without a positive authorised control are insufficient. Do not record passwords, session tokens, private file URLs, inbox links or unrelated student content.

### Workflow tests and current outcomes

| ID / workflow | Exact test to perform once authorised | Required identities/data and explicit write scope | Actual result and remaining proof |
| --- | --- | --- | --- |
| LA1 Founder authentication (A1/UI7) | From visible Sign in, F submits valid credentials, reaches Founder dashboard with correct identity, refreshes/reopens, signs out within approved session scope, and confirms deep-link denial; S/O must not enter Founder administration. In separate designated sessions verify checked/unchecked persistence and sign-out clearing. One approved invalid-password attempt must show an honest failure without a session. | F and S/O sessions; controlled inbox for recovery. No account creation, role edits or student changes implied. Agree scope before revoking an existing Founder's sessions. | **BLOCKED** for sign-in, success/persistence, failure feedback and authenticated role denial. **PASS** only for actual anonymous Founder redirect, visible sign-in and reachable real auth configuration (C01-C03/R-auth-settings). |
| LA2 Student dashboard (UI1/UI2/A2/A6) | S signs in, dashboard shows S and only entitled courses; refresh and new navigation retain correct identity/data. O opens S's approved profile/course URL and directly queries the known protected IDs; verify denial and no cross-user cache leakage. F/assigned C may view only permitted management data. | S, O, F/C; Founder-designated isolated course/enrolment/progress IDs. Creating enrolment or progress is a separate explicit write approval; real student records remain untouched. | **BLOCKED** for authenticated student entry, entitled content, persistence and cross-account denial; **PASS** for anonymous dashboard/course redirects and real enrolment/progress anonymous denials (C04/C08/R tables). |
| LA3 Messaging (UI4/A8) | S sends one marked message to assigned C, C opens a fresh session/query and replies once; reopen both threads, verify exact student/sender/recipient/body and distinct pairs in full/floating views. O queries these known IDs and attempts only an explicitly approved prohibited send; verify denial and unchanged thread. F/guardian oversight must be read-only when not a participant. | S, C, O; approved relationship and exactly two retained test messages. Any negative send attempt requires approval because a permission defect could persist it. Founder/guardian oversight requires approved test relationship/consent. | **BLOCKED** for send/reply/receipt/persistence and authenticated permissions. **PASS** for anonymous message-section redirects and actual message-table denial (C05-C06/R-hka_messages). Historical real self-conversation investigation **NOT TESTED**. |
| LA4 Course management (UI5/A5-A7) | C creates one marked draft, module and lesson, edits/reopens each, previews, uploads one nonsensitive supported file, reopens private material; publish/unpublish only with approved audience. Enrol S only if approved, open lesson and persist progress/submission/feedback. O must fail draft edits, unenrolled lesson/material reads and known private-file access; verify no changed rows. | F/C author, S/O; one approved pathway, draft/module/lesson/file and optional test enrolment/attempt/submission/grade. Publication, enrolment, progress, marking, storage writes and cleanup each need named approval. No payments. | **BLOCKED** for actual author/student saves, upload/open, learning and permission boundaries. **PASS** for anonymous workspace/course redirects and private-file-table denial; unpublished-course empty response is only a limited observation (C07-C08/R-hka_files/R-draft-courses). |
| LA5 Coaching (UI3/A9) | F publishes one isolated future availability window in approved timezone. S requests within it; F approves through existing RPC. Reopen S/F schedule and verify saved time/status/appointment ID. A second approved overlapping request must fail approval without an extra appointment; exercise student reschedule request, Founder decision and cancellation/review, refreshing after each. O must not read/change these known requests or approve appointments. | F, assigned C, S/O; existing service with unchanged price/duration/rules; approved future slot, one normal request and one conflict request. Agree notification effects, cancellation and retention first. Do not alter existing schedules or appointments. | **BLOCKED** for request/approval/conflict/reschedule/cancel persistence and authenticated denial. **PASS** for anonymous coaching redirects and actual request/appointment denials (C09-C10/R tables). Live approval function metadata inspected, not invoked. |
| LA6 Account settings (UI8) | Purpose-created test account edits its name/timezone, saves, reloads/fresh-signs-in, and checks exact values; change one non-email notification preference and verify persistence. Upload/crop/reopen/remove one approved avatar if authorised. O attempts approved negative updates/storage access to the same test identity; verify rejection and unchanged data. Exercise failed save retaining edits and Cancel making no write. | Purpose-created account plus O; exact allowed before/after values and avatar file. Use no existing student profile for test edits. Preference changes, restoration and file removal require approval; horse-care email opt-in is outside this test. | **BLOCKED** for settings/avatar success, durable saves and authenticated permission rejection; **PASS** only for anonymous settings redirect and real profile/files denial (C11/R tables). |
| LA7 Signup/recovery and hosted redirects (A2/Q8) | Create only an approved new test identity, follow verification link using controlled inbox, sign in; request recovery once, follow approved HTTPS origin, set new password and verify old/new credentials. Expired/invalid link must fail safely. | Explicit new-account and recovery approval, controlled inbox, Founder-approved production origin/allowlist and account creation count. | **BLOCKED**; no email sent, identity created, password changed or hosted settings touched. Public settings show confirmation required but prove no delivery or allowlist behaviour. |
| LA8 Guardian/minor, role and horse workflows (A3/A4/A10/Q7) | If included in first cohort, verify approved/pending/revoked role and guardian/coach relationships, minor consent and revocation denials; isolated horse/care/file persistence and outsider denial. Use existing checklist criteria without changing access rules. | Separately approved guardian/minor/multi-role identities, relationships and isolated horse/content; no existing student/horse mutations. | **NOT TESTED**, outside the six starting workflows; becomes a launch blocker wherever these capabilities are included. No new consent, linking, horse or role record created. |

### Minimum remaining blockers for controlled first web launch

1. **Authorised access:** Founder-designated F/S/C/O sessions and controlled inbox; identify approved existing read-only records or explicitly approve purpose-created test accounts. No accessible authenticated test context currently exists.
2. **Specific Founder write approval:** approve the exact LA2-LA6 isolated records/actions, failure/negative attempts, notification effects and cleanup/retention. Execute those workflows and retain positive persistence plus authenticated denial evidence before marking them PASS; no blanket live-data approval is inferred.
3. **Essential live acceptance and launch origin:** LA1-LA7 remain BLOCKED. Complete actual auth/recovery, student access, two-user messaging, author/student course flow, coaching and settings; verify production HTTPS auth callbacks on approved origin. Include LA8 wherever the launch cohort can use it, or obtain a reviewed, enforceable cohort/scope restriction rather than assuming it is excluded.
4. **Controlled launch decision:** after essential live acceptance passes, Founder must approve deployment/cohort and rollback plan separately. Billing stays outside this run and cannot be offered as verified; payment scope/readiness needs its own approval if included.

**Launch readiness is not established.** Anonymous guard/network PASS results and historical local fixture results do not substitute for authenticated operation, persistence or cross-account permission acceptance.

This register distinguishes source review, isolated browser checks and actual connected-account acceptance. Editing source never establishes acceptance.

## Recovery and constraints
- Recoverable pre-edit checkpoint: `.elmony-checkpoints/hka-release-20261029-112121.zip` (20,790,777 bytes).
- Includes source, functions/migrations, public assets, approved design references, docs and root project/configuration files; excludes secrets, dependencies, generated output and Git internals.
- Restore into a separate local directory, compare affected files, then copy only approved source changes; do not restore or run migrations automatically.
- Reviewed `design-references/Elmany_Professional_Website_Design_QA_Master_Prompt.pdf` and Founder/sign-in design references; retain established cream, green, gold styling, existing photos and components.
- No deployment, payment changes, policy changes, migrations or real student-record mutations are authorised.
- Existing direct-profile links can be reviewed in source; do not open real student profiles or change real records as a test.
- Controlled test identities requested; no credentials or authorised role sessions supplied at start.

## Status and evidence
PASS = acceptance actually demonstrated; FAIL = observed failure; BLOCKED = access/approval missing; NOT TESTED = no valid acceptance evidence.
Each item below records implementation, remaining work, acceptance, changes, actual tests and blockers. Initial states remain provisional until evidence is attached.

## Milestone 1 - UI and workflows (current 2026-10-29)

Implementation is locally stable; full milestone acceptance is **PARTIAL/BLOCKED**. PARTIAL means completed safe implementation and limited demonstrated local criteria, with connected acceptance still outstanding. Fixtures do not establish real account permissions or server persistence.

| ID | Requirement and current implementation | Remaining / acceptance criteria | Changes made | Tests actually performed | Status / blockers |
|---|---|---|---|---|---|
| UI1 | Searchable Founder rows, full stable IDs, direct profiles and reachable management pane. | Authorized read-only investigation of actual same-name records; never merge/delete. | OwnerDashboard: block layout, name/ID search, empty/error/loading states, Manage selection. | Actual directory/profile components with anonymous synthetic cache: nonoverlap, two same-name IDs, name/ID search/empty result, profile/Back/Manage at 1440/768/390/320px; zero remote requests. | PARTIAL: local criteria PASS; actual duplicate audit BLOCKED by authorized read access. |
| UI2 | Existing guarded profile route retained; role-aware Back/breadcrumbs, correct title, loading/error/unavailable states and file controls. | Connected enrolment/task/marking/message saves, coach navigation and download permissions must persist and deny outsiders. | OwnerDashboard: safe async form references, role-specific links, submission file viewing; SiteLayout dynamic title. | Synthetic Founder profile opens from directory; title, Back, tabs containment at four widths; source review of handlers and gates. | PARTIAL: connected saves/coach-role/file permissions NOT TESTED without controlled sessions/content. |
| UI3 | Saved calendar integrated before request lists; guided requests use actual availability and timezone-aware validation. | Live requests, actual published windows, conflicts, approvals/reschedules/cancellation and persistence. | OwnerDashboard/StudentDashboard integrate CoachingCalendar and coaching helpers; preserve existing approval RPCs and status-only student rescheduling restrictions. | Calendar empty state/date callback at four widths; timezone/DST/calendar/range helper checks PASS. | PARTIAL: live schedule/participant acceptance BLOCKED by controlled identities. |
| UI4 | Shared workspace uses distinct participant pairs, explicit recipients, self-send guard, child labels and read-only oversight. | Real two-user delivery/reply/denial and authorized investigation of historical self-conversations. | ConversationWorkspace integrates conversations helper; mobile Back, compose reset and floating popup preserved. | Four-width pair/reply-callback/Back/popup tests PASS; helper chronology, self-row preservation, oversight and guardian child-label regressions PASS. | PARTIAL: real delivery/permissions and historical-row audit NOT TESTED without controlled sessions. |
| UI5 | Existing course manager now exposes saved editors, author preview, private materials and publication readiness. | Actual draft create/reopen, module/lesson saves, private uploads/reopen, publish/unpublish and student learning/review. | AcademyWorkspace integrates CourseContentEditor/CoursePreview; restored PrivateFileButton/LessonMaterials used in CoursePlayer and marking; error handling and selected-course validation. | Four-width editor defaults/cancel, intercepted denied-save input preservation and preview switching PASS; TypeScript/import graph and source handler review PASS. | PARTIAL: connected author/student/course persistence and permissions BLOCKED by controlled identities/content. |
| UI6 | Existing horse/care/storage flows preserved; detail subtree scoped by horse ID, async forms captured, document errors handled. | Verify actual selection/care edit reset, save/cancel, file validation/reopen and cross-account denial. | HorseOrganizer: horse-scoped remount, safe async reset, handled file open/rename. | Source review and current app TypeScript/build; avatar/photo shared-control tests cover crop/menu behavior only. | NOT TESTED for connected horse workflow; controlled horse/session required. |
| UI7 | One existing Supabase client serves page/popup auth; registration fields/timezone/password validation and durable/tab session choices wired. | Actual sign-in/signup/email verification/recovery, real-token refresh/tab/sign-out persistence and approved hosted redirects. | Restored auth-storage and client export; SignInForm reused in SiteLayout/AccountPage; responsive registration popup, focus/scroll reset and remembered-email clearing. | Auth routes, modal containment/focus/Escape/scroll reset, field mapping, adult/timezone/password rejection, remembered email/session preference at four widths PASS; storage regressions PASS. | PARTIAL: real credentials, controlled inbox and production redirect acceptance NOT TESTED. |
| UI8 | Existing profile/preferences/avatar controls retained; saves require returned row, failed edits remain open, menus/crop are responsive. | Durable profile/preference/avatar persistence and wrong-account rejection. | MemberAccountSettings validation/save confirmation/dialog containment; StudentDashboard photo errors/retry/focus/responsive crop. | Avatar view/menu dismissal/remove failure/retry/crop/focus at four widths PASS; settings source review and current TypeScript/build. | PARTIAL: connected settings/storage persistence and permissions BLOCKED by controlled account access. |

### Milestone 1 evidence

- App and configuration TypeScript: PASS, exit 0; original three missing-module/export errors resolved without exclusions.
- Production build: PASS, 2,628 modules; existing chunk-size warning, output .elmony/milestone1-build.
- Source lint: 0 errors / 13 existing warnings.
- Helper runner: 23 PASS / 0 FAIL, including both original coaching failures.
- Main browser runner: 26 PASS / 0 FAIL; exceptions 0, console errors 0.
- Course controls: 4 PASS / 0 FAIL; four intentional intercepted 403 responses verified as visible denied-save errors with input retained.
- Directory/profile controls: 4 PASS / 0 FAIL; zero remote requests or exceptions.
- All five saved additions have active application consumers. Exact files, assertions, commands, screenshots/evidence paths and unproven criteria are recorded in HKA_RECOVERY_STATUS.md.
- Read-only database history SELECT confirms all 19 local migration versions recorded, including 202610280003 and 202610290001. Four function metadata reads reconfirm signup/invitation fixes and coaching guard.
- No SQL mutation, migration replay, RLS/permission change, live record test write, function deployment or app deployment.
- Stop after Milestone 1; full acceptance remains blocked by the explicitly listed controlled-session criteria. Milestone 2 has not begun.

## Milestone 2 — Functional acceptance (recovery baseline; current results above)
| ID | Requirement / implementation | Remaining and specific acceptance criteria | Changes made | Tests actually performed | Status / blockers |
|---|---|---|---|---|---|
| A1 | Founder auth/admin routes exist. | Controlled Founder sign-in, permitted administration, sign-out and denial to non-Founders. | None yet. | None this release. | BLOCKED: authorised identities/session. |
| A2 | Student signup/login exists. | Create designated identity, verify email, login/logout/recovery; correct metadata mapping. | None yet. | None this release. | BLOCKED: controlled identity and inbox. |
| A3 | Multiple purposes and dashboard switching exist. | Each approved role switches; pending/revoked roles cannot elevate access. | None yet. | None this release. | BLOCKED: controlled multi-role identity. |
| A4 | Guardian/coach invitations and approvals exist. | Invitation creates request only; minor consent and Founder approval required; decline/revoke deny access. | None yet. | None this release. | BLOCKED: guardian/minor/coach identities and approved test relationships. |
| A5 | Course authoring exists. | Controlled draft create/save/reopen/preview/publish/unpublish; uploads reopen through private storage. | None yet. | None this release. | BLOCKED: controlled author and isolated content. |
| A6 | Enrolment/progress exists. | Enrol designated student in test course; persistence; unauthorised course access denied. | None yet. | None this release. | BLOCKED: controlled student/course. |
| A7 | Assignment/marking exists. | Draft/submission/upload/review/resubmission and grade persistence across student/coach. | None yet. | None this release. | BLOCKED: controlled student/coach/content. |
| A8 | Messaging exists. | Distinct controlled users send/reply; correct recipients; outsider denied; guardian oversight as authorised. | None yet. | None this release. | BLOCKED: distinct controlled sessions. |
| A9 | Coaching scheduling exists. | Real availability, timezone, pending request, approval, conflict rejection, reschedule/cancellation persistence. | None yet. | None this release. | BLOCKED: controlled participants and test schedule. |
| A10 | Horse/files exist. | Isolated horse create/select/care save and supported upload/download; cross-account access denied. | None yet. | None this release. | BLOCKED: controlled identity/horse. |
| A11 | Responsive website exists. | Public and accessible workflows at desktop/tablet/mobile without overflow or blocked controls. | None yet. | None this release. | NOT TESTED; local browser availability being established. |

## Milestone 3 — Quality/security
| ID | Requirement / implementation | Remaining and specific acceptance criteria | Changes made | Tests actually performed | Status / blockers |
|---|---|---|---|---|---|
| Q1 | React Router routes and titles. | Public links/protected redirects/404, deep links and role-specific page titles. | Pending. | App routes reviewed. | NOT TESTED. |
| Q2 | Console/runtime. | No fresh app errors on exercised flows; expected network failures visibly handled. | Pending. | None this release. | NOT TESTED. |
| Q3 | Bugfinder/blocked controls. | Repeat three reported avatar/settings hit tests; dialogs/menu focus and mobile placement. | Preserve earlier fixes. | No Bugfinder tool exposed in current tool discovery. | BLOCKED for official Bugfinder; local DOM checks pending. |
| Q4 | Save/close/error/loading/empty states. | Touched forms preserve input on failure, disable duplicate submission, close/cancel and show honest feedback. | Pending. | Initial source review. | NOT TESTED. |
| Q5 | Overflow and responsiveness. | Desktop/tablet/320px phone: no accidental horizontal overflow, clipped dialogs or unreachable actions. | Pending. | None this release. | NOT TESTED. |
| Q6 | Supabase boundaries. | RLS on essential tables, restrictive policies/RPC checks and negative cross-account tests, private storage reads. | No policy/migration changes permitted. | Connected project metadata confirms expected tables/functions exist. | NOT TESTED: policy inspection and negative tests pending. |
| Q7 | Guardian/minor protection. | Adult guardian requirement, verified consent, coach approval and revocation enforced server-side. | No permission changes permitted. | None this release. | NOT TESTED. |
| Q8 | Production auth redirects. | Founder-approved HTTPS origin and allowlist; verification/recovery deep links verified with inbox. | No hosted settings changed. | Source uses current origin redirects. | BLOCKED: approved production origin and auth/inbox access. |
| Q9 | Membership/payment readiness. | Correct existing access; billing stays inactive until Founder approves mode/setup and full verified payment lifecycle. | No payment changes permitted. | Supplied integration diagnostic: publishable key and STRIPE_SECRET_KEY missing. | BLOCKED: separate Founder approval and Stripe connection/mode. |
| Q10 | Build/type/lint/automated checks. | Applicable checks pass on final revision; meaningful regression checks cover repaired logic. | Pending. | None this release. | NOT TESTED. |

## Milestone 4 — Launch decision
| ID | Requirement / implementation | Remaining and acceptance criteria | Changes made | Tests actually performed | Status / blockers |
|---|---|---|---|---|---|
| L1 | Launch-readiness document required. | Classify each essential requirement as PASS/FAIL/BLOCKED/NOT TESTED with evidence; optional items separate. | Pending. | None. | NOT TESTED. |
| L2 | Controlled first deployment instructions required. | Exact approval gates, backup/rollback, environment/redirect review, test cohort, smoke checks and stop conditions. | Pending. | No deployment performed. | BLOCKED until critical acceptance and Founder deployment approval. |

## Execution cursor
Controlled live acceptance started with real anonymous network checks and preserved Milestone 1 implementation; authenticated LA1-LA7 acceptance is BLOCKED pending designated sessions and exact Founder test-write approval. Resume at LA1, then LA2-LA6; complete applicable LA7/LA8 before any launch decision. No live writes or deployments are authorised by this cursor.
