# HKA Equestrian - Interrupted release recovery assessment

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
