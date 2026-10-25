-- Founder-only horse photographs with server-enforced image checks.
-- Existing horse-document permissions and all stored records remain unchanged.
-- Prepared for review; do not apply before explicit owner approval.
--
-- LOCAL SECURITY RESULTS (disposable Supabase Postgres; no live writes):
-- PASS: self-owned student avatar insert accepted; wrong owner, PDF, and >5 MiB rejected.
-- PASS: existing student horse-document insert remains accepted as purpose='horse'.
-- PASS: student horse-photo metadata insert, RPC preparation, and direct photo_path update rejected.
-- PASS: Founder JPEG prepare/upload/attach path accepted with matching storage MIME and size.
-- PASS: repeat application preserved profile, horse, file counts, avatar_path, and photo_path.
--
-- EXACT PROPOSED CHANGES:
-- 1. Add horse_photo purpose without repurposing existing horse documents.
-- 2. Enforce new avatar/horse-photo image types, 5 MiB limit, ownership, and storage metadata match.
-- 3. Restrict photo_path updates and horse-photo RPCs to authenticated Founder/Admin checks.
-- 4. Extend private-photo reads while preserving all existing file read/write branches.
-- 5. Create no tables and update/delete no existing rows or storage objects.
begin;

alter table public.hka_files drop constraint if exists hka_files_purpose_check;
alter table public.hka_files add constraint hka_files_purpose_check
  check (purpose in ('avatar','material','submission','certificate','horse','horse_photo'));

alter table public.hka_files drop constraint if exists hka_files_purpose_shape_check;
alter table public.hka_files add constraint hka_files_purpose_shape_check check (
  (purpose='avatar' and lesson_id is null and student_id=owner_id and horse_id is null)
  or (purpose='material' and lesson_id is not null and student_id is null and horse_id is null)
  or (purpose='submission' and lesson_id is not null and student_id=owner_id and horse_id is null)
  or (purpose='certificate' and lesson_id is null and student_id is not null and horse_id is null)
  or (purpose='horse' and lesson_id is null and student_id=owner_id and horse_id is not null)
  or (purpose='horse_photo' and lesson_id is null and student_id is not null and horse_id is not null)
);

alter table public.hka_files drop constraint if exists hka_files_photo_upload_check;
alter table public.hka_files add constraint hka_files_photo_upload_check check (
  purpose not in ('avatar','horse_photo')
  or (
    mime_type in ('image/jpeg','image/png','image/webp')
    and size_bytes between 1 and 5242880
    and (purpose<>'horse_photo' or mime_type='image/jpeg')
  )
) not valid;

revoke update(photo_path) on public.hka_horses from public,anon,authenticated;

create or replace function public.hka_prepare_horse_photo(target_horse uuid,new_file uuid,file_path text,original_name text,mime_type text,size_bytes bigint)
returns void language plpgsql security definer set search_path='' as '
declare horse_owner uuid;
begin
  if not public.hka_admin() then raise exception ''Founder access required.''; end if;
  select student_id into horse_owner from public.hka_horses where id=target_horse;
  if horse_owner is null then raise exception ''Horse not found.''; end if;
  if mime_type<>''image/jpeg'' or size_bytes<=0 or size_bytes>5242880 or file_path<>auth.uid()::text||''/''||new_file::text||''.jpg'' then
    raise exception ''Choose a JPEG horse photograph up to 5 MB.'';
  end if;
  insert into public.hka_files(id,owner_id,path,original_name,purpose,mime_type,size_bytes,student_id,horse_id)
  values(new_file,auth.uid(),file_path,original_name,''horse_photo'',mime_type,size_bytes,horse_owner,target_horse);
end';

create or replace function public.hka_attach_horse_photo(target_horse uuid,file_path text)
returns void language plpgsql security definer set search_path='' as '
declare horse_owner uuid;
begin
  if not public.hka_admin() then raise exception ''Founder access required.''; end if;
  select student_id into horse_owner from public.hka_horses where id=target_horse;
  if horse_owner is null then raise exception ''Horse not found.''; end if;
  if not exists (
    select 1 from public.hka_files f
    join storage.objects o on o.bucket_id=''hka-private'' and o.name=f.path
    where f.path=file_path and f.owner_id=auth.uid() and f.horse_id=target_horse
      and f.student_id=horse_owner and f.purpose=''horse_photo'' and f.mime_type=''image/jpeg''
      and f.size_bytes between 1 and 5242880
      and lower(coalesce(jsonb_extract_path_text(o.metadata,''mimetype''),''''))=''image/jpeg''
      and case when jsonb_typeof(jsonb_extract_path(o.metadata,''size''))=''number''
        then jsonb_extract_path_text(o.metadata,''size'')::bigint=f.size_bytes else false end
  ) then raise exception ''Horse photo upload failed validation.''; end if;
  update public.hka_horses set photo_path=file_path where id=target_horse;
end';

create or replace function public.hka_file_read(file_path text)
returns boolean language sql stable security definer set search_path='' as '
  select public.hka_active() and exists (
    select 1 from public.hka_files f where f.path=file_path and (
      public.hka_admin() or f.owner_id=auth.uid()
      or (f.purpose=''material'' and public.hka_read_lesson(f.lesson_id))
      or (f.purpose in (''avatar'',''submission'',''certificate'',''horse'',''horse_photo'') and public.hka_view_student(f.student_id))
    )
  )';

create or replace function public.hka_file_write(file_path text)
returns boolean language sql stable security definer set search_path='' as '
  select public.hka_active() and exists (
    select 1 from public.hka_files f
    where f.path=file_path and f.owner_id=auth.uid() and (
      (f.purpose=''avatar'' and f.student_id=auth.uid())
      or (f.purpose=''material'' and public.hka_manage_lesson(f.lesson_id))
      or (f.purpose=''submission'' and f.student_id=auth.uid() and public.hka_learn(f.lesson_id))
      or (f.purpose=''certificate'' and public.hka_teach(f.student_id))
      or (f.purpose=''horse'' and f.student_id=auth.uid() and exists (
        select 1 from public.hka_horses h where h.id=f.horse_id and h.student_id=auth.uid()
      ))
      or (f.purpose=''horse_photo'' and f.mime_type=''image/jpeg'' and public.hka_admin() and exists (
        select 1 from public.hka_horses h where h.id=f.horse_id and h.student_id=f.student_id
      ))
    )
  )';

drop policy if exists hka_storage_insert on storage.objects;
create policy hka_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id='hka-private'
  and public.hka_file_write(name)
  and exists (
    select 1 from public.hka_files f
    where f.path=name and f.owner_id=auth.uid()
      and (
        f.purpose not in ('avatar','horse_photo')
        or (
          lower(f.mime_type)=lower(coalesce(jsonb_extract_path_text(metadata,'mimetype'),''))
          and case when jsonb_typeof(jsonb_extract_path(metadata,'size'))='number'
            then jsonb_extract_path_text(metadata,'size')::bigint=f.size_bytes else false end
        )
      )
  )
);

revoke all on function public.hka_prepare_horse_photo(uuid,uuid,text,text,text,bigint),public.hka_attach_horse_photo(uuid,text),public.hka_file_read(text),public.hka_file_write(text) from public,anon;
grant execute on function public.hka_prepare_horse_photo(uuid,uuid,text,text,text,bigint),public.hka_attach_horse_photo(uuid,text),public.hka_file_read(text),public.hka_file_write(text) to authenticated;

commit;