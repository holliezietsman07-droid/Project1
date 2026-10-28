# HKA Equestrian — Student invitation-code repair

## Root cause

Live catalog inspection confirms `pgcrypto` is installed in schema `extensions`. Its `gen_random_bytes(integer)` and both `digest(text, text)` / `digest(bytea, text)` overloads also reside in `extensions`.

The deployed `SECURITY DEFINER` invitation functions deliberately use `SET search_path TO ''`, but migration `202610280002_multi_role_onboarding.sql` called `gen_random_bytes()` and `digest()` without schema qualification. PostgreSQL therefore cannot resolve those extension functions. Live definitions confirm unqualified references in:

- `public.hka_signup_profile()`
- `public.hka_create_student_link_code(text)`
- `public.hka_redeem_student_link_code(text)`

## Prepared repair

`supabase/migrations/202610280003_fix_invitation_code_crypto_schema.sql` recreates only those three functions and changes extension calls to `extensions.gen_random_bytes()` and `extensions.digest()`.

The repair preserves:

- `SECURITY DEFINER` with empty `search_path`
- 10 cryptographically random bytes, encoded as a 12-character uppercase hexadecimal code
- SHA-256 hashes only in `hka_student_link_codes`
- 72-hour expiry and single-use accounting
- student ownership checks
- guardian/adult and coach-application requirements
- founder review, guardian consent, and existing revocation workflow
- existing function signatures and grants; `CREATE OR REPLACE FUNCTION` retains current execute ACLs

Migration was prepared only and was not applied.

## Account-page title

`/dashboard/account` is an actual route in `src/App.tsx` and renders `MemberAccountSettings`. “Page not found” came only from the document-title fallback because `src/components/SiteLayout.tsx` lacked that pathname in its title map. The title entry now resolves to “Account settings | HKA Equestrian”; no route or dashboard redesign was needed.

## Required verification after approval

1. Apply `202610280003_fix_invitation_code_crypto_schema.sql` through the normal Supabase migration workflow.
2. Confirm the three function definitions remain `SECURITY DEFINER`, report `search_path="`, and contain only schema-qualified pgcrypto calls.
3. Confirm authenticated still has execute permission on create/redeem RPCs, while direct table writes remain revoked and `hka_signup_profile()` remains unavailable for direct authenticated execution.
4. As a non-production adult student identity, create parent and coach codes; confirm each is 12 uppercase hexadecimal characters, only its hash is stored, and expiry is approximately 72 hours.
5. Confirm code creation fails for unauthenticated users and authenticated users without an authorised student purpose.
6. Confirm own-code redemption, invalid/expired/revoked codes, guardian redemption without an authorised adult guardian purpose, and coach redemption without a coach application are rejected.
7. Confirm valid redemption creates a pending request rather than immediate student access, then verify founder approval and guardian consent requirements still gate linking.
8. Open `/dashboard/account`; confirm Account Settings renders and browser title is “Account settings | HKA Equestrian”.

