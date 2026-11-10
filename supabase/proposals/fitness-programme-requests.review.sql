-- Review proposal. Apply only after Founder approval of the request workflow.
-- Prerequisites: reviewed Message Hollie and fitness programme proposals.
begin;
set local lock_timeout='5s';
do $$
begin
  if to_regprocedure('hka_messaging.founder_id()') is null
    or to_regprocedure('hka_messaging.direct_scope(uuid,uuid)') is null
    or to_regprocedure('hka_messaging.can_send(uuid,uuid,uuid)') is null
    or to_regprocedure('hka_fitness.assign(uuid,uuid)') is null
    or to_regclass('public.hka_messages') is null
    or not (select relrowsecurity from pg_class where oid='public.hka_messages'::regclass)
  then
    raise exception 'The reviewed Message Hollie and fitness programme schemas are required.';
  end if;
  if 'hka_fitness'=any(string_to_array(replace(coalesce(current_setting('pgrst.db_schemas',true),''),' ',''),',')) then
    raise exception 'Keep hka_fitness outside the exposed Data API schemas.';
  end if;
end $$;

alter table hka_fitness.settings add column requests_enabled boolean not null default false;
create table public.hka_fitness_requests (
  id uuid primary key,
  student_id uuid not null references public.hka_profiles(id),
  founder_id uuid not null references public.hka_profiles(id),
  -- Keep the original horse identity if the owner later removes the horse.
  horse_id uuid,
  horse_name text,
  kind text not null check(kind in ('rider','horse')),
  intake jsonb not null check(hka_fitness.valid_intake(intake)),
  message_id uuid not null unique references public.hka_messages(id),
  programme_id uuid unique references public.hka_fitness_programmes(id),
  reply_message_id uuid unique references public.hka_messages(id),
  created_at timestamptz not null default now(),
  check((kind='rider' and horse_id is null and horse_name is null) or
        (kind='horse' and horse_id is not null and horse_name is not null))
);
create index fitness_requests_student_date on public.hka_fitness_requests(student_id,created_at desc);
create index fitness_requests_founder_date on public.hka_fitness_requests(founder_id,created_at desc);
alter table public.hka_fitness_requests enable row level security;
revoke all on public.hka_fitness_requests from public,anon,authenticated,service_role;
grant select on public.hka_fitness_requests to authenticated;
create policy fitness_requests_participants on public.hka_fitness_requests for select to authenticated
  using((select public.hka_active()) and (
    student_id=(select auth.uid()) or (founder_id=(select auth.uid()) and (select hka_fitness.founder()))
  ));

create function hka_fitness.requests_enabled() returns boolean
language sql stable security definer set search_path='' as $$
  select coalesce((select enabled and requests_enabled from hka_fitness.settings where id),false)
$$;

create function hka_fitness.send_request(request_id uuid,target_horse uuid,new_intake jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare
  actor uuid:=auth.uid();
  recipient uuid:=hka_messaging.founder_id();
  chat_scope uuid;
  horse_label text;
  request_kind text:=case when target_horse is null then 'rider' else 'horse' end;
  previous public.hka_fitness_requests;
  message uuid;
begin
  if actor is null or request_id is null or not hka_fitness.requests_enabled()
    or not coalesce(hka_fitness.owner(actor,target_horse),false)
    or (target_horse is null and not coalesce(hka_messaging.has_role(actor,'student'),false))
  then
    raise exception 'An active rider or the horse owner can send a programme request.' using errcode='42501';
  end if;
  if not hka_fitness.valid_intake(new_intake)
    or jsonb_typeof(new_intake->'minutes') is distinct from 'number'
    or coalesce(jsonb_typeof(new_intake->'age'),'missing') not in ('number','null')
    or exists(
      select 1 from unnest(array['goals','condition','equipment','recentWork','timeOff','professionalInstructions']) field(name)
      where jsonb_typeof(new_intake->field.name) is distinct from 'string'
    )
  then
    raise exception 'Please review the fitness profile details before sending.';
  end if;
  if exists(
    select 1 from jsonb_array_elements((new_intake->'days')||(new_intake->'health')||(new_intake->'disciplines')) item(value)
    where jsonb_typeof(item.value) is distinct from 'string'
  ) then
    raise exception 'Please review the fitness profile details before sending.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('fitness-request:'||request_id::text,0));
  select * into previous from public.hka_fitness_requests where id=request_id;
  if found then
    if previous.student_id is distinct from actor then
      raise exception 'Request unavailable.' using errcode='42501';
    end if;
    if previous.horse_id is distinct from target_horse or previous.intake is distinct from new_intake then
      raise exception 'This request was already sent. Reopen fitness to send a new request.';
    end if;
    return previous.id;
  end if;
  chat_scope:=hka_messaging.direct_scope(actor,recipient);
  if recipient is null or not coalesce(hka_messaging.founder(recipient),false)
    or not hka_messaging.direct_enabled() or not hka_messaging.can_send(actor,chat_scope,recipient)
  then
    raise exception 'Founder chat is unavailable. Your request was not sent.' using errcode='42501';
  end if;
  if target_horse is not null then
    select name into horse_label from public.hka_horses where id=target_horse and student_id=actor;
    if not found then raise exception 'Horse profile unavailable.' using errcode='42501'; end if;
  end if;
  perform hka_fitness.save_intake(actor,target_horse,new_intake);
  insert into public.hka_messages(student_id,sender_id,recipient_id,body)
    values(chat_scope,actor,recipient,case request_kind
      when 'horse' then 'Horse conditioning programme request'
      else 'Rider fitness programme request' end)
    returning id into message;
  insert into public.hka_fitness_requests(id,student_id,founder_id,horse_id,horse_name,kind,intake,message_id)
    values(request_id,actor,recipient,target_horse,horse_label,request_kind,new_intake,message);
  return request_id;
end $$;

create function hka_fitness.save_request_draft(request_id uuid,new_title text,new_intake jsonb,new_sessions jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare request public.hka_fitness_requests; draft uuid;
begin
  if not hka_fitness.requests_enabled() or not hka_fitness.founder() then
    raise exception 'Founder access required.' using errcode='42501';
  end if;
  select * into request from public.hka_fitness_requests
    where id=request_id and founder_id=auth.uid() for update;
  if not found then raise exception 'Programme request unavailable.' using errcode='42501'; end if;
  if request.programme_id is not null then return request.programme_id; end if;
  draft:=hka_fitness.save_programme(null,request.student_id,request.horse_id,request.kind,'hka',new_title,new_intake,new_sessions);
  update public.hka_fitness_requests set programme_id=draft where id=request.id;
  return draft;
end $$;

create function hka_fitness.send_requested_programme(request_id uuid,expected_draft uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare request public.hka_fitness_requests; programme public.hka_fitness_programmes; chat_scope uuid; message uuid;
begin
  if not hka_fitness.requests_enabled() or not hka_fitness.founder() then
    raise exception 'Founder access required.' using errcode='42501';
  end if;
  select * into request from public.hka_fitness_requests
    where id=request_id and founder_id=auth.uid() for update;
  if not found then raise exception 'Programme request unavailable.' using errcode='42501'; end if;
  if request.reply_message_id is not null then return request.reply_message_id; end if;
  chat_scope:=hka_messaging.direct_scope(auth.uid(),request.student_id);
  if not hka_messaging.direct_enabled() or not hka_messaging.can_send(auth.uid(),chat_scope,request.student_id) then
    raise exception 'This member’s chat is unavailable.' using errcode='42501';
  end if;
  if expected_draft is not null then
    perform hka_fitness.assign(request.programme_id,expected_draft);
  end if;
  select * into programme from public.hka_fitness_programmes where id=request.programme_id for update;
  if not found or programme.status<>'assigned' or programme.current_version_id is null
    or programme.draft_version_id is not null or programme.source<>'hka'
    or programme.student_id<>request.student_id or programme.kind<>request.kind
    or programme.horse_id is distinct from request.horse_id then
    raise exception 'Approve this member’s programme before sending it.';
  end if;
  insert into public.hka_messages(student_id,sender_id,recipient_id,body)
    values(chat_scope,auth.uid(),request.student_id,case request.kind
      when 'horse' then 'Your personalised horse conditioning programme is ready.'
      else 'Your personalised rider fitness programme is ready.' end)
    returning id into message;
  update public.hka_fitness_requests set reply_message_id=message where id=request.id;
  return message;
end $$;

create function public.hka_fitness_send_request(request_id uuid,target_horse uuid,new_intake jsonb) returns uuid
language sql security invoker set search_path='' as $$
  select hka_fitness.send_request(request_id,target_horse,new_intake)
$$;
create function public.hka_fitness_save_request_draft(request_id uuid,new_title text,new_intake jsonb,new_sessions jsonb) returns uuid
language sql security invoker set search_path='' as $$
  select hka_fitness.save_request_draft(request_id,new_title,new_intake,new_sessions)
$$;
create function public.hka_fitness_send_requested_programme(request_id uuid,expected_draft uuid) returns uuid
language sql security invoker set search_path='' as $$
  select hka_fitness.send_requested_programme(request_id,expected_draft)
$$;
revoke all on function hka_fitness.requests_enabled(),
  hka_fitness.send_request(uuid,uuid,jsonb), hka_fitness.save_request_draft(uuid,text,jsonb,jsonb),
  hka_fitness.send_requested_programme(uuid,uuid),
  public.hka_fitness_send_request(uuid,uuid,jsonb),public.hka_fitness_save_request_draft(uuid,text,jsonb,jsonb),
  public.hka_fitness_send_requested_programme(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function hka_fitness.send_request(uuid,uuid,jsonb),hka_fitness.save_request_draft(uuid,text,jsonb,jsonb),
  hka_fitness.send_requested_programme(uuid,uuid),
  public.hka_fitness_send_request(uuid,uuid,jsonb),public.hka_fitness_save_request_draft(uuid,text,jsonb,jsonb),
  public.hka_fitness_send_requested_programme(uuid,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
