# HKA Equestrian — Web: implementation status

Scope: Stage 1 public website, with original photographs and uploaded logo added on 20 October 2026. Design baseline: saved Stage 1 commit fb062122df32f315934f15fbd3d3c86d2bde68e2. Existing routes, copy, palette and section design retained; header accommodates the complete logo. This remains a public preview, not a connected academy or production release.

## Implemented
- Home, Learning Pathways, Memberships, About, Sign in, Sign up and Password reset in the existing React/Vite app.
- Shared navigation, mobile menu, footer, route titles, skip link, hash navigation and branded not-found page.
- Confirmed HKA identity, five pathways, exact USD monthly packages and Premium limits.
- Supplied founder note unchanged; original photographs fill the existing Home, About and Learning Pathways frames.
- Uploaded logo replaces the text wordmark in the shared header and footer, with its full artwork, colours, lettering and aspect ratio preserved.
- Photos use proportional CSS cropping and positioning; the logo uses uncropped proportional sizing. Removed the old photo hover brightness filter. Image-load failures show an accessible fallback without collapsing the frame.
- Disabled account forms and checkout with accurate availability explanations. No accounts, sessions, records, emails, payments or entitlements are simulated.
- Existing React Router and shadcn components reused; no dependencies added.
- Existing Supabase/Stripe scaffolding retained without use in the public application. Legacy payment-success URL redirects to membership information.
- Original specification retained in PROJECT_BRIEF.md; Stage 1 execution instructions retained in WEB_BUILD_PLAN.md.

## Original asset placement
All five uploaded files are kept under public/images/ with their original filenames and unchanged bytes.

| Original upload | Placement |
| --- | --- |
| 20260227_131818.jpg | Home founder section and About portrait |
| IMG_5698.jpg | Home hero; Riding and Competition cards on Home and Learning Pathways |
| IMG_5697.JPG | Horse Care and Young Riders cards on Home and Learning Pathways |
| IMG_5696.JPG | Equestrian Knowledge cards on Home and Learning Pathways |
| ChatGPT Image Oct 19, 2026, 06_52_32 PM.png | Shared header and footer on every public route |

The four photographs are reused across the seven existing slots; no replacement or generated imagery was introduced. Photo paths, intrinsic dimensions and crop positions remain centralised in src/lib/hka-content.ts.

## Tested
Checked 20 October 2026; latest browser results recorded at 13:58 UTC.
- Production: pnpm run build passed.
- Development: pnpm run build:dev --outDir .elmony/development-build passed.
- App types: pnpm exec tsc --noEmit -p tsconfig.app.json passed.
- Config types: pnpm exec tsc --noEmit -p tsconfig.node.json passed.
- Lint: pnpm run lint passed with zero errors and six existing Fast Refresh warnings in unchanged shadcn components; the final photo-component revision also passed its focused lint check.
- Browserslist: refreshed the existing dependency tree with pnpm update caniuse-lite browserslist. pnpm-lock.yaml now records caniuse-lite 1.0.30001817 and browserslist 4.29.4. Both latest builds complete without the outdated-browser-data warning; no application dependencies were added.
- Integrity: all five SHA-256 hashes match the uploaded originals in public/images/, production dist/images/ and HTTP-served image responses; every asset returned HTTP 200.
- Headless Chrome: 16 checks passed across 1440px desktop, 1024px laptop, 768px tablet, 390px phone and 320px small phone viewports. All seven public routes plus the not-found route remained reachable.
- Every photo and both logos decoded successfully at every tested width. Declared and intrinsic dimensions match; photographs fill existing frames, logos retain their original proportions, and no colour filter, opacity change, horizontal overflow or header/navigation collision was found.
- Desktop and phone screenshots of Home, About, Learning Pathways and footer were visually reviewed; header logo remains readable and complete on phone and desktop.
- Navigation, browser back/forward, pathway links, anchor focus, keyboard skip link and mobile menu focus/escape/navigation checks passed.
- Existing package copy, disabled account/payment controls, FAQ and founder note checks passed unchanged.
- Simulated image-request failure displayed the accessible fallback inside the existing frame; restoring access loaded the original photograph again.
- Latest browser run recorded zero unexpected runtime/console errors and no external service/image requests. Its result replaces older diagnostic output.
- Repeatable check: node .elmony/stage-one-check.cjs. Evidence: .elmony/stage-one-results.json, .elmony/photos-*.png and .elmony/hka-*.png.

## Running preview
- Development website is running at http://127.0.0.1:8080/; HTTP 200 and browser-rendered routes confirmed.
- Restart command: pnpm dev --host 127.0.0.1 --port 8080 --strictPort.
- No external publication or production deployment performed; public Stage 1 is ready for review.

## Blocked / external dependencies
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
