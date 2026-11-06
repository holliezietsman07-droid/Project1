-- Stage 3: persistent academy records. No public access to member data.
begin;
create table public.hka_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null check (char_length(full_name) between 1 and 100),
 birth_date date not null check (birth_date <= current_date and birth_date > date '1900-01-01'),
 timezone text not null default 'UTC' check (char_length(timezone) between 1 and 100),
 role text not null default 'student' check (role in ('student','guardian','coach','admin')),
 suspended boolean not null default false,
 avatar_path text,
 created_at timestamptz not null default now(),
 check (avatar_path is null or avatar_path like id::text || '/%')
);
create table public.hka_guardians (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.hka_profiles on delete cascade,
 guardian_id uuid not null references public.hka_profiles on delete cascade,
 child_label text not null check (char_length(child_label) between 1 and 100),
 status text not null default 'pending' check (status in ('pending','approved','revoked')),
 verified_by uuid not null references public.hka_profiles,
 consent_at timestamptz,
 created_at timestamptz not null default now(),
 unique (student_id,guardian_id), check (student_id <> guardian_id)
);
create table public.hka_coach_students (
 id uuid primary key default gen_random_uuid(),
 coach_id uuid not null references public.hka_profiles on delete cascade,
 student_id uuid not null references public.hka_profiles on delete cascade,
 unique (coach_id,student_id), check (coach_id <> student_id)
);
create table public.hka_pathways (
 id text primary key, title text not null check(char_length(title) between 1 and 150),
 description text not null default '', active boolean not null default true
);
create table public.hka_courses (
 id uuid primary key default gen_random_uuid(),
 pathway_id text not null references public.hka_pathways,
 coach_id uuid not null references public.hka_profiles,
 title text not null check(char_length(title) between 1 and 150),
 description text not null default '' check(char_length(description) <= 10000),
 published boolean not null default false, created_at timestamptz not null default now()
);
create table public.hka_enrolments (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.hka_profiles on delete cascade,
 course_id uuid not null references public.hka_courses on delete cascade,
 status text not null default 'active' check(status in ('active','completed','withdrawn')),
 created_at timestamptz not null default now(), unique(student_id,course_id)
);
create table public.hka_enrolment_requests (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.hka_profiles on delete cascade,
 course_id uuid not null references public.hka_courses on delete cascade,
 created_at timestamptz not null default now(), unique(student_id,course_id)
);
create table public.hka_lessons (
 id uuid primary key default gen_random_uuid(),
 course_id uuid not null references public.hka_courses on delete cascade,
 title text not null check(char_length(title) between 1 and 150),
 content text not null default '' check(char_length(content) <= 100000),
 kind text not null default 'lesson' check(kind in ('lesson','assignment','quiz')),
 position integer not null default 1 check(position > 0),
 published boolean not null default false, created_at timestamptz not null default now()
);
create table public.hka_progress (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.hka_profiles on delete cascade,
 lesson_id uuid not null references public.hka_lessons on delete cascade,
 completed_at timestamptz not null default now(), unique(student_id,lesson_id)
);
create table public.hka_files (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.hka_profiles on delete cascade,
 path text not null unique, original_name text not null check(char_length(original_name) between 1 and 180),
 purpose text not null check(purpose in ('avatar','material','submission','certificate')),
 mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp','application/pdf','video/mp4','video/webm')),
 size_bytes bigint not null check(size_bytes > 0 and size_bytes <= 52428800),
 lesson_id uuid references public.hka_lessons on delete cascade,
 student_id uuid references public.hka_profiles on delete cascade,
 created_at timestamptz not null default now(),
 check(path ~ ('^' || owner_id::text || '/' || id::text || '\.(jpg|png|webp|pdf|mp4|webm)$')),
 check(purpose <> 'avatar' or (mime_type in ('image/jpeg','image/png','image/webp') and size_bytes <= 5242880)),
 check((purpose='avatar' and lesson_id is null and student_id=owner_id)
    or (purpose='material' and lesson_id is not null and student_id is null)
    or (purpose='submission' and lesson_id is not null and student_id=owner_id)
    or (purpose='certificate' and lesson_id is null and student_id is not null))
);
create table public.hka_submissions (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.hka_profiles on delete cascade,
 lesson_id uuid not null references public.hka_lessons on delete cascade,
 response text not null default '' check(char_length(response) <= 30000),
 file_id uuid references public.hka_files on delete set null,
 submitted_at timestamptz not null default now(),
 check(char_length(trim(response)) > 0 or file_id is not null)
);
create table public.hka_assessments (
 id uuid primary key default gen_random_uuid(),
 submission_id uuid not null unique references public.hka_submissions on delete cascade,
 coach_id uuid not null references public.hka_profiles,
 grade integer not null check(grade between 0 and 100),
 feedback text not null check(char_length(feedback) between 1 and 10000),
 assessed_at timestamptz not null default now()
);
create table public.hka_appointments (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.hka_profiles on delete cascade,
 coach_id uuid not null references public.hka_profiles,
 title text not null check(char_length(title) between 1 and 150),
 starts_at timestamptz not null, duration_minutes integer not null default 30 check(duration_minutes between 10 and 240),
 location text not null default '' check(char_length(location) <= 500),
 status text not null default 'scheduled' check(status in ('scheduled','completed','cancelled'))
);
create table public.hka_training_plans (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.hka_profiles on delete cascade,
 coach_id uuid not null references public.hka_profiles,
 title text not null check(char_length(title) between 1 and 150),
 content text not null check(char_length(content) between 1 and 30000),
 created_at timestamptz not null default now()
);
create table public.hka_horses (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.hka_profiles on delete cascade,
 name text not null check(char_length(name) between 1 and 100),
 details text not null default '' check(char_length(details) <= 5000),
 created_at timestamptz not null default now(), unique(id,student_id)
);
create table public.hka_training_records (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.hka_profiles on delete cascade,
 horse_id uuid not null,
 recorded_on date not null default current_date,
 notes text not null check(char_length(notes) between 1 and 10000),
 foreign key(horse_id,student_id) references public.hka_horses(id,student_id) on delete cascade
);
create table public.hka_achievements (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.hka_profiles on delete cascade,
 coach_id uuid not null references public.hka_profiles,
 title text not null check(char_length(title) between 1 and 150),
 kind text not null check(kind in ('achievement','badge','certificate')),
 description text not null default '' check(char_length(description) <= 10000),
 issued_at timestamptz not null default now()
);
create table public.hka_notifications (
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references public.hka_profiles on delete cascade,
 student_id uuid not null references public.hka_profiles on delete cascade,
 message text not null, read_at timestamptz, created_at timestamptz not null default now()
);
create table public.hka_membership_plans (
 id uuid primary key default gen_random_uuid(),
 name text not null unique check(char_length(name) between 1 and 100),
 monthly_usd numeric(10,2) not null check(monthly_usd >= 0),
 description text not null default '', active boolean not null default true
);
create table public.hka_coaching_services (
 id uuid primary key default gen_random_uuid(),
 title text not null check(char_length(title) between 1 and 150),
 description text not null default '',
 duration_minutes integer not null default 30 check(duration_minutes between 10 and 240),
 price_usd numeric(10,2) not null default 0 check(price_usd >= 0), active boolean not null default true
);
create table public.hka_settings (
 id text primary key check(char_length(id) between 1 and 100),
 value text not null check(char_length(value) <= 10000)
);
-- Payment records are server-owned; no browser role can invent transactions.
create table public.hka_transactions (
 id uuid primary key default gen_random_uuid(),
 student_id uuid references public.hka_profiles on delete set null,
 stripe_payment_id text not null unique, amount_cents integer not null check(amount_cents > 0),
 currency text not null default 'usd', status text not null,
 created_at timestamptz not null default now()
);
create table public.hka_audit (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid references public.hka_profiles on delete set null,
 target_id uuid references public.hka_profiles on delete set null,
 action text not null, created_at timestamptz not null default now()
);

create function public.hka_role() returns text language sql stable security definer set search_path='' as $$
 select p.role from public.hka_profiles p join auth.users u on u.id=p.id
 where p.id=auth.uid() and not p.suspended and u.email_confirmed_at is not null
$$;
create function public.hka_admin() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(public.hka_role()='admin',false)
$$;
create function public.hka_active(person uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.hka_profiles p join auth.users u on u.id=p.id where p.id=person
 and not p.suspended and u.email_confirmed_at is not null
 and (p.role <> 'student' or p.birth_date <= (current_date-interval '18 years')::date
 or exists(select 1 from public.hka_guardians g join public.hka_profiles gp on gp.id=g.guardian_id
 join auth.users gu on gu.id=gp.id
 where g.student_id=p.id and g.status='approved' and g.consent_at is not null
 and gp.role='guardian' and not gp.suspended and gu.email_confirmed_at is not null)))
$$;
create function public.hka_coaches(person uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.hka_role()='coach' and exists(select 1 from public.hka_coach_students where coach_id=auth.uid() and student_id=person)
$$;
create function public.hka_view_student(person uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.hka_admin() or (public.hka_active() and public.hka_active(person) and (
 auth.uid()=person or public.hka_coaches(person) or
 (public.hka_role()='guardian' and exists(select 1 from public.hka_guardians
 where guardian_id=auth.uid() and student_id=person and status='approved' and consent_at is not null))))
$$;
create function public.hka_teach(person uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.hka_admin() or (public.hka_active() and public.hka_active(person) and public.hka_coaches(person))
$$;
create function public.hka_manage_course(course uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.hka_admin() or (public.hka_role()='coach' and exists(select 1 from public.hka_courses where id=course and coach_id=auth.uid()))
$$;
create function public.hka_read_lesson(lesson uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.hka_lessons l join public.hka_courses c on c.id=l.course_id where l.id=lesson
 and (public.hka_manage_course(c.id) or (l.published and c.published and public.hka_active() and exists(
 select 1 from public.hka_enrolments e where e.course_id=c.id and e.status in ('active','completed') and public.hka_view_student(e.student_id)))))
$$;
create function public.hka_learn(lesson uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.hka_role()='student' and public.hka_active() and exists(
 select 1 from public.hka_lessons l join public.hka_courses c on c.id=l.course_id
 join public.hka_enrolments e on e.course_id=c.id
 where l.id=lesson and l.published and c.published and e.student_id=auth.uid() and e.status='active')
$$;
create function public.hka_manage_lesson(lesson uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.hka_lessons where id=lesson and public.hka_manage_course(course_id))
$$;
create function public.hka_file_read(file_path text) returns boolean language sql stable security definer set search_path='' as $$
 select public.hka_active() and exists(select 1 from public.hka_files f where f.path=file_path and (
 public.hka_admin() or f.owner_id=auth.uid()
 or (f.purpose='material' and public.hka_read_lesson(f.lesson_id))
 or (f.purpose in ('avatar','submission','certificate') and public.hka_view_student(f.student_id))))
$$;
create function public.hka_file_write(file_path text) returns boolean language sql stable security definer set search_path='' as $$
 select public.hka_active() and exists(select 1 from public.hka_files f where f.path=file_path and f.owner_id=auth.uid() and (
 (f.purpose='avatar' and f.student_id=auth.uid())
 or (f.purpose='material' and public.hka_manage_lesson(f.lesson_id))
 or (f.purpose='submission' and f.student_id=auth.uid() and public.hka_learn(f.lesson_id))
 or (f.purpose='certificate' and public.hka_teach(f.student_id))))
$$;
create function public.hka_signup_profile() returns trigger language plpgsql security definer set search_path='' as $$
declare dob date; requested text; display_name text;
begin
 dob := nullif(new.raw_user_meta_data->>'birth_date','')::date;
 display_name := trim(coalesce(new.raw_user_meta_data->>'full_name',''));
 requested := coalesce(new.raw_user_meta_data->>'account_type','student');
 if dob is null or dob > current_date or dob <= date '1900-01-01' or char_length(display_name) not between 1 and 100 then
 raise exception 'A valid name and date of birth are required.'; end if;
 if requested not in ('student','guardian') then requested:='student'; end if;
 if requested='guardian' and dob > (current_date-interval '18 years')::date then raise exception 'Guardians must be adults.'; end if;
 insert into public.hka_profiles(id,full_name,birth_date,timezone,role)
 values(new.id,display_name,dob,coalesce(nullif(new.raw_user_meta_data->>'timezone',''),'UTC'),requested);
 return new;
end $$;
create trigger hka_auth_profile after insert on auth.users for each row execute function public.hka_signup_profile();

create function public.hka_set_role(person uuid, new_role text, is_suspended boolean default false) returns void
 language plpgsql security definer set search_path='' as $$
begin
 if not public.hka_admin() then raise exception 'Administrator access required.'; end if;
 if person=auth.uid() then raise exception 'Ask another administrator to change your access.'; end if;
 if new_role not in ('student','guardian','coach','admin') then raise exception 'Invalid role.'; end if;
 if new_role <> 'student' and exists(select 1 from public.hka_profiles where id=person and birth_date > (current_date-interval '18 years')::date)
 then raise exception 'Underage accounts must remain students.'; end if;
 update public.hka_profiles set role=new_role,suspended=is_suspended where id=person;
 if not found then raise exception 'Member not found.'; end if;
 insert into public.hka_audit(actor_id,target_id,action) values(auth.uid(),person,'Role: '||new_role||'; suspended: '||is_suspended::text);
end $$;
create function public.hka_guardian_consent(link uuid, approve boolean) returns void
 language plpgsql security definer set search_path='' as $$
begin
 if public.hka_role() <> 'guardian' or public.hka_role() is null then raise exception 'Guardian access required.'; end if;
 update public.hka_guardians set status=case when approve then 'approved' else 'revoked' end,
 consent_at=case when approve then now() else null end
 where id=link and guardian_id=auth.uid() and (not approve or status='pending');
 if not found then raise exception 'Guardian invitation not found.'; end if;
 insert into public.hka_audit(actor_id,action) values(auth.uid(),'Guardian consent '||approve::text||' for link '||link::text);
end $$;
create function public.hka_enrol(student uuid, course uuid) returns void
 language plpgsql security definer set search_path='' as $$
declare coach uuid;
begin
 if not public.hka_admin() then raise exception 'Administrator access required.'; end if;
 if not public.hka_active(student) or not exists(select 1 from public.hka_profiles where id=student and role='student')
 then raise exception 'Student must be verified and have guardian consent when underage.'; end if;
 select coach_id into coach from public.hka_courses where id=course;
 if coach is null then raise exception 'Course not found.'; end if;
 insert into public.hka_enrolments(student_id,course_id) values(student,course)
 on conflict(student_id,course_id) do update set status='active';
 if coach<>student then insert into public.hka_coach_students(coach_id,student_id) values(coach,student) on conflict do nothing; end if;
 delete from public.hka_enrolment_requests where student_id=student and course_id=course;
 insert into public.hka_audit(actor_id,target_id,action) values(auth.uid(),student,'Enrolled in '||course::text);
end $$;
create function public.hka_notify_progress() returns trigger language plpgsql security definer set search_path='' as $$
declare person uuid; notice text;
begin
 if tg_table_name='hka_assessments' then
 select student_id into person from public.hka_submissions where id=new.submission_id;
 notice:='New assessment feedback is available.';
 elsif tg_table_name='hka_appointments' then person:=new.student_id; notice:='Coaching appointment: '||new.title||' ('||new.status||').';
 else person:=new.student_id; notice:='New '||new.kind||': '||new.title; end if;
 insert into public.hka_notifications(recipient_id,student_id,message) values(person,person,notice);
 insert into public.hka_notifications(recipient_id,student_id,message)
 select guardian_id,person,notice from public.hka_guardians where student_id=person and status='approved';
 return new;
end $$;
create trigger hka_assessment_notice after insert or update on public.hka_assessments for each row execute function public.hka_notify_progress();
create trigger hka_appointment_notice after insert or update on public.hka_appointments for each row execute function public.hka_notify_progress();
create trigger hka_achievement_notice after insert on public.hka_achievements for each row execute function public.hka_notify_progress();

-- Restrict grants before installing explicit policies.
do $$
declare t text; f record;
begin
 for t in select tablename from pg_tables where schemaname='public' and tablename like 'hka_%' loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 end loop;
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on p.pronamespace=n.oid where n.nspname='public' and p.proname like 'hka_%' loop
 execute format('revoke all on function %s from public, anon',f.signature);
 execute format('grant execute on function %s to authenticated',f.signature);
 end loop;
end $$;
revoke execute on function public.hka_signup_profile(),public.hka_notify_progress() from authenticated;
grant update(full_name,timezone,avatar_path) on public.hka_profiles to authenticated;
grant update(read_at) on public.hka_notifications to authenticated;
grant insert,update,delete on public.hka_pathways,public.hka_courses,public.hka_lessons,public.hka_coach_students,
 public.hka_appointments,public.hka_training_plans,public.hka_horses,public.hka_training_records,public.hka_achievements,
 public.hka_membership_plans,public.hka_coaching_services,public.hka_settings,public.hka_assessments to authenticated;
grant insert,delete on public.hka_files,public.hka_guardians,public.hka_enrolment_requests to authenticated;
grant insert,delete on public.hka_progress to authenticated;
grant insert on public.hka_submissions to authenticated;
grant update(status),delete on public.hka_enrolments to authenticated;

create policy profiles_read on public.hka_profiles for select to authenticated using(id=auth.uid() or public.hka_view_student(id));
create policy profiles_update on public.hka_profiles for update to authenticated using(id=auth.uid() and public.hka_role() is not null)
 with check(id=auth.uid() and (avatar_path is null or exists(select 1 from public.hka_files f where f.path=avatar_path and f.owner_id=auth.uid() and f.purpose='avatar')));

create policy guardians_read on public.hka_guardians for select to authenticated using(public.hka_admin() or guardian_id=auth.uid() or student_id=auth.uid());
create policy guardians_insert on public.hka_guardians for insert to authenticated with check(public.hka_admin() and verified_by=auth.uid() and status='pending' and consent_at is null
 and exists(select 1 from public.hka_profiles where id=student_id and role='student')
 and exists(select 1 from public.hka_profiles where id=guardian_id and role='guardian' and birth_date <= (current_date-interval '18 years')::date));
create policy guardians_delete on public.hka_guardians for delete to authenticated using(public.hka_admin());

create policy assignments_read on public.hka_coach_students for select to authenticated using(public.hka_admin() or coach_id=auth.uid() or public.hka_view_student(student_id));
create policy assignments_write on public.hka_coach_students for all to authenticated using(public.hka_admin())
 with check(public.hka_admin() and exists(select 1 from public.hka_profiles where id=coach_id and role in ('coach','admin')) and exists(select 1 from public.hka_profiles where id=student_id and role='student'));

create policy pathways_read on public.hka_pathways for select to authenticated using(public.hka_role() is not null);
create policy pathways_admin on public.hka_pathways for all to authenticated using(public.hka_admin()) with check(public.hka_admin());
create policy courses_read on public.hka_courses for select to authenticated using(public.hka_manage_course(id) or (published and public.hka_active()));
create policy courses_insert on public.hka_courses for insert to authenticated with check(public.hka_admin() or (public.hka_role()='coach' and coach_id=auth.uid()));
create policy courses_update on public.hka_courses for update to authenticated using(public.hka_manage_course(id)) with check(public.hka_admin() or (public.hka_role()='coach' and coach_id=auth.uid()));
create policy courses_delete on public.hka_courses for delete to authenticated using(public.hka_manage_course(id));
create policy enrolments_read on public.hka_enrolments for select to authenticated using(public.hka_view_student(student_id));
create policy enrolments_update on public.hka_enrolments for update to authenticated using(public.hka_admin()) with check(public.hka_admin());
create policy enrolments_delete on public.hka_enrolments for delete to authenticated using(public.hka_admin());
create policy requests_read on public.hka_enrolment_requests for select to authenticated using(public.hka_admin() or student_id=auth.uid());
create policy requests_insert on public.hka_enrolment_requests for insert to authenticated with check(student_id=auth.uid() and public.hka_role()='student' and public.hka_active()
 and exists(select 1 from public.hka_courses where id=course_id and published));
create policy requests_delete on public.hka_enrolment_requests for delete to authenticated using(public.hka_admin() or student_id=auth.uid());
create policy lessons_read on public.hka_lessons for select to authenticated using(public.hka_read_lesson(id));
create policy lessons_write on public.hka_lessons for all to authenticated using(public.hka_manage_course(course_id)) with check(public.hka_manage_course(course_id));
create policy progress_read on public.hka_progress for select to authenticated using(public.hka_view_student(student_id));
create policy progress_insert on public.hka_progress for insert to authenticated with check(student_id=auth.uid() and public.hka_learn(lesson_id));
create policy progress_delete on public.hka_progress for delete to authenticated using(student_id=auth.uid() and public.hka_learn(lesson_id));
create policy files_read on public.hka_files for select to authenticated using(public.hka_file_read(path));
create policy files_insert on public.hka_files for insert to authenticated with check(owner_id=auth.uid() and public.hka_active() and (
 (purpose='avatar' and student_id=auth.uid())
 or (purpose='material' and public.hka_manage_lesson(lesson_id))
 or (purpose='submission' and student_id=auth.uid() and public.hka_learn(lesson_id))
 or (purpose='certificate' and public.hka_teach(student_id))));
create policy files_delete on public.hka_files for delete to authenticated using(public.hka_admin() or (owner_id=auth.uid() and public.hka_active()));
create policy submissions_read on public.hka_submissions for select to authenticated using(public.hka_view_student(student_id));
create policy submissions_insert on public.hka_submissions for insert to authenticated with check(student_id=auth.uid() and public.hka_learn(lesson_id)
 and exists(select 1 from public.hka_lessons where id=lesson_id and kind in ('assignment','quiz'))
 and (file_id is null or exists(select 1 from public.hka_files f where f.id=file_id and f.owner_id=auth.uid() and f.lesson_id=hka_submissions.lesson_id and f.purpose='submission')));
create policy assessments_read on public.hka_assessments for select to authenticated using(exists(select 1 from public.hka_submissions s where s.id=submission_id and public.hka_view_student(s.student_id)));
create policy assessments_write on public.hka_assessments for all to authenticated using(public.hka_admin() or (coach_id=auth.uid() and exists(select 1 from public.hka_submissions s where s.id=submission_id and public.hka_teach(s.student_id))))
 with check((coach_id=auth.uid() or public.hka_admin()) and exists(select 1 from public.hka_submissions s where s.id=submission_id and public.hka_teach(s.student_id)));
create policy appointments_read on public.hka_appointments for select to authenticated using(public.hka_view_student(student_id));
create policy appointments_write on public.hka_appointments for all to authenticated using(public.hka_admin() or (coach_id=auth.uid() and public.hka_teach(student_id)))
 with check((public.hka_admin() or coach_id=auth.uid()) and public.hka_teach(student_id));
create policy plans_read on public.hka_training_plans for select to authenticated using(public.hka_view_student(student_id));
create policy plans_write on public.hka_training_plans for all to authenticated using(public.hka_admin() or (coach_id=auth.uid() and public.hka_teach(student_id)))
 with check((public.hka_admin() or coach_id=auth.uid()) and public.hka_teach(student_id));
create policy horses_read on public.hka_horses for select to authenticated using(public.hka_view_student(student_id));
create policy horses_write on public.hka_horses for all to authenticated using(student_id=auth.uid() and public.hka_active())
 with check(student_id=auth.uid() and public.hka_role()='student' and public.hka_active());
create policy records_read on public.hka_training_records for select to authenticated using(public.hka_view_student(student_id));
create policy records_write on public.hka_training_records for all to authenticated using(student_id=auth.uid() and public.hka_active())
 with check(student_id=auth.uid() and public.hka_active());
create policy achievements_read on public.hka_achievements for select to authenticated using(public.hka_view_student(student_id));
create policy achievements_write on public.hka_achievements for all to authenticated using(public.hka_admin() or (coach_id=auth.uid() and public.hka_teach(student_id)))
 with check((public.hka_admin() or coach_id=auth.uid()) and public.hka_teach(student_id));
create policy notices_read on public.hka_notifications for select to authenticated using(recipient_id=auth.uid() and public.hka_view_student(student_id));
create policy notices_update on public.hka_notifications for update to authenticated using(recipient_id=auth.uid() and public.hka_view_student(student_id)) with check(recipient_id=auth.uid());
create policy memberships_read on public.hka_membership_plans for select to authenticated using(public.hka_active());
create policy memberships_write on public.hka_membership_plans for all to authenticated using(public.hka_admin()) with check(public.hka_admin());
create policy services_read on public.hka_coaching_services for select to authenticated using(public.hka_active());
create policy services_write on public.hka_coaching_services for all to authenticated using(public.hka_admin()) with check(public.hka_admin());
create policy settings_admin on public.hka_settings for all to authenticated using(public.hka_admin()) with check(public.hka_admin());
create policy transactions_admin on public.hka_transactions for select to authenticated using(public.hka_admin());
create policy audit_admin on public.hka_audit for select to authenticated using(public.hka_admin());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('hka-private','hka-private',false,52428800,array['image/jpeg','image/png','image/webp','application/pdf','video/mp4','video/webm']);
create policy hka_storage_read on storage.objects for select to authenticated using(bucket_id='hka-private' and public.hka_file_read(name));
create policy hka_storage_insert on storage.objects for insert to authenticated with check(bucket_id='hka-private' and public.hka_file_write(name));
create policy hka_storage_delete on storage.objects for delete to authenticated using(bucket_id='hka-private' and (public.hka_admin() or public.hka_file_write(name)));
-- No UPDATE policy: objects cannot be overwritten or moved to a less restrictive scope.

create index on public.hka_guardians(guardian_id,status);
create index on public.hka_coach_students(student_id);
create index on public.hka_courses(coach_id);
create index on public.hka_lessons(course_id);
create index on public.hka_enrolments(course_id,student_id);
create index on public.hka_submissions(student_id,lesson_id);
create index on public.hka_files(lesson_id);
create index on public.hka_files(student_id);
create index on public.hka_notifications(recipient_id,created_at);
create index on public.hka_appointments(student_id,starts_at);

insert into public.hka_pathways(id,title,description) values
 ('riding','Riding & Rider Development','Explore confidence, understanding and the partnership between horse and rider.'),
 ('horse-care','Horse Care & Ownership','Make thoughtful care and horse welfare part of your everyday understanding.'),
 ('knowledge','Equestrian Knowledge','Make room for curiosity and a deeper understanding of the equestrian world.'),
 ('young-riders','Young Riders & Pony Learning','A welcoming pathway for younger learners discovering horses and ponies.'),
 ('competition','Competition Preparation','Approach your next event with thoughtful preparation and horse welfare in mind.');
insert into public.hka_membership_plans(name,monthly_usd,description) values
 ('Free',0,'Introductory learning and private account records.'),
 ('HKA Basic',20,'Planned self-paced learning membership. Billing is not enabled.'),
 ('HKA Premium',100,'Planned personal coaching support. Billing is not enabled.');
insert into public.hka_settings(id,value) values
 ('academy_name','HKA Equestrian Online Academy'),
 ('support_email','hka.equestrian@gmail.com');
notify pgrst, 'reload schema';
commit;
