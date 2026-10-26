# Horse Document Fix — Final Review

Migration 007 remains **prepared only**. It was not deployed, no other migration was applied, reminder emails remain inactive, and the website was not published.

## Exact SHA-256

`A43C289B323B085955FF1C8983DD4E79E6A9FD4746D3C6FB356CC919B4DD5D27`

## Full proposed SQL

```sql
-- Prepared correction only. Do not execute without separate owner approval.
-- Allows horse-document Storage inserts before object metadata exists, then verifies
-- the stored object before creating or replacing a document record.

begin;

drop policy if exists hka_horse_document_storage_insert on storage.objects;
create policy hka_horse_document_storage_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'hka-private'
  and public.hka_file_write(name)
  and exists (
    select 1
    from public.hka_files f
    join public.hka_horses h
      on h.id = f.horse_id
     and h.student_id = f.student_id
    where f.path = name
      and f.owner_id = auth.uid()
      and f.student_id = auth.uid()
      and f.purpose = 'horse'
      and f.mime_type in ('application/pdf', 'image/jpeg', 'image/png')
      and f.size_bytes between 1 and 10485760
      and (
        (f.mime_type = 'application/pdf' and f.path = auth.uid()::text || '/' || f.horse_id::text || '/' || f.id::text || '.pdf')
        or (f.mime_type = 'image/jpeg' and f.path = auth.uid()::text || '/' || f.horse_id::text || '/' || f.id::text || '.jpg')
        or (f.mime_type = 'image/png' and f.path = auth.uid()::text || '/' || f.horse_id::text || '/' || f.id::text || '.png')
      )
      and h.student_id = auth.uid()
      and public.hka_active()
  )
);

create or replace function public.hka_create_horse_document(
  target_file uuid,
  new_display_name text,
  new_document_type text,
  new_appointment_date date default null,
  new_expiry_date date default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  file_record public.hka_files;
  document_id uuid;
begin
  select *
  into file_record
  from public.hka_files
  where id = target_file
  for update;

  if file_record.id is null
    or file_record.owner_id <> auth.uid()
    or file_record.student_id <> auth.uid()
    or file_record.purpose <> 'horse'
    or file_record.mime_type not in ('application/pdf', 'image/jpeg', 'image/png')
    or file_record.size_bytes not between 1 and 10485760
    or not public.hka_active()
    or not exists (
      select 1
      from public.hka_horses h
      where h.id = file_record.horse_id
        and h.student_id = auth.uid()
    )
  then
    raise exception 'Document owner access required.';
  end if;

  if not exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'hka-private'
      and o.name = file_record.path
      and lower(coalesce(o.metadata ->> 'mimetype', '')) = lower(file_record.mime_type)
      and coalesce(o.metadata ->> 'size', '') ~ '^[0-9]+$'
      and (o.metadata ->> 'size')::bigint = file_record.size_bytes
  )
  then
    raise exception 'Document upload failed validation.';
  end if;

  insert into public.hka_horse_documents (
    student_id,
    horse_id,
    file_id,
    display_name,
    document_type,
    appointment_date,
    expiry_date
  )
  values (
    auth.uid(),
    file_record.horse_id,
    file_record.id,
    new_display_name,
    new_document_type,
    new_appointment_date,
    new_expiry_date
  )
  returning id into document_id;

  return document_id;
end;
$$;

create or replace function public.hka_replace_horse_document(target_document uuid, new_file uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_file uuid;
  owner uuid;
  target_horse uuid;
  file_record public.hka_files;
begin
  select file_id, student_id, horse_id
  into old_file, owner, target_horse
  from public.hka_horse_documents
  where id = target_document
  for update;

  select *
  into file_record
  from public.hka_files
  where id = new_file
  for update;

  if owner <> auth.uid() or not public.hka_active() then
    raise exception 'Document owner access required.';
  end if;

  if file_record.id is null
    or file_record.owner_id <> auth.uid()
    or file_record.student_id <> auth.uid()
    or file_record.horse_id <> target_horse
    or file_record.purpose <> 'horse'
    or file_record.mime_type not in ('application/pdf', 'image/jpeg', 'image/png')
    or file_record.size_bytes not between 1 and 10485760
    or not exists (
      select 1
      from public.hka_horses h
      where h.id = target_horse
        and h.student_id = auth.uid()
    )
  then
    raise exception 'Replacement file failed validation.';
  end if;

  if not exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'hka-private'
      and o.name = file_record.path
      and lower(coalesce(o.metadata ->> 'mimetype', '')) = lower(file_record.mime_type)
      and coalesce(o.metadata ->> 'size', '') ~ '^[0-9]+$'
      and (o.metadata ->> 'size')::bigint = file_record.size_bytes
  )
  then
    raise exception 'Replacement upload failed validation.';
  end if;

  update public.hka_horse_documents
  set file_id = new_file,
      replaced_file_id = old_file,
      updated_at = now()
  where id = target_document;
end;
$$;

revoke all on function public.hka_create_horse_document(uuid,text,text,date,date) from public, anon;
grant execute on function public.hka_create_horse_document(uuid,text,text,date,date) to authenticated;

revoke all on function public.hka_replace_horse_document(uuid,uuid) from public, anon;
grant execute on function public.hka_replace_horse_document(uuid,uuid) to authenticated;

commit;

```

## HorseOrganizer.tsx changes

- Keeps validation at PDF, JPEG, or PNG and 10 MB maximum.
- Creates owner-bound `hka_files` metadata before uploading to `hka-private`.
- Calls `hka_create_horse_document` only after Storage upload, so actual stored MIME type and size are verified before document creation.
- Uses hardened replacement RPC validation.
- Removes uploaded Storage object and metadata when later creation or replacement fails.
- Deletes document row, private object, and metadata after owner confirmation.
- Awaits refresh after upload, replacement, and deletion.

## Metadata-at-insert correction

**Confirmed.** Existing generic policy checks `storage.objects.metadata` during INSERT, before horse-document object metadata is reliably available. Migration 007 adds a narrowly scoped owner policy validating purpose, owner, student, horse, path, declared MIME, declared size, active status, and 10 MB limit without initial object metadata. New RPC then verifies actual stored metadata.

## Test results

| Scenario | Result | Evidence |
| --- | --- | --- |
| Owner-only upload | PASS | Rollback transaction created owner metadata, inserted objects with null initial metadata, populated stored metadata, and created bound documents. |
| Cross-owner rejection | FAIL | Cross-owner document, metadata, and object reads plus document deletion were denied, but complete negative sequence stopped when Supabase prohibited direct SQL Storage deletion. |
| PDF, JPEG, PNG | PASS | All three formats completed owner save and binding; PDF passed exact 10 MB boundary. |
| Document retrieval | PASS | Owner reselected document, file metadata, and private object; cross-owner reads returned no rows. |
| Refresh persistence | FAIL | Assertion was after Storage deletion probe and was not reached. |
| Failed-upload cleanup | FAIL | Invalid document creation was rejected and client cleanup is saved, but authenticated Storage API cleanup could not be exercised through direct SQL. |

## Rollback-only confirmation

Migration DDL and fictional documents ran inside rollback-only transactions. Supabase `storage.protect_delete` rejected direct SQL Storage deletion, and transaction rolled back. Remote inspection confirmed `hka_create_horse_document` remains absent, so migration 007 did not persist.

## Preservation

Existing horse photographs, avatars, documents, profiles, memberships, Founder permissions, AI Studio, and unrelated HKA features remain unchanged. Migration 007 only adds document-specific Storage/RPC behavior; every database probe rolled back.

Client changes are saved in `src/components/accounts/HorseOrganizer.tsx`. Production execution still requires explicit approval of exact migration and hash above.

## Pre-repair findings (superseded 2026-10-26)

Migration 007 remains undeployed. No migration, Edge Function, reminder-email, or website deployment action was performed.

| Check | Result | Specific evidence |
| --- | --- | --- |
| Authenticated Storage deletion | PASS | `HorseOrganizer.tsx:44` and `:66` call `db().storage.from(hka-private).remove(...)`; no direct SQL deletion of `storage.objects` exists in this client path. |
| Failed-upload metadata cleanup | FAIL | `uploadPrivateFile` inserts `hka_files` first, but its Storage-upload failure branch awaits metadata deletion without checking the returned `error`; metadata cleanup can therefore fail silently. Later RPC failure cleanup is stronger because `discardPrivateFile` checks both Storage and metadata errors. |
| Storage-deletion failure handling and consistent UI | FAIL | `deleteConfirmed` deletes `hka_horse_documents` before calling authenticated Storage removal. A Storage failure is shown through `setMessage(errorText(error))`, so success is not reported, but the database row is already gone while cached UI and dialog remain until refresh. This is an inconsistent partial deletion. |
| Non-overwriting uploads | PASS | Horse document creation and replacement share `uploadPrivateFile`; `HorseOrganizer.tsx:39` explicitly passes `upsert:false`, and UUID-based paths prevent normal collisions. |
| Actual document-size enforcement without shared-bucket disruption | PASS | Client accepts only 1 to 10,485,760 bytes. Migration 007 checks declared metadata within the same range and both RPCs require stored `storage.objects.metadata.size` to be numeric and exactly equal to `hka_files.size_bytes`. Live `hka-private` bucket remains 52,428,800 bytes for existing lesson media and permits its existing MIME types; migration 007 does not alter bucket configuration or generic policies. |
| Owner SELECT and DELETE; other-student denial | PASS | Live `hka_storage_read` requires `bucket_id = hka-private` plus `hka_file_read(name)`; live `hka_file_read` grants horse documents to owner or administrator, not unrelated students. Live `hka_storage_delete` requires administrator or `hka_file_write(name)`; live `hka_file_write` requires matching owner, student, horse ownership, active status, and metadata path. Live `hka_files` SELECT/DELETE policies use the same owner checks. |

### Authenticated API test status

**NOT TESTED.** This pre-deployment session has no two student login sessions or credentials, and migration 007 is intentionally undeployed. Static client review and live read-only policy inspection were completed, but they do not substitute for authenticated Storage API calls.

### Short post-deployment two-account plan

1. Student A uploads PDF, JPEG, and PNG documents; test 1 byte, exactly 10 MB, and over 10 MB; confirm `upsert:false`, unique paths, refresh persistence, and signed retrieval.
2. Student B attempts document-row and `hka_files` reads, signed-URL creation, upload to Student A path, and Storage removal of Student A object; every attempt must be denied.
3. Student A triggers a post-upload RPC rejection and confirms both object and preliminary `hka_files` row are removed; force Storage and metadata cleanup failures separately and require explicit UI errors.
4. Student A deletes a document and confirms document row, object, and metadata disappear together; force Storage deletion failure and verify no success message or stale/inconsistent UI.
5. Recheck existing horse photographs, avatars, lesson materials, submissions, and 50 MB shared-bucket workflows.

Production approval remains subject to the corrections and results below plus the authenticated two-account plan.

## Client failure corrections (2026-10-26)

### Failure 1: preliminary metadata cleanup

- **Cause:** When authenticated Storage upload failed, uploadPrivateFile attempted to delete the preliminary hka_files row but ignored the deletion result, allowing cleanup failure to be silent.
- **Correction:** HorseOrganizer.tsx:40 now captures cleanupError. It throws a combined upload and metadata-cleanup error when deletion fails, and throws the original upload error only after confirmed metadata cleanup. Document creation and replacement continue to use discardPrivateFile, which checks both authenticated Storage removal and metadata deletion.

### Failure 2: deletion ordering

- **Cause:** deleteConfirmed deleted the document database row before authenticated Storage removal. A failed Storage request therefore left the cached document UI representing a row already removed from the database.
- **Correction:** HorseOrganizer.tsx:66 now removes the private object through db().storage.from('hka-private').remove(...) before deleting either the document row or hka_files metadata. Any Storage error exits through the catch path with the document row and UI unchanged. The success message, dialog close, and refresh occur only after Storage, document-row, and metadata deletion all succeed.

### Updated scoped results

| Scenario | Result | Evidence |
| --- | --- | --- |
| Failed Storage-upload metadata cleanup | PASS | Cleanup result is checked; failure is explicit and cannot be silently discarded. |
| Failed Storage deletion preserves document row and UI | PASS | Authenticated Storage removal now precedes database deletion; failure reaches the error message path before UI or row mutation. |
| Successful document deletion | PASS | Success is reported only after private object, document row, and metadata row deletion complete. |
| Document upload and replacement cleanup | PASS | Both use authenticated hka-private upload/removal helpers; later RPC failures invoke checked discardPrivateFile cleanup. |
| Accidental overwrite prevention | PASS | Shared upload helper still uses UUID paths and upsert:false. |
| PDF/JPEG/PNG and 10 MB validation | PASS | FILE_TYPES and FILE_LIMIT are unchanged and apply to both upload and replacement. |
| Client compilation | PASS | Vite production build completed with 1,785 modules transformed. |
| Authenticated Storage API integration | NOT TESTED | Migration 007 remains undeployed and no two authenticated student sessions are available in this pre-deployment environment; no production record, object, or policy was changed. |

No SQL was deployed, no database push ran, no production records or Storage policies changed, reminder emails remain inactive, and the website was not published.
