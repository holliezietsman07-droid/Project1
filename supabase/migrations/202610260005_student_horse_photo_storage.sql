-- Permit authenticated horse owners and Founder/Admin to upload prepared horse photos.
-- Existing private-document, avatar, read, delete, and general insert policies remain unchanged.
begin;

drop policy if exists hka_horse_photo_storage_insert on storage.objects;
create policy hka_horse_photo_storage_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'hka-private'
  and public.hka_file_write(storage.objects.name)
  and exists (
    select 1
    from public.hka_files f
    join public.hka_horses h
      on h.id = f.horse_id
     and h.student_id = f.student_id
    where f.path = storage.objects.name
      and f.owner_id = auth.uid()
      and f.purpose = 'horse_photo'
      and f.mime_type = 'image/jpeg'
      and f.size_bytes between 1 and 5242880
      and f.path = auth.uid()::text || '/' || f.horse_id::text || '/' || f.id::text || '.jpg'
      and (
        (h.student_id = auth.uid() and public.hka_active())
        or public.hka_admin()
      )
  )
);

commit;
