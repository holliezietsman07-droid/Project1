# Parent and Coach Linking Verification

Date: 2026-10-29  
Connected project: `sqaydpbqycvaictieafk`  
Deployment or migration applied: no

## Outcome

No existing account, membership, student record, dashboard design, function, or migration was changed. Frontend production build passed, and route/RPC wiring is present for parent and coach dashboards, approvals, consent, revocation, and role switching.

Live workflow execution did not complete. The rollback-only test attempted to create isolated `example.invalid` identities, but coach-only signup failed before invitation redemption began. Elmony then marked the database action outcome uncertain and blocked both the cleanup check and a corrected retry.

## Failed

### Coach-only account creation prerequisite

`public.hka_signup_profile()` inserts each requested purpose with:

```sql
item = active_purpose
```

For a signup whose only purpose is `coach`, `active_purpose` remains `NULL`. PostgreSQL therefore tries to insert `NULL` into `public.hka_account_roles.is_active`, which is `NOT NULL`.

Observed error:

```text
null value in column "is_active" of relation "hka_account_roles" violates not-null constraint
```

Context identified the failing row as a requested coach role with `is_active = NULL`. This is a database-function defect, not a dashboard rendering issue.

## Successfully verified

- Founder-reported Create Parent Code and Create Coach Code success was accepted as prior evidence; it was not repeated.
- Production frontend build completed successfully.
- Static wiring exists for:
  - `hka_redeem_student_link_code`
  - `hka_review_student_link`
  - `hka_guardian_link_decision`
  - `hka_guardian_coach_consent`
  - `hka_revoke_student_link`
  - `hka_switch_dashboard`
- `/dashboard/parent` and `/dashboard/coach` routes exist behind matching role gates.
- Dashboard switch UI calls `hka_switch_dashboard`, refreshes the profile, and navigates to the returned route.

Static inspection is not counted as successful end-to-end workflow execution.

## Untested due to blocker

- Correct guardian-code redemption by an authorized adult guardian
- Correct coach-code redemption by a coach applicant
- Pending parent and coach request visibility/state
- Founder approval and rejection
- Parent consent after founder verification
- Guardian consent for coaching access to a minor
- Parent and coach access after approval
- Parent and coach permission revocation
- Expired, reused, wrong-account-type, self-redemption, and unauthorized-review rejection
- Browser-level dashboard role switching

## Required continuation

1. Inspect the connected project for any `codex-%@example.invalid` auth users before retrying. The first statement failed transactionally, so persistence is unlikely, but Elmony prevented confirmation.
2. Repair `hka_signup_profile()` so coach-only signup writes `is_active = false` instead of `NULL`, preserving the secure empty `search_path` and current approval requirements.
3. Run the isolated verification again inside one explicit transaction and roll it back.
4. Exercise the visible UI with non-production student, guardian, coach, and founder sessions to confirm browser state, messages, and dashboard switching.

