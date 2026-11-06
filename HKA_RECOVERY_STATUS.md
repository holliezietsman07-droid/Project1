# HKA Equestrian - Interrupted release recovery assessment

## Current Milestone 1 status - 2026-10-29

**Achievable implementation repaired and locally stable; full Milestone 1 acceptance remains PARTIAL/BLOCKED. Release is NOT READY.**
All five saved source additions are integrated. Application/configuration TypeScript and production bundling pass. Current evidence contains 23 passing helper checks and 34 passing browser check groups. No Milestone 2 work or deployment was begun.

This section supersedes the earlier recovery findings below. Controlled account delivery, durable server saves and authorization boundaries remain unproven; local fixtures are not connected-account acceptance.

### Exact integration and corrections

| File | Current change |
| --- | --- |
| `src/lib/coaching.ts` | Reject impossible calendar components and nonfinite timestamp ranges; retain timezone conversion and approval semantics. |
| `src/lib/conversations.ts` | Reused pair-based helper; label guardian conversations with child identity when sharing a coach. Preserve historical rows. |
| `src/components/accounts/CoachingCalendar.tsx` | Existing saved file reused unchanged by both Founder and student coaching screens. |
| `src/components/accounts/CourseContentEditor.tsx` | Existing saved file reused unchanged by AcademyWorkspace; missing dependency restored with actual private material/file controls. |
| `src/components/accounts/SignInForm.tsx` | Used in standalone and popup sign-in; restore remembered email after Auth renders, clear email preference and display storage failures. |
| `src/lib/auth-storage.ts` (new) | Complete missing storage adapter; isolate this app's token, migrate durable/tab sessions safely, clear both on sign-out and preserve active tokens over stale copies. |
| `src/integrations/supabase/client.ts` | Retain single client and VITE variables; supply adapter and exported setSessionPersistence. |
| `src/components/accounts/PrivateFileButton.tsx` (new) | Complete missing module with PrivateFileButton and LessonMaterials exports; authorize through existing Supabase/RLS, show failures and open short-lived private URLs in user-initiated tabs. |
| `src/components/SiteLayout.tsx` | Share sign-in/registration popup flow; correct dynamic student title, modal sizing, focus return and scroll reset; remove duplicate registration headings/actions. |
| `src/pages/AccountPage.tsx` | Use shared sign-in form, support existing registration inside popup, validate timezone, apply chosen session persistence before signup. |
| `src/components/accounts/ConversationWorkspace.tsx` | Use pair helper; explicit recipient, self-send guard, read-only nonparticipant oversight, thread-scoped compose resets, working mobile Back and bounded columns. |
| `src/components/accounts/OwnerDashboard.tsx` | Spaced searchable directory with stable IDs and reachable management; role-aware profile Back/breadcrumb, loading/error/unavailable state, private submission-file opening and safe async form references; Founder calendar and timezone/range validation. |
| `src/components/accounts/StudentDashboard.tsx` | Calendar-first guided requests, real availability, future-date/duration validation, safe async reset; photo save/remove error handling, responsive crop frame and focus return. |
| `src/pages/AcademyWorkspace.tsx` | Integrate module/lesson editing and author preview, readiness-gated course publication, handled lesson-publish failures and selected-course upload validation/reset. |
| `src/pages/CoursePlayer.tsx` | Expose private materials for selected lesson through same shared file component. |
| `src/components/accounts/HorseOrganizer.tsx` | Key horse detail subtree by horse ID to reset care edit state on selection; capture async form references; handle private-document open/rename errors. |
| `src/pages/MemberAccountSettings.tsx` | Validate name/timezone, confirm updates return a row, preserve failed edits and prevent close during save; contain dialog/toast on mobile. |

All five saved additions have active consumers, confirmed through TypeScript import analysis. None is intentionally unused. Existing routes and role gates remain in App.tsx; no parallel client, route tree, provider, payment flow or dependency was introduced.

### TypeScript failures resolved

- TS2307 at CourseContentEditor.tsx:7: missing PrivateFileButton module. Restored the expected module and both real exports.
- TS2307 at SignInForm.tsx:5: missing auth-storage module. Implemented the expected typed adapter and preference exports.
- TS2305 at SignInForm.tsx:6: missing setSessionPersistence export. Added it to the existing client and wired that same client to adapter.
- Latest app and configuration project checks both exit 0. No exclusions, unsafe casts or disabled compiler checks were added.

### Coaching assertions and root causes

The original failing assertions were:
- `assert.throws(() => coachingInstant('2026-02-30T09:00', 'Africa/Lusaka'))`, alongside invalid month/hour/string/timezone cases.
- `assert.throws(() => validateCoachingRange('invalid', 'invalid'))`, alongside past and reversed ranges.

Date.UTC normalized impossible dates into the following month; parsing now round-trips each UTC calendar component before conversion. Date.parse returned NaN, whose comparisons silently returned false; explicit finite checks now reject it.

Both affected checks pass. Existing timezone, summer/winter DST, DST-gap and UTC-midnight assertions also pass. Full helper runner now reports **23 PASS, 0 FAIL**, including three added guardian/stale-token regressions. No schedules, prices, approval rules or coaching data were changed.

### Current verification evidence

| Actual command/check | Result |
| --- | --- |
| `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit` | PASS, exit 0 on latest source. |
| `node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit` | PASS, exit 0; configuration unchanged. |
| `pnpm build --outDir .elmony/milestone1-build` | PASS, 2,628 modules; existing large-chunk warning. Existing dist preserved. |
| `node node_modules/eslint/bin/eslint.js src --format json --output-file .elmony/milestone1-lint-results.json` | PASS, 0 errors / 13 existing warnings. |
| `node .elmony/release-unit-check.cjs` | 23 PASS / 0 FAIL; synthetic records/storage only. |
| `node .elmony/milestone1-browser-check.cjs` | 26 PASS / 0 FAIL; fresh browser exceptions 0, console errors 0. |
| `node .elmony/milestone1-course-browser-check.cjs` | 4 PASS / 0 FAIL; editor defaults/cancel/failed-save input retention and preview switching. Four deliberately intercepted 403 responses were visibly handled; no uncaught or unexpected errors. |
| `node .elmony/milestone1-directory-browser-check.cjs` | 4 PASS / 0 FAIL; rows/search/same-name IDs/profile opening/Back/management controls; zero remote requests, exceptions or console errors. |

Browser viewports: 1440x1000, 768x1024, 390x844 and 320x740. Reviewed actual desktop auth and mobile registration/course screenshots; registration opens at top with reachable close control. Public/deep-link redirects, focus/Escape, remembered-email clearing, session preference, registration field mapping/adult/timezone/password validation, paired threads/reply callbacks/mobile Back/popup, real-empty calendar, avatar menu/remove-error/crop controls are covered.

The directory harness uses actual OwnerDashboard/StudentManagementProfile components with explicitly synthetic query-cache data and an anonymous SessionContext. Course harness intercepts all Supabase requests. They demonstrate controls and layout, not authentication, server saves or permissions.

Test-only files under .elmony include current runners/harnesses and evidence directories. Existing assertions were scoped to active dialog links and active message content, so inert background links and sidebar message previews do not create false failures. Fixture favicon was aligned with existing app asset. App code was not weakened for tests.

### Milestone 1 acceptance completed and remaining

| ID | Locally demonstrated / implementation completed | Remaining blocked or untested |
| --- | --- | --- |
| UI1 | Nonoverlapping block rows, name/ID search, empty search, separate same-name IDs, direct profile opening and reachable Manage action at four widths. | Investigate actual identically named live records using authorized read access; no records merged/deleted. |
| UI2 | Profile opening, appropriate title, Founder Back navigation and bounded tabs at four widths; coach-specific links, loading/error states, async form references and file action implemented. | Actual Founder/coach saves, coach-role navigation, marking/download permissions and persistence require controlled sessions/content. |
| UI3 | Calendar and date callback at four widths; timezone/DST/invalid-range tests pass; existing requests/availability/approval/cancellation paths retained. | Live published availability, request/approval/conflict/reschedule/cancel persistence need controlled identities/schedule. Server guard only permits students to request status changes; no attempt to bypass it. |
| UI4 | Distinct synthetic coach threads, exact reply callbacks, historical self-row exclusion, mobile Back and floating popup pass; guardian child-label regression passes. | Two-user real delivery, authorization denials, oversight permissions and read-only investigation of historical self-conversations require controlled sessions. |
| UI5 | Editor defaults/cancel, retained input on denied save, preview lesson switching, mobile containment; draft, upload and publication-readiness paths integrated. | Actual create/reopen/upload/publish/unpublish and student access/progress/marking require controlled author/student content. |
| UI6 | Horse-scoped remount, safe async resets and handled file errors implemented; existing care sections/storage retained. | Horse selection/care/save/cancel/upload/reopen and cross-account permissions need controlled horse/session; no connected mutation attempted. |
| UI7 | Reachable sign-in/signup routes and popups, mapped fields, email preference, session adapter, validation, focus/close and responsive checks pass. | Actual credentials, verification/recovery inbox links, refresh/tab session behavior with real tokens and hosted auth redirects remain untested. |
| UI8 | Avatar hit tests/view/remove-error/retry/focus/crop pass at four widths; settings row-confirmed saves and mobile/error handling implemented. | Connected profile/preference/avatar persistence and permission rejection need controlled account/storage access. |

Milestone 1 implementation can be reviewed locally; full connected acceptance remains blocked. Do not mark the whole milestone PASS based on fixtures.

### Database operations performed this turn

Destination remained sqaydpbqycvaictieafk.

1. Read-only function metadata: hka_signup_profile, hka_create_student_link_code, hka_redeem_student_link_code and hka_guard_coaching_request_update.
2. Exactly one SQL statement, read-only: `SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;`.
3. Result: 19 recorded migration versions, including **202610280003** and **202610290001**. Live signup and invitation definitions contain the previously repaired expressions. Their applied status is now confirmed by migration history and function metadata.
4. Existing student coaching update guard still rejects changes to dates/details and allows only defined reschedule/cancellation status transitions. Client retains those restrictions.
5. **Zero SQL mutations, migration replay, duplicate objects, RLS changes, account-permission changes, real-record test writes, function deployments or app deployments.**

### Stopping point

Stop at Milestone 1. Remaining user-dependent work is authorized controlled account/inbox/content access for the exact unproven criteria above; separate approval is still required for any future database or deployment changes. Milestones 2-4 were not started.

## Original recovery assessment (historical)


Date: 2026-10-29 (Africa/Johannesburg).
Decision: **NOT READY. First incomplete milestone: Milestone 1 - UI and workflows.**
This is an assessment, not another implementation run. No application source, existing checklist, migrations, live records, hosted settings or deployments were changed during recovery.

## Saved-state recovery

- Read `HKA_RELEASE_CHECKLIST.md`; its execution cursor is still Milestone 1, and its change entries are largely "Pending".
- `HKA_LAUNCH_READINESS.md` does not exist.
- Pre-release checkpoint exists: `.elmony-checkpoints/hka-release-20261029-112121.zip`, 20,790,777 bytes. Its 176 file entries were compared to current files with SHA-256; all are byte-identical and none are missing.
- Current Git HEAD is `5fe5d672b99db335b0c0bc0899569101b273048c`. All 187 non-environment files in that commit match their Git blob hashes; index comparison also found no differences. Git executable was unavailable, so these were direct, read-only Git-object/index comparisons.
- Five source files were added relative to the checkpoint, and are already saved in HEAD: `src/lib/coaching.ts`, `src/lib/conversations.ts`, `src/components/accounts/CoachingCalendar.tsx`, `src/components/accounts/CourseContentEditor.tsx`, `src/components/accounts/SignInForm.tsx`.
- The release checklist is also an addition relative to the checkpoint. Generated TypeScript build-info files predate this recovery and do not establish acceptance.
- No existing source file shows retained edits relative to the checkpoint. New helpers/components survived, but their intended changes to existing consumers did not. This is an integration gap, not a syntax-truncated existing file.
- Existing routes, Supabase client, dashboards, account settings, horse workflows, payment code, design references and migrations were preserved. No merge markers were found in source/migration searches.
- Reviewed the seven saved release harness/runner files under `.elmony/release-*`, plus saved browser/unit/lint evidence. They are local test artifacts, not application entry points.

## Genuinely complete versus incomplete milestones

| Milestone | Recovery status | Evidence and remaining work |
| --- | --- | --- |
| 1 - UI and workflows | **INCOMPLETE; first incomplete milestone** | Five additions exist, but calendar, conversation and course editing helpers are not wired into active screens. Two added components have unresolved imports. Directory layout and student-profile navigation issues remain in baseline source. Detailed remaining work below. |
| 2 - Functional acceptance | **BLOCKED / NOT PROVEN** | Checklist A1-A10 require controlled identities and isolated test content. No current connected-account acceptance evidence establishes authentication, role switching, linking/consent/revocation, course authoring/enrolment/submissions, real delivery, scheduling, horse persistence or cross-account denial. A11 responsive acceptance is also incomplete. |
| 3 - Quality/security | **INCOMPLETE** | Current build and lint succeed, but app TypeScript fails. Historical browser evidence contains failures and references code now absent. Metadata confirms RLS on four inspected tables, not full authorization acceptance. Production redirects, inbox recovery, guardian/minor negative tests and payment readiness remain unproven. |
| 4 - Launch decision | **INCOMPLETE** | Launch-readiness document and accepted controlled deployment/rollback instructions are absent. No launch/deployment authorization was requested or used. |

No entire release milestone is genuinely complete. Completed sub-results include a preserved checkpoint, a saved requirement register, current production bundling, configuration TypeScript checking, lint with warnings, and limited helper behavior. These do not establish workflow acceptance.

## Unfinished saved source

| File | Actual saved state | Exact unfinished work |
| --- | --- | --- |
| `src/components/accounts/CourseContentEditor.tsx` | Contains module/lesson edit dialogs and author preview, but imports missing `@/components/accounts/PrivateFileButton`. Active AcademyWorkspace does not import this component. | Reconcile private lesson-material viewing with existing storage helpers, resolve missing import, and integrate editing/preview into existing course manager. Verify draft reopen, uploads, preview and publication with isolated content. |
| `src/components/accounts/SignInForm.tsx` | Contains intended email-memory/session choices, but imports absent `src/lib/auth-storage.ts` and nonexistent client export `setSessionPersistence`. AccountPage still renders its previous Auth component directly. | Recover/complete persistence adapter against the single existing Supabase client; resolve imports and wire this form into existing auth entry points. Verify checked/unchecked choices across refresh, tab close, sign-out and failure. |
| `src/components/accounts/CoachingCalendar.tsx` | Calendar component exists; no active screen imports it. | Integrate into existing Founder/student coaching screens; connect day selection to guided request, use actual saved availability and explicit loading/error/empty states. |
| `src/lib/coaching.ts` | Helper exists but active coaching handlers still use browser-local Date conversion. Two current synthetic checks fail. | Reject impossible calendar dates before Date.UTC normalization; reject invalid/nonfinite start/end timestamps; wire timezone-aware conversion and range validation into request/availability handlers. |
| `src/lib/conversations.ts` | Helper correctly separates two synthetic coach pairs and excludes synthetic self-records, but ConversationWorkspace still groups by student_id. | Integrate participant-pair grouping and explicit reply recipient/read-only oversight into full and floating chat; verify guardian child disambiguation and approved contacts before first message. Preserve historical rows. |

No code was repaired during this assessment.

## First incomplete milestone - exact remaining work

The following is the completion queue for Milestone 1, not authorization to execute it now.

| ID | Current verified implementation | Remaining work and acceptance |
| --- | --- | --- |
| UI1 - Founder students | Name search and direct student-profile links exist in OwnerDashboard. Row anchors lack block/flex layout; the management pane depends on student selection state that no row updates. | Give each row nonoverlapping layout, spacing and keyboard focus; keep direct profile opening; reconcile unreachable inline management state. Read-only investigation must distinguish identically named records by stable identity and authorized account evidence; never merge/delete them. Demonstrate search, empty/error/loading states and narrow-screen layout. |
| UI2 - Student profiles | Existing route is guarded for coach/admin and includes enrolment, tasks, submissions and marking. A role-aware dashboardBase is calculated, but breadcrumb/Back links still point to Founder routes. Dynamic student-profile document title falls through to "Page not found". Task/message handlers access event.currentTarget after await. | Use role-appropriate navigation/title; implement loading/error/not-found behavior; retain form references safely across async work; ensure marking opens relevant uploaded work and reports failures honestly. Demonstrate enrolment/task/marking/message saves, Back navigation and persistence with controlled accounts. |
| UI3 - Coaching | Request/approval/cancellation RPC paths exist. Current screens remain list-based despite "Calendar-led" wording. New calendar/helper files are unused. | Integrate calendar first; guide date/service/format/goals/request; validate future and alternative dates, ranges and member timezone; preserve actual availability and conflict/approval enforcement. Demonstrate approval/reschedule/cancellation persistence and honest unconfirmed availability. Repair helper failures listed above. |
| UI4 - Messages | Existing component and floating entry points survive. ConversationWorkspace still combines everyone under each student ID and infers reply recipient from latest incoming message. New pair helper is unused. | Adopt distinct participant pairs, explicit recipients and self-send rejection in both views. Keep authorized oversight read-only when not a participant. Verify mobile Back, floating popup, send/reply/error and server denial with distinct controlled sessions. Investigate historical self-conversations without deleting records. |
| UI5 - Academy Workspace | Existing course draft, module/lesson creation, ordering, questions and private uploads exist. Added editor/preview is disconnected and missing material-view dependency. | Resolve editor dependency and integrate edit/preview/reopen. Verify readiness-gated publication, lesson/module state, supported-file validation, private upload reopen, save failure/retry and student consumption with isolated course content. |
| UI6 - Horse management | Existing horse selection, profile/document/care/reminder sections and care edit/cancel code survive unchanged. | Prove correct selected-horse binding and focused editing, including switching horse while care edit state exists; verify save/cancel, supported uploads, reopen and cross-account denial. Current recovery did not mutate horses or storage. |
| UI7 - Authentication | Existing Supabase routes, SessionContextProvider, registration field names/password confirmation and role gates survive. New sign-in choices are disconnected. Current registration unchecked Stay Signed In signs out a returned session rather than implementing tab-only persistence. | Complete existing-client persistence integration and missing imports; verify sign-in and registration popup geometry, input mapping, focus/Escape and error states; validate timezone; verify email-memory clearing and distinct durable/tab session behavior. Controlled signup/verification/recovery/inbox acceptance remains required. |
| UI8 - Settings/avatar | Existing settings save/error rollback, avatar menus/crop/view/remove and profile refresh survive unchanged. | Verify saves and reload persistence under correct permissions; repeat avatar/settings hit tests and keyboard/focus/dismissal/viewport checks; verify failed saves preserve edits and wrong-account actions are denied. Existing code alone does not establish acceptance. |

## Supabase SQL operations and observed effects

Only metadata read tools were used during this recovery: project object names, four table definitions/policies/triggers, and three function definitions. No SQL-execution, migration or deployment tool was called; no RPC was invoked and no application records were read or changed as tests.

### Confirmed live database state

Connected project: `sqaydpbqycvaictieafk`.

| Object | Observed live definition/effect | Recovery conclusion |
| --- | --- | --- |
| `public.hka_signup_profile()` | Uses `coalesce(item=active_purpose,false)`; coach-only purposes become requested/inactive instead of writing NULL into is_active. Preserves SECURITY DEFINER, empty search_path and schema-qualified digest calls. | The coach-signup repair is currently installed. `COACH_REGISTRATION_REPAIR_REPORT.md` saying "prepared, not applied" is stale with respect to present function code. Live signup behavior was not exercised. |
| `public.hka_create_student_link_code(text)` | Uses `extensions.gen_random_bytes` and `extensions.digest`, a student-purpose check, a hashed 12-character code and 72-hour expiry. | Invitation crypto repair is currently installed; code creation was not invoked. |
| `public.hka_redeem_student_link_code(text)` | Uses `extensions.digest`, rejects expired/invalid/self redemption, checks guardian/adult or coach application eligibility, creates a link request and increments uses. | Invitation crypto repair is currently installed; no request or use counter was changed during recovery. |
| `hka_profiles`, `hka_messages`, `hka_coaching_requests`, `hka_audit` | All four report RLS enabled. Relevant profile/message/request policies and coaching update guard are present. Audit reads are admin-scoped. | Metadata presence only; no negative cross-account test or table-wide security certification was performed. |

### What can and cannot be attributed to the interrupted run

- Existing repair reports describe earlier SQL attempts involving temporary example.invalid users. The linking report describes a failed/uncertain attempt; the later coach repair report says a corrected transaction rolled back and follow-up counts were zero. These are saved historical claims, not independently rerun cleanup verification.
- Present live definitions prove both function repairs exist persistently, contradicting older "not applied" wording in repair reports. They do not prove who applied them, when, whether a named migration was recorded, or whether application happened during the interrupted release.
- All local migration/function source files match the pre-release checkpoint; no new release SQL migration was found.
- No SQL execution receipt, approval record or operation/audit log was found among local release artifacts. Metadata tools cannot establish prior row mutations, test-identity cleanup, or migration execution history.
- Therefore, **the interrupted run's SQL execution history and row-level effects remain unverified**. An existing Elmony operation receipt or authorized database/audit history would be needed for exact attribution. Do not reapply these migrations merely because an old report says they were unapplied.

## Checks actually performed on current saved revision

| Check | Result | Scope / limitation |
| --- | --- | --- |
| SHA-256 checkpoint comparison | PASS | 176 checkpoint entries present and identical. |
| Git HEAD and index blob comparison | PASS | 187 non-environment HEAD files unchanged; no index differences. Environment contents were not printed or compared. |
| Source conflict-marker search | PASS | No merge-marker matches in checked TS/TSX/SQL source. |
| `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit` | **FAIL** | TS2307 at CourseContentEditor.tsx:7 (PrivateFileButton); TS2307 at SignInForm.tsx:5 (auth-storage); TS2305 at SignInForm.tsx:6 (setSessionPersistence). Final direct check exited 1. |
| `node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit` | PASS | Vite/config project only. |
| `pnpm build --outDir .elmony/recovery-build` | PASS | Vite production build, 1,795 modules; existing large-chunk warning. Unreachable files are not bundled, so this does not contradict TypeScript failure. Existing dist output was preserved. |
| `node node_modules/eslint/bin/eslint.js src --format json --output-file .elmony/recovery-lint-results.json` | PASS with warnings | 0 errors, 13 warnings; source-only lint, no autofix. |
| Seven read-only synthetic helper checks | **5 PASS / 2 FAIL** | Pass: timezone conversion, DST gap rejection, distinct coach recipients, self-record exclusion without input mutation, same-name identity separation. Fail: impossible February date rejection; invalid availability timestamp rejection. No live data used. |
| Local preview availability probe | Unavailable | Anonymous fetch to 127.0.0.1:8080 failed; no preview process was started/restarted and no new browser-runtime acceptance is claimed. |

The application TypeScript and helper failures remain unresolved intentionally under the assessment-only scope.

## Historical evidence reliability

- Saved `.elmony/release-evidence/browser-results.json` is dated 2026-10-29T11:01:38Z and contains 24 PASS / 2 FAIL entries: the 768px public-route timeout and console/network-error review failed.
- Saved `unit-results.json` reports 21 passes at 11:10:32Z, but current saved unit runner has 20 named tests and imports missing auth-storage. Its historical results cannot establish current-revision success.
- Historical browser output references auth-storage, improved paired conversations and auth popups that are not integrated in current saved source. Later screenshot timestamps do not constitute a newer complete passing result file.
- Historical ERROR entries and those two browser failures are retained as historical evidence, not silently relabeled passing. Current build/config/lint results above are newer passing checks of their stated scopes only; browser runtime remains unproven.
- Original browser fixture code intercepts synthetic storage and records message callbacks. Those checks, even when passing historically, do not prove connected delivery, actual persistence, RLS denial or live account behavior.

## Safe continuation boundary

Resume at Milestone 1 using current saved source and this report. First reconcile incomplete component dependencies and active consumers, then finish UI1-UI8 and current type/helper failures before pursuing controlled acceptance.

Do not repeat currently installed SQL repairs, run migrations, alter live students/messages/horses, create test accounts or deploy under this recovery request. Milestones 2-4 still need their specific acceptance evidence and any applicable later authorization.

Recovery produced this report and local generated check output only; existing release checklist and historical evidence remain unchanged.
