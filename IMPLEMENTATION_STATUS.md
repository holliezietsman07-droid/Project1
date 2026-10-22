# HKA Equestrian — Web: implementation status

## Stage 4 implementation — 22 October 2026

### A. Course and lesson management
- Added dedicated pathway catalogue routes while preserving the five published pathway names, existing imagery and public design.
- Added an authorised course workspace for coach and administrator roles: create draft courses, set pathway, level, duration, eligibility and membership access, add lesson, quiz or assignment drafts, preview records, publish/unpublish, duplicate and archive.
- Added persistent schema for course metadata, modules, lesson objectives, draft/publication state and safe duplication in `supabase/migrations/202610220001_stage4_lms.sql`.
- Existing private `hka-private` storage remains unchanged and protected. Student assignment uploads use the original file without image transformation, accept the existing allow-list and enforce the existing 50 MB limit.
- Module assignment, drag-and-drop reordering and coach-facing course material upload controls remain incomplete in the UI; database support and ordering fields are prepared.

### B. Student learning and assessments
- Added protected course player with lesson navigation, account-backed completion, resume progress, written assignments and private image/PDF/video submissions.
- Added quiz rendering for multiple choice, true/false and written responses, save-and-resume attempts, submission history records and server-side automatic scoring RPC.
- Answer keys live in a separately protected table and are never selected by the student UI. Objective explanations are returned only after submission; written, practical and riding-video work remains pending human review.
- Student dashboard now displays per-course completion progress and resume links.
- No placeholder courses or educational lessons were published.

### C. Coach feedback, parents and Premium preparation
- Added coach review queue with score, comments, approve/feedback/resubmission decisions; coach results use existing student notifications and guardian visibility.
- Preserved existing guardian consent and role RLS. Approved guardians can continue reading authorised student progress and feedback; nothing is made public.
- Added future Premium review allowance records with two included personal reviews per period and usage counters. No payments, membership page changes or entitlements were activated.
- Review allowance charging and automatic monthly provisioning remain intentionally disconnected until the existing billing model is approved for Stage 4 activation.

### D. HKA AI Studio
- Added authorised HKA AI Studio with riding lesson, horse care, assessment and competition template builders, private draft saving, editing, reopening and text download.
- Horse-care templates explicitly state they are educational and not veterinary advice.
- No AI provider or paid API was detected or activated. Current builder labels output as a template draft, not AI-generated content; secure provider-backed generation, regeneration and direct student/course assignment remain pending owner approval and credentials.

### E. Integration status and verification
- Application TypeScript check, production build and ESLint completed successfully. Existing eight non-blocking framework warnings remain.
- Remote Stage 4 migration was not applied: initial execution failed on a transport-altered SQL delimiter and rolled back; exact schema inspection confirmed no Stage 4 objects or altered columns were committed. A corrected replay was then blocked by the external safety reviewer as an uncertain prior action.
- Because the remote migration is pending, live course creation, publication, student access, quiz scoring, uploads, coach review, parent visibility and AI draft persistence could not be end-to-end tested with real role accounts.
- Required owner action: explicitly approve replay of `supabase/migrations/202610220001_stage4_lms.sql` against connected project `sqaydpbqycvaictieafk`, then provide controlled student, guardian, coach and administrator test sessions for role-by-role integration testing.

 

## Stage 3 registration-rate investigation — 21 October 2026

### Findings
- Connected project sqaydpbqycvaictieafk returned healthy public Auth settings: email/password sign-up is enabled, phone sign-up is disabled and mailer_autoconfirm is false. Email verification therefore remains required; no security setting was disabled or weakened.
- The reported email rate limit exceeded response matches Supabase email-dispatch throttling rather than a database, profile-trigger or client-configuration failure. Supabase currently documents a combined default limit of two Auth emails per hour for its built-in SMTP service.
- Public Auth settings do not expose the configured SMTP host, so custom-versus-default SMTP cannot be proved from the client API. The very low observed threshold is consistent with Supabase's default service. Owner action is required to confirm this under Supabase Authentication > Emails > SMTP Settings; no external Auth setting was changed during this investigation.
- Recent Auth inspection found two accounts: pa***@gmail.com, created 13:11 UTC, remains unconfirmed and has a profile; 
a***@gmail.com, created 13:12 UTC, was confirmed at 13:13 UTC and has signed in. This proves registration created records before or around the reported failure, but the failing address cannot be attributed without its full test email.

### Registration safeguards completed
- Replaced only the sign-up account-detail step with the existing branded inputs and direct Supabase signUp call so provider errors can be translated safely.
- Added synchronous duplicate-submit locking, disabled controls while sending, password confirmation, a completed-registration lock and a 60-second retry pause after email throttling.
- Added friendly rate-limit guidance: wait and try later, and check the inbox before submitting again. Existing sign-in, recovery, verification, routes, dashboards, branding and account metadata are preserved.

### Production email recommendation and owner action
- Recommended provider: Postmark custom SMTP, using a dedicated authentication subdomain and sender. It is transactional-email focused and is listed as a supported Supabase SMTP option. Verify the sending domain and configure SPF, DKIM and DMARC before production.
- Configure credentials only in Supabase Authentication > Emails > SMTP Settings, keep email confirmation enabled, leave current limits unchanged until normal traffic is measured, and disable provider link tracking for confirmation links.
- After SMTP configuration or the current cooldown expires, test one new controlled address through registration, confirmation and sign-in; avoid repeated resend attempts. References: https://supabase.com/docs/guides/auth/auth-smtp and https://supabase.com/docs/guides/deployment/going-into-prod.

### Tested
- Public Auth configuration endpoint returned HTTP 200 with sign-up enabled, email enabled and email auto-confirm disabled.
- Connected database inspection verified recent Auth users and corresponding hka_profiles without exposing full addresses.
- No live registration email was triggered during diagnosis, avoiding another quota event or unnecessary account.
- TypeScript application check, focused ESLint and production build passed after the registration changes.

## Stage 3 continuation — 21 October 2026

### Completed
- Confirmed connected Supabase project contains deployed Stage 3 academy tables, role functions, RLS policies and private storage structures from `supabase/migrations/202610210001_stage3_academy.sql`.
- Connected existing sign-up, sign-in, verification resend, password reset and password update screens to the shared Supabase client and application session provider.
- Added protected `/dashboard` routing with role destinations for student, parent or guardian, coach and administrator accounts.
- Added role-aware dashboard navigation and RLS-backed summaries for learning, coaching, horses, achievements, linked students, submissions, enrolment requests and academy records.
- Updated shared desktop and mobile account navigation to show dashboard and sign-out actions for authenticated members.
- Preserved public designs, photographs, logo, branding, membership plans and payment behavior. Stage 4 work was not started.

### Unfinished or externally dependent
- Browser end-to-end registration, email confirmation, password recovery and all four role sessions require real test accounts and delivered Supabase emails; no credentials or account roles were invented.
- Founder bootstrap, coach and administrator role assignment, guardian linking, course authoring and member data entry remain operational setup tasks using the deployed secure backend.
- Preview runtime was unavailable at `127.0.0.1:8080`; it was not restarted because this continuation explicitly prohibited restarting or rebuilding the project.

### Tested
- TypeScript application check passed with `pnpm exec tsc --noEmit -p tsconfig.app.json`.
- ESLint passed with zero errors; eight existing Fast Refresh and hooks warnings remain non-blocking.
- Static route review confirmed visible sign-in and sign-up entry points, password reset and update routes, protected dashboard index, role redirects, role guards, failure states and shared Supabase client usage.
- Connected Supabase metadata inspection confirmed all dashboard tables and required auth role functions are present remotely.

Scope: Stage 1 public website, with original photographs in Home, About and Learning Pathways and the uploaded logo in the shared header and footer. Restored saved photograph version c41a2e72efaa7216f9ae7c904733db48ac0071df on 21 October 2026, preserving Stage 1 design baseline fb062122df32f315934f15fbd3d3c86d2bde68e2. Existing routes, copy, palette and section design retained; header accommodates the complete logo. This remains a public preview, not a connected academy or production release.

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
Rechecked 21 October 2026; latest browser results recorded at 06:34 UTC.

The active source had reverted to the blank starter. Recovered the completed Stage 1 website and its original asset placements from saved project history, without redesigning or reconstructing its pages. All recovered source and image files match the saved photograph version; only this status report adds new content. The saved browser-data lockfile was restored and matches the dependencies used for the checks below.

- Production: pnpm run build passed.
- Development: pnpm run build:dev --outDir .elmony/development-build passed.
- App types: pnpm exec tsc --noEmit -p tsconfig.app.json passed.
- Config types: pnpm exec tsc --noEmit -p tsconfig.node.json passed.
- Lint: pnpm run lint passed with zero errors and six existing Fast Refresh warnings in unchanged shadcn components.
- Browserslist: neither fresh build emitted the outdated-browser-data warning. Restored the saved pnpm browser-data refresh: caniuse-lite 1.0.30001817 and browserslist 4.29.4. pnpm why confirmed these installed versions; the restored lockfile matches node_modules/.pnpm/lock.yaml byte for byte. pnpm install --offline --lockfile-only --frozen-lockfile --ignore-scripts passed. No new dependencies, downloads or further data update were needed.
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
