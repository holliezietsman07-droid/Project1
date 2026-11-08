# Fitness programme acceptance and approval package

**Rider, horse and Founder browser workflows passed against a disposable local PostgreSQL test database. Saving and reloading worked.**

14 database scenario groups, 13 browser scenario groups and 7 model checks passed in the final run. Every database operation committed before separate-connection reloads; the database and isolated browser process were removed after testing.

## Checkpoint and saved implementation

Existing checkpoint: [.checkpoints/hka-before-fitness-20261108.zip](../.checkpoints/hka-before-fitness-20261108.zip). All 192 archive entries were read successfully. SHA-256: d2c9127df4796fe56edf9485441bb5d6fe7e627b676f47b6b0b5592b744624f3.

[Checkpoint audit](fitness-review-20261108/checkpoint-audit.json) records original source hashes. Existing fitness pages/components, dashboard routes, horse profile entry, HKA styling, profile/horse prefills and Message Hollie entry were reused.

Completed missing database proposal: RLS-protected intakes, programme/version history, Founder approval, reusable templates, private attachment metadata/policies, and atomic owner-only progress RPCs. Horse completion uses a locked progress key and deterministic ride-log ID; retries update one correctly linked record. No feed records are modified.

UI corrections: keep intake confirmations visible, open latest Founder draft after revision, retain approval confirmations, invalidate ride-log cache after completion, retain health concerns from horse records, hold unknown horse time off, distribute rider work over available days, and identify programme pages correctly.

## Passed browser scenarios

| Scenario | Result |
| --- | --- |
| Rider visible navigation and profile-prefilled intake save/reload use real database | PASS |
| Rider completes and updates notes; browser reload keeps exact progress | PASS |
| Founder creates age-appropriate HKA draft, reviews and approves with save/reload | PASS |
| Founder revision displays newest draft; approval preserves prior versions | PASS |
| Rider skips a scheduled session; skipped status survives browser reload | PASS |
| Horse profile route prefills records; manual owner programme saves/reloads independently | PASS |
| Horse completion retry makes one ride log with correct horse; notes survive reload | PASS |
| Owner original attachment metadata and permitted object survive reload | PASS |
| Rejected save retains entered notes and reports failure without success | PASS |
| Second horse route is separate; Message Hollie entry remains reachable; mobile fits | PASS |
| Founder reusable template is persisted and available after reload | PASS |
| Founder health flag holds template suggestions; coach/guardian views stay read-only | PASS |
| Unrelated rider cannot open another member fitness; non-Founder management denied | PASS |

## Passed database scenarios

| Scenario | Result |
| --- | --- |
| All fitness tables enforce RLS; anon has no table/RPC access | PASS |
| Owner saves intake; new connection reloads exact disciplines/goals | PASS |
| Founder saves draft; rider cannot see unapproved programme/version | PASS |
| Only Founder approves; one current programme; approved version persists | PASS |
| Rider completes and skips; repeat save updates one row across connections | PASS |
| Coach/guardian read approved work; unrelated account cannot read or write | PASS |
| Owner manual programme runs independently; correct horse ride log is idempotent | PASS |
| Second horse separated; cross-horse programme reassignment denied | PASS |
| Revision retains approved history and work; stale approval rejected | PASS |
| Health holds block standard assignment; professional instructions can be tracked | PASS |
| Private attachment metadata and storage use authorised version; unrelated reader denied | PASS |
| Approved coach without minor guardian coaching consent cannot see fitness | PASS |
| Direct version/progress/assignment writes denied; invalid sessions rejected | PASS |
| Rollback freezes writes while preserving versions, history and ride logs | PASS |

Browser saves used the existing Supabase SDK/client and actual React routes/action handlers. Intercepted requests invoked the proposed SQL RPCs under the appropriate authenticated PostgreSQL role and synthetic account ID. A page reload re-read committed rows through a new database connection. Responses were derived from actual SQL results, rather than an in-memory programme store.

Final evidence: [machine-readable results](fitness-review-20261108/results.json), [database transcript](fitness-review-20261108/database.log), [model results](fitness-review-20261108/model-results.json), [exact-file checksums](fitness-review-20261108/checksums.json). Intentional permission/validation denials appear as expected PostgreSQL errors in the transcript; they are assertions of rejection. The injected browser 403 verifies failure handling and retained notes. Earlier intermediate harness outputs are superseded by this final passing result.

Project TypeScript check, targeted fitness lint and production build passed for the final source revision.

## Approval files — live project unchanged

- [Migration proposal](../supabase/proposals/202611080001_fitness_programmes.sql)
- [Rollback proposal](../supabase/proposals/202611080001_fitness_programmes.rollback.sql)

**Neither file was applied to connected Supabase project sqaydpbqycvaictieafk.** No live fitness data, storage objects, migration history, auth configuration, feed records or deployed functions changed. SQL remains under supabase/proposals, outside automatic migration discovery.

Production saving remains disabled by default. After separate approval and application of the reviewed migration, enable VITE_FITNESS_DATABASE_ENABLED=true through app environment settings. The local test child process alone used that flag; .env.local was not edited.

Rollback disables the private fitness feature switch and revokes attachment/template writes; checked RPCs reject further writes. It preserves programme versions, progress, private originals and existing linked ride logs, with authorised history still readable. It intentionally does not drop feature tables or delete user records.

## Boundaries of this evidence

- Real local PostgreSQL persistence, transactions, role grants and RLS were exercised. Relevant HKA auth helper definitions came from the reviewed existing catalog reconstruction; profile/horse/ride-log columns were checked against current connected metadata.
- Browser auth sessions were synthetic and requests were bridged to local SQL. Real hosted Supabase Auth/JWT verification, PostgREST exposure and realtime delivery remain unproven.
- Attachment metadata, authorisation and object-row policies were tested, including an owner original selected through the real browser file picker and visible after reload. Local storage.objects is a test stand-in; file bytes used the isolated transport adapter. Real hosted object persistence, signed downloads and full storage-policy interaction remain unproven.
- The isolated test database used relevant schema reconstruction, not a full live-project restore. Connected end-to-end acceptance remains a separate approval activity.

Changed app files: `src/components/fitness/WeeklyProgramme.tsx`, `src/hooks/use-fitness.ts`, `src/pages/FitnessProgrammes.tsx`, `src/lib/fitness/model.ts`, `src/components/SiteLayout.tsx`.
