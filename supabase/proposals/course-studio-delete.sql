begin;

create schema if not exists hka_course_tools;
revoke all on schema hka_course_tools from public, anon;
grant usage on schema hka_course_tools to authenticated;

create or replace function hka_course_tools.delete_draft(item_type text, item_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  item_published boolean;
  item_archived boolean;
begin
  if not coalesce(public.hka_admin() and public.hka_active()
      and hka_messaging.founder(auth.uid()), false) then
    raise exception 'Only the Founder can delete Course Studio drafts.' using errcode = '42501';
  end if;

  if item_type = 'course' then
    select published into item_published
    from public.hka_courses where id = item_id for update;

    if not found then
      raise exception 'Course draft could not be found.';
    end if;
    if item_published then
      raise exception 'Archive this course before deleting it.';
    end if;
    if exists (select 1 from public.hka_enrolments where course_id = item_id)
       or exists (select 1 from public.hka_enrolment_requests where course_id = item_id) then
      raise exception 'This course has student access history. Keep it archived.';
    end if;
    if exists (select 1 from public.hka_lessons where course_id = item_id)
       or exists (select 1 from public.hka_modules where course_id = item_id) then
      raise exception 'Remove the draft lessons and modules first. Keep courses with student history archived.';
    end if;
    delete from public.hka_courses where id = item_id;
  elsif item_type = 'lesson' then
    select lesson.published, course.archived_at is not null
      into item_published, item_archived
    from public.hka_courses course
    join public.hka_lessons lesson on lesson.course_id = course.id
    where lesson.id = item_id for update of course, lesson;

    if not found then
      raise exception 'Lesson or quiz could not be found.';
    end if;
    if item_published and not item_archived then
      raise exception 'Unpublish this lesson or quiz before deleting it.';
    end if;

    perform 1 from public.hka_questions where lesson_id = item_id for update;
    if exists (select 1 from public.hka_attempts where lesson_id = item_id)
       or exists (select 1 from public.hka_progress where lesson_id = item_id)
       or exists (select 1 from public.hka_submissions where lesson_id = item_id)
       or exists (select 1 from public.hka_responses response join public.hka_questions question on question.id = response.question_id where question.lesson_id = item_id) then
      raise exception 'Students have work linked to this lesson or quiz. Keep it for their records.';
    end if;
    if exists (select 1 from public.hka_files where lesson_id = item_id) then
      raise exception 'This lesson has files attached and must be kept for now.';
    end if;
    delete from public.hka_lessons where id = item_id;
  elsif item_type = 'module' then
    select module.published, course.archived_at is not null
      into item_published, item_archived
    from public.hka_courses course
    join public.hka_modules module on module.course_id = course.id
    where module.id = item_id for update of course, module;

    if not found then
      raise exception 'Module could not be found.';
    end if;
    if item_published and not item_archived then
      raise exception 'Unpublish this module before deleting it.';
    end if;
    if exists (select 1 from public.hka_lessons where module_id = item_id) then
      raise exception 'Move or delete the lessons in this module first.';
    end if;
    delete from public.hka_modules where id = item_id;
  else
    raise exception 'Choose a course, lesson, quiz or module.';
  end if;

  return item_id;
end;
$function$;

revoke all on function hka_course_tools.delete_draft(text, uuid) from public, anon;
grant execute on function hka_course_tools.delete_draft(text, uuid) to authenticated;

create or replace function public.hka_course_studio_delete_draft(item_type text, item_id uuid)
returns uuid
language sql
security invoker
set search_path = ''
as $function$
  select hka_course_tools.delete_draft(item_type, item_id)
$function$;

revoke all on function public.hka_course_studio_delete_draft(text, uuid) from public, anon;
grant execute on function public.hka_course_studio_delete_draft(text, uuid) to authenticated;

commit;
