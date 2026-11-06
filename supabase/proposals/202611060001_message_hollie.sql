-- REVIEW PROPOSAL ONLY: separate Founder approval required for ANY execution.
-- Project sqaydpbqycvaictieafk; no deployment or data changes authorised.
-- Supersedes October proposal; see docs/MESSAGE_HOLLIE_APPROVAL.md.
-- Existing activation consent suffices; no plan, assignment, link code or chat approval.
-- This proposal has NOT been applied.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
-- Fix deparser name visibility for exact policy expression comparison.
set local search_path=pg_catalog,public;
lock table public.hka_messages in access exclusive mode;

do $preflight$
begin
 if current_user<>'postgres' or not exists(select 1 from pg_roles
    where rolname=current_user and (rolsuper or rolbypassrls)) then
  raise exception 'Run only as the reviewed postgres migration owner.';
 end if;
 if exists(select 1 from (values('hka_messages'),('hka_profiles'),('hka_account_roles'),
    ('hka_guardians'),('hka_coach_students'),('hka_link_requests')) required(name)
   left join pg_class c on c.oid=to_regclass('public.'||required.name)
   where c.oid is null or not c.relrowsecurity) then
  raise exception 'A required table is absent or its RLS is disabled.';
 end if;
 if has_column_privilege('authenticated','public.hka_profiles','birth_date','UPDATE')
 or has_column_privilege('authenticated','public.hka_profiles','role','UPDATE')
 or has_column_privilege('authenticated','public.hka_profiles','suspended','UPDATE') then
  raise exception 'Protected age/role/activation columns became client-writable.';
 end if;
 if (select array_agg(column_name::text order by ordinal_position) from information_schema.columns
   where table_schema='public' and table_name='hka_messages')
   is distinct from array['id','student_id','sender_id','recipient_id','body','read_at','created_at'] then
  raise exception 'Message column schema drift: review before applying.';
 end if;
 -- Full live USING/WITH CHECK expressions, command, permissiveness and exact
 -- authenticated role target captured read-only on 2026-10-31.
 -- Exact deparser whitespace deliberately fails closed.
 if (select count(*) from pg_policies where schemaname='public' and tablename='hka_messages')<>3
 or exists(
  select 1 from (values
   ('hka_messages_insert','INSERT',null,$baseline$((sender_id = auth.uid()) AND (hka_admin() OR (hka_teach(student_id) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT g.guardian_id
   FROM hka_guardians g
  WHERE ((g.student_id = hka_messages.student_id) AND (g.status = 'approved'::text) AND (g.consent_at IS NOT NULL)))))) OR ((student_id = auth.uid()) AND (recipient_id IN ( SELECT cs.coach_id
   FROM hka_coach_students cs
  WHERE (cs.student_id = auth.uid())))) OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1
   FROM hka_profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'guardian'::text)))) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT cs.coach_id
   FROM hka_coach_students cs
  WHERE (cs.student_id = hka_messages.student_id)))))))$baseline$),
   ('hka_messages_read','SELECT',$baseline$(((auth.uid() = sender_id) OR (auth.uid() = recipient_id)) OR hka_admin() OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1
   FROM hka_profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'guardian'::text))))))$baseline$,null),
   ('hka_messages_update_read','UPDATE',$baseline$(recipient_id = auth.uid())$baseline$,$baseline$(recipient_id = auth.uid())$baseline$)
  ) expected(name,command,qual,check_expr)
  left join pg_policies actual on actual.schemaname='public'
   and actual.tablename='hka_messages' and actual.policyname=expected.name
  where actual.policyname is null or actual.cmd<>expected.command
   or actual.permissive<>'PERMISSIVE'
   or actual.roles is distinct from array['authenticated']::name[]
   or actual.qual is distinct from expected.qual
   or actual.with_check is distinct from expected.check_expr
 ) then
  raise exception 'Live message policy definition drift: review complete catalog before applying.';
 end if;
 if exists(select 1 from pg_trigger where tgrelid='public.hka_messages'::regclass and not tgisinternal) then
  raise exception 'Unexpected message trigger: review before applying.';
 end if;
 if exists(select 1 from pg_namespace where nspname='hka_messaging')
 or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname like 'hka_message_%') then
  raise exception 'Messaging helper/schema collision: do not overwrite an existing installation.';
 end if;
 if not exists(select 1 from information_schema.columns where table_schema='public'
    and table_name='hka_profiles' and column_name='birth_date'
    and data_type='date' and is_nullable='NO') then
  raise exception 'Age schema drift: review trusted adulthood evidence; NULL is never proof of adulthood.';
 end if;
end
$preflight$;

-- Dedicated NON-EXPOSED schema. Confirm absence from Data API/GraphQL exposed
-- schemas before approval; a missing server GUC does not prove configuration.
create schema hka_messaging authorization postgres;
revoke all on schema hka_messaging from public,anon,authenticated,service_role;
grant usage on schema hka_messaging to authenticated;
do $exposure$
begin
 if 'hka_messaging'=any(string_to_array(
    replace(coalesce(current_setting('pgrst.db_schemas',true),''),' ',''),',')) then
  raise exception 'hka_messaging must not be an exposed API schema.';
 end if;
end
$exposure$;

alter table public.hka_messages alter column student_id drop not null;

-- These helpers read durable authorised purposes. Dashboard role/is_active are
-- presentation state and must never determine messaging privileges.
create function hka_messaging.has_role(person uuid,purpose_name text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.hka_account_roles ar
  where ar.user_id=person and ar.purpose=purpose_name and ar.status='authorized')
$$;

create function hka_messaging.verified(person uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.hka_profiles p join auth.users u on u.id=p.id
  where p.id=person and not p.suspended and u.email_confirmed_at is not null
   and exists(select 1 from public.hka_account_roles ar
    where ar.user_id=p.id and ar.status='authorized'))
$$;

-- Roles/onboarding/auth metadata are NOT trusted age attestations.
-- Current live schema requires DOB. Defensive NULL handling remains fail-closed.
create function hka_messaging.adult(person uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.hka_profiles p where p.id=person
  and p.birth_date <= (current_date-interval '18 years')::date)
$$;

create function hka_messaging.guardian(guardian uuid,student uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select hka_messaging.verified(guardian) and hka_messaging.verified(student)
  and hka_messaging.adult(guardian) and hka_messaging.has_role(guardian,'guardian')
  and exists(select 1 from public.hka_guardians g where g.guardian_id=guardian
   and g.student_id=student and g.status='approved' and g.consent_at is not null)
$$;

create function hka_messaging.ready(person uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select hka_messaging.verified(person) and (hka_messaging.adult(person)
  or exists(select 1 from public.hka_guardians g where g.student_id=person
   and hka_messaging.guardian(g.guardian_id,person)))
$$;

create function hka_messaging.founder(person uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select hka_messaging.ready(person) and hka_messaging.has_role(person,'admin')
$$;

create function hka_messaging.coach(coach uuid,student uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select hka_messaging.ready(coach) and hka_messaging.ready(student)
  and hka_messaging.has_role(coach,'coach') and hka_messaging.has_role(student,'student')
  and exists(select 1 from public.hka_coach_students cs
   where cs.coach_id=coach and cs.student_id=student)
  and (hka_messaging.adult(student)
   or exists(select 1 from public.hka_link_requests r where r.student_id=student
    and r.claimant_id=coach and r.kind='coach' and r.status='approved'
    and r.founder_approved_at is not null and r.guardian_consented_at is not null
    and r.revoked_at is null))
$$;

-- Constant is the sole reversible feature switch. No client can execute/modify it.
create function hka_messaging.direct_enabled() returns boolean
language sql stable set search_path='' as $$ select true $$;

-- Canonical scope depends on durable Student purpose, never selected dashboard.
-- Include non-adult/unknown-age members for legitimate guardian oversight even
-- when Horse Owner is their only purpose. Never invent a child for adult peers.
create function hka_messaging.direct_scope(actor uuid,peer uuid) returns uuid
language sql stable security definer set search_path='' as $$
 select p.id from public.hka_profiles p
 where p.id in (actor,peer) and not hka_messaging.founder(p.id)
  and (hka_messaging.has_role(p.id,'student') or not hka_messaging.adult(p.id))
  and (hka_messaging.founder(actor) or hka_messaging.founder(peer))
 order by p.id limit 1
$$;

-- Authenticated callers get EXECUTE only on these caller-bound entry points,
-- plus contacts(). Arbitrary role/relationship/age helpers stay owner-only.
create function hka_messaging.can_send(actor uuid,student uuid,peer uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(actor=auth.uid() and actor<>peer
  and hka_messaging.ready(actor) and hka_messaging.ready(peer) and (
   (hka_messaging.direct_enabled()
    and (hka_messaging.founder(actor) or hka_messaging.founder(peer))
    and student is not distinct from hka_messaging.direct_scope(actor,peer))
   or (student is not null and (
    (actor=student and hka_messaging.coach(peer,student))
    or (peer=student and hka_messaging.coach(actor,student))
    or (actor=student and hka_messaging.guardian(peer,student))
    or (peer=student and hka_messaging.guardian(actor,student))
    or (hka_messaging.guardian(actor,student) and hka_messaging.coach(peer,student))
    or (hka_messaging.coach(actor,student) and hka_messaging.guardian(peer,student))
   ))
  ),false)
$$;

create function hka_messaging.can_read(student uuid,sender uuid,recipient uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(hka_messaging.ready(auth.uid()) and (
  auth.uid() in (sender,recipient)
  -- Oversight applies ONLY when the linked child is an actual participant.
  -- A child scope on two adults' direct messages never grants another guardian access.
  or (student is not null and student in (sender,recipient)
   and not hka_messaging.adult(student)
   and hka_messaging.guardian(auth.uid(),student))
 ),false)
$$;

-- Privilege elevation stays in the non-exposed schema. This zero-argument
-- projection is bound to auth.uid() and returns no email, DOB or onboarding data.
create function hka_messaging.contacts()
returns table(id uuid,full_name text,role text,role_label text,student_id uuid,
 student_name text,relationship text,can_message boolean,directory_entry boolean,created_at timestamptz)
language sql stable security definer set search_path='' as $$
 with actor as (select auth.uid() as id),
 candidates as (
  select p.id,hka_messaging.direct_scope(a.id,p.id) as student_id
   from public.hka_profiles p cross join actor a
   where hka_messaging.founder(a.id) or hka_messaging.founder(p.id)
  union
  select case when cs.coach_id=a.id then cs.student_id else cs.coach_id end,cs.student_id
   from public.hka_coach_students cs cross join actor a where a.id in (cs.coach_id,cs.student_id)
  union
  select case when g.guardian_id=a.id then g.student_id else g.guardian_id end,g.student_id
   from public.hka_guardians g cross join actor a where a.id in (g.guardian_id,g.student_id)
  union
  select case when g.guardian_id=a.id then cs.coach_id else g.guardian_id end,g.student_id
   from public.hka_guardians g join public.hka_coach_students cs on cs.student_id=g.student_id
   cross join actor a where a.id in (g.guardian_id,cs.coach_id)
  union
  select participants.id,case when hka_messaging.founder(m.sender_id)
    or hka_messaging.founder(m.recipient_id)
    then hka_messaging.direct_scope(m.sender_id,m.recipient_id) else m.student_id end
   from public.hka_messages m
   cross join lateral (values(m.sender_id),(m.recipient_id)) participants(id)
   where hka_messaging.can_read(m.student_id,m.sender_id,m.recipient_id)
 ),
 normalised as (
  select distinct c.id,case when hka_messaging.founder(a.id) or hka_messaging.founder(c.id)
    then hka_messaging.direct_scope(a.id,c.id) else c.student_id end as student_id
  from candidates c cross join actor a
 ),
 projected as (
  select p.id,p.full_name,case when hka_messaging.founder(p.id) then 'admin' else p.role end as role,
   coalesce((select string_agg(case ar.purpose when 'admin' then 'Founder / Admin'
     when 'student' then 'Student' when 'guardian' then 'Parent / Guardian'
     when 'coach' then 'Coach' when 'horse_owner' then 'Horse Owner' end,' / ' order by ar.purpose)
    from public.hka_account_roles ar where ar.user_id=p.id and ar.status='authorized'),
    'Awaiting approval') as role_label,
   c.student_id,s.full_name as student_name,
   case when hka_messaging.founder(a.id) or hka_messaging.founder(p.id)
     then 'Founder direct message'
    when hka_messaging.coach(a.id,c.student_id) or hka_messaging.coach(p.id,c.student_id)
     then 'Assigned coaching relationship' else 'Approved family relationship' end as relationship,
   hka_messaging.can_send(a.id,c.student_id,p.id) as can_message,
   hka_messaging.founder(a.id) and hka_messaging.direct_enabled()
    and hka_messaging.ready(p.id) as directory_entry,p.created_at
  from normalised c join public.hka_profiles p on p.id=c.id
  left join public.hka_profiles s on s.id=c.student_id cross join actor a
  where a.id<>p.id and hka_messaging.ready(a.id)
   and ((hka_messaging.founder(a.id) and hka_messaging.direct_enabled()
     and hka_messaging.ready(p.id))
    or hka_messaging.can_send(a.id,c.student_id,p.id)
    or exists(select 1 from public.hka_messages m where p.id in (m.sender_id,m.recipient_id)
     and hka_messaging.can_read(m.student_id,m.sender_id,m.recipient_id)
     and (m.student_id is not distinct from c.student_id
      or hka_messaging.founder(m.sender_id) or hka_messaging.founder(m.recipient_id))))
 )
 select distinct * from projected order by full_name,id,student_id
$$;

-- Public API remains securely accessible; wrapper itself has NO elevated rights.
create function public.hka_message_contacts()
returns table(id uuid,full_name text,role text,role_label text,student_id uuid,
 student_name text,relationship text,can_message boolean,directory_entry boolean,created_at timestamptz)
language sql stable security invoker set search_path='' as $$
 select * from hka_messaging.contacts()
$$;

-- Revoke Supabase and PostgreSQL defaults, including service_role, immediately
-- within the same transaction; grant only the actual policy/API entry points.
revoke all on all functions in schema hka_messaging from public,anon,authenticated,service_role;
revoke all on function public.hka_message_contacts() from public,anon,authenticated,service_role;
grant execute on function hka_messaging.can_send(uuid,uuid,uuid),
 hka_messaging.can_read(uuid,uuid,uuid),hka_messaging.contacts(),
 public.hka_message_contacts() to authenticated;

drop policy hka_messages_insert on public.hka_messages;
drop policy hka_messages_read on public.hka_messages;
drop policy hka_messages_update_read on public.hka_messages;
create policy hka_messages_insert on public.hka_messages for insert to authenticated
 with check(sender_id=auth.uid() and read_at is null
  and char_length(btrim(body)) between 1 and 4000
  and hka_messaging.can_send(auth.uid(),student_id,recipient_id));
create policy hka_messages_read on public.hka_messages for select to authenticated
 using(hka_messaging.can_read(student_id,sender_id,recipient_id));
create policy hka_messages_update_read on public.hka_messages for update to authenticated
 using(recipient_id=auth.uid() and hka_messaging.can_read(student_id,sender_id,recipient_id))
 with check(recipient_id=auth.uid() and hka_messaging.can_read(student_id,sender_id,recipient_id));

create function hka_messaging.guard_write() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='INSERT' then
  if new.sender_id is distinct from auth.uid() or new.read_at is not null then
   raise exception 'Message identity or state is not authorised.' using errcode='42501';
  end if;
  new.created_at:=now();
 else
  if auth.uid() is distinct from old.recipient_id
    or (to_jsonb(new)-'read_at') is distinct from (to_jsonb(old)-'read_at') then
   raise exception 'Only the recipient may mark a message read.' using errcode='42501';
  end if;
  if new.read_at is null then
   raise exception 'Read status cannot be cleared.' using errcode='42501';
  end if;
  new.read_at:=coalesce(old.read_at,now());
 end if;
 return new;
end
$$;
revoke all on function hka_messaging.guard_write() from public,anon,authenticated,service_role;
create trigger hka_message_guard_write before insert or update on public.hka_messages
 for each row execute function hka_messaging.guard_write();

-- Reset client grants (including DELETE and column-level grants), then allow
-- only SELECT/INSERT and recipient read receipts. Historical data is unchanged.
revoke all on public.hka_messages from public,anon,authenticated;
revoke all(id,student_id,sender_id,recipient_id,body,created_at,read_at)
 on public.hka_messages from public,anon,authenticated;
grant select,insert on public.hka_messages to authenticated;
grant update(read_at) on public.hka_messages to authenticated;

-- Record exact installed definitions AND enabled states for rollback drift checks.
-- This owner-only catalog snapshot contains definitions, never application rows.
create table hka_messaging.installation_snapshot (
 singleton boolean primary key default true check(singleton),
 policy_definitions jsonb not null,
 function_definitions jsonb not null,
 trigger_definitions jsonb not null
);
alter table hka_messaging.installation_snapshot enable row level security;
revoke all on hka_messaging.installation_snapshot from public,anon,authenticated,service_role;
insert into hka_messaging.installation_snapshot(policy_definitions,function_definitions,trigger_definitions)
select
 (select jsonb_agg(to_jsonb(p) order by p.policyname) from pg_policies p
   where p.schemaname='public' and p.tablename='hka_messages'),
 (select jsonb_object_agg(p.oid::regprocedure::text,jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='hka_messaging' or (n.nspname='public' and p.proname='hka_message_contacts')),
 (select jsonb_agg(jsonb_build_object('name',t.tgname,'definition',pg_get_triggerdef(t.oid),'enabled',t.tgenabled::text) order by t.tgname) from pg_trigger t
  where t.tgrelid='public.hka_messages'::regclass and not t.tgisinternal);

-- Validate the actual catalog immediately before commit, independently of any
-- recorded enabled state. O is the reviewed origin-mode INSERT/UPDATE guard.
do $guard_state$
begin
 if current_setting('session_replication_role')<>'origin'
 or not exists(select 1 from pg_trigger t
  where t.tgrelid='public.hka_messages'::regclass
   and t.tgname='hka_message_guard_write' and not t.tgisinternal
   and t.tgenabled='O'
   and pg_get_triggerdef(t.oid)='CREATE TRIGGER hka_message_guard_write BEFORE INSERT OR UPDATE ON public.hka_messages FOR EACH ROW EXECUTE FUNCTION hka_messaging.guard_write()') then
  raise exception 'Required message guard missing, disabled or altered; origin-mode execution required.';
 end if;
 if (select jsonb_agg(jsonb_build_object('name',t.tgname,'definition',pg_get_triggerdef(t.oid),'enabled',t.tgenabled::text) order by t.tgname)
     from pg_trigger t where t.tgrelid='public.hka_messages'::regclass and not t.tgisinternal)
    is distinct from (select trigger_definitions from hka_messaging.installation_snapshot where singleton)
 or (select jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text)
     from pg_proc p where p.oid='hka_messaging.guard_write()'::regprocedure)
    is distinct from (select function_definitions->'hka_messaging.guard_write()'
     from hka_messaging.installation_snapshot where singleton) then
  raise exception 'Message guard definition/state changed before commit.';
 end if;
end
$guard_state$;

notify pgrst,'reload schema';
commit;
