# HKA Equestrian — Web: implementation status

Scope: Stage 1 only. Public website preview, not a connected academy or production release.

## Implemented
- Home, Learning Pathways, Memberships, About, Sign in, Sign up and Password reset in the existing React/Vite app.
- Shared navigation, mobile menu, footer, route titles, skip link, hash navigation and branded not-found page.
- Confirmed HKA identity, five pathways, exact USD monthly packages and Premium limits.
- Supplied founder note, unchanged; clearly labelled original-photo slots.
- Disabled account forms and checkout with accurate availability explanations. No accounts, sessions, records, emails, payments or entitlements are simulated.
- Existing React Router and shadcn components reused; no dependencies added.
- Existing Supabase/Stripe scaffolding retained without use in the public application. Legacy payment-success URL redirects to membership information.
- Original specification retained in PROJECT_BRIEF.md; Stage 1 execution instructions retained in WEB_BUILD_PLAN.md.

## Tested
Pending final checks. Results and preview location will be recorded here before handover.

## Blocked / external dependencies
- Original photographs await Hollie’s upload. Placeholder slots are centralised in src/lib/hka-content.ts and rendered by PhotoPlaceholder.tsx; no stock or generated photography.
- Account/backend workflows require Stage 2 authorisation and the single Supabase connection, schema, policies, auth configuration and verified founder bootstrap.
- Lesson assets, learning programmes and events await founder-supplied published content.
- Live DPO payments require Stage 4 and merchant activation, server secrets, service identifiers, USD charge/settlement approval, account-holder consent and explicit DPO approval for the proposed third-party USD bank settlement in Zambia. Recurring billing requires merchant enablement and explicit customer consent. Terms, fees and refund/cancellation policies require confirmation.
- Dormant Stripe starter code is not wired to public routes and must not be deployed or enabled for HKA. No payment provider is connected by Stage 1.

## Not started (intentional stage boundary)
- Stage 2: real authentication and recovery email delivery, private profiles, date typing/picker validation, searchable IANA timezones, protected roles, guardian verification and shared backend policies.
- Stage 3: connected member/parent/founder areas; content and photo management, lessons, assignments, uploads, marking, horses, private threads, consultation booking and event calendar.
- Stage 4: backend-controlled membership periods, allowances, expiry and DPO hosted checkout/verification.
- Stage 5: private-workflow/privacy testing, deployment, backup and operating-cost handover.
- Native clients, store publishing, paid accounts and public deployment are not authorised in this run.

## Next concrete stage
Connect the single shared Supabase backend in Stage 2; implement and verify authentication, private profiles, protected founder access and guardian privacy before exposing member tools. Reuse src/integrations/supabase/client.ts. Never grant privileges from a browser-provided email.
