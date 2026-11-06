-- REVIEW PROPOSAL ONLY. Separate Founder approval required for execution.
-- RESTRICTIVE FEATURE ROLLBACK, deliberately NOT restoration of legacy policies.
-- Matches 202611060001_message_hollie.sql only.
-- See docs/MESSAGE_HOLLIE_APPROVAL.md for retained schema/API contract.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
set local search_path=pg_catalog,public;
lock table public.hka_messages in access exclusive mode;

do $preflight$
declare baseline hka_messaging.installation_snapshot%rowtype;
 actual_policies jsonb; actual_functions jsonb; actual_triggers jsonb;
begin
 if current_user<>'postgres' then raise exception 'Reviewed postgres owner required.'; end if;
 if not exists(select 1 from pg_class where oid='public.hka_messages'::regclass and relrowsecurity) then
  raise exception 'Messaging RLS must remain enabled.';
 end if;
 -- Never accept a disabled/replica/otherwise altered guard, even if an unsafe
 -- snapshot records the same state. Validate origin execution and exact wiring.
 if current_setting('session_replication_role')<>'origin'
 or not exists(select 1 from pg_trigger t
  where t.tgrelid='public.hka_messages'::regclass
   and t.tgname='hka_message_guard_write' and not t.tgisinternal
   and t.tgenabled='O'
   and pg_get_triggerdef(t.oid)='CREATE TRIGGER hka_message_guard_write BEFORE INSERT OR UPDATE ON public.hka_messages FOR EACH ROW EXECUTE FUNCTION hka_messaging.guard_write()') then
  raise exception 'Installed policies/helpers/triggers drifted: required enabled origin-mode message guard missing or altered.';
 end if;
 select * into strict baseline from hka_messaging.installation_snapshot where singleton;
 select jsonb_agg(to_jsonb(p) order by p.policyname) into actual_policies
  from pg_policies p where p.schemaname='public' and p.tablename='hka_messages';
 select jsonb_object_agg(p.oid::regprocedure::text,jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text))
  into actual_functions from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='hka_messaging' or (n.nspname='public' and p.proname='hka_message_contacts');
 select jsonb_agg(jsonb_build_object('name',t.tgname,'definition',pg_get_triggerdef(t.oid),'enabled',t.tgenabled::text) order by t.tgname) into actual_triggers
  from pg_trigger t where t.tgrelid='public.hka_messages'::regclass and not t.tgisinternal;
 if actual_policies is distinct from baseline.policy_definitions
  or actual_functions is distinct from baseline.function_definitions
  or actual_triggers is distinct from baseline.trigger_definitions then
  raise exception 'Installed policies/helpers/triggers drifted or rollback already ran: review before proceeding.';
 end if;
end
$preflight$;

-- Removes platform-wide NEW Founder conversations/sends, never restores global
-- Founder reads or cross-guardian access. Existing participants retain history.
-- Ordinary approved assigned/consented paths remain available.
create or replace function hka_messaging.direct_enabled() returns boolean
language sql stable set search_path='' as $$ select false $$;
revoke all on function hka_messaging.direct_enabled() from public,anon,authenticated,service_role;

-- Retain all strict RLS, caller-bound private helpers, public invoker contacts
-- API, immutable-message trigger and recipient-only column write permissions.
revoke all on public.hka_messages from public,anon,authenticated;
revoke all(id,student_id,sender_id,recipient_id,body,created_at,read_at)
 on public.hka_messages from public,anon,authenticated;
grant select,insert on public.hka_messages to authenticated;
grant update(read_at) on public.hka_messages to authenticated;

-- INTENTIONAL DIFFERENCES FROM PRE-MIGRATION SCHEMA:
-- * nullable student_id retains non-Student direct history without deleting rows;
-- * hka_messaging schema, owner-only installation snapshot and all helpers remain;
-- * public.hka_message_contacts() retains its exact ten-column return contract;
-- * strict participant/child-oversight RLS and immutable-message trigger remain;
-- * no table UPDATE/DELETE or cross-guardian/global Founder SELECT is restored.
-- FRONTEND: retain grant-driven useMessaging/contacts support. Existing Founder
-- direct threads become history-only unless another approved relationship grants
-- sends; clients must honour can_message=false and directory_entry=false.
-- Do not restore old client code that assumes student_id is always non-null,
-- derives permissions from dashboard roles, or directly queries private helpers.
-- Re-enabling direct messaging requires a separately reviewed forward change;
-- replaying the original migration/rollback is intentionally rejected.

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
