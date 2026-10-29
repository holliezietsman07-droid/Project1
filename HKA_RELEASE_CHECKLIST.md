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

## Milestone 1 — UI and workflows
| ID | Requirement and current implementation | Remaining / acceptance criteria | Changes made | Tests actually performed | Status / blockers |
|---|---|---|---|---|---|
| UI1 | Founder directory exists with search and profile links; inline anchors and unreachable selection state observed in OwnerDashboard. | Clearly spaced rows; search; accessible identity disambiguation; existing authorised navigation preserved; never merge/delete identically named records. | Pending. | Source review of existing directory. | FAIL: row layout; connected duplicate investigation needs authorised read access. |
| UI2 | Student management route, enrolment, tasks and marking exist. | Correct role-aware breadcrumbs/title, loading/error/not-found states, valid saves, file viewing, actionable feedback. | Pending. | Routes and management source reviewed. | NOT TESTED; connected saves require controlled identities. |
| UI3 | Coaching requests, availability and approvals exist; list-first UI. | Calendar first; guided request; only actual published availability; correct time zones, date validation, approval/cancellation handling. | Pending. | Existing Founder coaching handlers reviewed. | NOT TESTED. |
| UI4 | Shared conversation component groups all participants by student ID. | Distinct authorised pairs, correct reply recipient, no self send, working mobile navigation and floating chat, server access boundaries. | Pending. | Source review identified grouping/reply hazards. | FAIL: participant grouping; live two-user test blocked by identities. |
| UI5 | Existing Academy Workspace/course player, content and file helpers. | Create and reopen draft; modules/lessons/uploads; preview; readiness-gated publish; progress and assignment review. | Pending. | Not yet reviewed. | NOT TESTED. |
| UI6 | Existing HorseOrganizer and storage flow. | Select correct horse, focused care editing, save/cancel, file validation and permission handling. | Pending. | Not yet reviewed. | NOT TESTED. |
| UI7 | Existing Supabase account pages and popups. | Correct fields, responsive modal/focus/Escape, registration validation, Remember Me and Stay Signed In persistence. | Pending. | Session/client and registration source reviewed. | NOT TESTED; live auth requires controlled identities. |
| UI8 | Existing account settings and avatar menus. | Durable save, permissions, reachable photo actions, cancellation, focus return, viewport containment and persistence. | Pending. | Prior fixes present; not accepted on historical claims. | NOT TESTED. |

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
Milestone 1: inspect remaining existing workflows, implement achievable UI/logic repairs and verify them; then complete Milestones 2–4 with honest evidence and explicit blockers.
