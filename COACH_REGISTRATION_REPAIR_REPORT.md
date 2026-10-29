# Coach Registration Repair

Date: 2026-10-29  
Migration status: prepared, not applied  
Deployment status: not deployed

## Root cause

The live `public.hka_signup_profile()` trigger derives `active_purpose` only for guardian-only, student, and horse-owner registrations. For coach-only registration, `active_purpose` remains `NULL`.

The trigger previously passed `item = active_purpose` into `public.hka_account_roles.is_active`. In PostgreSQL, `coach = NULL` evaluates to `NULL`, so the insert violated the table's `is_active boolean NOT NULL DEFAULT false` constraint. Supplying the column explicitly bypassed its default.

## Repair

The new migration changes only the inserted `is_active` expression to `coalesce(item=active_purpose,false)`.

Coach-only registration now creates a profile plus a coach purpose with:

- `status = 'requested'`
- `is_active = false`
- `approved_at = NULL`

Founder approval remains mandatory. Student, horse-owner, student-plus-coach, and guardian-plus-coach purpose selection keeps the existing active-purpose behavior. The trigger remains `SECURITY DEFINER` with an empty `search_path`, and existing schema-qualified pgcrypto calls are preserved.

## Test-data cleanup

Read-only inspection of the connected project found zero accounts matching the isolated test pattern `codex-%@example.invalid`. Consequently, no associated profiles, roles, invitation codes, link requests, guardian links, or coach assignments remained from the earlier failed transaction. Nothing was deleted.

After the corrected isolated test, a second read-only query again returned `remaining_test_users = 0`.

## Tests performed

A transaction temporarily installed the migration function, created five isolated `example.invalid` identities, asserted their resulting role state, rolled back, and returned `PASS`.

- Coach-only: registration succeeded; coach stayed requested and inactive.
- Student-only: authorized student purpose stayed active.
- Horse-owner-only: authorized horse-owner purpose stayed active.
- Student plus coach: student stayed active; coach stayed requested and inactive.
- Guardian plus coach: guardian stayed active; coach stayed requested and inactive.
- Existing-record counts changed only by expected temporary rows inside the transaction.
- Transaction rollback left no test identities.
- Frontend production build and TypeScript no-emit check passed.

## Files changed

- `supabase/migrations/202610290001_fix_coach_only_signup_active_role.sql`
- `COACH_REGISTRATION_REPAIR_REPORT.md`

## Outstanding live requirement

Founder approval is required before applying the new migration. After application, complete one browser signup with a non-production coach-only address and confirm the pending Coach / Instructor state appears without dashboard access before Founder approval.
