# HKA Equestrian — Web

Stage 1: public responsive React/TypeScript website in the existing Vite project. Private academy workflows and native apps are later stages.

## Start locally

Use the project’s existing dependencies (Elmony coordinates installation).

- Development preview: `pnpm dev --host 127.0.0.1 --port 8080 --strictPort`
- Production build: `pnpm build`
- Type checks: `pnpm exec tsc --noEmit -p tsconfig.app.json` and `pnpm exec tsc --noEmit -p tsconfig.node.json`
- Lint: `pnpm lint`
- Built-site preview: `pnpm preview --host 127.0.0.1 --port 4173`

Open http://127.0.0.1:8080/ for development. If port 8080 is already owned by Elmony, use its existing preview instead of starting another server.

## Public routes

`/`, `/learning-pathways`, `/memberships`, `/about`, `/sign-in`, `/sign-up`, `/password-reset`.

Routes remain in src/App.tsx. Unknown routes show a helpful not-found page. The legacy payment-success URL redirects to memberships without asserting payment.

## Content and photographs

Public content, package definitions and stable photo slots live in src/lib/hka-content.ts. PhotoPlaceholder.tsx renders labelled placeholders; no original photographs have been supplied to this project. Preserve supplied originals exactly with proportional cropping/resizing only. Founder image replacement controls belong to Stage 3.

The complete supplied reference lives in PROJECT_BRIEF.md. WEB_BUILD_PLAN.md defines the web-first restart and stage boundary. IMPLEMENTATION_STATUS.md records verified work and outstanding requirements.

## Integration boundary

No environment values are required to browse Stage 1. Account controls and payment collection are unavailable by design. No browser storage acts as a database. The retained Supabase and Stripe files are starter scaffolding, not proof of a connected integration. They are not invoked by the public routes.

Stage 2 must reuse the single existing Supabase client and establish actual auth and row/file policies. Stage 4 requires DPO Pay by Network; obsolete Stripe starter functions must remain undeployed/disabled. Do not put service keys or payment secrets in VITE variables. Never interpret redirects as payment verification.

External deployment, billing activation and native development are outside this run.
