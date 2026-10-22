-- Stage 4B: student operations and founder dashboard support.
-- Prepared for review; do not apply before explicit owner approval.
begin;

create extension if not exists btree_gist with schema extensions;

alter table public.hka_profiles
  add column if not exists membership_tier text not null default 'free' check (membership_tier in ('free','basic','premium')),
  add column if not exists notification_preferences jsonb not null default jsonb_build_object('academy',true,'coaching',true,'feedback',true) check (jsonb_typeof(notification_preferences)='object');

alter table public.hka_horses
  add column if not exists photo_path text,
  add column if not exists birth_year integer check (birth_year between 1980 and extract(year from current_date)::integer),
  add column if not exists breed text not null default '',
  add column if not exists sex text not null default '' check (sex in ('','mare','gelding','stallion','colt','filly')),
  add column if not exists identification text not null default '',
  add column if not exists height_hands numeric(4,1) check (height_hands between 5 and 22),
  add column if not exists discipline text not null default '',
  add column if not exists training_goals text not null default '';

create table if not exists public.hka_horse_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.hka_profiles on delete cascade,
  horse_id uuid not null,
  record_type text not null check (record_type in ('exercise','veterinary','farrier','dental','care','competition')),
  recorded_on date not null default current_date,
  title text not null check (char_length(title) between 1 and 150),
  notes text not null default '' check (char_length(notes) <= 10000),
  created_at timestamptz not null default now(),
  foreign key (horse_id,student_id) references public.hka_horses(id,student_id) on delete cascade
);

create table if not exists public.hka_owner_availability (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.hka_profiles on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  availability_type text not null check (availability_type in ('available','unavailable')),
  note text not null default '' check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.hka_coaching_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.hka_profiles on delete cascade,
  service_id uuid references public.hka_coaching_services on delete set null,
  lesson_format text not null check (lesson_format in ('online','in_person')),
  preferred_starts_at timestamptz not null,
  alternate_starts_at timestamptz,
  duration_minutes integer not null default 60 check (duration_minutes between 30 and 240),
  learning_goals text not null check (char_length(learning_goals) between 1 and 5000),
  location text not null default '' check (char_length(location) <= 500),
  status text not null default 'pending' check (status in ('pending','approved','declined','alternative_proposed','reschedule_requested','cancellation_requested','cancelled')),
  owner_message text not null default '' check (char_length(owner_message) <= 5000),
  fee_usd numeric(10,2) check (fee_usd >= 0),
  travel_charge_usd numeric(10,2) check (travel_charge_usd >= 0),
  appointment_id uuid references public.hka_appointments on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hka_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 150),
  body text not null check (char_length(body) between 1 and 10000),
  published boolean not null default false,
  created_by uuid not null references public.hka_profiles,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $stage4b$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.hka_appointments'::regclass
      and conname='hka_appointments_no_scheduled_overlap'
  ) then
    alter table public.hka_appointments add constraint hka_appointments_no_scheduled_overlap
      exclude using gist (
        coach_id with =,
        tsrange(starts_at at time zone 'UTC',(starts_at at time zone 'UTC')+make_interval(mins=>duration_minutes),'[)') with &&
      ) where (status='scheduled');
  end if;
end $stage4b$;

drop policy if exists appointments_write on public.hka_appointments;
drop policy if exists appointments_admin on public.hka_appointments;
create policy appointments_admin on public.hka_appointments for all to authenticated
  using (public.hka_admin()) with check (public.hka_admin());

alter table public.hka_files add column if not exists horse_id uuid references public.hka_horses on delete restrict;
alter table public.hka_files drop constraint if exists hka_files_purpose_check;
alter table public.hka_files add constraint hka_files_purpose_check
  check (purpose in ('avatar','material','submission','certificate','horse'));
alter table public.hka_files drop constraint if exists hka_files_check2;
alter table public.hka_files drop constraint if exists hka_files_purpose_shape_check;
alter table public.hka_files add constraint hka_files_purpose_shape_check check (
  (purpose='avatar' and lesson_id is null and student_id=owner_id and horse_id is null)
  or (purpose='material' and lesson_id is not null and student_id is null and horse_id is null)
  or (purpose='submission' and lesson_id is not null and student_id=owner_id and horse_id is null)
  or (purpose='certificate' and lesson_id is null and student_id is not null and horse_id is null)
  or (purpose='horse' and lesson_id is null and student_id=owner_id and horse_id is not null)
);

alter table public.hka_horse_records enable row level security;
alter table public.hka_owner_availability enable row level security;
alter table public.hka_coaching_requests enable row level security;
alter table public.hka_announcements enable row level security;

revoke all on public.hka_horse_records,public.hka_owner_availability,public.hka_coaching_requests,public.hka_announcements from anon,authenticated;
grant select,insert,update,delete on public.hka_horse_records,public.hka_owner_availability,public.hka_coaching_requests,public.hka_announcements to authenticated;
revoke update on public.hka_profiles from anon,authenticated;
revoke update(id,full_name,birth_date,timezone,role,suspended,avatar_path,created_at,membership_tier,notification_preferences) on public.hka_profiles from anon,authenticated;
grant update(full_name,timezone,avatar_path,notification_preferences) on public.hka_profiles to authenticated;
revoke update on public.hka_horses from anon,authenticated;
revoke update(id,student_id,name,details,created_at,photo_path,birth_year,breed,sex,identification,height_hands,discipline,training_goals) on public.hka_horses from anon,authenticated;
grant update(name,details,photo_path,birth_year,breed,sex,identification,height_hands,discipline,training_goals) on public.hka_horses to authenticated;

drop policy if exists horse_records_read on public.hka_horse_records;
drop policy if exists horse_records_write on public.hka_horse_records;
create policy horse_records_read on public.hka_horse_records for select to authenticated using (public.hka_view_student(student_id));
create policy horse_records_write on public.hka_horse_records for all to authenticated
  using (student_id=auth.uid() and public.hka_active())
  with check (student_id=auth.uid() and public.hka_role()='student' and public.hka_active());

drop policy if exists availability_read on public.hka_owner_availability;
drop policy if exists availability_admin on public.hka_owner_availability;
create policy availability_read on public.hka_owner_availability for select to authenticated using (public.hka_admin());
create policy availability_admin on public.hka_owner_availability for all to authenticated using (public.hka_admin()) with check (public.hka_admin());

drop policy if exists coaching_requests_read on public.hka_coaching_requests;
drop policy if exists coaching_requests_insert on public.hka_coaching_requests;
drop policy if exists coaching_requests_student_update on public.hka_coaching_requests;
drop policy if exists coaching_requests_admin on public.hka_coaching_requests;
create policy coaching_requests_read on public.hka_coaching_requests for select to authenticated
  using (public.hka_admin() or student_id=auth.uid() or public.hka_teach(student_id));
create policy coaching_requests_insert on public.hka_coaching_requests for insert to authenticated
  with check (student_id=auth.uid() and public.hka_role()='student' and public.hka_active() and status='pending');
create policy coaching_requests_student_update on public.hka_coaching_requests for update to authenticated
  using (student_id=auth.uid() and status in ('pending','alternative_proposed','approved'))
  with check (student_id=auth.uid() and status in ('reschedule_requested','cancellation_requested','cancelled'));
create policy coaching_requests_admin on public.hka_coaching_requests for all to authenticated
  using (public.hka_admin()) with check (public.hka_admin());

drop policy if exists announcements_read on public.hka_announcements;
drop policy if exists announcements_admin on public.hka_announcements;
create policy announcements_read on public.hka_announcements for select to authenticated using (published or public.hka_admin());
create policy announcements_admin on public.hka_announcements for all to authenticated using (public.hka_admin()) with check (public.hka_admin());

create or replace function public.hka_enforce_horse_limit() returns trigger
language plpgsql security definer set search_path='' as $stage4b$
begin
  perform 1 from public.hka_profiles where id=new.student_id for update;
  if (select membership_tier='free' from public.hka_profiles where id=new.student_id)
     and (select count(*) from public.hka_horses where student_id=new.student_id) >= 1
  then raise exception 'Free membership includes one horse profile.'; end if;
  return new;
end $stage4b$;
drop trigger if exists hka_horse_limit on public.hka_horses;
create trigger hka_horse_limit before insert on public.hka_horses for each row execute function public.hka_enforce_horse_limit();

create or replace function public.hka_self_enrol_free(target_course uuid) returns uuid
language plpgsql security definer set search_path='' as $stage4b$
declare enrolment_id uuid;
begin
  if public.hka_role()<>'student' or not public.hka_active() then raise exception 'Active student account required.'; end if;
  if not exists(select 1 from public.hka_courses where id=target_course and published and archived_at is null and access_level='free')
  then raise exception 'This course requires owner-approved access.'; end if;
  insert into public.hka_enrolments(student_id,course_id) values(auth.uid(),target_course)
  on conflict(student_id,course_id) do update set status='active' returning id into enrolment_id;
  return enrolment_id;
end $stage4b$;

create or replace function public.hka_guard_coaching_request_update() returns trigger
language plpgsql security definer set search_path='' as $stage4b$
begin
  if not public.hka_admin() then
    if (new.id,new.student_id,new.service_id,new.lesson_format,new.preferred_starts_at,new.alternate_starts_at,
        new.duration_minutes,new.learning_goals,new.location,new.owner_message,new.fee_usd,new.travel_charge_usd,
        new.appointment_id,new.created_at)
       is distinct from
       (old.id,old.student_id,old.service_id,old.lesson_format,old.preferred_starts_at,old.alternate_starts_at,
        old.duration_minutes,old.learning_goals,old.location,old.owner_message,old.fee_usd,old.travel_charge_usd,
        old.appointment_id,old.created_at)
    then raise exception 'Students may only request rescheduling or cancellation.'; end if;
    if not (
      (old.status in ('pending','alternative_proposed') and new.status in ('reschedule_requested','cancelled'))
      or (old.status='approved' and new.status in ('reschedule_requested','cancellation_requested'))
    ) then raise exception 'Invalid student request status change.'; end if;
  end if;
  new.updated_at:=now();
  return new;
end $stage4b$;
drop trigger if exists hka_coaching_request_update_guard on public.hka_coaching_requests;
create trigger hka_coaching_request_update_guard before update on public.hka_coaching_requests
for each row execute function public.hka_guard_coaching_request_update();

create or replace function public.hka_approve_coaching_request(target_request uuid, approved_start timestamptz, assigned_coach uuid)
returns uuid language plpgsql security definer set search_path='' as $stage4b$
declare request_row public.hka_coaching_requests; appointment uuid; approved_end timestamptz;
begin
  if not public.hka_admin() then raise exception 'Administrator access required.'; end if;
  select * into request_row from public.hka_coaching_requests where id=target_request for update;
  if request_row.id is null or request_row.status not in ('pending','reschedule_requested','alternative_proposed')
  then raise exception 'Request is no longer pending approval.'; end if;
  if not exists(select 1 from public.hka_profiles where id=assigned_coach and role in ('coach','admin') and not suspended)
     or not public.hka_active(assigned_coach)
  then raise exception 'Assigned coach must be active and authorised.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(assigned_coach::text,0));
  approved_end:=approved_start + make_interval(mins=>request_row.duration_minutes);
  if exists(select 1 from public.hka_owner_availability a where a.coach_id=assigned_coach and a.availability_type='unavailable'
    and tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(approved_start,approved_end,'[)'))
  then raise exception 'Selected time is unavailable.'; end if;
  if exists(select 1 from public.hka_appointments a where a.coach_id=assigned_coach and a.status='scheduled'
    and a.id is distinct from request_row.appointment_id
    and tstzrange(a.starts_at,a.starts_at+make_interval(mins=>a.duration_minutes),'[)') && tstzrange(approved_start,approved_end,'[)'))
  then raise exception 'Selected time conflicts with another lesson.'; end if;
  if request_row.appointment_id is null then
    insert into public.hka_appointments(student_id,coach_id,title,starts_at,duration_minutes,location,status)
    values(request_row.student_id,assigned_coach,case when request_row.lesson_format='online' then 'Online coaching lesson' else 'In-person coaching lesson' end,
      approved_start,request_row.duration_minutes,request_row.location,'scheduled') returning id into appointment;
  else
    update public.hka_appointments set coach_id=assigned_coach,starts_at=approved_start,
      duration_minutes=request_row.duration_minutes,location=request_row.location,status='scheduled'
    where id=request_row.appointment_id and student_id=request_row.student_id returning id into appointment;
    if appointment is null then raise exception 'Confirmed appointment was not found.'; end if;
  end if;
  update public.hka_coaching_requests set status='approved',appointment_id=appointment,updated_at=now() where id=target_request;
  return appointment;
end $stage4b$;

create or replace function public.hka_review_coaching_cancellation(target_request uuid, approve boolean)
returns void language plpgsql security definer set search_path='' as $stage4b$
declare request_row public.hka_coaching_requests;
begin
  if not public.hka_admin() then raise exception 'Administrator access required.'; end if;
  select * into request_row from public.hka_coaching_requests where id=target_request for update;
  if request_row.id is null or request_row.status<>'cancellation_requested' or request_row.appointment_id is null
  then raise exception 'Cancellation request is no longer pending.'; end if;
  if approve then
    update public.hka_appointments set status='cancelled'
      where id=request_row.appointment_id and student_id=request_row.student_id and status='scheduled';
    if not found then raise exception 'Confirmed appointment was not found.'; end if;
    update public.hka_coaching_requests set status='cancelled',updated_at=now() where id=target_request;
  else
    update public.hka_coaching_requests set status='approved',updated_at=now() where id=target_request;
  end if;
end $stage4b$;

revoke all on function public.hka_enforce_horse_limit(),public.hka_guard_coaching_request_update(),public.hka_self_enrol_free(uuid),public.hka_approve_coaching_request(uuid,timestamptz,uuid),public.hka_review_coaching_cancellation(uuid,boolean) from public,anon;
revoke execute on function public.hka_enforce_horse_limit(),public.hka_guard_coaching_request_update() from authenticated;
grant execute on function public.hka_self_enrol_free(uuid),public.hka_approve_coaching_request(uuid,timestamptz,uuid),public.hka_review_coaching_cancellation(uuid,boolean) to authenticated;

create or replace function public.hka_file_read(file_path text) returns boolean language sql stable security definer set search_path='' as $stage4b$
 select public.hka_active() and exists(select 1 from public.hka_files f where f.path=file_path and (
 public.hka_admin() or f.owner_id=auth.uid() or (f.purpose='material' and public.hka_read_lesson(f.lesson_id))
 or (f.purpose in ('avatar','submission','certificate','horse') and public.hka_view_student(f.student_id))))
$stage4b$;
create or replace function public.hka_file_write(file_path text) returns boolean language sql stable security definer set search_path='' as $stage4b$
 select public.hka_active() and exists(select 1 from public.hka_files f where f.path=file_path and f.owner_id=auth.uid() and (
 (f.purpose='avatar' and f.student_id=auth.uid()) or (f.purpose='material' and public.hka_manage_lesson(f.lesson_id))
 or (f.purpose='submission' and f.student_id=auth.uid() and public.hka_learn(f.lesson_id))
 or (f.purpose='certificate' and public.hka_teach(f.student_id))
 or (f.purpose='horse' and f.student_id=auth.uid() and exists(select 1 from public.hka_horses h where h.id=f.horse_id and h.student_id=auth.uid()))))
$stage4b$;
drop policy if exists files_insert on public.hka_files;
create policy files_insert on public.hka_files for insert to authenticated with check(owner_id=auth.uid() and public.hka_active() and (
 (purpose='avatar' and student_id=auth.uid()) or (purpose='material' and public.hka_manage_lesson(lesson_id))
 or (purpose='submission' and student_id=auth.uid() and public.hka_learn(lesson_id))
 or (purpose='certificate' and public.hka_teach(student_id))
 or (purpose='horse' and student_id=auth.uid() and exists(select 1 from public.hka_horses h where h.id=horse_id and h.student_id=auth.uid()))));
revoke all on function public.hka_file_read(text),public.hka_file_write(text) from public,anon;
grant execute on function public.hka_file_read(text),public.hka_file_write(text) to authenticated;

alter table public.hka_ai_drafts drop constraint if exists hka_ai_drafts_category_check;
alter table public.hka_ai_drafts add constraint hka_ai_drafts_category_check
  check (category in ('riding_lesson','development','horse_care','assessment','memorandum','pony_club','competition','stable'));

create index if not exists hka_horse_records_owner on public.hka_horse_records(student_id,horse_id,recorded_on desc);
create index if not exists hka_coaching_requests_status on public.hka_coaching_requests(status,preferred_starts_at);
create index if not exists hka_owner_availability_time on public.hka_owner_availability(coach_id,starts_at,ends_at);
create index if not exists hka_announcements_published on public.hka_announcements(published,created_at desc);
notify pgrst, 'reload schema';
commit;
