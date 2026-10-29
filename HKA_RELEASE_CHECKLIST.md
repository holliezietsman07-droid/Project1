# HKA release checklist

Updated: 2026-10-29. Release decision: **NOT READY**. Work in progress.
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

## Milestone 2 — Functional acceptance
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
Milestone 1 safe implementation is locally stable; connected acceptance remains PARTIAL/BLOCKED as listed above. Stop here; do not begin Milestone 2 under this run.
