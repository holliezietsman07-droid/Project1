-- Stage 4: LMS, assessments, review allowances and AI Studio drafts.
begin;

alter table public.hka_courses
  add column if not exists level text not null default 'All levels' check (level in ('Beginner','Intermediate','Advanced','All levels')),
  add column if not exists duration_minutes integer not null default 0 check (duration_minutes >= 0),
  add column if not exists eligibility text not null default 'Active academy account' check (char_length(eligibility) <= 1000),
  add column if not exists access_level text not null default 'free' check (access_level in ('free','basic','premium')),
  add column if not exists learning_objectives text[] not null default '{}',
  add column if not exists archived_at timestamptz,
  add column if not exists duplicated_from uuid references public.hka_courses(id) on delete set null;

alter table public.hka_lessons
  add column if not exists description text not null default '' check (char_length(description) <= 5000),
  add column if not exists duration_minutes integer not null default 0 check (duration_minutes >= 0),
  add column if not exists learning_objectives text[] not null default '{}',
  add column if not exists free_preview boolean not null default false;

alter table public.hka_progress
  add column if not exists started_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists last_position_seconds integer not null default 0 check (last_position_seconds >= 0),
  alter column completed_at drop not null,
  alter column completed_at drop default;

create table if not exists public.hka_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.hka_courses on delete cascade,
  title text not null check (char_length(title) between 1 and 150),
  description text not null default '' check (char_length(description) <= 5000),
  position integer not null default 1 check (position > 0),
  published boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.hka_lessons add column if not exists module_id uuid references public.hka_modules on delete set null;

create table if not exists public.hka_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.hka_lessons on delete cascade,
  question_type text not null check (question_type in ('multiple_choice','true_false','short_answer','long_answer','image_identification','practical','riding_video')),
  prompt text not null check (char_length(prompt) between 1 and 10000),
  image_file_id uuid references public.hka_files on delete set null,
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options)='array'),
  marking_criteria text not null default '' check (char_length(marking_criteria) <= 10000),
  points integer not null default 1 check (points between 1 and 1000),
  position integer not null default 1 check (position > 0),
  requires_coach boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.hka_answer_keys (
  question_id uuid primary key references public.hka_questions on delete cascade,
  answer jsonb not null,
  explanation text not null default '' check (char_length(explanation) <= 10000)
);
create table if not exists public.hka_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.hka_profiles on delete cascade,
  lesson_id uuid not null references public.hka_lessons on delete cascade,
  status text not null default 'draft' check (status in ('draft','submitted','auto_graded','coach_reviewed','resubmission_requested')),
  score integer,
  max_score integer,
  automated_feedback jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  check ((score is null and max_score is null) or (score >= 0 and max_score >= score))
);
create table if not exists public.hka_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.hka_attempts on delete cascade,
  question_id uuid not null references public.hka_questions on delete cascade,
  response jsonb not null default 'null'::jsonb,
  awarded_points integer,
  updated_at timestamptz not null default now(),
  unique(attempt_id,question_id)
);

alter table public.hka_submissions
  add column if not exists status text not null default 'submitted' check (status in ('draft','submitted','under_review','approved','resubmission_requested')),
  add column if not exists review_kind text not null default 'practice' check (review_kind in ('practice','personal')),
  add column if not exists preliminary_feedback text,
  add column if not exists updated_at timestamptz not null default now();
alter table public.hka_assessments
  add column if not exists decision text not null default 'feedback' check (decision in ('feedback','approved','resubmission_requested')),
  add column if not exists automated boolean not null default false;

create table if not exists public.hka_review_allowances (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.hka_profiles on delete cascade,
  period_start date not null,
  period_end date not null,
  included_reviews integer not null default 2 check (included_reviews >= 0),
  used_reviews integer not null default 0 check (used_reviews between 0 and included_reviews),
  source text not null default 'future_membership',
  created_at timestamptz not null default now(),
  unique(student_id,period_start),
  check(period_end > period_start)
);
create table if not exists public.hka_ai_drafts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.hka_profiles on delete cascade,
  category text not null check (category in ('riding_lesson','horse_care','assessment','competition')),
  title text not null check (char_length(title) between 1 and 150),
  prompt_data jsonb not null default '{}'::jsonb,
  content text not null default '' check (char_length(content) <= 100000),
  status text not null default 'draft' check (status in ('draft','approved','assigned')),
  student_id uuid references public.hka_profiles on delete set null,
  course_id uuid references public.hka_courses on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hka_modules enable row level security;
alter table public.hka_questions enable row level security;
alter table public.hka_answer_keys enable row level security;
alter table public.hka_attempts enable row level security;
alter table public.hka_responses enable row level security;
alter table public.hka_review_allowances enable row level security;
alter table public.hka_ai_drafts enable row level security;

revoke all on public.hka_modules,public.hka_questions,public.hka_answer_keys,public.hka_attempts,public.hka_responses,public.hka_review_allowances,public.hka_ai_drafts from anon,authenticated;
grant select,insert,update,delete on public.hka_modules,public.hka_questions,public.hka_answer_keys,public.hka_ai_drafts to authenticated;
grant select,insert,update on public.hka_attempts,public.hka_responses to authenticated;
grant select on public.hka_review_allowances to authenticated;
grant update on public.hka_progress to authenticated;
grant update(status,response,file_id,review_kind,updated_at) on public.hka_submissions to authenticated;
grant update(status,score,max_score,automated_feedback,updated_at,submitted_at) on public.hka_attempts to authenticated;
grant update(response,awarded_points,updated_at) on public.hka_responses to authenticated;
grant select on public.hka_pathways,public.hka_courses to anon;

drop policy if exists pathways_public_read on public.hka_pathways;
create policy pathways_public_read on public.hka_pathways for select to anon using(active);
drop policy if exists courses_public_catalogue on public.hka_courses;
create policy courses_public_catalogue on public.hka_courses for select to anon using(published and archived_at is null);

create policy modules_read on public.hka_modules for select to authenticated using(public.hka_manage_course(course_id) or exists(
  select 1 from public.hka_lessons l where l.module_id=hka_modules.id and public.hka_read_lesson(l.id)));
create policy modules_write on public.hka_modules for all to authenticated using(public.hka_manage_course(course_id)) with check(public.hka_manage_course(course_id));
create policy questions_read on public.hka_questions for select to authenticated using(public.hka_manage_lesson(lesson_id) or public.hka_learn(lesson_id));
create policy questions_write on public.hka_questions for all to authenticated using(public.hka_manage_lesson(lesson_id)) with check(public.hka_manage_lesson(lesson_id));
create policy answer_keys_staff on public.hka_answer_keys for all to authenticated using(public.hka_manage_lesson((select lesson_id from public.hka_questions where id=question_id)))
 with check(public.hka_manage_lesson((select lesson_id from public.hka_questions where id=question_id)));
create policy attempts_read on public.hka_attempts for select to authenticated using(public.hka_view_student(student_id));
create policy attempts_insert on public.hka_attempts for insert to authenticated with check(student_id=auth.uid() and status='draft' and public.hka_learn(lesson_id));
create policy attempts_student_update on public.hka_attempts for update to authenticated using(student_id=auth.uid() and status in ('draft','resubmission_requested'))
 with check(student_id=auth.uid() and status in ('draft','submitted'));
create policy responses_read on public.hka_responses for select to authenticated using(exists(
  select 1 from public.hka_attempts a where a.id=attempt_id and public.hka_view_student(a.student_id)));
create policy responses_insert on public.hka_responses for insert to authenticated with check(exists(
  select 1 from public.hka_attempts a join public.hka_questions q on q.id=question_id
  where a.id=attempt_id and a.student_id=auth.uid() and a.status in ('draft','resubmission_requested') and q.lesson_id=a.lesson_id));
create policy responses_update on public.hka_responses for update to authenticated using(exists(
  select 1 from public.hka_attempts a where a.id=attempt_id and a.student_id=auth.uid() and a.status in ('draft','resubmission_requested')));
create policy allowance_read on public.hka_review_allowances for select to authenticated using(public.hka_view_student(student_id));
create policy ai_drafts_read on public.hka_ai_drafts for select to authenticated using(public.hka_admin() or author_id=auth.uid());
create policy ai_drafts_write on public.hka_ai_drafts for all to authenticated using(public.hka_admin() or (author_id=auth.uid() and public.hka_role()='coach'))
 with check(public.hka_admin() or (author_id=auth.uid() and public.hka_role()='coach'));

drop policy if exists progress_update on public.hka_progress;
create policy progress_update on public.hka_progress for update to authenticated using(student_id=auth.uid() and public.hka_learn(lesson_id))
 with check(student_id=auth.uid() and public.hka_learn(lesson_id));
drop policy if exists submissions_student_update on public.hka_submissions;
create policy submissions_student_update on public.hka_submissions for update to authenticated using(student_id=auth.uid() and status in ('draft','resubmission_requested'))
 with check(student_id=auth.uid() and status in ('draft','submitted'));

create or replace function public.hka_duplicate_course(source_course uuid) returns uuid language plpgsql security definer set search_path='' as $stage$
declare new_course uuid; m record; new_module uuid;
begin
 if not public.hka_manage_course(source_course) then raise exception 'Course management access required.'; end if;
 insert into public.hka_courses(pathway_id,coach_id,title,description,level,duration_minutes,eligibility,access_level,learning_objectives,duplicated_from)
 select pathway_id,auth.uid(),title||' (Copy)',description,level,duration_minutes,eligibility,access_level,learning_objectives,id
 from public.hka_courses where id=source_course returning id into new_course;
 if new_course is null then raise exception 'Course not found.'; end if;
 for m in select * from public.hka_modules where course_id=source_course order by position loop
   insert into public.hka_modules(course_id,title,description,position,published)
   values(new_course,m.title,m.description,m.position,false) returning id into new_module;
   insert into public.hka_lessons(course_id,module_id,title,description,content,kind,position,duration_minutes,learning_objectives,free_preview,published)
   select new_course,new_module,title,description,content,kind,position,duration_minutes,learning_objectives,free_preview,false
   from public.hka_lessons where module_id=m.id;
 end loop;
 insert into public.hka_lessons(course_id,title,description,content,kind,position,duration_minutes,learning_objectives,free_preview,published)
 select new_course,title,description,content,kind,position,duration_minutes,learning_objectives,free_preview,false
 from public.hka_lessons where course_id=source_course and module_id is null;
 return new_course;
end $stage$;

create or replace function public.hka_submit_attempt(target_attempt uuid) returns public.hka_attempts language plpgsql security definer set search_path='' as $stage$
declare result public.hka_attempts; needs_coach boolean;
begin
 if not exists(select 1 from public.hka_attempts where id=target_attempt and student_id=auth.uid() and status in ('draft','resubmission_requested'))
 then raise exception 'This attempt cannot be submitted.'; end if;
 update public.hka_responses r set awarded_points=case
   when q.requires_coach or q.question_type in ('short_answer','long_answer','practical','riding_video') then null
   when r.response=k.answer then q.points else 0 end, updated_at=now()
 from public.hka_questions q left join public.hka_answer_keys k on k.question_id=q.id
 where r.attempt_id=target_attempt and r.question_id=q.id;
 select coalesce(bool_or(q.requires_coach or q.question_type in ('short_answer','long_answer','practical','riding_video')),false)
 into needs_coach from public.hka_responses r join public.hka_questions q on q.id=r.question_id where r.attempt_id=target_attempt;
 update public.hka_attempts a set status=case when needs_coach then 'submitted' else 'auto_graded' end,
 score=(select coalesce(sum(coalesce(r.awarded_points,0)),0) from public.hka_responses r where r.attempt_id=a.id),
 max_score=(select coalesce(sum(q.points),0) from public.hka_questions q where q.lesson_id=a.lesson_id),
 automated_feedback=(select coalesce(jsonb_agg(jsonb_build_object('question_id',q.id,'awarded',r.awarded_points,'explanation',case when r.awarded_points is not null then k.explanation else '' end)),'[]'::jsonb)
   from public.hka_responses r join public.hka_questions q on q.id=r.question_id left join public.hka_answer_keys k on k.question_id=q.id where r.attempt_id=a.id),
 submitted_at=now(),updated_at=now() where a.id=target_attempt returning * into result;
 return result;
end $stage$;

revoke all on function public.hka_duplicate_course(uuid),public.hka_submit_attempt(uuid) from public,anon;
grant execute on function public.hka_duplicate_course(uuid),public.hka_submit_attempt(uuid) to authenticated;
create index if not exists hka_modules_course_position on public.hka_modules(course_id,position);
create index if not exists hka_questions_lesson_position on public.hka_questions(lesson_id,position);
create index if not exists hka_attempts_student_lesson on public.hka_attempts(student_id,lesson_id,updated_at desc);
create index if not exists hka_responses_attempt on public.hka_responses(attempt_id);
create index if not exists hka_ai_drafts_author on public.hka_ai_drafts(author_id,updated_at desc);
notify pgrst, 'reload schema';
commit;
 
