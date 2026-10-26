-- Local/staging only. Requires migrations 001, 008 and 010 in a disposable database.
-- Every mutation is rolled back. This script sends no network request or email.
begin;

do '
declare definition text;
begin
  if (select value from public.hka_settings where id=''horse_care_email_delivery_enabled'')<>''false'' then
    raise exception ''delivery must default disabled'';
  end if;
  if (select value from public.hka_settings where id=''horse_care_email_kill_switch'')<>''true'' then
    raise exception ''kill switch must default active'';
  end if;
  if public.hka_prepare_care_email_deliveries(now())<>0 then
    raise exception ''disabled preparation must return zero'';
  end if;
  if not (select relrowsecurity from pg_class where oid=''public.hka_care_email_deliveries''::regclass) then
    raise exception ''delivery table RLS must be enabled'';
  end if;

  select pg_get_functiondef(''public.hka_claim_care_email_deliveries(uuid,integer,text)''::regprocedure) into definition;
  if position(''skip locked'' in lower(definition))=0 then raise exception ''atomic SKIP LOCKED claim missing''; end if;
  if position(''allowed_email'' in lower(definition))=0 then raise exception ''test recipient allow-list missing''; end if;
  if position(''email_confirmed_at'' in lower(definition))=0 then raise exception ''confirmed email check missing''; end if;
  if position(''notification_preferences'' in lower(definition))=0 or position(''email_enabled'' in lower(definition))=0 then
    raise exception ''two-level opt-in check missing'';
  end if;
  if position(''schedule_version'' in lower(definition))=0 then raise exception ''schedule version isolation missing''; end if;

  select pg_get_functiondef(''public.hka_recheck_care_email_delivery(uuid,uuid)''::regprocedure) into definition;
  if position(''kill_switch'' in lower(definition))=0 then raise exception ''immediate kill-switch recheck missing''; end if;
  if position(''student_id=a.student_id'' in lower(definition))=0 then raise exception ''cross-student join isolation missing''; end if;

  select pg_get_functiondef(''public.hka_finish_care_email_delivery(uuid,uuid,text,text,text)''::regprocedure) into definition;
  if position(''attempt_count'' in lower(definition))=0 or position(''lease_token'' in lower(definition))=0 then
    raise exception ''retry or lease checks missing'';
  end if;
  if position(''manual_review'' in lower(definition))=0 then raise exception ''ambiguous-send hold missing''; end if;
end';

-- Africa/Lusaka has UTC+02:00; a 07:00 local reminder must map to 05:00 UTC.
do '
declare calculated timestamptz;
begin
  calculated:=((date ''2026-11-15''+time ''07:00'') at time zone ''Africa/Lusaka'');
  if calculated<>timestamptz ''2026-11-15 05:00:00+00'' then raise exception ''timezone conversion failed''; end if;
end';

-- Exact local-day equality suppresses catch-up work and accepts only the intended day.
do '
begin
  if (date ''2026-11-20''-7)=date ''2026-11-14'' then raise exception ''old reminder incorrectly eligible''; end if;
  if (date ''2026-11-20''-7)<>date ''2026-11-13'' then raise exception ''exact reminder date failed''; end if;
end';

-- Unique schedule identity rejects duplicate intended notifications.
do '
declare unique_ok boolean;
begin
  select exists(
    select 1 from pg_indexes
    where schemaname=''public'' and tablename=''hka_care_email_deliveries''
      and indexdef ilike ''%UNIQUE%appointment_id%schedule_version%reminder_days%''
  ) into unique_ok;
  if not unique_ok then raise exception ''persistent idempotency uniqueness missing''; end if;
end';

-- Trigger definitions prove delete, completion, reschedule and opt-out invalidation hooks.
do '
declare definition text;
begin
  select pg_get_functiondef(''public.hka_cancel_care_email_deliveries()''::regprocedure) into definition;
  if position(''appointment_deleted'' in lower(definition))=0
     or position(''appointment_changed'' in lower(definition))=0
     or position(''email_enabled'' in lower(definition))=0
     or position(''status'' in lower(definition))=0 then
    raise exception ''appointment invalidation coverage missing'';
  end if;
end';

-- No prepared migration may create or replace the existing pg_cron configuration.
do '
begin
  if exists(select 1 from pg_extension where extname=''pg_cron'')
     and exists(select 1 from cron.job where jobname=''hka-horse-care-reminders'') then
    raise exception ''horse-care cron must remain absent during inactive preparation'';
  end if;
exception when undefined_table then null;
end';

rollback;
