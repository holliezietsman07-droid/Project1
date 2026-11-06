-- Emergency rollback for migration 202610220001_stage4_lms.
-- Execute only with owner approval. This removes Stage 4-only records while preserving Stage 3 accounts and records.
begin;

drop policy if exists pathways_public_read on public.hka_pathways;
drop policy if exists courses_public_catalogue on public.hka_courses;
drop policy if exists progress_update on public.hka_progress;
drop policy if exists submissions_student_update on public.hka_submissions;

revoke select on public.hka_pathways, public.hka_courses from anon;
revoke update on public.hka_progress from authenticated;
revoke update(status,response,file_id,review_kind,updated_at) on public.hka_submissions from authenticated;

drop function if exists public.hka_duplicate_course(uuid);
drop function if exists public.hka_submit_attempt(uuid);

drop table if exists public.hka_responses;
drop table if exists public.hka_attempts;
drop table if exists public.hka_answer_keys;
drop table if exists public.hka_questions;
drop table if exists public.hka_review_allowances;
drop table if exists public.hka_ai_drafts;

alter table public.hka_lessons drop column if exists module_id;
drop table if exists public.hka_modules;

update public.hka_progress
set completed_at=coalesce(completed_at,updated_at,started_at,now())
where completed_at is null;
alter table public.hka_progress
  alter column completed_at set default now(),
  alter column completed_at set not null;

alter table public.hka_courses
  drop column if exists duplicated_from,
  drop column if exists archived_at,
  drop column if exists learning_objectives,
  drop column if exists access_level,
  drop column if exists eligibility,
  drop column if exists duration_minutes,
  drop column if exists level;
alter table public.hka_lessons
  drop column if exists free_preview,
  drop column if exists learning_objectives,
  drop column if exists duration_minutes,
  drop column if exists description;
alter table public.hka_progress
  drop column if exists last_position_seconds,
  drop column if exists updated_at,
  drop column if exists started_at;
alter table public.hka_submissions
  drop column if exists updated_at,
  drop column if exists preliminary_feedback,
  drop column if exists review_kind,
  drop column if exists status;
alter table public.hka_assessments
  drop column if exists automated,
  drop column if exists decision;

notify pgrst, 'reload schema';
commit;

