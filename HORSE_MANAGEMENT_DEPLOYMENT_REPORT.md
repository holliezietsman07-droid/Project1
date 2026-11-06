# HKA Horse Management deployment readiness

Overall result: PASS WITH DEPLOYMENT HOLD

Production package is internally consistent after correcting Founder horse-photo paths. No migration, reminder job, email job, or website publication was performed during this preparation turn.

## Safe deployment order and SHA-256

1. supabase/migrations/202610250002_founder_horse_photos.sql
   - SHA-256: f55395558c9db1c5f07c45316941e0a546796cf7bca0f61a2da964e4cd7af74e
   - Connected project: already applied.
   - Purpose: establishes private horse-photo metadata, Founder-only photo RPCs, storage validation, and file-purpose constraints.

2. supabase/migrations/202610260001_horse_organiser.sql
   - SHA-256: 48279e938accaa8efb88987c6b7645b3988b8db496cce1c6f0f357405a37b54f
   - Connected project: pending.
   - Purpose: adds private documents, care appointments, attachments, reminders, owner self-service photos, replacement history, and reminder generation.
   - Dependency: must follow 202610250002 because it relies on horse and horse_photo file purposes, horse_id metadata, private storage policies, and existing photo RPC signatures.

3. supabase/migrations/202610260003_horse_membership_limits.sql
   - SHA-256: 0823eac8de1c630741d81858dbe5385f9952741cad655e1b4093cd073f005c42
   - Connected project: already applied.
   - Purpose: adds Founder-configurable limits and replaces the horse insert trigger with database-enforced tier limits.
   - Clean-environment order: apply after the organiser migration and before scheduling reminders. It is independent of organiser tables and is already safely active on this connected project.

4. supabase/migrations/202610260002_horse_reminder_schedule.sql
   - SHA-256: 545dadbb9a9fb596bed406a67343f0a03241d526bfe2cbf4613a48b26f95e3ad
   - Connected project: pending and intentionally held.
   - Purpose: schedules in-app reminder generation only.
   - Dependency: must follow 202610260001 because it calls public.hka_generate_care_reminders.
   - Approval boundary: keep this migration last and separate from core activation.

The safe clean deployment sequence is 202610250002, 202610260001, 202610260003, then separately approved 202610260002. On the connected project, only 202610260001 remains necessary for core Horse Management; 202610260002 remains optional and held.

## PASS/FAIL controls

- PASS — migration compatibility: existing horse/file primitives satisfy organiser dependencies; the limits migration is independent; no migration changes course, coaching, authentication, billing, or membership-plan tables.
- PASS — Founder photo compatibility: src/components/accounts/OwnerDashboard.tsx now uses the owner-photo path required by 202610260001.
- PASS — server-side limits: live public.hka_horses has a BEFORE INSERT trigger calling public.hka_enforce_horse_limit; the function locks the profile row, reads the active configured tier limit, counts server-side horses, and rejects excess inserts.
- PASS — Founder/Admin-only allowance changes: column privileges expose only horse_profile_limit and updated_at, while the UPDATE RLS policy requires public.hka_admin() in both USING and WITH CHECK.
- PASS — data preservation: limits run only before new horse inserts. Lower limits do not update or delete existing horses, documents, care records, files, or reminders.
- PASS — per-horse separation: compound horse_id/student_id foreign keys bind documents and care records to the same owner; attachment checks require appointment and document ownership plus matching horse; reminder inserts are not granted to clients.
- PASS — private storage: document metadata requires the authenticated owner and matching horse; private files use expiring signed URLs; no public document URL path is introduced.
- PASS — Founder oversight: Admin access is explicit in read/update/delete policies while student writes remain constrained to auth.uid() ownership.
- PASS — Stable/Yard inactive: stable_yard is seeded with offering_active=false; the limit trigger accepts only active offerings; the dashboard exposes no activation control.
- PASS — billing preserved: horse migrations contain no Stripe, transaction, membership price, or membership assignment changes.
- PASS — email held: reminder rows default to email_status=held. No SMTP, Resend, SendGrid, HTTP mail call, email sender, or delivery function exists in these migrations.
- PASS — reminder schedule isolated: 202610260002 only invokes database reminder generation and remains unapplied.
- PASS — production build: npm run build completed successfully.
- PASS — lint: ESLint completed with zero errors; existing warnings are outside this deployment scope.
- PASS — static security/data-preservation assertions: server trigger, admin-only configuration, owner RLS, stable inactivity, no horse/document deletion, no billing changes, and no email sender all passed.

## Current live-state evidence

Connected Supabase metadata confirms:

- hka_horse_profile_limits exists with RLS enabled.
- hka_horses has the hka_horse_limit BEFORE INSERT trigger.
- public.hka_enforce_horse_limit is installed server-side.
- hka_horse_documents, hka_care_appointments, hka_care_attachments, and hka_care_reminders do not yet exist.
- public.hka_generate_care_reminders does not yet exist.
- Horse photo RPCs remain Founder-only until 202610260001 is approved.

## Outstanding blockers

- Core Horse Management is not active in the connected database until 202610260001 is approved and applied.
- Live database behavior tests for documents, care records, reminder rows, and student-owned photos cannot run without applying that pending migration.
- A fresh database snapshot or backup must be confirmed immediately before production application.
- 202610260002 must remain held unless in-app reminder scheduling receives separate approval.
- Email delivery requires a future, separate implementation and approval; none exists here.

## Exact approvals required

Core activation approval:

Approve a fresh production backup and application of only supabase/migrations/202610260001_horse_organiser.sql with SHA-256 48279e938accaa8efb88987c6b7645b3988b8db496cce1c6f0f357405a37b54f to the connected HKA Supabase project, followed by isolated owner/admin/student verification. Do not apply the reminder schedule or publish the website.

Separate later reminder approval:

Approve supabase/migrations/202610260002_horse_reminder_schedule.sql with SHA-256 545dadbb9a9fb596bed406a67343f0a03241d526bfe2cbf4613a48b26f95e3ad to schedule in-app reminder generation. This does not approve email delivery.

Website publication and any email delivery remain separate approvals.
