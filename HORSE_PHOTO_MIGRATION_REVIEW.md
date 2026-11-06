# Horse Photo Permissions Migration Review

## Exact proposal

Filename: supabase/migrations/202610250001_secure_coach_horse_photos.sql

That file is the exact deployable SQL reviewed here. It has not been executed against connected Supabase project.

## Change surface

- public.hka_files: replaces only hka_files_purpose_shape_check so a horse image may be owned by uploader while remaining linked to horse owner. Existing valid rows still satisfy replacement constraint.
- public.hka_prepare_horse_photo: new SECURITY DEFINER RPC. Requires active account and horse owner, Founder administrator, or permitted coach relationship through public.hka_teach. Accepts only JPEG, positive size up to 5 MiB, and exact immutable path auth-user-id/file-id.jpg.
- public.hka_attach_horse_photo: new SECURITY DEFINER RPC. Rechecks same authorization and only attaches metadata prepared by current uploader after matching object exists in private storage.
- public.hka_file_write: extends existing private-bucket authorization solely for linked horse images prepared by owner, Founder, or permitted coach.
- EXECUTE permissions: denied to public and anon; granted only to authenticated for two RPCs and storage helper.
- storage.objects policies: unchanged. Existing hka_storage_insert continues delegating to public.hka_file_write; no UPDATE policy exists, so objects cannot be overwritten or moved.
- public.hka_horses: no schema or policy change. photo_path changes only when authorised attach RPC is explicitly called.
- public.hka_profiles and existing horse/file rows: no data statements touch them.

## Authorization findings

PASS — Founder access requires current authenticated role to satisfy public.hka_admin.
PASS — horse owners may only target horses whose student_id equals their authenticated ID.
PASS — coaches require public.hka_teach for horse owner, which requires active coach and active assigned student relationship.
PASS — unrelated students fail owner, Founder, and coach-assignment checks.
PASS — suspended, unconfirmed, or otherwise inactive callers fail public.hka_active.
PASS — attach step cannot reference another uploader metadata or different horse.
PASS — storage remains private and signed reads continue through existing public.hka_file_read authorization.
PASS — browser cropping emits JPEG; frontend and RPC both limit images to 5 MiB; exact path now matches existing database path constraint.

## Preservation findings

PASS — migration contains no DELETE, TRUNCATE, or row-wide UPDATE.
PASS — existing horse records and photo_path values remain unchanged at migration time.
PASS — existing student profiles and avatar_path values remain unchanged.
PASS — existing stored objects remain unchanged; new uploads use unique UUID names.
PASS — courses, AI Studio, payments, branding, and authentication are outside migration scope.

## Test status

PASS — compared against connected live metadata read-only: RLS is enabled on hka_profiles, hka_horses, hka_files, and hka_coach_students.
PASS — verified current hka_admin, hka_active, hka_teach, hka_file_write, hka_storage_insert, hka_storage_delete, and no-overwrite design are compatible.
PASS — frontend TypeScript and production bundle complete after correcting image paths to existing database constraint.
NOT RUN — transactional SQL execution was intentionally withheld because live database changes are forbidden and local Docker/Postgres service is unavailable.
NOT RUN — role-by-role upload/reload acceptance tests require migration approval and authenticated test accounts.

## Outstanding requirements

- Separate approval is required before applying migration.
- After approval, run owner, Founder, assigned-coach, unrelated-student, suspended-user, oversized-file, wrong-MIME, reload, and replacement acceptance cases.
- Generic Coach Dashboard does not yet expose horse photo controls; database permission supports assigned coaches, while current control is visible in Founder and horse-owner dashboards.
- Website publication remains separately gated and was not performed.

## Overall

PASS for static least-privilege review and frontend compatibility.
PENDING for isolated SQL execution and authenticated end-to-end tests.
DEPLOYMENT NOT APPROVED OR EXECUTED.

