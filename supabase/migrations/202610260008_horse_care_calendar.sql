-- Prepared only: complete horse-care calendar fields and reminder lifecycle safety.
-- Do not deploy without explicit owner approval. This migration schedules no jobs and sends no email.
begin;

alter table public.hka_care_appointments
  add column if not exists appointment_time time without time zone;

-- Replace only the named care-type and reminder-count CHECK constraints.
-- The reminder value-range, status/completion, interval and title constraints remain untouched.
alter table public.hka_care_appointments
  drop constraint if exists hka_care_appointments_care_type_check,
  drop constraint if exists hka_care_appointments_reminder_days_check,
  drop constraint if exists hka_care_appointments_reminder_count_check;

alter table public.hka_care_appointments
  add constraint hka_care_appointments_care_type_check check (care_type in (
    'vaccination','deworming','farrier','dental','veterinarian','physiotherapy',
    'health_check','grooming_general','custom'
  )),
  add constraint hka_care_appointments_reminder_count_check check (cardinality(reminder_days) between 0 and 10);

alter table public.hka_profiles alter column timezone set default 'Africa/Lusaka';

create or replace function public.hka_signup_profile()
returns trigger language plpgsql security definer set search_path='' as '
declare dob date; requested text; display_name text;
begin
 dob := nullif(new.raw_user_meta_data->>''birth_date'','''')::date;
 display_name := trim(coalesce(new.raw_user_meta_data->>''full_name'',''''));
 requested := coalesce(new.raw_user_meta_data->>''account_type'',''student'');
 if dob is null or dob > current_date or dob <= date ''1900-01-01'' or char_length(display_name) not between 1 and 100 then
 raise exception ''A valid name and date of birth are required.''; end if;
 if requested not in (''student'',''guardian'') then requested:=''student''; end if;
 if requested=''guardian'' and dob > (current_date-interval ''18 years'')::date then raise exception ''Guardians must be adults.''; end if;
 insert into public.hka_profiles(id,full_name,birth_date,timezone,role)
 values(new.id,display_name,dob,coalesce(nullif(new.raw_user_meta_data->>''timezone'',''''),''Africa/Lusaka''),requested);
 return new;
end';

create or replace function public.hka_complete_care_appointment(target_appointment uuid,completed_date date)
returns void language plpgsql security definer set search_path='' as '
declare item public.hka_care_appointments; student_timezone text;
begin
 if target_appointment is null then raise exception ''Appointment is required.''; end if;
 select * into item from public.hka_care_appointments where id=target_appointment for update;
 if not found then raise exception ''Appointment not found.''; end if;
 if auth.uid() is null or item.student_id is distinct from auth.uid() or not public.hka_active() then
   raise exception ''Appointment owner access required.'';
 end if;
 if item.status<>''scheduled'' then raise exception ''Only scheduled appointments can be completed.''; end if;
 select timezone into student_timezone from public.hka_profiles where id=item.student_id;
 if completed_date is null
    or completed_date<=date ''1900-01-01''
    or completed_date>(now() at time zone coalesce(nullif(student_timezone,''''),''Africa/Lusaka''))::date then
   raise exception ''A valid completion date is required.'';
 end if;
 update public.hka_care_appointments set status=''completed'',completed_at=completed_date,updated_at=now() where id=target_appointment;
 update public.hka_care_reminders set status=''dismissed'',read_at=now() where appointment_id=target_appointment and status=''unread'';
 if item.repeat_interval_days is not null then
   insert into public.hka_care_appointments(student_id,horse_id,care_type,title,last_appointment_date,next_due_date,appointment_time,provider_name,notes,repeat_interval_days,reminder_days,email_enabled)
   values(item.student_id,item.horse_id,item.care_type,item.title,completed_date,completed_date+item.repeat_interval_days,item.appointment_time,item.provider_name,item.notes,item.repeat_interval_days,item.reminder_days,item.email_enabled);
 end if;
end';

create or replace function public.hka_reset_care_reminders()
returns trigger language plpgsql security definer set search_path='' as '
begin
 if old.next_due_date is distinct from new.next_due_date
    or old.reminder_days is distinct from new.reminder_days
    or old.status is distinct from new.status then
   delete from public.hka_care_reminders where appointment_id=new.id;
 end if;
 return new;
end';
revoke all on function public.hka_reset_care_reminders() from public,anon,authenticated;

drop trigger if exists hka_reset_care_reminders_after_change on public.hka_care_appointments;
create trigger hka_reset_care_reminders_after_change
after update of next_due_date,reminder_days,status on public.hka_care_appointments
for each row execute function public.hka_reset_care_reminders();

create or replace function public.hka_generate_care_reminders(run_date date default null)
returns integer language plpgsql security definer set search_path='' as '
declare created integer:=0; added integer:=0;
begin
 delete from public.hka_care_reminders r using public.hka_care_appointments a
 where r.appointment_id=a.id and a.status<>''scheduled'';
 insert into public.hka_care_reminders(student_id,horse_id,appointment_id,reminder_days,due_date,title,is_overdue,email_requested)
 select a.student_id,a.horse_id,a.id,d,a.next_due_date,a.title,a.next_due_date<coalesce(run_date,(now() at time zone p.timezone)::date),
        a.email_enabled and coalesce((p.notification_preferences->>''horse_care_email'')::boolean,false)
 from public.hka_care_appointments a join public.hka_profiles p on p.id=a.student_id cross join lateral unnest(a.reminder_days) d
 where a.status=''scheduled'' and public.hka_active(a.student_id) and a.next_due_date-d<=coalesce(run_date,(now() at time zone p.timezone)::date)
 on conflict(appointment_id,reminder_days,due_date) where appointment_id is not null do update
 set title=excluded.title,is_overdue=excluded.is_overdue,email_requested=excluded.email_requested;
 get diagnostics created=row_count;
 insert into public.hka_care_reminders(student_id,horse_id,document_id,reminder_days,due_date,title,is_overdue,email_requested)
 select d.student_id,d.horse_id,d.id,r,d.expiry_date,d.display_name||'' renewal'',d.expiry_date<coalesce(run_date,(now() at time zone p.timezone)::date),false
 from public.hka_horse_documents d join public.hka_profiles p on p.id=d.student_id cross join unnest(array[30,14,7]) r
 where d.expiry_date is not null and d.expiry_date-r<=coalesce(run_date,(now() at time zone p.timezone)::date)
 on conflict(document_id,reminder_days,due_date) where document_id is not null do update set title=excluded.title,is_overdue=excluded.is_overdue;
 get diagnostics added=row_count; created:=created+added; return created;
end';
revoke all on function public.hka_generate_care_reminders(date) from public,anon,authenticated;

commit;
