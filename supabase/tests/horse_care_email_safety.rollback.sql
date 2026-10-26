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

  select pg_get_functiondef(''public.hka_recheck_care_email_delivery(uuid,uuid,text,text)''::regprocedure) into definition;
  if position(''kill_switch'' in lower(definition))=0 then raise exception ''immediate kill-switch recheck missing''; end if;
  if position(''student_id=a.student_id'' in lower(definition))=0 then raise exception ''cross-student join isolation missing''; end if;

  select pg_get_functiondef(''public.hka_finish_care_email_delivery(uuid,uuid,text,text,text)''::regprocedure) into definition;
  if position(''attempt_count'' in lower(definition))=0 or position(''lease_token'' in lower(definition))=0 then
    raise exception ''retry or lease checks missing'';
  end if;
  if position(''manual_review'' in lower(definition))=0 then raise exception ''ambiguous-send hold missing''; end if;
  if position(''^[a-z0-9][a-z0-9_.:-]{0,79}$'' in definition)=0 then raise exception ''anchored error-code validation missing''; end if;
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

-- Exercise delivery behavior with disposable records. No provider request is made.
do $test$
declare
  test_user constant uuid:='11111111-1111-4111-8111-111111111111';
  other_user constant uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  test_horse constant uuid:='22222222-2222-4222-8222-222222222222';
  test_appointment constant uuid:='33333333-3333-4333-8333-333333333333';
  target uuid;
  lease uuid;
  rows_found integer;
  result boolean;
begin
  insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values
    (test_user,'authenticated','authenticated','reminder-test@example.com','',now(),'{}',jsonb_build_object('full_name','Reminder Test','birth_date','1990-01-01','account_type','student','timezone','Africa/Lusaka'),now(),now()),
    (other_user,'authenticated','authenticated','other@example.com','',now(),'{}',jsonb_build_object('full_name','Other Test','birth_date','1990-01-01','account_type','student','timezone','Africa/Lusaka'),now(),now())
  on conflict(id) do update set email=excluded.email,email_confirmed_at=excluded.email_confirmed_at;

  insert into public.hka_profiles(id,full_name,birth_date,timezone,role,suspended,notification_preferences)
  values
    (test_user,'Reminder Test','1990-01-01','Africa/Lusaka','student',false,'{"horse_care_email":true}'),
    (other_user,'Other Test','1990-01-01','Africa/Lusaka','student',false,'{"horse_care_email":true}')
  on conflict(id) do update set suspended=false,timezone='Africa/Lusaka',notification_preferences=excluded.notification_preferences;

  insert into public.hka_horses(id,student_id,name,details)
  values(test_horse,test_user,'Safety Test Horse','') on conflict(id) do nothing;
  insert into public.hka_care_appointments(
    id,student_id,horse_id,care_type,title,next_due_date,appointment_time,reminder_days,email_enabled,status
  ) values(
    test_appointment,test_user,test_horse,'farrier','Safety Test Care',
    (now() at time zone 'Africa/Lusaka')::date+7,time '09:30',array[7],true,'scheduled'
  );

  begin
    insert into public.hka_care_appointments(student_id,horse_id,care_type,title,next_due_date,reminder_days,email_enabled,status)
    values(other_user,test_horse,'farrier','Wrong owner',(now() at time zone 'Africa/Lusaka')::date+7,array[7],true,'scheduled');
    raise exception 'cross-student horse ownership was accepted';
  exception when foreign_key_violation then null;
  end;

  update public.hka_settings set value=case id
    when 'horse_care_email_delivery_enabled' then 'true'
    when 'horse_care_email_kill_switch' then 'false' else value end
  where id in ('horse_care_email_delivery_enabled','horse_care_email_kill_switch');

  rows_found:=public.hka_prepare_care_email_deliveries(
    ((((now() at time zone 'Africa/Lusaka')::date)+time '07:00') at time zone 'Africa/Lusaka')
  );
  if rows_found<>1 then raise exception 'local-date preparation did not create one delivery'; end if;
  if (select scheduled_for from public.hka_care_email_deliveries where appointment_id=test_appointment and schedule_version=1 and reminder_days=7)
     <>((((now() at time zone 'Africa/Lusaka')::date)+time '07:00') at time zone 'Africa/Lusaka') then
    raise exception 'prepared delivery used the wrong timezone instant';
  end if;
  update public.hka_care_email_deliveries set scheduled_for=now()-interval '1 minute',expires_at=now()+interval '1 hour'
  where appointment_id=test_appointment and schedule_version=1 and reminder_days=7;

  begin
    perform public.hka_claim_care_email_deliveries(gen_random_uuid(),1,null);
    raise exception 'missing test recipient was accepted';
  exception when others then
    if sqlerrm not like '%valid test recipient%' then raise; end if;
  end;

  select count(*) into rows_found from public.hka_claim_care_email_deliveries(gen_random_uuid(),1,'wrong@example.com');
  if rows_found<>0 then raise exception 'non-allow-listed recipient was claimed'; end if;

  update public.hka_profiles set notification_preferences='{"horse_care_email":false}' where id=test_user;
  select count(*) into rows_found from public.hka_claim_care_email_deliveries(gen_random_uuid(),1,'reminder-test@example.com');
  if rows_found<>0 then raise exception 'profile opt-out was ignored'; end if;
  update public.hka_profiles set notification_preferences='{"horse_care_email":true}' where id=test_user;
  update public.hka_care_email_deliveries set state='pending',last_error_code=null,last_error_at=null where appointment_id=test_appointment;

  update public.hka_care_appointments set email_enabled=false where id=test_appointment;
  insert into public.hka_care_email_deliveries(appointment_id,student_id,schedule_version,reminder_days,scheduled_for,expires_at)
  values(test_appointment,test_user,2,7,now()-interval '1 minute',now()+interval '1 hour');
  select count(*) into rows_found from public.hka_claim_care_email_deliveries(gen_random_uuid(),1,'reminder-test@example.com');
  if rows_found<>0 then raise exception 'appointment opt-out was ignored'; end if;
  update public.hka_care_appointments set email_enabled=true where id=test_appointment;
  insert into public.hka_care_email_deliveries(
    appointment_id,student_id,schedule_version,reminder_days,scheduled_for,expires_at
  ) select id,student_id,schedule_version,7,now()-interval '1 minute',now()+interval '1 hour'
    from public.hka_care_appointments where id=test_appointment;

  select delivery_id,lease_token into target,lease
  from public.hka_claim_care_email_deliveries(gen_random_uuid(),1,'reminder-test@example.com');
  if target is null then raise exception 'eligible delivery was not claimed'; end if;
  select count(*) into rows_found from public.hka_claim_care_email_deliveries(gen_random_uuid(),1,'reminder-test@example.com');
  if rows_found<>0 then raise exception 'atomic claim allowed a duplicate lease'; end if;

  update auth.users set email='changed@example.com' where id=test_user;
  result:=public.hka_recheck_care_email_delivery(target,lease,'reminder-test@example.com','reminder-test@example.com');
  if result then raise exception 'changed recipient passed immediate recheck'; end if;
  update auth.users set email='reminder-test@example.com' where id=test_user;
  update auth.users set email_confirmed_at=null where id=test_user;
  result:=public.hka_recheck_care_email_delivery(target,lease,'reminder-test@example.com','reminder-test@example.com');
  if result then raise exception 'unconfirmed recipient passed immediate recheck'; end if;
  update auth.users set email_confirmed_at=now() where id=test_user;

  update public.hka_care_email_deliveries set lease_expires_at=now()-interval '1 second' where id=target;
  select delivery_id,lease_token into target,lease
  from public.hka_claim_care_email_deliveries(gen_random_uuid(),1,'reminder-test@example.com');
  if target is null then raise exception 'pre-dispatch interruption was not safely reclaimed'; end if;

  result:=public.hka_begin_care_email_dispatch(target,lease,'reminder-test@example.com','reminder-test@example.com');
  if not result then raise exception 'eligible dispatch did not start'; end if;
  update public.hka_care_email_deliveries set lease_expires_at=now()-interval '1 second' where id=target;
  perform public.hka_claim_care_email_deliveries(gen_random_uuid(),1,'reminder-test@example.com');
  if (select state from public.hka_care_email_deliveries where id=target)<>'manual_review' then
    raise exception 'during-send interruption was automatically retried';
  end if;

  insert into public.hka_care_email_deliveries(
    appointment_id,student_id,schedule_version,reminder_days,scheduled_for,expires_at
  ) select test_appointment,test_user,schedule_version,3,now()-interval '1 minute',now()+interval '1 hour'
    from public.hka_care_appointments where id=test_appointment;
  select delivery_id,lease_token into target,lease
  from public.hka_claim_care_email_deliveries(gen_random_uuid(),1,'reminder-test@example.com');
  if not public.hka_begin_care_email_dispatch(target,lease,'reminder-test@example.com','reminder-test@example.com') then
    raise exception 'acceptance test dispatch did not start';
  end if;
  if public.hka_finish_care_email_delivery(target,gen_random_uuid(),'sent','49a3999c-0ce1-4ea6-ab68-afcd6dc2e794',null) then
    raise exception 'wrong lease recorded provider acceptance';
  end if;
  if not public.hka_hold_care_email_delivery(target,lease,'acceptance_record_failed','49a3999c-0ce1-4ea6-ab68-afcd6dc2e794') then
    raise exception 'provider acceptance failure was not held';
  end if;
  if (select state from public.hka_care_email_deliveries where id=target)<>'manual_review' then
    raise exception 'accepted but unrecorded delivery was not held';
  end if;

  insert into public.hka_care_email_deliveries(
    appointment_id,student_id,schedule_version,reminder_days,scheduled_for,expires_at
  ) select test_appointment,test_user,schedule_version,1,now()-interval '1 minute',now()+interval '1 hour'
    from public.hka_care_appointments where id=test_appointment;
  select delivery_id,lease_token into target,lease
  from public.hka_claim_care_email_deliveries(gen_random_uuid(),1,'reminder-test@example.com');
  if not public.hka_begin_care_email_dispatch(target,lease,'reminder-test@example.com','reminder-test@example.com') then
    raise exception 'sent test dispatch did not start';
  end if;
  if not public.hka_finish_care_email_delivery(target,lease,'sent','49a3999c-0ce1-4ea6-ab68-afcd6dc2e795',null) then
    raise exception 'valid provider acceptance was not recorded';
  end if;
  update public.hka_care_email_deliveries set updated_at=now()-interval '25 hours' where id=target;
  select count(*) into rows_found from public.hka_claim_care_email_deliveries(gen_random_uuid(),50,'reminder-test@example.com');
  if rows_found<>0 then raise exception 'sent delivery was reclaimable after provider idempotency expiry'; end if;

  begin
    perform public.hka_finish_care_email_delivery(target,lease,'sent','not-a-resend-id',null);
    raise exception 'invalid Resend message ID was accepted';
  exception when others then
    if sqlerrm not like '%valid Resend message ID%' then raise; end if;
  end;

  insert into public.hka_care_email_deliveries(
    appointment_id,student_id,schedule_version,reminder_days,scheduled_for,expires_at,last_error_code
  ) select test_appointment,test_user,schedule_version,0,now()-interval '1 minute',now()+interval '1 hour','resend_http_429'
    from public.hka_care_appointments where id=test_appointment;
  begin
    update public.hka_care_email_deliveries set last_error_code=E'bad\ncode' where reminder_days=0 and appointment_id=test_appointment;
    raise exception 'newline error code was accepted';
  exception when check_violation then null;
  end;
  begin
    update public.hka_care_email_deliveries set last_error_code='BadCode' where reminder_days=0 and appointment_id=test_appointment;
    raise exception 'uppercase error code was accepted';
  exception when check_violation then null;
  end;

  update public.hka_settings set value='true' where id='horse_care_email_kill_switch';
  if public.hka_recheck_care_email_delivery(target,lease,'reminder-test@example.com','reminder-test@example.com') then
    raise exception 'kill switch did not block recheck';
  end if;
end
$test$;

-- Trigger actual reschedule, completion and deletion transitions.
do $test$
declare
  test_user constant uuid:='11111111-1111-4111-8111-111111111111';
  test_horse constant uuid:='22222222-2222-4222-8222-222222222222';
  appointment_id uuid;
  delivery_id uuid;
begin
  insert into public.hka_care_appointments(student_id,horse_id,care_type,title,next_due_date,reminder_days,email_enabled,status)
  values(test_user,test_horse,'farrier','Lifecycle Test',(now() at time zone 'Africa/Lusaka')::date+14,array[7],true,'scheduled')
  returning id into appointment_id;
  insert into public.hka_care_email_deliveries(appointment_id,student_id,schedule_version,reminder_days,scheduled_for,expires_at)
  values(appointment_id,test_user,1,7,now()-interval '1 minute',now()+interval '1 hour') returning id into delivery_id;
  update public.hka_care_appointments set next_due_date=next_due_date+1 where id=appointment_id;
  if (select state from public.hka_care_email_deliveries where id=delivery_id)<>'cancelled' then raise exception 'reschedule did not cancel delivery'; end if;

  insert into public.hka_care_email_deliveries(appointment_id,student_id,schedule_version,reminder_days,scheduled_for,expires_at)
  select id,student_id,schedule_version,7,now()-interval '1 minute',now()+interval '1 hour' from public.hka_care_appointments where id=appointment_id
  returning id into delivery_id;
  update public.hka_care_appointments set status='completed',completed_at=current_date where id=appointment_id;
  if (select state from public.hka_care_email_deliveries where id=delivery_id)<>'cancelled' then raise exception 'completion did not cancel delivery'; end if;

  insert into public.hka_care_appointments(student_id,horse_id,care_type,title,next_due_date,reminder_days,email_enabled,status)
  values(test_user,test_horse,'farrier','Delete Test',(now() at time zone 'Africa/Lusaka')::date+14,array[7],true,'scheduled') returning id into appointment_id;
  insert into public.hka_care_email_deliveries(appointment_id,student_id,schedule_version,reminder_days,scheduled_for,expires_at)
  values(appointment_id,test_user,1,7,now()-interval '1 minute',now()+interval '1 hour') returning id into delivery_id;
  delete from public.hka_care_appointments where id=appointment_id;
  if (select state from public.hka_care_email_deliveries where id=delivery_id)<>'cancelled' then raise exception 'deletion did not cancel delivery'; end if;
end
$test$;

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
