# HKA fitness ZIP preview — 10 November 2026

Checkpoint saved before source changes: [hka-before-fitness-preview-20261110-093308.zip](../.checkpoints/hka-before-fitness-preview-20261110-093308.zip).
All 397 checkpoint entries passed ZIP integrity validation.
SHA-256: 9fb948813ff7a00f2b016532258f3fb2bb24bc97abce234223443b449e850487.
Includes app source, public assets, docs, SQL and dependency manifests; excludes generated files, installed dependencies, earlier checkpoints, Git and local secrets.

Applied HKA-fitness-20261110-054436.zip to separate copy at .elmony/fitness-preview-copy, preserving every ZIP folder path, including fitness/, src/ and root SQL/report files.
ZIP SHA-256: c9b1085c8f4cb4adbf6c2e4d7ae1f7206a83657d4b8180f72034458f5337c751.
All 130 imported files accounted for; unchanged imported files match original SHA-256 hashes.
[Import manifest](fitness-preview-20261110/import.json) records every original path and checksum.

ZIP source matched existing app source before preview adjustments.
Adjusted routing, offline context and view switching in working app and preview copy.
Rider/horse tabs select fictional owner; Programme Management selects fictional Founder.
Deep links and reload preserve selected view; sample edits reset on reload.
Preview does not subscribe to hosted auth or load live records.
Existing member routes retain sign-in and role checks.
Preview copy Vite config reads existing app environment through envDir; no environment files edited or copied.

Open preview copy:
- [Rider](http://127.0.0.1:8089/dashboard/fitness-preview)
- [Horse](http://127.0.0.1:8089/dashboard/fitness-preview?view=horse)
- [Founder](http://127.0.0.1:8089/dashboard/fitness-preview?view=manage)

## Actual results

Production build and project TypeScript check passed.
Targeted ESLint reported zero errors and two existing SessionContext warnings.
Chrome interactions exercised actual preview-copy routes at desktop and mobile sizes.

| Scenario | Result |
| --- | --- |
| Rider route opens without sign-in with sample programme | PASS |
| Rider completion is in memory and resets on reload | PASS |
| Horse view keeps Willow and Atlas separate | PASS |
| Founder view opens assignments and reusable templates | PASS |
| Founder creates, reviews and assigns fictional draft | PASS |
| Founder deep link reload and fixture permission denial | PASS |
| Rider, horse and Founder mobile layouts fit viewport | PASS |
| Homepage and live member routes preserve normal access gate | PASS |
| Zero live Supabase requests and runtime errors | PASS |

[Machine-readable results](fitness-preview-20261110/results.json).
[Rider screenshot](fitness-preview-20261110/rider.png), [horse screenshot](fitness-preview-20261110/horse.png), [Founder screenshot](fitness-preview-20261110/founder.png), [Founder templates](fitness-preview-20261110/founder-templates.png).

## Approval boundary

Live Supabase unchanged: no SQL execution, Storage mutations, function deployments, migration execution or activation.
Browser checks blocked and counted live Supabase requests; observed requests: **0**.
Samples are explicitly fictional and exist only in memory.
Imported SQL remains at original ZIP paths inside preview copy, outside automatic migration discovery.
Existing migration proposals unchanged.

- Migration 202611080001_fitness_programmes.sql SHA-256: 87072c9298b45176f318ce4fd959f54abdd2a13911b9b46d8438d5ae66c95da2.
- Rollback 202611080001_fitness_programmes.rollback.sql SHA-256: 8d4ea1732f8e8c91ec14ff665e51e8cbe7952bdefb8ac142dc00ccc18d6923fd.

Migration application, deployment and fitness activation remain pending explicit approval.
Real Storage testing and hosted persistence remain pending separate test environment.
Prior FITNESS_RESULTS.md preserved as supplied; this turn's new evidence concerns sample preview only.

Changed app files: src/App.tsx, src/pages/FitnessProgrammes.tsx, src/hooks/use-fitness.ts, src/contexts/SessionContext.tsx.
