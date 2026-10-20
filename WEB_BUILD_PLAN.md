# HKA Equestrian — fresh Website build

## Read this execution brief first

Create a NEW Elmony Website project named HKA Equestrian — Web. Work only in this new project. The existing Elmony design/mobile work and the Bubble project remain separate references; do not delete, overwrite or assume you imported them.

This file contains the full existing master specification below. Use it as the authoritative product reference, including its current learning pathways, package prices, founder identity, photography rules, privacy rules and DPO payment requirements. Do not replace those details with earlier ideas.

### Scope and precedence for this restart

This execution brief overrides only instructions in the reference that ask you to implement both clients or finish every stage in a single run. Build the RESPONSIVE WEBSITE first. It must work in desktop, tablet and phone browsers. A downloadable native iOS/Android app is a later, separately authorised stage.

Do not create Expo/React Native source, a mobile/ directory, native builds or store submissions during this website restart. Keep the web architecture suitable for a future mobile client that connects to the same backend. Do not create a second backend for that future client.

Build the product in short, reviewable stages. In the FIRST run, complete Stage 1 below, verify what is available, update the status file, and stop with a concise report. A completed Stage 1 is not a completed academy.

Save the entire reference specification in PROJECT_BRIEF.md. Save this execution brief in WEB_BUILD_PLAN.md. Maintain a short IMPLEMENTATION_STATUS.md that distinguishes implemented, tested, blocked and not started work. If a fresh chat is needed, use these files to continue rather than rebuilding or replaying an oversized conversation.

### Context discipline

Inspect only the source files needed for the active stage. Do not attach or dump entire project folders, node_modules, .git, build outputs such as dist, caches, binary assets, base64 image contents or whole lockfiles into the conversation. Use targeted file reads. Attachments and chat history can increase request size even when the visible message is short.

### Stage 1 — public website and a working development preview

Use React and TypeScript in a small, maintainable structure that Elmony's Website Builder can run.

Implement working public routes for Home, Learning Pathways, Memberships, About, Sign in, Sign up and Password reset. Use real navigation with usable back/forward behavior and clear links. Account screens may be prepared now, but must not pretend to authenticate users or save records before Stage 2 is connected.

Apply the confirmed HKA design:
- Founder: Hollie Zietsman.
- Brand: HKA Equestrian, subtitle Online Academy.
- Tagline: Rooted in Horsemanship. Inspired by Learning.
- Forest green #2F4A3C, ivory #F6F1E7, antique gold #B79B62, restrained saddle brown.
- Elegant serif headings, readable body text, consistent spacing, aligned cards and accessible navigation.
- Clean HKA wordmark, without horseshoe, shield or tick decoration.

Use the current five pathways from the reference:
1. Riding & Rider Development.
2. Horse Care & Ownership.
3. Equestrian Knowledge.
4. Young Riders & Pony Learning.
5. Competition Preparation.

Use the current monthly package catalogue exactly: Free US$0, HKA Basic US$20, HKA Premium US$100. Take inclusions and limits from the reference. Do not imply in-person lessons are included. Live payment collection remains disabled until the configuration and approvals required by the reference are complete.

Include the supplied founder note from the reference on About. Do not fabricate testimonials, course content, student numbers, qualifications, achievements or events. Use honest empty states for content Hollie has not supplied.

Use only original photos actually supplied to this new project. If none are present, use calm, labelled photo placeholders that show where Hollie's images belong. Do not fetch stock images, generate photos or copy photographs from another project without access. Keep image locations easy to replace through the founder controls implemented in a later stage. Preserve supplied photos exactly, allowing only proportional cropping, resizing, framing and positioning.

Prepare member and founder route structures as needed, but keep incomplete functions out of the apparent working product. Record implementation dependencies in the status file. Do not show invented successful login, checkout, upload, booking or message states. Do not use browser storage as a substitute for the real private backend.

Check representative desktop and phone widths, navigation, form layout, scrolling and keyboard access. Run the configured type/build checks and fix failures. Start the development preview and report whether it actually runs, along with the visible preview route or exact command if access is unavailable. Do not publish externally or claim the app is finished.

### Later website stages — retain these requirements, execute after Stage 1

Stage 2: Configure the single shared Supabase backend, versioned schema and policies; implement real authentication, private profiles, date of birth/timezones, protected roles, trusted founder bootstrap, and verified guardian access. Follow the full reference rather than treating hiding controls as authorization. If credentials are missing, prepare code/configuration and record the exact blocked checks; never fake a successful connection.

Stage 3: Implement connected member, parent and founder dashboards; founder-managed learning content; enrolments, quizzes, individual assignments, uploads, marking and released feedback; private horses/care records and ride logs; private Ask Hollie threads; consultation bookings and a founder-managed event calendar. Use the reference's ownership, allowance and file-access rules.

Stage 4: Implement server-controlled membership periods, entitlements, usage and expiry; prepare DPO hosted checkout and verification. Retain all merchant approval, settlement, currency, recurring-consent and server-secret requirements in the reference. Keep live checkout unavailable until they are fulfilled. Do not enable obsolete payment providers.

Stage 5: Verify available web workflows and privacy boundaries, fix failures, and prepare deployment, backup and handover instructions. Accurately list untested or externally blocked features. Native mobile work remains deferred.

### Report at the end of this run

State what Stage 1 implemented, which checks ran and their results, whether the web preview runs, what remains incomplete, and the next concrete stage. Keep this brief and update IMPLEMENTATION_STATUS.md. Do not claim private workflows, payments, native apps or production readiness from public-page appearance.

---

