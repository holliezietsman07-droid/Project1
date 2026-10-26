# HKA Horse Management backup and deployment preparation

Status: **BACKUP NOT YET VERIFIED; DEPLOYMENT NOT AUTHORIZED**

The existing private backup directory `C:\Users\Hollie\HKA-Private-Backup` is readable and contains the earlier nonempty `roles.sql`, `schema.sql`, `data.sql`, and `auth-data.sql` set. This session could not create a fresh production export because neither Supabase CLI nor a linked database connection is available. No existing backup was overwritten, no migration was applied, reminder scheduling remains unapplied, automatic reminder emails remain disabled, and the website was not published.

## Create a fresh, separately dated backup

Open Windows PowerShell in a trusted local session. In Supabase Dashboard, open the connected HKA project (`sqaydpbqycvaictieafk`), choose **Connect**, and copy its Session pooler connection string with the database password filled in. Then run:

```powershell
$backupRoot = 'C:\Users\Hollie\HKA-Private-Backup'
$backupSet = Join-Path $backupRoot ('pre-horse-organiser-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
if (Test-Path -LiteralPath $backupSet) { throw "Backup set already exists: $backupSet" }
New-Item -ItemType Directory -Path $backupSet | Out-Null

$secureUrl = Read-Host 'Paste Session pooler connection string' -AsSecureString
$urlPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureUrl)
$env:HKA_DB_URL = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($urlPointer)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($urlPointer)
Remove-Variable secureUrl,urlPointer

npx --yes supabase@latest db dump --db-url $env:HKA_DB_URL -f (Join-Path $backupSet 'roles.sql') --role-only
if ($LASTEXITCODE -ne 0) { throw 'roles.sql export failed' }
npx --yes supabase@latest db dump --db-url $env:HKA_DB_URL -f (Join-Path $backupSet 'schema.sql')
if ($LASTEXITCODE -ne 0) { throw 'schema.sql export failed' }
npx --yes supabase@latest db dump --db-url $env:HKA_DB_URL -f (Join-Path $backupSet 'data.sql') --use-copy --data-only -x 'storage.buckets_vectors' -x 'storage.vector_indexes'
if ($LASTEXITCODE -ne 0) { throw 'data.sql export failed' }
npx --yes supabase@latest db dump --db-url $env:HKA_DB_URL -f (Join-Path $backupSet 'auth-data.sql') --use-copy --data-only --schema auth
if ($LASTEXITCODE -ne 0) { throw 'auth-data.sql export failed' }

$required = 'roles.sql','schema.sql','data.sql','auth-data.sql' | ForEach-Object { Join-Path $backupSet $_ }
$missing = $required | Where-Object { -not (Test-Path -LiteralPath $_) }
if ($missing) { throw "Missing backup files: $($missing -join ', ')" }
$empty = Get-Item -LiteralPath $required | Where-Object Length -le 0
if ($empty) { throw "Empty backup files: $($empty.Name -join ', ')" }

Get-FileHash -LiteralPath $required -Algorithm SHA256 | ForEach-Object {
  '{0} *{1}' -f $_.Hash.ToLowerInvariant(), (Split-Path $_.Path -Leaf)
} | Set-Content -LiteralPath (Join-Path $backupSet 'SHA256SUMS.txt') -Encoding ASCII

Get-Item -LiteralPath $required | Select-Object Name,Length,LastWriteTime
Get-Content -LiteralPath (Join-Path $backupSet 'SHA256SUMS.txt')
Remove-Item Env:HKA_DB_URL
Write-Host "Verified backup set: $backupSet"
```

Docker Desktop must be running because Supabase CLI performs these dumps through a container. Keep the resulting file sizes, hashes, and dated directory path as the backup evidence. Supabase database backups contain Storage metadata but not stored objects; if `hka-private` contains objects, separately download them into a `hka-private` subdirectory and record their paths, sizes, and hashes before approval. See [Supabase backup and restore using the CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) and [Supabase database backup scope](https://supabase.com/docs/guides/platform/backups).

## Migration dependency confirmation

- `202610250002_founder_horse_photos.sql` is already applied and is a prerequisite for the organiser migration.
- `202610260003_horse_membership_limits.sql` is **not required again** on the connected project. Live metadata confirms `hka_horse_profile_limits` with RLS, the `hka_horse_limit` `BEFORE INSERT` trigger, and `hka_enforce_horse_limit()` are installed. Its local SHA-256 is `0823eac8de1c630741d81858dbe5385f9952741cad655e1b4093cd073f005c42`.
- `202610260001_horse_organiser.sql` is the only core migration still required. Its verified SHA-256 is `48279e938accaa8efb88987c6b7645b3988b8db496cce1c6f0f357405a37b54f`.
- `202610260002_horse_reminder_schedule.sql` depends on the organiser migration and remains unapplied. Its verified SHA-256 is `545dadbb9a9fb596bed406a67343f0a03241d526bfe2cbf4613a48b26f95e3ad`.

Clean-environment order: `202610250002` → `202610260001` → `202610260003` → separately authorized `202610260002`.

Connected-project action: after backup verification, authorize **only** `202610260001_horse_organiser.sql`; do not reapply `202610260003` and do not apply `202610260002`.

## Exact remaining approval step

After recording the fresh backup directory, four nonzero file sizes, and SHA-256 manifest, send:

> I confirm the fresh production backup in `C:\Users\Hollie\HKA-Private-Backup\<dated-set>` is verified. Approve application of only `supabase/migrations/202610260001_horse_organiser.sql` with SHA-256 `48279e938accaa8efb88987c6b7645b3988b8db496cce1c6f0f357405a37b54f` to connected project `sqaydpbqycvaictieafk`, followed by isolated owner/admin/student verification. Do not apply `202610260002_horse_reminder_schedule.sql`, activate automatic reminder emails, or publish the website.
