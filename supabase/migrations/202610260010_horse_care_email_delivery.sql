-- Prepared only. Do not deploy without owner approval.
-- Adds server-only delivery state; installs no extension, cron job, webhook, or scheduler.
begin;

alter table public.hka_care_appointments
  add column if not exists schedule_version bigint not null default 1;

insert into public.hka_settings(id,value) values
  ('horse_care_email_delivery_enabled','false'),
  ('horse_care_email_kill_switch','true'),
  ('horse_care_email_send_local_time','07:00')
on conflict(id) do update set value=excluded.value;

create table public.hka_care_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null,
  student_id uuid not null,
  schedule_version bigint not null,
  reminder_days integer not null check(reminder_days in (30,14,7,3,1,0)),
  scheduled_for timestamptz not null,
  expires_at timestamptz not null,
  state text not null default 'pending' check(state in ('pending','claimed','dispatching','retry','sent','permanent_failure','manual_review','cancelled')),
  attempt_count integer not null default 0 check(attempt_count between 0 and 20),
  next_attempt_at timestamptz,
  lease_token uuid,
  lease_expires_at timestamptz,
  claimed_recipient_email text,
  dispatch_started_at timestamptz,
  provider_message_id text,
  provider_accepted_at timestamptz,
  last_error_code text check(last_error_code is null or last_error_code ~ '^[a-z0-9][a-z0-9_.:-]{0,79}$'),
  last_error_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(appointment_id,schedule_version,reminder_days),
  check(expires_at > scheduled_for),
  check(state <> 'sent' or (
    provider_accepted_at is not null
    and provider_message_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  )),
  check(provider_accepted_at is null or provider_message_id is not null),
  check(dispatch_started_at is null or claimed_recipient_email is not null)
);

create unique index hka_care_email_provider_message_unique
  on public.hka_care_email_deliveries(provider_message_id)
  where provider_message_id is not null;
create index hka_care_email_claimable
  on public.hka_care_email_deliveries(state,next_attempt_at,scheduled_for)
  where state in ('pending','claimed','dispatching','retry');

alter table public.hka_care_email_deliveries enable row level security;
revoke all on public.hka_care_email_deliveries from public,anon,authenticated;
grant select,insert,update on public.hka_care_email_deliveries to service_role;

create or replace function public.hka_cancel_care_email_deliveries()
returns trigger language plpgsql security definer set search_path='' as '
begin
  if tg_op=''DELETE'' then
    update public.hka_care_email_deliveries
       set state=''cancelled'', lease_token=null, lease_expires_at=null,
           last_error_code=''appointment_deleted'', last_error_at=now(), updated_at=now()
     where appointment_id=old.id and state not in (''sent'',''cancelled'',''manual_review'');
    return old;
  end if;
  if old.next_due_date is distinct from new.next_due_date
     or old.appointment_time is distinct from new.appointment_time
     or old.reminder_days is distinct from new.reminder_days
     or old.email_enabled is distinct from new.email_enabled
     or old.status is distinct from new.status
     or old.horse_id is distinct from new.horse_id
     or old.care_type is distinct from new.care_type
     or old.title is distinct from new.title then
    update public.hka_care_email_deliveries
       set state=''cancelled'', lease_token=null, lease_expires_at=null,
           last_error_code=''appointment_changed'', last_error_at=now(), updated_at=now()
     where appointment_id=old.id and schedule_version=old.schedule_version
       and state not in (''sent'',''cancelled'',''manual_review'');
    new.schedule_version:=old.schedule_version+1;
  end if;
  return new;
end';

revoke all on function public.hka_cancel_care_email_deliveries() from public,anon,authenticated;

drop trigger if exists hka_cancel_care_email_deliveries_before_change on public.hka_care_appointments;
create trigger hka_cancel_care_email_deliveries_before_change
before update or delete on public.hka_care_appointments
for each row execute function public.hka_cancel_care_email_deliveries();

create or replace function public.hka_reset_care_reminders()
returns trigger language plpgsql security definer set search_path='' as '
begin
 if old.next_due_date is distinct from new.next_due_date
    or old.appointment_time is distinct from new.appointment_time
    or old.reminder_days is distinct from new.reminder_days
    or old.email_enabled is distinct from new.email_enabled
    or old.status is distinct from new.status
    or old.horse_id is distinct from new.horse_id
    or old.care_type is distinct from new.care_type
    or old.title is distinct from new.title then
   delete from public.hka_care_reminders where appointment_id=new.id;
 end if;
 return new;
end';

revoke all on function public.hka_reset_care_reminders() from public,anon,authenticated;
drop trigger if exists hka_reset_care_reminders_after_change on public.hka_care_appointments;
create trigger hka_reset_care_reminders_after_change
after update of next_due_date,appointment_time,reminder_days,email_enabled,status,horse_id,care_type,title
on public.hka_care_appointments
for each row execute function public.hka_reset_care_reminders();

create or replace function public.hka_prepare_care_email_deliveries(at_time timestamptz default now())
returns integer language plpgsql security definer set search_path='' as '
declare inserted_count integer:=0; send_time time;
begin
  if coalesce((select value::boolean from public.hka_settings where id=''horse_care_email_delivery_enabled''),false) is not true
     or coalesce((select value::boolean from public.hka_settings where id=''horse_care_email_kill_switch''),true) is true then
    return 0;
  end if;
  send_time:=coalesce((select value::time from public.hka_settings where id=''horse_care_email_send_local_time''),time ''07:00'');
  insert into public.hka_care_email_deliveries(
    appointment_id,student_id,schedule_version,reminder_days,scheduled_for,expires_at
  )
  select a.id,a.student_id,a.schedule_version,days.value,
         (((a.next_due_date-days.value)::date+send_time) at time zone coalesce(nullif(p.timezone,''''),''Africa/Lusaka'')),
         ((((a.next_due_date-days.value)::date+send_time) at time zone coalesce(nullif(p.timezone,''''),''Africa/Lusaka''))+interval ''12 hours'')
  from public.hka_care_appointments a
  join public.hka_profiles p on p.id=a.student_id
  cross join lateral unnest(a.reminder_days) as days(value)
  where a.status=''scheduled''
    and a.email_enabled
    and days.value in (30,14,7,3,1,0)
    and coalesce((p.notification_preferences->>''horse_care_email'')::boolean,false)
    and public.hka_active(a.student_id)
    and (at_time at time zone coalesce(nullif(p.timezone,''''),''Africa/Lusaka''))::date=a.next_due_date-days.value
    and a.next_due_date >= (at_time at time zone coalesce(nullif(p.timezone,''''),''Africa/Lusaka''))::date
    and (((a.next_due_date-days.value)::date+send_time) at time zone coalesce(nullif(p.timezone,''''),''Africa/Lusaka''))<=at_time
  on conflict(appointment_id,schedule_version,reminder_days) do nothing;
  get diagnostics inserted_count=row_count;
  return inserted_count;
end';

create or replace function public.hka_claim_care_email_deliveries(
  worker_id uuid,
  claim_limit integer default 10,
  allowed_email text default null
)
returns table(
  delivery_id uuid,lease_token uuid,recipient_email text,student_name text,
  horse_name text,care_title text,care_type text,appointment_date date,
  appointment_time time,student_timezone text,reminder_days integer
) language plpgsql security definer set search_path='' as '
begin
  if worker_id is null or claim_limit not between 1 and 50 then raise exception ''Invalid worker claim.''; end if;
  if allowed_email is null or btrim(allowed_email)='''' or allowed_email !~* ''^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'' then
    raise exception ''A valid test recipient is required.'';
  end if;
  if coalesce((select value::boolean from public.hka_settings where id=''horse_care_email_delivery_enabled''),false) is not true
     or coalesce((select value::boolean from public.hka_settings where id=''horse_care_email_kill_switch''),true) is true then
    return;
  end if;

  update public.hka_care_email_deliveries
     set state=''retry'',lease_token=null,lease_expires_at=null,next_attempt_at=now(),
         claimed_recipient_email=null,last_error_code=''claim_expired_before_dispatch'',
         last_error_at=now(),updated_at=now()
   where state=''claimed'' and dispatch_started_at is null and lease_expires_at<=now();

  update public.hka_care_email_deliveries
     set state=''manual_review'',lease_token=null,lease_expires_at=null,next_attempt_at=null,
         last_error_code=''dispatch_outcome_unknown'',last_error_at=now(),updated_at=now()
   where state in (''claimed'',''dispatching'') and dispatch_started_at is not null
     and lease_expires_at<=now();

  update public.hka_care_email_deliveries d
     set state=''cancelled'',lease_token=null,lease_expires_at=null,
         last_error_code=''eligibility_changed'',last_error_at=now(),updated_at=now()
   where d.state in (''pending'',''claimed'',''retry'')
     and not exists (
       select 1
       from public.hka_care_appointments a
       join public.hka_profiles p on p.id=a.student_id
       join public.hka_horses h on h.id=a.horse_id and h.student_id=a.student_id
       join auth.users u on u.id=a.student_id
       where a.id=d.appointment_id and a.student_id=d.student_id
         and a.schedule_version=d.schedule_version and a.status=''scheduled''
         and a.email_enabled and d.reminder_days=any(a.reminder_days)
         and coalesce((p.notification_preferences->>''horse_care_email'')::boolean,false)
         and not p.suspended and u.email_confirmed_at is not null and u.deleted_at is null
         and (u.banned_until is null or u.banned_until<=now())
         and lower(u.email)=lower(btrim(allowed_email))
         and a.next_due_date >= (now() at time zone coalesce(nullif(p.timezone,''''),''Africa/Lusaka''))::date
     );

  return query
  with candidate as (
    select d.id
    from public.hka_care_email_deliveries d
    join public.hka_care_appointments a on a.id=d.appointment_id and a.student_id=d.student_id and a.schedule_version=d.schedule_version
    join public.hka_profiles p on p.id=a.student_id
    join public.hka_horses h on h.id=a.horse_id and h.student_id=a.student_id
    join auth.users u on u.id=a.student_id
    where d.state in (''pending'',''retry'')
      and coalesce(d.next_attempt_at,d.scheduled_for)<=now() and d.expires_at>now()
      and d.attempt_count<5 and a.status=''scheduled'' and a.email_enabled
      and d.reminder_days=any(a.reminder_days)
      and coalesce((p.notification_preferences->>''horse_care_email'')::boolean,false)
      and not p.suspended and u.email_confirmed_at is not null and u.deleted_at is null
      and (u.banned_until is null or u.banned_until<=now())
      and lower(u.email)=lower(btrim(allowed_email))
      and a.next_due_date >= (now() at time zone coalesce(nullif(p.timezone,''''),''Africa/Lusaka''))::date
    order by d.scheduled_for,d.id
    for update of d skip locked
    limit claim_limit
  ), claimed as (
    update public.hka_care_email_deliveries d
       set state=''claimed'',lease_token=gen_random_uuid(),lease_expires_at=now()+interval ''5 minutes'',
           claimed_recipient_email=u.email,dispatch_started_at=null,
           attempt_count=d.attempt_count+1,updated_at=now()
      from candidate c,auth.users u
     where d.id=c.id and u.id=d.student_id and lower(u.email)=lower(btrim(allowed_email))
    returning d.*
  )
  select c.id,c.lease_token,c.claimed_recipient_email,p.full_name,h.name,a.title,a.care_type,
         a.next_due_date,a.appointment_time,coalesce(nullif(p.timezone,''''),''Africa/Lusaka''),c.reminder_days
  from claimed c
  join public.hka_care_appointments a on a.id=c.appointment_id and a.student_id=c.student_id and a.schedule_version=c.schedule_version
  join public.hka_profiles p on p.id=a.student_id
  join public.hka_horses h on h.id=a.horse_id and h.student_id=a.student_id;
end';

create or replace function public.hka_recheck_care_email_delivery(
  target_delivery uuid,target_lease uuid,expected_recipient text,allowed_email text
)
returns boolean language sql stable security definer set search_path='' as '
  select allowed_email is not null and btrim(allowed_email)<>'''' and exists(
    select 1
    from public.hka_care_email_deliveries d
    join public.hka_care_appointments a on a.id=d.appointment_id and a.student_id=d.student_id and a.schedule_version=d.schedule_version
    join public.hka_profiles p on p.id=a.student_id
    join public.hka_horses h on h.id=a.horse_id and h.student_id=a.student_id
    join auth.users u on u.id=a.student_id
    where d.id=target_delivery and d.state=''claimed'' and d.lease_token=target_lease and d.lease_expires_at>now()
      and lower(u.email)=lower(d.claimed_recipient_email)
      and lower(u.email)=lower(expected_recipient)
      and lower(u.email)=lower(btrim(allowed_email))
      and d.expires_at>now() and a.status=''scheduled'' and a.email_enabled
      and d.reminder_days=any(a.reminder_days)
      and coalesce((p.notification_preferences->>''horse_care_email'')::boolean,false)
      and not p.suspended and u.email_confirmed_at is not null and u.deleted_at is null
      and (u.banned_until is null or u.banned_until<=now())
      and a.next_due_date >= (now() at time zone coalesce(nullif(p.timezone,''''),''Africa/Lusaka''))::date
      and coalesce((select value::boolean from public.hka_settings where id=''horse_care_email_delivery_enabled''),false)
      and not coalesce((select value::boolean from public.hka_settings where id=''horse_care_email_kill_switch''),true)
  )';

create or replace function public.hka_begin_care_email_dispatch(
  target_delivery uuid,target_lease uuid,expected_recipient text,allowed_email text
)
returns boolean language plpgsql security definer set search_path='' as '
declare changed integer;
begin
  if allowed_email is null or btrim(allowed_email)='''' then return false; end if;
  update public.hka_care_email_deliveries d
     set state=''dispatching'',dispatch_started_at=now(),updated_at=now()
   where d.id=target_delivery and d.state=''claimed'' and d.lease_token=target_lease
     and d.lease_expires_at>now() and d.expires_at>now()
     and lower(d.claimed_recipient_email)=lower(expected_recipient)
     and exists (
       select 1
       from public.hka_care_appointments a
       join public.hka_profiles p on p.id=a.student_id
       join public.hka_horses h on h.id=a.horse_id and h.student_id=a.student_id
       join auth.users u on u.id=a.student_id
       where a.id=d.appointment_id and a.student_id=d.student_id and a.schedule_version=d.schedule_version
         and a.status=''scheduled'' and a.email_enabled and d.reminder_days=any(a.reminder_days)
         and coalesce((p.notification_preferences->>''horse_care_email'')::boolean,false)
         and not p.suspended and u.email_confirmed_at is not null and u.deleted_at is null
         and (u.banned_until is null or u.banned_until<=now())
         and lower(u.email)=lower(d.claimed_recipient_email)
         and lower(u.email)=lower(expected_recipient)
         and lower(u.email)=lower(btrim(allowed_email))
         and a.next_due_date >= (now() at time zone coalesce(nullif(p.timezone,''''),''Africa/Lusaka''))::date
         and coalesce((select value::boolean from public.hka_settings where id=''horse_care_email_delivery_enabled''),false)
         and not coalesce((select value::boolean from public.hka_settings where id=''horse_care_email_kill_switch''),true)
     );
  get diagnostics changed=row_count;
  return changed=1;
end';

create or replace function public.hka_finish_care_email_delivery(
  target_delivery uuid,target_lease uuid,outcome text,
  resend_message_id text default null,safe_error_code text default null
)
returns boolean language plpgsql security definer set search_path='' as '
declare current_attempts integer; current_state text;
begin
  if outcome not in (''sent'',''retry'',''permanent_failure'',''manual_review'') then raise exception ''Invalid outcome.''; end if;
  if safe_error_code is not null and safe_error_code !~ ''^[a-z0-9][a-z0-9_.:-]{0,79}$'' then
    raise exception ''Unsafe error code.'';
  end if;
  if outcome=''sent'' and (resend_message_id is null or resend_message_id !~* ''^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'') then
    raise exception ''A valid Resend message ID is required.'';
  end if;
  select attempt_count,state into current_attempts,current_state
  from public.hka_care_email_deliveries
  where id=target_delivery and state in (''claimed'',''dispatching'') and lease_token=target_lease and lease_expires_at>now()
  for update;
  if not found then return false; end if;
  if outcome=''sent'' and current_state<>''dispatching'' then raise exception ''Delivery dispatch has not started.''; end if;

  update public.hka_care_email_deliveries
     set state=case when outcome=''retry'' and (current_attempts>=5 or expires_at<=now()+interval ''5 minutes'') then ''permanent_failure'' else outcome end,
         provider_message_id=case when outcome=''sent'' then resend_message_id else provider_message_id end,
         provider_accepted_at=case when outcome=''sent'' then now() else provider_accepted_at end,
         next_attempt_at=case when outcome=''retry'' and current_attempts<5 then now()+least(interval ''60 minutes'',interval ''5 minutes''*power(2,current_attempts-1)::double precision) else null end,
         lease_token=null,lease_expires_at=null,last_error_code=safe_error_code,
         last_error_at=case when safe_error_code is null then last_error_at else now() end,updated_at=now()
   where id=target_delivery;
  return true;
end';

create or replace function public.hka_hold_care_email_delivery(
  target_delivery uuid,target_lease uuid,safe_error_code text,resend_message_id text default null
)
returns boolean language plpgsql security definer set search_path='' as '
declare changed integer;
begin
  if safe_error_code is null or safe_error_code !~ ''^[a-z0-9][a-z0-9_.:-]{0,79}$'' then
    raise exception ''Unsafe error code.'';
  end if;
  if resend_message_id is not null and resend_message_id !~* ''^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'' then
    raise exception ''Invalid Resend message ID.'';
  end if;
  update public.hka_care_email_deliveries
     set state=''manual_review'',provider_message_id=coalesce(resend_message_id,provider_message_id),
         provider_accepted_at=case when resend_message_id is null then provider_accepted_at else now() end,
         lease_token=null,lease_expires_at=null,next_attempt_at=null,
         last_error_code=safe_error_code,last_error_at=now(),updated_at=now()
   where id=target_delivery and lease_token=target_lease and state in (''claimed'',''dispatching'');
  get diagnostics changed=row_count;
  return changed=1;
end';

revoke all on function public.hka_prepare_care_email_deliveries(timestamptz),
  public.hka_claim_care_email_deliveries(uuid,integer,text),
  public.hka_recheck_care_email_delivery(uuid,uuid,text,text),
  public.hka_begin_care_email_dispatch(uuid,uuid,text,text),
  public.hka_finish_care_email_delivery(uuid,uuid,text,text,text),
  public.hka_hold_care_email_delivery(uuid,uuid,text,text)
from public,anon,authenticated;
grant execute on function public.hka_prepare_care_email_deliveries(timestamptz),
  public.hka_claim_care_email_deliveries(uuid,integer,text),
  public.hka_recheck_care_email_delivery(uuid,uuid,text,text),
  public.hka_begin_care_email_dispatch(uuid,uuid,text,text),
  public.hka_finish_care_email_delivery(uuid,uuid,text,text,text),
  public.hka_hold_care_email_delivery(uuid,uuid,text,text)
to service_role;

commit;
