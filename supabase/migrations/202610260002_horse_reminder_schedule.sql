-- Prepared separately: daily in-app horse-care reminder generation only.
-- Email delivery remains held and this job must not run without owner approval.
begin;
create extension if not exists pg_cron with schema extensions;
do 'declare existing_job bigint; begin
 select jobid into existing_job from cron.job where jobname=''hka-horse-care-reminders'';
 if existing_job is not null then perform cron.unschedule(existing_job); end if;
 perform cron.schedule(''hka-horse-care-reminders'',''15 * * * *'',''select public.hka_generate_care_reminders(null);'');
end';
commit;
/* source template remainder
-- hka-avatars enforces image MIME types and a 5 MiB object limit at the bucket boundary.
begin;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('hka-avatars','hka-avatars',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;

drop policy if exists hka_avatar_storage_read on storage.objects;
create policy hka_avatar_storage_read on storage.objects for select to authenticated using (
  bucket_id='hka-avatars' and public.hka_file_read(name)
);

drop policy if exists hka_avatar_storage_insert on storage.objects;
create policy hka_avatar_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id='hka-avatars'
  and public.hka_file_write(name)
  and exists (
    select 1 from public.hka_files f
    where f.path=name
      and f.owner_id=auth.uid()
      and f.student_id=auth.uid()
      and f.purpose='avatar'
      and f.mime_type in ('image/jpeg','image/png','image/webp')
      and f.size_bytes between 1 and 5242880
  )
);

drop policy if exists hka_avatar_storage_delete on storage.objects;
create policy hka_avatar_storage_delete on storage.objects for delete to authenticated using (
  bucket_id='hka-avatars'
  and exists (
    select 1 from public.hka_files f
    where f.path=name
      and f.owner_id=auth.uid()
      and f.student_id=auth.uid()
      and f.purpose='avatar'
  )
);

commit; -- "@/hooks/use-toast";

-- migration end
*/
