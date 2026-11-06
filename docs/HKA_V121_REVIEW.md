# HKA Version 121 continuation — 6 November 2026

Updated existing React/Supabase dashboard components, retaining HKA forest green, warm ivory, antique gold and photo sign-in modal.

## Changes

- Sign-out clears account state, query cache and redirect state. Sign-in waits for the new account's profile; personalised welcome fades into its authorised dashboard. Student access to admin routes remains blocked. Restored sessions keep the current lesson URL on refresh.
- Desktop sidebar stays visible while content scrolls and still collapses. Founder coaching cards open their matching list or empty state; returning home clears their filters. Student Horses link uses the existing horseshoe.
- Shared floating chat now works in Student Account Settings and Founder dashboards through the same inbox, draft cache and server permission gate as Messages.
- Signed avatar/banner URLs and decoded images are cached per account and storage path, avoiding resets on home navigation. Completed actionable setup collapses; unavailable course enrolment and optional coaching do not keep setup expanded. Existing confirmed lessons, course progress and care reminders appear beneath the Student banner.
- Course progress refreshes dashboard records after completion; read errors display retry instead of apparent zero progress.

Source files: [SessionContext.tsx](../src/contexts/SessionContext.tsx), [App.tsx](../src/App.tsx), [AccessGate.tsx](../src/components/accounts/AccessGate.tsx), [SignInForm.tsx](../src/components/accounts/SignInForm.tsx), [AccountPage.tsx](../src/pages/AccountPage.tsx), [SiteLayout.tsx](../src/components/SiteLayout.tsx), [StudentDashboard.tsx](../src/components/accounts/StudentDashboard.tsx), [FloatingAcademyChat.tsx](../src/components/accounts/FloatingAcademyChat.tsx), [FounderDailyWorkspace.tsx](../src/components/accounts/FounderDailyWorkspace.tsx), [CoachingWorkspace.tsx](../src/components/accounts/CoachingWorkspace.tsx), [StudentHome.tsx](../src/components/accounts/StudentHome.tsx), [StudentHomeSummary.tsx](../src/components/accounts/StudentHomeSummary.tsx), [CoursePlayer.tsx](../src/pages/CoursePlayer.tsx).

## Checks performed

Production build and TypeScript passed. Scoped ESLint: zero errors, existing hook/refresh warnings. Messaging proposal source checks: 14 passed.

Actual app routes, SessionContext, Supabase SDK and components ran in isolated Chrome at 1440, 390 and 320 pixels: [14 flow checks](../.elmony/v121-flow-evidence/results.json) and [3 rejected-sign-in checks](../.elmony/v121-auth-negative-evidence/results.json) passed. Covered same-browser account switching without admin flash, route guard, sidebar scrolling/collapse, card lists/empty states, filter clearing, imagery reuse, compact setup, reminders, account chat and responsive layouts. No unexpected browser exceptions.

All browser Supabase traffic was intercepted. Course enrolment/progress persistence and Founder send/Student reply passed against isolated in-memory fixtures only; they do not prove deployed permissions, real JWT acceptance or database persistence. No hosted messages, accounts, enrolments, publishing or permission changes were performed.

## Messaging diagnosis and exact proposal

Fresh read-only deployed checks confirm [hka_message_contacts is absent](v121-messaging-readonly.json). Client intentionally requires this RPC's exact contact grants, so existing threads become History only and New Message has no authorised contacts. Legacy INSERT permits admin sends but Student recipients remain assignment-scoped; student_id is also NOT NULL, preventing adult cross-role direct messages without an invented Student scope.

Reuse the existing [exact SQL proposal](../supabase/proposals/202610310001_founder_direct_messaging.sql) and [restrictive rollback](../supabase/proposals/202610310001_founder_direct_messaging.rollback.sql), both outside automatic migrations and unchanged/unapplied. Proposal grants Founder direct access across registered roles without coaching assignment, Student-to-Founder replies, scoped external coaching, verified adult guardian consent for minors, participant privacy and recipient-only read updates. Unverified, suspended or consent-ineligible contacts remain unavailable.

Before execution: obtain separate, explicit Founder approval of this exact proposal, including its treatment of existing guardian activation consent for Founder/minor messaging. Recheck preflight and private-schema exposure against current metadata.

Acceptance plan after approval:

1. Execute matching-schema isolated SQL allow/deny suite and rollback checks; prior reports are historical evidence, not this turn's execution.
2. Use designated Founder/Student sessions: send one new private message through floating chat, reply as Student, refresh both inboxes, check exact recipient, scope and read receipts.
3. Check Founder contacts across all roles and dashboard switching; deny unrelated external Coaches, missing/revoked guardian consent, spoofed sender/scope, anonymous and suspended/unverified accounts; preserve legitimate history.
4. Repeat chat acceptance on desktop/mobile. Keep live course publication a separate approval.

## Horse Care Basics and remaining access

Read-only course ID: 2b31e19e-a2ad-4a9f-a120-ee81aaba4a88, title HKA Test Course - Horse Care Basics. Course and its single lesson are unpublished; lesson educational content is empty. Its exact title/description snapshot opened in Founder preview on desktop/mobile. A completed, published clone existed only inside intercepted browser fixtures for enrolment, lesson completion and refresh checks.

Deployed hka_learn/hka_read_lesson require published course and lesson plus eligible enrolment. Real Student access and persistence therefore remain unproven without a designated isolated test project and authorised test sessions. Test-environment access was requested; no credentials were supplied or fabricated. Complete lesson content before considering publication, then obtain separate Founder approval before publishing anything live.

