-- Prepared correction only. Do not execute without separate owner approval.
-- Repairs horse-document file binding in the deployed organiser policies.

begin;

drop policy if exists horse_documents_insert on public.hka_horse_documents;
create policy horse_documents_insert
on public.hka_horse_documents
for insert
to authenticated
with check (
  hka_horse_documents.student_id = auth.uid()
  and public.hka_active()
  and exists (
    select 1
    from public.hka_horses h
    where h.id = hka_horse_documents.horse_id
      and h.student_id = hka_horse_documents.student_id
  )
  and exists (
    select 1
    from public.hka_files f
    where f.id = hka_horse_documents.file_id
      and f.owner_id = hka_horse_documents.student_id
      and f.student_id = hka_horse_documents.student_id
      and f.horse_id = hka_horse_documents.horse_id
      and f.purpose = 'horse'
      and f.mime_type in ('application/pdf', 'image/jpeg', 'image/png')
      and f.size_bytes between 1 and 10485760
  )
  and (
    hka_horse_documents.replaced_file_id is null
    or exists (
      select 1
      from public.hka_files previous_file
      where previous_file.id = hka_horse_documents.replaced_file_id
        and previous_file.owner_id = hka_horse_documents.student_id
        and previous_file.student_id = hka_horse_documents.student_id
        and previous_file.horse_id = hka_horse_documents.horse_id
        and previous_file.purpose = 'horse'
    )
  )
);

drop policy if exists horse_documents_update on public.hka_horse_documents;
create policy horse_documents_update
on public.hka_horse_documents
for update
to authenticated
using (
  (
    hka_horse_documents.student_id = auth.uid()
    and public.hka_active()
  )
  or public.hka_admin()
)
with check (
  (
    (
      hka_horse_documents.student_id = auth.uid()
      and public.hka_active()
    )
    or public.hka_admin()
  )
  and exists (
    select 1
    from public.hka_horses h
    where h.id = hka_horse_documents.horse_id
      and h.student_id = hka_horse_documents.student_id
  )
  and exists (
    select 1
    from public.hka_files f
    where f.id = hka_horse_documents.file_id
      and f.owner_id = hka_horse_documents.student_id
      and f.student_id = hka_horse_documents.student_id
      and f.horse_id = hka_horse_documents.horse_id
      and f.purpose = 'horse'
      and f.mime_type in ('application/pdf', 'image/jpeg', 'image/png')
      and f.size_bytes between 1 and 10485760
  )
  and (
    hka_horse_documents.replaced_file_id is null
    or exists (
      select 1
      from public.hka_files previous_file
      where previous_file.id = hka_horse_documents.replaced_file_id
        and previous_file.owner_id = hka_horse_documents.student_id
        and previous_file.student_id = hka_horse_documents.student_id
        and previous_file.horse_id = hka_horse_documents.horse_id
        and previous_file.purpose = 'horse'
    )
  )
);

commit;
