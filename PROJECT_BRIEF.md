# Full master specification — retained product reference

The reference below is preserved from the saved HKA master prompt. Where it requires immediate native development or all-stage completion, apply the web-only, Stage-1 execution scope above. All other product requirements remain in force.

# HKA Equestrian — Elmony master build prompt

Build HKA Equestrian as a complete working website and iOS/Android application using this single master specification. Save this specification as PROJECT_BRIEF.md and track implementation/testing in IMPLEMENTATION_STATUS.md so the requirements survive project or conversation changes. Carry the work through implementation and verification in ordered stages; do not stop after a plan, marketing page or disconnected screen mockups. A missing external account must not prevent independent development work, but it must be reported accurately rather than bypassed.

This is a NEW code-based implementation of the agreed HKA platform. The earlier Bubble project is a reference and potential future migration source. Do not delete, modify or assume you have imported its accounts, workflows, private files, roles or database. This prompt is not a Bubble source-code export. Preserve all provided original photos and content.

## A. Build architecture and platform workflow

Use TypeScript, React for the website, and Expo/React Native for the iOS/Android client, with ONE shared Supabase backend for authentication, PostgreSQL data, private file storage and server functions. Use current official SDKs and documentation. Prefer a small maintainable architecture and shared types, design tokens, validation and business rules.

Start with the Website project and establish the shared backend plus complete responsive web application. Then implement the Expo client against that SAME backend. If the Elmony workspace supports both clients together, keep them in a clearly organised repository. If it requires separate Website and Mobile App projects, do not pretend one project preview is both: prepare the linked mobile source/handoff, preserve the same backend configuration/schema and identify the exact project-switch step. Never silently provision a second production database or independent set of accounts for mobile.

Create versioned database migrations, storage rules, seed configuration for published package definitions, server functions, a clearly documented environment template without real secrets, and setup/build instructions. Do not depend on localStorage or a client-side array as the real database. Demo fixtures may be isolated in a visibly labelled local demo, never presented as connected production data.

Use authenticated server operations and database row-level security for all private data. Protect privileges, guardian verification, assessment release, subscription dates, payment outcomes and allowance counters against ordinary-user writes. Enforce both row ownership and allowed column changes; do not permit self-editable profile metadata to grant roles. Keep birth dates and other sensitive fields out of public profile reads. Privileged server functions must authenticate callers and validate permissions, ownership and input, even when using backend credentials.

Use private storage for passports, health records, submissions, messages and paid lesson files. Issue short-lived authorised download links after checking current permissions; do not use public buckets or permanent public URLs to solve preview errors. Public brand photos are a separate founder-managed asset category. Service credentials, DPO credentials and reusable payment tokens belong only in server secrets/protected server data, never browser bundles or EXPO_PUBLIC/VITE client variables. Only genuinely publishable backend identifiers/keys may be public.

Model the required entities coherently: private profiles and capabilities; trusted roles; guardian links; membership plans, subscriptions, payments, entitlement periods and usage; pathways/programmes/modules/lessons/assets/enrolments; coach-set assignments/submissions/quizzes/released feedback; horses/care appointments/records/ride logs/private files; private threads/messages; availability/bookings/events; editable founder/site content; notification delivery and important administrative/payment audit events. Combine tables where sensible without weakening access control. Use UTC timestamps, currency codes and integer minor units for money (US$20 = 2,000 cents; US$100 = 10,000 cents).

Separate development from production data and credentials. If Supabase or DPO accounts are not connected, generate the complete configuration/migrations/functions and clear setup instructions, show honest connection states, and continue the independent build. Never weaken security or invent an active integration.

## B. Execution, migration and cost control

Implement in this order:
1. Shared data model, authentication, founder permissions, guardian privacy and accessible navigation.
2. Complete member/parent/founder workflows, learning, assignments, files, horse records and private support.
3. Membership expiry/renewal rules and DPO hosted checkout/server verification, kept disabled until approved/configured.
4. The native client against the same backend, followed by responsive/device checks and corrections.
5. Deployment/export documentation, remaining external setup and evidence of actual tests.

Keep an implementation checklist in the project and update it as work progresses. If one external requirement blocks a feature, finish the other stages and precisely identify the blocked feature. Do not declare a mobile app, paid checkout or private backend finished from a visual preview.

A later Bubble migration must be a separate, reversible import with authorised exports, ID/relationship mapping, file-access verification and reconciliation. Do not scrape private data or promise passwords will transfer. Use a verified invitation/password-reset flow if credentials cannot be migrated. Preserve existing legitimate roles only through a reviewed mapping; never infer privileged access from a display name.

Provide a concise operating-cost note covering the chosen AI model/agent, website hosting, backend/database, video/file storage and bandwidth, transactional email, domain, mobile build/store accounts, and payment fees/minimums. Identify current included quotas and unknown costs; do not promise that Elmony's advertised builder subscription includes every operating expense. Do not create paid external accounts or activate charges without the account owner's authorised setup.

The following product requirements are mandatory.

## 1. Purpose, identity and design

HKA Equestrian — Online Academy is founded and coached by Hollie Zietsman. It serves riders, horse owners and learners internationally, including people who combine those interests. Online learning is available worldwide; in-person coaching is offered where Hollie actually operates. Never limit eligibility to Zambia or the UK.

Keep the tagline “Rooted in Horsemanship. Inspired by Learning.” Use forest green #2F4A3C, ivory #F6F1E7, antique gold #B79B62, restrained saddle brown, elegant serif headings and readable body text.

Create consistent reusable styles across web and native mobile: proportional headings, consistent page padding and spacing, matching card image ratios, clear text hierarchy, equal-height cards within rows and bottom-aligned action buttons. Forms, sheets and modals must scroll and remain usable with the keyboard open. Prevent clipping, overlap and horizontal overflow. Keep sufficient text contrast and comfortable touch targets. Use a clean HKA wordmark without decorative horseshoe, shield or tick icons.

Use my existing personal photographs only. Preserve originals: proportional crop, resize, frame and positioning are permitted; no AI regeneration, retouching or stock replacements. Provide founder-only image replacement controls in the normal platform interface. Ordinary users must not see editing controls.

Remove HKA Yard, Challenges and Hall of Progress from current navigation and visible pages. Preserve students’ private progress, earned achievements and parent progress reports.

Replace “One academy. Five ways to grow.” and the separate academy presentation with “Learn, ride and care with confidence.” and these learning pathways:
- Riding & Rider Development
- Horse Care & Ownership
- Equestrian Knowledge
- Young Riders & Pony Learning
- Competition Preparation

Organise courses under these pathways. If existing content is supplied or later imported, preserve its relationships and progress. Advanced instructor/teaching content can sit within Equestrian Knowledge. Preserve or redirect links during any approved migration.

## 2. Accounts, date of birth and safeguarding

Keep normal login as email and password. Date of birth belongs in signup/profile, not repeated login.

Allow date of birth to be typed with a clearly stated format and selected through a picker with fast month/year navigation. Validate real dates, reject future dates, and preserve valid supplied values. Do not show a red birth-date validation message on an untouched blank field. Show a concise error after an invalid field is touched/submitted. Keep a brief, accurate privacy explanation.

Implement searchable timezone selection, validated IANA timezone storage and profile editing. Do not infer or overwrite a timezone without reliable evidence.

Implement Unknown / Under 18 / Adult classification. Missing or unverified age remains protective Unknown; do not label every signup as a confirmed child or adult. Birth dates are private. Implement guardian link requests, trusted verification, pending/revoked states and restricted parent visibility. A parent cannot approve their own link or obtain child records through a pending request.

Offer learner/rider, horse owner and parent signup capabilities, allowing combined interests within one account. Never offer Founder, Coach or Admin as self-selected signup privileges. Preserve legitimate imported roles only through a reviewed migration; new accounts receive ordinary privileges. Hide the public “Join Academy” action after login and show the appropriate dashboard.

## 3. Founder and user dashboards

Hollie Zietsman, using hka.equestrian@gmail.com, is the sole Founder / Main Coach. Provide a documented, trusted server-side bootstrap to bind Founder privileges to her actual verified authentication user ID. Do not grant Founder access merely because a browser supplies this email or a signup form asks for that role. Use a one-time protected administrative setup, not an open bootstrap endpoint. Never seed a shared password or insecure default administrator.

Hollie must manage all HKA clients, including non-enrolled horse owners seeking advice, free members and users with combined interests. Do not restrict the founder to assigned course students. Any legitimate existing Admin role may be preserved only through a reviewed migration; do not grant anybody else Founder or Main Coach access.

The founder workspace must include all clients, client/horse details, enrolments, individual assignments, review queue, private questions, learning content, bookings, billing status and image/content management. Provide meaningful empty states and search/filter controls.

User dashboards should clearly show their package, next renewal/expiry, learning, outstanding tasks, released feedback, horses, private questions, bookings and progress. Parent dashboards show verified children, released feedback, progress and the subscriptions the parent actually pays for. A parent account itself does not require a second paid membership.

Founder access, guardian access and purchased package access are separate permissions. Payment must never grant a privileged role.

## 4. Confirmed monthly packages

These prices supersede every earlier tentative HKA package amount:
- Free — US$0.
- HKA Basic — US$20 per calendar month.
- HKA Premium — US$100 per calendar month.

USD is the authoritative catalogue currency and default advertised currency. Do not replace these with K200/K1,200 or calculate HKA memberships from the separate riding advertisement. In-person coaching is separately arranged and is not automatically included in these memberships.

Use the following starting inclusions, with founder-editable limits for future offers:
- Free: account/profile, one free introductory lesson per pathway when published, one horse profile with basic private records, and access to the member’s own retained history.
- HKA Basic: Free features plus published self-paced learning, lesson materials, quizzes, practice assignments and progress tracking. Do not promise personal marking or unlimited coaching.
- HKA Premium: Basic features plus one personalised monthly plan, two coach reviews per paid month (video up to five minutes each, or a written/practical submission), two private coaching question threads covering one topic each, and one 30-minute online consultation per paid month.

A Premium client may use support for riding, learning, ownership/care or event preparation. Do not require a riding-course enrolment merely to receive owner advice.

Track allowances and usage per paid billing period. Show remaining allowances; prevent double-counting and unlimited requests. No automatic rollover. Do not alter existing paid promises retroactively when a founder edits future offers. Limit additional uploads and horse profiles through configurable allowances rather than promising unlimited storage.

Routine personal feedback should normally be within two working days, subject to a founder-managed working calendar. Provide an urgent in-app contact option without advertising guaranteed instant or 24-hour responses. Keep my personal phone number private. Founder booking availability should support roughly three to four working hours per day, including preparation and feedback, without assuming my workdays or creating unlimited bookable capacity.

## 5. Currency selection, DPO Pay readiness and approved USD bank settlement

PAYMENT UPDATE: Use DPO Pay by Network for web payments. Flutterwave cannot be used. The requested settlement destination is my father's US-dollar bank account in ZAMBIA, replacing the previous MTN MoMo wallet requirement. The bank name and whether this is a personal or business account are not yet confirmed. DPO merchant activation and credentials are not yet confirmed. Do not represent the account as belonging to Hollie or assume it has been approved.

DPO's published Payment Processing Services Agreement, clause 10.1, makes third-party settlement discretionary and allows DPO to request supporting information. This proposed arrangement therefore requires the account holder's agreement and DPO's explicit approval. Use accurate merchant/business and account-holder identities during onboarding. Keep live checkout disabled until this settlement arrangement and the relevant merchant features are approved. The payout beneficiary receives no Founder, Coach or Admin role merely because their bank account is used; Hollie remains the sole Founder / Main Coach.

If supplied source contains earlier payment work, disable obsolete provider-specific checkout/payout workflows without deleting transaction history. Build reusable billing records, entitlement logic, a DPO hosted-checkout integration and a founder-only setup/readiness interface in Development. Keep live checkout disabled until the merchant account, credentials, supported currencies, methods and bank settlement route are configured and verified. Never fabricate credentials, merchant/service identifiers, successful payments or an active merchant connection. Any test simulation must be clearly marked, restricted to the founder and unavailable in Live.

Let users save a preferred display currency. Start with USD, ZMW, GBP, EUR and ZAR where a configured exchange-rate source supports them. Show currency codes and indicative conversion status. Use verified server-side rates and timestamps; do not invent rates or rely on a user-supplied price.

Display currency is separate from charge currency and payout currency. Changing the display preference must not silently change an existing subscription’s agreed billing amount/currency. Show the actual amount, charge currency, renewal terms and any disclosed charges before consent.

Use DPO's current official hosted-checkout/API documentation and merchant-specific configuration. Create transaction tokens on the server, redirect to DPO hosted checkout, and verify payment server-side before granting access. Confirm the correct service identifiers and API version for this merchant instead of copying travel/demo values. Store credentials and any reusable subscription/customer payment tokens in protected backend settings/data. Do not store raw card numbers or security codes in the application database or logs. Simply entering bank account details into the application does not enable card collection or automatic reconciliation. Only offer methods enabled for the actual DPO merchant account.

For automatic monthly renewal, use DPO's documented tokenised recurring-payment flow only after DPO enables it for this merchant and the customer explicitly consents to the amount, currency, frequency and cancellation terms. Current DPO documentation describes createToken with AllowRecurrent, verification, getSubscriptionToken and chargeTokenRecurrent. DPO tokenisation alone must not be mistaken for an automatically scheduled monthly plan: implement an authorised backend renewal schedule that checks cancellation and billing-period status before attempting one charge for the due period. Independently verify each renewal, handle retries without duplicate charges, and stop future attempts after cancellation or revoked authorisation. Other supported methods, or cards without recurring consent/approval, use monthly “Pay now” renewal with reminders. Do not present manual batch processing as an automated renewal integration.

Official implementation references:
- Zambia merchant onboarding: https://dpogroup.com/online-payments/zambia/
- Hosted-checkout/API quick start: https://docs.dpopay.com/dpo-pay-by-network/reference/quick-start-guide
- Transaction verification: https://docs.dpopay.com/dpo-pay-by-network/reference/transaction-status-lookup
- Recurring tokenisation guide: https://docs.dpopay.com/dpo-pay-by-network/reference/recurring-payments-tokenisation-guide

Confirm with DPO that this Zambia merchant can collect the Basic US$20 and Premium US$100 monthly charges in USD, use tokenised recurring billing, and settle USD into the approved father's USD bank account. A USD account alone does not confirm these merchant features. Obtain the actual fees, any minimum monthly charges/reserves, settlement schedule, conversion rules and account-ownership approval during onboarding; do not invent commercial terms. If a ZMW charge is necessary, show a fixed, time-limited checkout quote using a verified rate. Do not silently substitute a fluctuating ZMW automatic subscription for the advertised USD subscription. Keep unsupported live billing disabled and identify the exact currency configuration decision needed.

Customers should pay through HKA-branded DPO hosted checkout; DPO then settles funds into the approved bank account under its agreed schedule. Full bank details, account-holder authorisation and requested documents must be supplied privately through DPO/bank onboarding, not in customer-facing application configuration, sample data or the AI prompt. Store only the connection references needed by the application and protect any administrative settlement information. Do not show customers the account number or instruct them to transfer directly to it as the default payment flow. Use only the merchant/trading name and statement descriptor approved by DPO; do not misrepresent the legal merchant. Do not assume a successful card collection means immediate bank receipt. Track collection, entitlement and merchant payout as separate statuses, with any currency conversion and fees accounted for.

My personal phone number, full bank details and private payout details must never appear in customer pages, profiles, receipts, email templates, client-readable API responses or exposed settings. Protect them on the server, not just visually, and verify customer-facing provider receipts/settings before launch. Use HKA business email and in-app messaging for support. Flag any existing image/advertisement containing my personal number for replacement; do not regenerate my photographs.

## 6. Verified payments, renewals and loss of access

Use server-controlled orders/subscriptions and entitlements tied to the correct member, plan, billing period and payer. Allow a verified guardian to pay for the correct child’s membership. Do not give the membership to the wrong account because the payer and learner differ.

For every payment, handle DPO callbacks using its current official documentation and independently confirm transaction status through the authenticated server-side verifyToken/transaction-status API. Do not assume every provider uses the same webhook-signature format. Match final successful payment status, order/token reference, amount, currency, expected plan and intended member before granting access. A redirect, screenshot, clicked button or user-edited field is never payment proof. Handle duplicate, delayed and out-of-order events without duplicate entitlements, allowances or charges. Prepare these controls in Development, and keep live payment verification unconfigured until valid DPO credentials and merchant settings are supplied.

Record paid-from and paid-through dates. Enforce access using server time at every protected data/file/action request, backed by expiry workflows; hiding buttons is insufficient.

Rules:
- No verified payment: no new paid access.
- Valid paid period: retain the purchased access even if a future renewal attempt fails early.
- Paid period expires without a verified renewal: lock that package immediately, with no unpaid grace period, and show the Free experience unless another paid entitlement remains valid.
- Failed renewals/retries must not extend the paid-through date.
- Cancellation stops future billing and retains already-paid access until expiry.
- Successful payment restores the appropriate package and existing progress.
- Locking one package must not revoke another valid entitlement or change account/guardian roles.

Do not delete accounts, horse records, learning progress, submissions, released feedback or billing history on downgrade. Members retain access to their own records/history and files. Paid lessons/materials, new Premium submissions, coaching requests and bookings remain gated. Previously downloaded files cannot be technically recalled: do not claim otherwise.

Use calendar-month billing/provider periods, not an assumed 28- or 30-day period. Show dates in the user’s timezone. Provide renewal reminders, payment-failure notices, cancellation and a clear membership page. Prevent duplicate overlapping subscriptions. Plan changes can take effect at the next renewal initially; do not invent proration or double-charge customers.

Provide a refund-request/contact flow and founder review, without inventing a blanket no-refunds policy or automatic refund promise. Cancellation/refund terms must be reviewed and published by the founder before live checkout. Verified refunds/chargebacks must reconcile the affected entitlement without deleting personal records.

## 7. Learning and founder uploads

Build and organise pathways → programmes → modules → lessons. Founder can create, edit, draft, publish, reorder and upload their own PDFs/documents, images, audio and videos through the coach interface, without opening Elmony or editing code. Include lesson descriptions, objectives and appropriate files.

Keep unpublished content and private files protected. Provide a genuine free sample lesson for each pathway once the founder supplies/publishes it. Do not fabricate completed lessons, testimonials, qualifications, assessment marks or student achievements.

Model Enrolments, Lessons and Submissions, and implement a real individual-assignment workflow: a coach must be able to set a task for a selected client before any submission exists, with instructions, optional course/horse, due date, status and attachments. Support submission, revision, coach marking and deliberate release of feedback. Keep relationships stable during later authorised imports.

Objective quizzes may be automatically marked. Written/practical assessments require founder review; do not imply they have been marked automatically. Parent visibility remains limited to appropriate released feedback. Protect content and upload access by role, ownership and current package.

## 8. My Horses, private questions and meetings

Provide My Horses → Add/Edit Horse with identity details, photo and passport uploads, vet/vaccination history, farrier, dentist, physio, care appointments and private attachments. Include manual ride/groundwork logs, notes, duration and optional links to goals, lessons or events. Do not claim GPS/background ride tracking has been implemented.

Enforce owner, verified guardian and authorised coaching access on records and the actual uploaded files. Unknown users must never retrieve documents through a public URL or another user’s record ID.

Build Ask Hollie as private threads with optional horse, lesson and attachments, direct founder replies, unread/awaiting response/resolved states and notifications that do not leak private contents. Only the relevant client, authorised guardian where appropriate and authorised founder can access a thread. General account/payment help is separate from Premium coaching allowances. A free/basic user must not gain Premium coaching merely by opening a thread.

Let Hollie manage available consultation slots, prevent double booking, account for timezones and attach an existing Zoom or Teams meeting link. Do not pretend to create meetings automatically without a configured integration. Keep meeting links restricted to authorised participants.

For regional competitions, provide a founder-managed calendar with country/region, date, discipline, level, location and official source link, plus relevant preparation programmes. Do not fabricate events or assume an automated external feed is connected.

## 9. Founder note and navigation

Add an editable shared founder note to About and suitable welcome areas on both platforms:

“I created HKA Equestrian to share my passion for horses and make thoughtful, practical learning easier to access. Wherever you live and wherever you are in your riding journey, I want you to feel encouraged, supported and able to keep progressing.

My approach centres on confidence, understanding and the partnership between horse and rider. Whether you are learning the basics, caring for your horse or preparing for an event, my aim is to give you clear guidance and meaningful next steps, with horse welfare at the heart of everything we do.”

Signature: Hollie Zietsman — Founder & Main Coach, HKA Equestrian.

Keep navigation simple and consistent. Offer Dashboard, Learning, My Horses, Ask Hollie, Events and My Profile/Billing where relevant, with parent/founder areas available only to authorised accounts. Logged-out users see public welcome, programme information, membership information and authentication.

## 10. Web, native mobile and publishing limits

Web and native mobile must share one authentication system, database, private storage and protected backend. They need appropriate platform-specific interfaces. Implement password reset, session expiry and appropriate app-update handling; do not assume the previous Bubble system views have been imported.

Prepare DPO web billing first, with live checkout disabled until the merchant is configured and the requested third-party USD bank settlement is explicitly approved. Do not copy an external digital-course checkout into native mobile and assume app-store compliance. Apple/Google digital subscriptions, physical lessons and live one-to-one services have different purchasing requirements, with regional exceptions. Record the native purchasing implementation still required before store publishing. A mobile web layout is not proof that native views work.

Do not add native external-purchase links or “Pay on our website” instructions for digital memberships in storefronts where that route has not been confirmed as permitted. Show accurate account status while native purchasing remains unconfigured.

Never claim a web-only change has also been applied to native. If the current Elmony project type cannot build/preview the Expo client, create its source or a precise linked-project handoff and state what remains unbuilt or untested. Do not mark mobile complete merely because web is responsive.

Produce working development previews and production configuration instructions. Do not submit to stores or charge real customers before account-owner setup, approval and verification. Configure authentication policy and native camera/microphone/photo-library permission declarations only for implemented features, and obtain device consent at runtime. List store credentials, permissions, deployment and production-readiness steps still required.

## 11. Verification and completion report

Run the checks actually available. Include type checking, build/lint checks where configured, and meaningful integration tests for security and billing. Test real interactions, not only an AI code/security scan:
- Logged-out/public navigation; signup, date typing/year picker, validation, timezone save, login/logout and role routing.
- Founder access to all client types; ordinary-user denial of founder functions.
- Two unrelated families: pending, verified and revoked guardian access; no cross-family child/file/feedback exposure.
- Course/sample access, assignment before submission, upload, quiz, marking/release and private question visibility.
- Horse/private-file ownership and denied direct access from another account.
- Basic/Premium/free gates; successful, pending, failed and cancelled payments; expiry without renewal; later reactivation; duplicate payment notifications; payer/child mapping.
- Currency display versus actual charge; protected payout details; failure/disabled states while merchant setup is incomplete.
- Representative desktop/mobile widths and native views where accessible: alignment, scrolling, keyboard and working action buttons.

Do not simulate a production payment test and call it verified. Without DPO credentials, activation, recurring approval and approved bank settlement, report the corresponding integration/payment/bank-settlement tests as blocked or not run, while testing the safe disabled states and available Development logic. Test a missing/rejected third-party settlement configuration and confirm it cannot enable live checkout.

Finish with: what changed; existing features reused; checks actually run and results; checks not run; exact manual setup/deployment work remaining; and any unresolved issue affecting privacy, access or billing. Distinguish created UI from tested workflows. Do not call the app finished or production-ready solely because it compiles, an AI security scan finds nothing, or a preview looks correct.

## 12. Practical acceptance and handover

Before recommending replacement of the Bubble app, demonstrate a working vertical slice: a real test signup/login; a protected horse/document record; denied access from an unrelated family; an assignment with submitted/released feedback; and a server-enforced membership expiry that returns the member to Free. Use clearly identified test fixtures where external credentials are missing. A failed privacy or billing test must be fixed and rechecked.

Deliver the actual editable source, migrations, backend/storage policies, protected payment/server functions, shared schema/configuration, runnable website and Expo source, and a README with exact setup/start/build/test commands. Give a status for each client and integration: implemented, tested, blocked or not run. Provide a deployment/rollback and data-backup guide. Export through GitHub when the user's connected plan/account permits; never claim an export or deployment occurred if it did not.

For the native release, check the current Apple/Google purchasing requirements and applicable storefronts before enabling digital memberships. If native store billing is required, keep that release blocked until configured and map verified store entitlements into the same membership service. Do not pretend DPO bank settlement applies to Apple/Google store transactions.

Keep the design consistent, preserve my original photos, use the confirmed names/prices, and deliver a connected product with explicit remaining external steps. Do not stop at a beautiful landing page.
