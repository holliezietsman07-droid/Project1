-- Prepared only: private horse documents, care schedules, reminders and student-owned photos.
-- Do not execute without separate owner approval and fresh backup/security verification.
begin;

create table public.hka_horse_documents (
 id uuid primary key default gen_random_uuid(), student_id uuid not null, horse_id uuid not null,
 file_id uuid not null unique references public.hka_files(id) on delete restrict,
 display_name text not null check(length(trim(display_name)) between 1 and 160),
 document_type text not null check(document_type in ('passport_identification','vaccination','veterinary','dental','farrier_hoof','physiotherapy','insurance_registration','other')),
 appointment_date date, expiry_date date, replaced_file_id uuid references public.hka_files(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(horse_id,student_id) references public.hka_horses(id,student_id) on delete cascade
);
create table public.hka_care_appointments (
 id uuid primary key default gen_random_uuid(), student_id uuid not null, horse_id uuid not null,
 care_type text not null check(care_type in ('vaccination','veterinarian','farrier','dental','physiotherapy','deworming','custom')),
 title text not null check(length(trim(title)) between 1 and 160), last_appointment_date date, next_due_date date not null,
 provider_name text not null default '', notes text not null default '', repeat_interval_days integer check(repeat_interval_days between 1 and 3650),
 reminder_days integer[] not null default array[30,14,7], email_enabled boolean not null default false,
 status text not null default 'scheduled' check(status in ('scheduled','completed','cancelled')),
 completed_at date, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(horse_id,student_id) references public.hka_horses(id,student_id) on delete cascade,
 check(cardinality(reminder_days) between 1 and 10), check(0<=all(reminder_days) and 365>=all(reminder_days)),
 check((status='completed')=(completed_at is not null))
);
create table public.hka_care_attachments (
 appointment_id uuid not null references public.hka_care_appointments(id) on delete cascade,
 document_id uuid not null references public.hka_horse_documents(id) on delete restrict,
 student_id uuid not null, primary key(appointment_id,document_id)
);
create table public.hka_care_reminders (
 id uuid primary key default gen_random_uuid(), student_id uuid not null, horse_id uuid not null,
 appointment_id uuid references public.hka_care_appointments(id) on delete cascade,
 document_id uuid references public.hka_horse_documents(id) on delete cascade,
 reminder_days integer not null check(reminder_days between 0 and 365), due_date date not null,
 title text not null, is_overdue boolean not null default false,
 status text not null default 'unread' check(status in ('unread','read','dismissed')),
 read_at timestamptz, email_requested boolean not null default false,
 email_status text not null default 'held' check(email_status in ('held','pending','sent','failed')),
 created_at timestamptz not null default now(),
 check((appointment_id is null)<>(document_id is null))
);
create unique index hka_care_reminder_appointment_unique on public.hka_care_reminders(appointment_id,reminder_days,due_date) where appointment_id is not null;
create unique index hka_care_reminder_document_unique on public.hka_care_reminders(document_id,reminder_days,due_date) where document_id is not null;
create index hka_horse_documents_owner on public.hka_horse_documents(student_id,horse_id,created_at desc);
create index hka_care_schedule_owner on public.hka_care_appointments(student_id,horse_id,next_due_date);
create index hka_care_reminders_owner on public.hka_care_reminders(student_id,status,due_date);

alter table public.hka_horse_documents enable row level security;
alter table public.hka_care_appointments enable row level security;
alter table public.hka_care_attachments enable row level security;
alter table public.hka_care_reminders enable row level security;
create policy horse_documents_read on public.hka_horse_documents for select to authenticated using(student_id=auth.uid() or public.hka_admin());
create policy horse_documents_insert on public.hka_horse_documents for insert to authenticated with check(student_id=auth.uid() and public.hka_active() and exists(select 1 from public.hka_horses h where h.id=horse_id and h.student_id=auth.uid()) and exists(select 1 from public.hka_files f where f.id=file_id and f.owner_id=auth.uid() and f.student_id=auth.uid() and f.horse_id=horse_id and f.purpose='horse' and f.mime_type in ('application/pdf','image/jpeg','image/png') and f.size_bytes between 1 and 10485760));
create policy horse_documents_update on public.hka_horse_documents for update to authenticated using((student_id=auth.uid() and public.hka_active()) or public.hka_admin()) with check((student_id=auth.uid() or public.hka_admin()) and exists(select 1 from public.hka_horses h where h.id=horse_id and h.student_id=hka_horse_documents.student_id));
create policy horse_documents_delete on public.hka_horse_documents for delete to authenticated using((student_id=auth.uid() and public.hka_active()) or public.hka_admin());
create policy care_appointments_owner on public.hka_care_appointments for all to authenticated using(student_id=auth.uid() or public.hka_admin()) with check((student_id=auth.uid() or public.hka_admin()) and public.hka_active(student_id) and exists(select 1 from public.hka_horses h where h.id=horse_id and h.student_id=hka_care_appointments.student_id));
create policy care_attachments_owner on public.hka_care_attachments for all to authenticated using(student_id=auth.uid() or public.hka_admin()) with check((student_id=auth.uid() or public.hka_admin()) and exists(select 1 from public.hka_care_appointments a join public.hka_horse_documents d on d.id=hka_care_attachments.document_id where a.id=hka_care_attachments.appointment_id and a.student_id=hka_care_attachments.student_id and d.student_id=hka_care_attachments.student_id and a.horse_id=d.horse_id));
create policy care_reminders_read on public.hka_care_reminders for select to authenticated using(student_id=auth.uid() or public.hka_admin());
create policy care_reminders_update on public.hka_care_reminders for update to authenticated using(student_id=auth.uid()) with check(student_id=auth.uid());

revoke all on public.hka_horse_documents,public.hka_care_appointments,public.hka_care_attachments,public.hka_care_reminders from anon,authenticated;
grant select,insert,update,delete on public.hka_horse_documents,public.hka_care_appointments,public.hka_care_attachments to authenticated;
grant select on public.hka_care_reminders to authenticated;
grant update(status,read_at) on public.hka_care_reminders to authenticated;

create or replace function public.hka_prepare_horse_photo(target_horse uuid,new_file uuid,file_path text,original_name text,mime_type text,size_bytes bigint)
returns void language plpgsql security definer set search_path='' as '
declare horse_owner uuid;
begin
 select student_id into horse_owner from public.hka_horses where id=target_horse;
 if horse_owner is null or not (public.hka_admin() or (horse_owner=auth.uid() and public.hka_active())) then raise exception ''Horse owner access required.''; end if;
 if mime_type<>''image/jpeg'' or size_bytes<=0 or size_bytes>5242880 or file_path<>auth.uid()::text||''/''||target_horse::text||''/''||new_file::text||''.jpg'' then raise exception ''Choose a JPEG horse photograph up to 5 MB.''; end if;
 insert into public.hka_files(id,owner_id,path,original_name,purpose,mime_type,size_bytes,student_id,horse_id) values(new_file,auth.uid(),file_path,original_name,''horse_photo'',mime_type,size_bytes,horse_owner,target_horse);
end';

create or replace function public.hka_attach_horse_photo(target_horse uuid,file_path text)
returns void language plpgsql security definer set search_path='' as '
declare horse_owner uuid;
begin
 select student_id into horse_owner from public.hka_horses where id=target_horse;
 if horse_owner is null or not (public.hka_admin() or (horse_owner=auth.uid() and public.hka_active())) then raise exception ''Horse owner access required.''; end if;
 if not exists(select 1 from public.hka_files f join storage.objects o on o.bucket_id=''hka-private'' and o.name=f.path where f.path=file_path and f.owner_id=auth.uid() and f.horse_id=target_horse and f.student_id=horse_owner and f.purpose=''horse_photo'' and f.mime_type=''image/jpeg'' and f.size_bytes between 1 and 5242880 and lower(coalesce(o.metadata->>''mimetype'',''''))=''image/jpeg'' and (o.metadata->>''size'')::bigint=f.size_bytes) then raise exception ''Horse photo upload failed validation.''; end if;
 update public.hka_horses set photo_path=file_path where id=target_horse;
end';
create or replace function public.hka_replace_horse_document(target_document uuid,new_file uuid)
returns void language plpgsql security definer set search_path='' as '
declare old_file uuid; owner uuid; target_horse uuid;
begin
 select file_id,student_id,horse_id into old_file,owner,target_horse from public.hka_horse_documents where id=target_document for update;
 if owner<>auth.uid() or not public.hka_active() then raise exception ''Document owner access required.''; end if;
 if not exists(select 1 from public.hka_files f where f.id=new_file and f.owner_id=auth.uid() and f.student_id=auth.uid() and f.horse_id=target_horse and f.purpose=''horse'' and f.mime_type in (''application/pdf'',''image/jpeg'',''image/png'') and f.size_bytes between 1 and 10485760) then raise exception ''Replacement file failed validation.''; end if;
 update public.hka_horse_documents set file_id=new_file,replaced_file_id=old_file,updated_at=now() where id=target_document;
end';

create or replace function public.hka_complete_care_appointment(target_appointment uuid,completed_date date)
returns void language plpgsql security definer set search_path='' as '
declare item public.hka_care_appointments;
begin
 select * into item from public.hka_care_appointments where id=target_appointment for update;
 if item.student_id<>auth.uid() or not public.hka_active() then raise exception ''Appointment owner access required.''; end if;
 update public.hka_care_appointments set status=''completed'',completed_at=completed_date,updated_at=now() where id=target_appointment;
 update public.hka_care_reminders set status=''dismissed'',read_at=now() where appointment_id=target_appointment and status=''unread'';
 if item.repeat_interval_days is not null then insert into public.hka_care_appointments(student_id,horse_id,care_type,title,last_appointment_date,next_due_date,provider_name,notes,repeat_interval_days,reminder_days,email_enabled) values(item.student_id,item.horse_id,item.care_type,item.title,completed_date,completed_date+item.repeat_interval_days,item.provider_name,item.notes,item.repeat_interval_days,item.reminder_days,item.email_enabled); end if;
end';

create or replace function public.hka_generate_care_reminders(run_date date default null)
returns integer language plpgsql security definer set search_path='' as '
declare created integer:=0; added integer:=0;
begin
 insert into public.hka_care_reminders(student_id,horse_id,appointment_id,reminder_days,due_date,title,is_overdue,email_requested)
 select a.student_id,a.horse_id,a.id,d,a.next_due_date,a.title,a.next_due_date<coalesce(run_date,(now() at time zone p.timezone)::date),a.email_enabled
 from public.hka_care_appointments a join public.hka_profiles p on p.id=a.student_id cross join lateral unnest(a.reminder_days) d
 where a.status=''scheduled'' and public.hka_active(a.student_id) and a.next_due_date-d<=coalesce(run_date,(now() at time zone p.timezone)::date)
 on conflict(appointment_id,reminder_days,due_date) where appointment_id is not null do update set is_overdue=excluded.is_overdue;
 get diagnostics created=row_count;
 insert into public.hka_care_reminders(student_id,horse_id,document_id,reminder_days,due_date,title,is_overdue,email_requested)
 select d.student_id,d.horse_id,d.id,r,d.expiry_date,d.display_name||'' renewal'',d.expiry_date<coalesce(run_date,(now() at time zone p.timezone)::date),false
 from public.hka_horse_documents d join public.hka_profiles p on p.id=d.student_id cross join unnest(array[30,14,7]) r
 where d.expiry_date is not null and d.expiry_date-r<=coalesce(run_date,(now() at time zone p.timezone)::date)
 on conflict(document_id,reminder_days,due_date) where document_id is not null do update set is_overdue=excluded.is_overdue;
 get diagnostics added=row_count; created:=created+added; return created;
end';

create or replace function public.hka_file_read(file_path text) returns boolean language sql stable security definer set search_path='' as '
 select public.hka_active() and exists(select 1 from public.hka_files f where f.path=file_path and (public.hka_admin() or f.owner_id=auth.uid() or (f.purpose=''material'' and public.hka_read_lesson(f.lesson_id)) or (f.purpose in (''avatar'',''submission'',''certificate'',''horse_photo'') and public.hka_view_student(f.student_id))))';
create or replace function public.hka_file_write(file_path text) returns boolean language sql stable security definer set search_path='' as '
 select public.hka_active() and exists(select 1 from public.hka_files f where f.path=file_path and f.owner_id=auth.uid() and ((f.purpose=''avatar'' and f.student_id=auth.uid()) or (f.purpose=''material'' and public.hka_manage_lesson(f.lesson_id)) or (f.purpose=''submission'' and f.student_id=auth.uid() and public.hka_learn(f.lesson_id)) or (f.purpose=''certificate'' and public.hka_teach(f.student_id)) or (f.purpose in (''horse'',''horse_photo'') and f.student_id=auth.uid() and exists(select 1 from public.hka_horses h where h.id=f.horse_id and h.student_id=auth.uid())) or (f.purpose=''horse_photo'' and public.hka_admin())))';

revoke all on function public.hka_prepare_horse_photo(uuid,uuid,text,text,text,bigint),public.hka_attach_horse_photo(uuid,text),public.hka_replace_horse_document(uuid,uuid),public.hka_complete_care_appointment(uuid,date),public.hka_generate_care_reminders(date) from public,anon;
grant execute on function public.hka_prepare_horse_photo(uuid,uuid,text,text,text,bigint),public.hka_attach_horse_photo(uuid,text),public.hka_replace_horse_document(uuid,uuid),public.hka_complete_care_appointment(uuid,date) to authenticated;
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
