-- Private, owner-scoped dashboard banner persistence.
begin;

alter table public.hka_profiles
  add column if not exists banner_path text,
  add column if not exists banner_subtitle text check (banner_subtitle is null or char_length(banner_subtitle) <= 140);

grant update(banner_path, banner_subtitle) on public.hka_profiles to authenticated;

drop policy if exists profiles_update on public.hka_profiles;
create policy profiles_update on public.hka_profiles for update to authenticated
  using (id = auth.uid() and public.hka_role() is not null)
  with check (
    id = auth.uid()
    and (avatar_path is null or exists (
      select 1 from public.hka_files f
      where f.path = hka_profiles.avatar_path
        and f.owner_id = auth.uid()
        and f.purpose = 'avatar'
    ))
    and (banner_path is null or split_part(banner_path, '/', 1) = auth.uid()::text)
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('hka-banners', 'hka-banners', false, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists hka_banner_storage_read on storage.objects;
create policy hka_banner_storage_read on storage.objects for select to authenticated
  using (bucket_id = 'hka-banners' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists hka_banner_storage_insert on storage.objects;
create policy hka_banner_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'hka-banners' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists hka_banner_storage_update on storage.objects;
create policy hka_banner_storage_update on storage.objects for update to authenticated
  using (bucket_id = 'hka-banners' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'hka-banners' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists hka_banner_storage_delete on storage.objects;
create policy hka_banner_storage_delete on storage.objects for delete to authenticated
  using (bucket_id = 'hka-banners' and (storage.foldername(name))[1] = auth.uid()::text);

commit;
