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
Checked 20 October 2026; browser results recorded at 13:20 UTC.
- Production build: pnpm build passed.
- Type checks: pnpm exec tsc --noEmit -p tsconfig.app.json and pnpm exec tsc --noEmit -p tsconfig.node.json passed.
- Lint: pnpm lint passed with no errors; six existing Fast Refresh warnings in unchanged shadcn components. Build also reports an older Browserslist dataset; neither prevents preview or compilation.
- Headless Chrome: all seven public routes and the not-found route passed at desktop (1440px), tablet (768px), phone (390px) and small phone (320px), with one page heading and no horizontal overflow.
- Desktop navigation, browser back/forward, pathway deep links, anchor focus, scrolling and keyboard skip-to-content passed.
- Mobile menu opening, focus trap, Escape dismissal, focus return and navigation passed.
- Exact package names/prices, unavailable checkout buttons and FAQ expansion passed; About founder note matches the supplied reference.
- All account fields and submit controls remain disabled; attempted submission sends no account/payment request and creates no browser storage. Legacy payment-success navigation redirects to membership information without a payment claim.
- No browser runtime/console errors or external service/photo requests were observed. Desktop, phone and sign-up screenshots were visually reviewed.
- Repeatable browser check: node .elmony/stage-one-check.cjs; current results and screenshots are in .elmony/stage-one-results.json and .elmony/hka-*.png. This successful run supersedes the earlier incomplete browser result.

## Running preview
- Development website is running at http://127.0.0.1:8080/; HTTP 200 and browser-rendered routes confirmed.
- Restart command: pnpm dev --host 127.0.0.1 --port 8080 --strictPort.
- No external publication or production deployment performed; public Stage 1 is ready for review.

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
