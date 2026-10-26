-- Permit horse files to use owner/horse/file paths while retaining valid legacy paths.
-- Horse photos remain JPEG-only and all non-horse purposes keep owner/file paths.
begin;

alter table public.hka_files
  drop constraint hka_files_check;

alter table public.hka_files
  add constraint hka_files_check check (
    (
      purpose = 'horse_photo'
      and horse_id is not null
      and path ~ (
        '^' || owner_id::text || '/' || horse_id::text || '/' || id::text
        || '\.jpg' || chr(36)
      )
    )
    or
    (
      purpose = 'horse'
      and horse_id is not null
      and (
        path ~ (
          '^' || owner_id::text || '/' || horse_id::text || '/' || id::text
          || '\.(jpg|png|webp|pdf|mp4|webm)' || chr(36)
        )
        or path ~ (
          '^' || owner_id::text || '/' || id::text
          || '\.(jpg|png|webp|pdf|mp4|webm)' || chr(36)
        )
      )
    )
    or
    (
      purpose not in ('horse','horse_photo')
      and path ~ (
        '^' || owner_id::text || '/' || id::text
        || '\.(jpg|png|webp|pdf|mp4|webm)' || chr(36)
      )
    )
  );

commit;
