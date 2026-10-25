-- Founder-only horse photographs with server-enforced JPEG and 5 MiB checks.
-- Prepared for review; do not apply before explicit owner approval.
begin;

alter table public.hka_files drop constraint if exists hka_files_purpose_shape_check;
alter table public.hka_files add constraint hka_files_purpose_shape_check check (
  (purpose='avatar' and lesson_id is null and student_id=owner_id and horse_id is null)
  or (purpose='material' and lesson_id is not null and student_id is null and horse_id is null)
  or (purpose='submission' and lesson_id is not null and student_id=owner_id and horse_id is null)
  or (purpose='certificate' and lesson_id is null and student_id is not null and horse_id is null)
  or (purpose='horse' and lesson_id is null and student_id is not null and horse_id is not null)
);

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
  values(new_file,auth.uid(),file_path,original_name,''horse'',mime_type,size_bytes,horse_owner,target_horse);
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
      and f.student_id=horse_owner and f.purpose=''horse'' and f.mime_type=''image/jpeg''
      and f.size_bytes between 1 and 5242880
      and lower(coalesce(jsonb_extract_path_text(o.metadata,''mimetype''),''''))=''image/jpeg''
      and case when jsonb_typeof(jsonb_extract_path(o.metadata,''size''))=''number''
        then jsonb_extract_path_text(o.metadata,''size'')::bigint=f.size_bytes else false end
  ) then raise exception ''Horse photo upload failed validation.''; end if;
  update public.hka_horses set photo_path=file_path where id=target_horse;
end';

create or replace function public.hka_file_write(file_path text)
returns boolean language sql stable security definer set search_path='' as '
  select public.hka_active() and exists (
    select 1 from public.hka_files f
    where f.path=file_path and f.owner_id=auth.uid() and (
      (f.purpose=''avatar'' and f.student_id=auth.uid())
      or (f.purpose=''material'' and public.hka_manage_lesson(f.lesson_id))
      or (f.purpose=''submission'' and f.student_id=auth.uid() and public.hka_learn(f.lesson_id))
      or (f.purpose=''certificate'' and public.hka_teach(f.student_id))
      or (f.purpose=''horse'' and f.mime_type=''image/jpeg'' and public.hka_admin() and exists (
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
      and lower(f.mime_type)=lower(coalesce(jsonb_extract_path_text(metadata,'mimetype'),''))
      and case when jsonb_typeof(jsonb_extract_path(metadata,'size'))='number'
        then jsonb_extract_path_text(metadata,'size')::bigint=f.size_bytes else false end
  )
);

revoke all on function public.hka_prepare_horse_photo(uuid,uuid,text,text,text,bigint),public.hka_attach_horse_photo(uuid,text),public.hka_file_write(text) from public,anon;
grant execute on function public.hka_prepare_horse_photo(uuid,uuid,text,text,text,bigint),public.hka_attach_horse_photo(uuid,text),public.hka_file_write(text) to authenticated;

commit;