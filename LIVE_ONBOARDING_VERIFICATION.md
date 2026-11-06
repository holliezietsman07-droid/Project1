# HKA Equestrian — Live Onboarding Verification

Date: 28 October 2026  
Environment: current Elmony preview connected to Supabase project `sqaydpbqycvaictieafk`

## Result

No live onboarding workflow can be marked successful or failed from current evidence. All eight workflows remain **UNTESTED** because the connected project contains only the preserved baseline accounts and no invitation codes or link requests. No accounts, student records, horses, pricing, payments, migrations, or frontend deployments were changed during this review.

Current live aggregate evidence:

- Account roles: 1 authorised administrator and 4 authorised students.
- Student invitation codes: 0.
- Student link requests: 0.
- Preview source builds successfully and routes expose account settings plus student, parent, coach, and administrator dashboards.

| Workflow | Status | Evidence available | Evidence still required |
|---|---|---|---|
| Multi-role account registration | UNTESTED | Registration accepts multiple purposes; non-coach purposes are authorised and coach starts requested. | Complete email-confirmed signup using a new adult test identity and inspect resulting dashboard/roles. |
| Add role to existing account | UNTESTED | Account Settings calls the deployed role-request RPC. | Add a second purpose to a disposable adult test account and confirm persisted state after sign-out/sign-in. |
| Dashboard role switching | UNTESTED | Switch control appears for more than one authorised purpose and calls the switch RPC. | Switch both directions and confirm route, profile role, permissions, and refresh persistence. |
| Invitation-code creation and expiry | UNTESTED | Student code creation is wired; database expiry is 72 hours and redemption rejects expired codes. | Create a code, redeem one valid code, then attempt the same workflow after genuine expiry or in an isolated clock-controlled test project. |
| Parent/guardian verification and approval | UNTESTED | Founder review, claimant consent, and secure request states are wired. | Exercise pending-founder, awaiting-consent, approved, and rejected states with adult test identities. |
| Coach approval and student linking | UNTESTED | Coach role and link approvals are wired; adult-student links can complete after Founder review. | Exercise requested, authorised, linked, rejected, and dashboard access states. Minor guardian-consent branch needs a safe non-production minor fixture. |
| Revocation of linked access | UNTESTED | Approved request exposes revocation and RPC removes guardian/coach access. | Revoke an approved disposable link and prove protected student data disappears immediately and after sign-in. |
| Rejection of unauthorised access | UNTESTED | RPC checks, access gates, and RLS reject unauthorised purposes and unrelated records. | Attempt random/expired/self codes, direct protected routes, and unrelated student reads with an outsider test identity. |

## Focused Founder test procedure

Use unique, clearly non-production adult identities such as `hka.preview.student+<run>@<controlled-domain>`, `hka.preview.guardian+<run>@<controlled-domain>`, `hka.preview.coach+<run>@<controlled-domain>`, and `hka.preview.outsider+<run>@<controlled-domain>`. Use a mailbox controlled by HKA so every verification link can be completed. Do not use real student or child details.

1. Open `/sign-up` in preview as Student Tester. Select **Student / Rider** and **Horse Owner / Stable Manager**, enter synthetic adult details, complete email verification, and sign in.
2. Confirm Student Tester reaches `/dashboard/student`. Open **Account settings** and confirm both authorised purposes appear.
3. Use **Switch Dashboard** in sidebar/account menu to select `horse owner`, confirm `/dashboard/student?section=horses`, then switch back to `student`; refresh and repeat after sign-out/sign-in.
4. In Student Tester's **Account settings → Secure student linking**, select **Create parent code**. Record code and creation time without placing it in chat or source control.
5. Register Guardian Tester as an adult **Parent / Guardian**, entering parent code during signup; alternatively redeem it from Guardian Tester's Account Settings. Confirm message says request was submitted and no student record is visible yet.
6. Sign in as Founder, open `/dashboard/admin` and its overview. Under **Student link approvals**, verify synthetic identity/relationship, then choose **Verify and approve**.
7. Sign in as Guardian Tester, open `/dashboard/account`, find guardian request in `awaiting consent`, and choose **Accept verified link**. Confirm linked student access appears; verify no unrelated student appears.
8. Repeat parent-link flow with a new code/request and choose **Reject** as Founder. Confirm Guardian Tester gains no linked student access.
9. From Student Tester, create a **coach code**. Register Coach Tester with **Coach / Instructor**, synthetic qualifications, and code; confirm coach purpose and link remain pending.
10. Sign in as Founder. Approve coach purpose under **Coach account approvals**, then approve link under **Student link approvals**. Because Student Tester is an adult, confirm request becomes approved without minor guardian consent.
11. Sign in as Coach Tester. Switch to coach dashboard, confirm only linked Student Tester appears, open that record, and confirm another student URL/list entry is unavailable.
12. From Student Tester, Guardian Tester, or Founder, revoke each approved disposable link in **Account settings**. Sign in again as claimant and prove linked student data and protected routes are no longer available.
13. Sign in as Outsider Tester. Attempt a random code, Student Tester's already-used code, self-redemption where possible, direct `/dashboard/admin`, `/dashboard/coach`, and a known student-record URL. Expected result is a clear error, redirect, or unavailable record with no data disclosure.
14. For expiry, retain one unused disposable code for at least 72 hours, then redeem it from correct-role tester. Expected result: `Invitation code is invalid or expired.` Do not change database timestamps in this connected project.
15. After every step, Founder should confirm existing five baseline accounts, four baseline students, and horse record remain unchanged; delete disposable identities/data only through an approved cleanup procedure after evidence is captured.

## Remaining launch blockers

- No controlled test mailboxes or disposable confirmed identities were supplied, so authenticated preview flows could not be executed here.
- No test codes or requests currently exist, so approval, consent, rejection, and revocation states have no live evidence.
- True 72-hour expiry needs elapsed time or a separate isolated test project with controlled clock/data; changing timestamps here would violate scope.
- Minor-specific coach consent cannot be safely exercised against preserved records and must remain untested until an isolated synthetic minor fixture is approved.
- Launch decision should remain pending until Founder records screenshots/timestamps for steps 1–14 and confirms expected access removal after revocation and re-login.
