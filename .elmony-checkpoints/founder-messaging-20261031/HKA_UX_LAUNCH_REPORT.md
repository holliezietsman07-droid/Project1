# HKA UX and invitation-only launch review

Latest focused assignment/Founder-role review: [HKA_COACH_MESSAGING_ACCESS.md](HKA_COACH_MESSAGING_ACCESS.md), 2026-10-31; it supersedes the Founder-role uncertainty and generic direct-Coach assignment instructions below. Founder remains authorized active admin, with zero assignments; external Coaches use protected approval/guardian consent.

Date: 2026-10-31. Release decision: **NOT READY — authorised acceptance and Founder actions remain outstanding.**

This report accompanies the latest section of HKA_RELEASE_CHECKLIST.md. IMPLEMENTED means source exists; VERIFIED means the specific local check below passed; BLOCKED and NOT TESTED remain separate from live acceptance. No deployment, database mutation, migration, policy change, course publication, test-account creation, billing change or real message/appointment write occurred.

## Recoverability and preserved boundaries

Pre-edit source and release checklist: `.elmony-checkpoints/launch-refinement-20261031/`.
Changed-source hashes and protected-file comparisons: `.elmony/launch-refinement-evidence/change-review.json`.

Read the four-page Professional Website Designer & Quality Control master prompt, approved student and Founder visual references, release checklist, recovery notes, actual routes, Supabase singleton and related source before implementation. Existing logo, uploaded photographs, visual identity, forest green, ivory, antique gold and tagline remain. Auth/session infrastructure, App routes, Supabase client, core academy helpers, coaching time/DST helpers and payment files match the checkpoint byte-for-byte. Existing photo upload, crop, private-image and shared dashboard navigation helper block also matches byte-for-byte. No Supabase or public asset file was edited.

## 1. Messaging — IMPLEMENTED / locally VERIFIED; connected delivery BLOCKED / NOT TESTED

### Confirmed root cause

Read-only inspection of the connected project `sqaydpbqycvaictieafk` established:

- `hka_messages`, `hka_profiles`, `hka_coach_students` and `hka_guardians` have RLS enabled.
- The INSERT policy requires `sender_id = auth.uid()`. For a student writing in their own student scope, the recipient must be a `coach_id` in `hka_coach_students` for that student.
- Current live data: **4 student profiles, 0 assigned-coach links, 0 historical self-addressed messages, and 2 staff-to-student message rows without a matching coach assignment**. These are aggregate read-only observations, not invented records or live delivery tests.
- With an empty assignment table, a normal student-to-Founder/coach reply cannot satisfy that INSERT branch. Founder can send under the admin branch, but receiving that message does not grant the student a reciprocal assignment. This explains the observed legitimate student reply rejection; changing the body from “hi” cannot resolve it.
- Existing pair mapping was already correct: the displayed conversation key is `studentId:sortedParticipantIds`; it is not a database conversation column. The database stores `student_id`, `sender_id` and `recipient_id` separately. The UI passes the actual student ID and peer ID, never the composite key, to the insert.
- The live profile SELECT policy permits the caller's own profile or `hka_view_student(id)`. It does not provide a student with the Founder's/coach's profile merely because a message exists. This explains the missing peer name. Existing authorised profile names are displayed; hidden names are not guessed.
- Read policies, recipient-only read-receipt policy, coach assignment policies, guardian consent policies, `hka_teach` and `hka_view_student` definitions were reviewed. An additional `hka_coaches` body inspection hit the metadata tool's exploration limit; no unsupported claim about its current body is made.

### Implemented behavior

`AcademyMessages → useMessaging → canSendMessage → existing saveRow/db singleton → hka_messages` is now the single active insert path. Student, Founder, scoped student management, Guardian and Coach entry points reuse it; the hidden legacy message composer and its bypass handlers were removed.

- Assigned contacts are derived from actual relationship rows, including before the first message.
- Sender comes from the authenticated session and must match the loaded profile. Self recipients, unrelated students, unassigned coaches and non-consenting/pending guardian relationships are rejected by the client preflight. Relationship rows are reread immediately before every insert; unchanged server RLS remains authoritative.
- Historical messages remain visible within existing RLS scope, including when a formerly allowed reply relationship no longer exists. No history was deleted or rewritten.
- Missing names use “Academy member”, without technical ID fragments. Available authorised names still identify exact peers; same-name identities remain distinct by underlying IDs.
- Ref locks prevent duplicate submits before React rerenders. Per-thread drafts survive thread changes, errors and floating-to-full messaging expansion through the in-memory session query cache; sign-out clears that cache. No fabricated delivered status or local replacement message record is created.
- Read receipts update only returned IDs belonging to the current recipient and only after a thread is displayed. Successful returned updates refresh unread counts. Guardian oversight never marks another recipient's messages read.
- Realtime subscription plus a 15-second message refresh fallback handles new messages and receipts. Subscription delivery itself remains NOT TESTED on the connected project.
- Permission/network errors explain delivery failure and preserve the draft. A confirmed insert is not relabelled failed because a later refresh failed.
- Student floating launcher is hidden while full Messages or its popup is open, keeping the composer/Send area clear. Existing WhatsApp-style layout is retained.
- Founder messaging explains missing assignments and links to the existing directory assignment controls; no relationship is created automatically.

### Founder action required

In the existing Founder Student Directory, identify the intended student by the dedicated record and use Manage to assign the intended authorised Founder/coach. **Do not bulk-create links.** External coach/minor relationships must use the existing approval and guardian-consent process before access is granted. Then test the exact sender/recipient pair using authorised accounts and designated real records. No policy relaxation is required to address the observed empty assignment table.

### Optional exact name-lookup proposal — NOT APPLIED; separate Founder approval required

If fully named assigned-coach contacts are required despite the current profile visibility policy, approve a narrowly scoped RPC rather than broadening profile reads. Proposed exact SQL:

```sql
CREATE FUNCTION public.hka_assigned_message_contacts()
RETURNS TABLE (id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT DISTINCT p.id, p.full_name
  FROM public.hka_coach_students cs
  JOIN public.hka_profiles p ON p.id = cs.coach_id
  WHERE cs.student_id = auth.uid()
    AND public.hka_active()
    AND public.hka_active(p.id)
    AND p.id <> auth.uid()
    AND p.role IN ('coach', 'admin');
$$;
REVOKE ALL ON FUNCTION public.hka_assigned_message_contacts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hka_assigned_message_contacts() TO authenticated;
```

This returns assigned adult staff IDs/names only; no child profile details, birthdays, photos, unrelated profiles or messages. Before any later approval/application, recheck current metadata and the existing consent/assignment lifecycle, then wire the existing client to the approved RPC. No application code calls an uninstalled RPC. If broader policy changes are requested later, they need their own exact review and separate Founder approval.

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

1. **BLOCKED — Founder relationship action:** select the intended real student/Founder/coach pair and establish the appropriate existing assignment/approval/consent relationship. There are currently zero coach assignments. Do not relax message RLS or add self-conversations.
2. **NOT TESTED — actual cross-account message delivery:** Student → assigned staff and reply; verify exact recipient, read receipt/unread refresh, history after reload, mobile composer, unrelated peer denial, revoked link denial and guardian oversight using specifically authorised accounts/records. No automatic test messages were sent.
3. **NOT TESTED — actual saves:** confirm rider preference persistence after sign-out/sign-in, course access and resume, submission/feedback persistence, Founder scheduling and Student request save/reload/approval with designated records. Live appointment creation remains explicitly unverified.
4. **Founder content action:** finish and preview the existing draft; explicitly approve publication of the first real course when satisfied. Zero published courses prevents meaningful course enrolment/learning acceptance.
5. **Founder decision on hidden staff names:** names currently display only when existing RLS makes profiles available. Approve and validate the narrowly scoped name RPC above if fully named student-side staff contacts are required; no broad profile access was added.
6. **NOT TESTED — invitation-only acceptance:** actual Founder, Student, assigned Coach and approved Guardian/minor checks; profile/avatar/horse save/reopen/limit-denial checks, privacy and negative cross-account access, invitation/approval and deployed-origin authentication. Use existing release checklist gates; do not paste credentials into reports.
7. Founder must review this evidence and separately authorise any database change, real test-record writes, course publication or deployment. No such action is inferred from local passes.

Minimum launch blockers remain relationship configuration, a real published course, and authenticated positive/negative acceptance (including persistence); named-staff lookup remains an explicit Founder decision. Local implementation is not launch certification.

## B. Optional improvements after launch

- Broader assessment previews once real assessments exist; no assessment content was invented.
- Calendar write capabilities for coaches/guardians beyond current permissions, only after a separately approved server/security design.
- Bundle splitting to reduce the existing large-chunk warning.
- Further compact mobile information density and non-essential visual polish, preserving approved photographs and branding.

## Precise continuation

Start with the Founder assignment and designated-account acceptance in A1–A3. If named staff lookup is approved, review current metadata again, apply only the approved RPC through Elmony's approval flow, then wire the existing singleton client and rerun focused name-access/delivery checks. Do not repeat installed historical repair migrations. Keep this app unpublished until remaining release gates are signed off.
