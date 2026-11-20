# HKA Equestrian Vision 2.0 — Design-to-implementation plan

Status: **Design direction approved, preview code isolated for review. Production changes not approved.**
Date: 20 November 2026
Owner: HKA Equestrian
Scope: Existing React / TypeScript / Vite / Tailwind app; preserve the existing Supabase integrations, roles, data and access controls.

## Vision

Grow HKA from a focused online equestrian academy into a connected educational, coaching and horse-care ecosystem. Initially serve a mixture of ages and abilities with **personalised learning pathways** and a signature blend of real equestrian knowledge, practical learning, coach feedback and horse welfare.

Brand: HKA Equestrian. Tagline: Rooted in Horsemanship. Inspired by Learning.
Design: #2F4A3C forest green, #F6F1E7 ivory, #B79B62 antique gold; airy, timeless, responsive, accessible. Prefer properly licensed genuine equestrian imagery and the existing uploaded HKA photographs.

## Current application: assets to preserve

- Existing web stack and file structure, route handling in `src/App.tsx`.
- Current student/parent/coach/admin dashboards, approved account linking, role permissions and founder access.
- Existing authenticated Academy, course player and course-editing workflows.
- Private horse records and uploads, coaching, messaging, ride tracking, member settings and theme controls.
- Authentication, signup, password reset, scheduled functions and storage permissions.
- Current publishing status and entitlements; do **not** imply that draft courses, unavailable payments or unverified functionality are live.
- The current production Supabase project and Vercel deployment, which must remain untouched until a separate release review.

## Stage 0 — Design preview (this branch)

- New `src/pages/HkaVisionPreview.tsx` is a local-only React sample interface.
- A route at `/vision-2-preview` is available only when `VITE_HKA_PUBLIC_SITE` is not `true`; production-public builds redirect to `/`.
- Screens: public welcome, example role dashboards, Academy pathways, illustrative lesson quiz, training, horses, and student/child workspace.
- Role and responsive-device controls change the sample display; learning quiz answer feedback works locally.
- Sample records are explicitly marked as fictitious and there are no backend reads/writes.
- Existing `/`, `/dashboard/*`, `/academy/*` and `/learning-pathways*` behaviour must remain unchanged.
- **Review gate:** visual approval and a local build check before any integration to functional screens.

## Stage 1 — Public site and design system

- Compare the approved preview against the existing `Index.tsx`, `SiteLayout.tsx`, `globals.css` and available actual HKA imagery.
- Extract reusable tokens and accessible components rather than copying prototype markup blindly.
- Improve site homepage, pathway discovery and mobile navigation while keeping real calls-to-action and existing links working.
- Existing content statuses and membership statements must remain truthful.

## Stage 2 — Personalised member home

- Adapt existing student/parent/coach/admin surfaces, not parallel dashboards or separate role databases.
- Each Home screen shows the next meaningful action; coach clicks student **name** to open the correct authorised profile directly (no extra Manage click).
- Users holding multiple verified roles switch seamlessly without exposing another role's private data.
- Mobile layout must preserve clear Back, keyboard controls, error states and small-screen readability.

## Stage 3 — Learning pathways and onboarding

- Five initial content categories: Equestrian Foundations; Rider Development; Performance & Competition; Horse Care & Horsemanship; Coaching & Instructor Development.
- Onboarding collects age-appropriate interests, self-rated experience, goals and horse access in short steps with progress/back and save-and-resume.
- Keep age, knowledge, observed practical competence and goals **separate**; the learner's self-rating never grants certification or coach privileges.
- Recommend pathways transparently; users/coaches may adjust pathways subject to appropriate authorisation.
- Implement against the real schema only after checking existing tables, migrations, RLS and session flows in a **separate development Supabase project**.
- Do not add data tables or columns until a schema and access-control review has been completed.

## Stage 4 — Real lesson-to-practice experience

- Support: Discover → Understand → Apply → Check → Reflect → Progress.
- Reuse the live course player, lesson resources, quiz/assignment/submission pipelines, coach assessments and progress records.
- Distinguish three achievements: content completion, knowledge assessment, and *verified practical competence*. Quizzes and videos alone are not formal verification.
- Publish courses and issue credentials only when content, rubric, permissions and accreditation claims have been checked.
- Avoid unsafe riding tasks without suitably qualified in-person supervision.

## Stage 5 — Coach and founder workflow

- One-click entry to authorised student profiles with tabs for learning, assignments, progress, training and notes.
- Founder content editor must offer Save Draft, Preview, Publish and Archive with confirmation, restore/error paths and no accidental public drafts.
- Pending feedback workload should be actionable; personal coaching capacity must not be represented as unlimited.
- Parent/child relationships and coach-student assignments must remain verified and controlled by server-side policy.

## Stage 6 — Future ecosystem

- Progressive rollout of rider fitness, horse conditioning and richer ride journals.
- Later: integrated GPS ride tracking and horse management expansion, without assuming background GPS will work in ordinary web/PWA contexts.
- Payments remain disabled until DPO and entitlement configuration, renewal tests, and server-side verification have been approved. Do not treat Stripe starter files as an authorised live provider.
- iOS/Android native publication is a future separate release; an installable web app is not automatically an App Store / Google Play app.

## Acceptance checks before merging any functional stage

1. Vite build and lint/type validation; link/route navigation; no missing image assets.
2. Desktop 1440px, tablet 768px, mobile 375px and 320px; keyboard and screen-reader checks.
3. Existing signed-in role routes continue to work; no changes to authentication or password resets.
4. Student A cannot read student B; parent sees verified children only; coach sees authorised students only; founder controls require actual admin capability.
5. Course drafts remain private; permissions and private uploads retain row-level policies.
6. No environment secrets, personal records, fictitious sample data or fake payment confirmations enter the real user experience.
7. At least one end-to-end real development-account walkthrough for each relevant role.
8. Check no production migration, redeployment or payment activation occurred inadvertently.

## Suggested Codex / local workflow (after design review)

1. On the developer laptop, check working tree changes and save them. Fetch `main` and this feature branch; **never force-push**.
2. Set up a **separate development** `.env.local` with the development Supabase URL and publishable key only. Keep service role and private secrets out of Vite variables.
3. Run `pnpm install --frozen-lockfile`, `pnpm build`, and `pnpm lint`.
4. Open local `http://localhost:8080/vision-2-preview` (assuming the existing Vite port configuration). Review role, page and mobile toggles.
5. Iterate on preview design, then implement each production-facing stage in separate small PRs with tests.
6. Merge only after reviewing the diff, running appropriate functionality and privacy checks, and confirming the desired deployment environment.

**Definition of done for this PR:** A safe preview route and code-owned design specification are available to inspect. This PR does not constitute the entire HKA 2.0 implementation.
