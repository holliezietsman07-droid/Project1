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
