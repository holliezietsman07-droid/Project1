begin;
set local search_path=pg_catalog,public;
do $$ begin if current_database() !~ '^hka_messaging_security_[a-z0-9_]+$' or current_user<>'postgres' then raise exception 'Wrong isolated target'; end if; if exists(select 1 from public.hka_profiles) or exists(select 1 from auth.users) then raise exception 'Schema-only empty database required; never test on existing accounts'; end if; end $$;
-- DISPOSABLE LOCAL DATABASE ONLY. Runner rejects non-loopback/non-test targets.
-- Uses current restored HKA schema and real signup triggers; never copies live rows.
create schema hka_messaging_test;
grant usage on schema hka_messaging_test to authenticated,anon;
create function hka_messaging_test.uid(n integer) returns uuid
-- Reuse the reviewed identity UUID with entirely synthetic local auth/profile rows.
language sql immutable as $fixture_identity$ select case when n=1 then 'f7c3e52e-4f5e-47d0-8139-b28cb296d526'::uuid
 else ('f1000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid end $fixture_identity$;
create function hka_messaging_test.ok(condition boolean,label text) returns text
language plpgsql as $$
begin
 if condition is distinct from true then raise exception 'FAIL: %',label; end if;
 return 'PASS: '||label;
end $$;
create function hka_messaging_test.denied(statement text,label text) returns text
language plpgsql security invoker as $$
begin
 begin execute statement;
 exception when insufficient_privilege then return 'PASS: '||label; end;
 raise exception 'FAIL (expected 42501): %',label;
end $$;
create function hka_messaging_test.rejects(statement text,expected_message text,label text) returns text
language plpgsql security invoker as $$
begin
 begin execute statement;
 exception when raise_exception then
  if position(expected_message in sqlerrm)>0 then return 'PASS: '||label; end if;
  raise;
 end;
 raise exception 'FAIL (expected preflight rejection): %',label;
end $$;
create function hka_messaging_test.fingerprint() returns jsonb
language plpgsql security invoker as $$
declare t record; rows_hash text; result jsonb:='{}';
begin
 for t in select tablename from pg_tables where schemaname='public' and tablename like 'hka_%' order by tablename loop
  execute format('select md5(coalesce(string_agg(row_json::text,'''' order by row_json::text),'''')) from (select to_jsonb(t) as row_json from public.%I t) q',t.tablename) into rows_hash;
  result:=result||jsonb_build_object(t.tablename,rows_hash);
 end loop;
 select md5(coalesce(string_agg(to_jsonb(u)::text,'' order by id),'')) into rows_hash from auth.users u;
 result:=result||jsonb_build_object('auth.users',rows_hash);
 return result;
end $$;
create table hka_messaging_test.fingerprints(label text primary key,value jsonb);
alter table hka_messaging_test.fingerprints enable row level security;
revoke all on hka_messaging_test.fingerprints from public,anon,authenticated;

do $fixtures$
declare row record; birthday date;
begin
 for row in select * from (values
  (1,'Founder',array['admin','student','guardian','coach','horse_owner'],'coach',false,true),
  (2,'Adult Student',array['student'],'student',false,true),
  (3,'Coach A',array['coach','student','guardian','horse_owner'],'student',false,true),
  (4,'Coach B',array['coach'],'coach',false,true),
  (5,'Guardian One',array['guardian','student','coach','horse_owner'],'coach',false,true),
  (6,'Guardian Two',array['guardian'],'guardian',false,true),
  (7,'Child',array['student','horse_owner'],'student',false,true),
  (8,'Unrelated Student',array['student'],'student',false,true),
  (9,'Horse Owner',array['horse_owner'],'student',false,true),
  (10,'Suspended Student',array['student'],'student',true,true),
  (11,'Unverified Student',array['student'],'student',false,false),
  (12,'Pending Coach',array['coach'],'coach',false,true),
  (13,'Unconsented Child',array['student','horse_owner'],'student',false,true),
  (14,'Legacy Age Case',array['student'],'student',false,true),
  (15,'Revoked Coach',array['coach'],'coach',false,true),
  (16,'Child Horse Owner',array['horse_owner'],'student',false,true),
  (17,'Pending Guardian',array['guardian'],'guardian',false,true),
  (18,'Another Admin',array['admin','horse_owner'],'admin',false,true)
 ) v(n,name,purposes,dashboard,suspended,confirmed) loop
  birthday:=case when row.n in (7,13,16) then (current_date-interval '12 years')::date else date '1990-01-01' end;
  insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
  values(hka_messaging_test.uid(row.n),'hka-isolated-'||row.n||'@example.invalid',
    case when row.confirmed then now() else null end,
    jsonb_build_object('full_name',row.name,'birth_date',birthday,'account_purposes',to_jsonb(array_remove(row.purposes,'admin')),'timezone','UTC'));
  -- Ensure Founder/approved fixture roles through owner-only fixture writes.
  -- Real signup trigger still ran; these changes are confined to disposable DB.
  insert into public.hka_account_roles(user_id,purpose,status,is_active)
   select hka_messaging_test.uid(row.n),purpose,'authorized',false from unnest(row.purposes) purpose
   on conflict(user_id,purpose) do nothing;
  update public.hka_account_roles set is_active=false where user_id=hka_messaging_test.uid(row.n);
  update public.hka_account_roles set status=case row.n when 12 then 'requested' when 15 then 'revoked' else 'authorized' end,
   approved_at=case when row.n in (12,15) then null else now() end,
   approved_by=case when row.n in (12,15) then null else hka_messaging_test.uid(1) end
   where user_id=hka_messaging_test.uid(row.n);
  -- Founder profile already exists before other approved_by references are used.
  update public.hka_account_roles set is_active=true
   where user_id=hka_messaging_test.uid(row.n) and purpose=row.dashboard and status='authorized';
  update public.hka_profiles set role=row.dashboard,suspended=row.suspended where id=hka_messaging_test.uid(row.n);
 end loop;
 insert into public.hka_guardians(student_id,guardian_id,child_label,status,verified_by,consent_at)
 select hka_messaging_test.uid(child),hka_messaging_test.uid(guardian),'Fixture child',status,hka_messaging_test.uid(1),
  case when status='approved' then now() else null end
 from (values(7,5,'approved'),(7,6,'approved'),(7,17,'pending'),(16,5,'approved')) v(child,guardian,status);
 insert into public.hka_coach_students(coach_id,student_id)
 select hka_messaging_test.uid(coach),hka_messaging_test.uid(student)
 from (values(3,2),(3,7),(3,14),(3,13),(4,8)) v(coach,student);
 insert into public.hka_student_link_codes(id,student_id,kind,code_hash,expires_at)
 values(hka_messaging_test.uid(201),hka_messaging_test.uid(7),'coach',decode(repeat('01',32),'hex'),now()+interval '1 day');
 insert into public.hka_link_requests(code_id,student_id,claimant_id,kind,status,founder_approved_at,founder_id,guardian_consented_at)
 values(hka_messaging_test.uid(201),hka_messaging_test.uid(7),hka_messaging_test.uid(3),'coach','approved',now(),hka_messaging_test.uid(1),now());
 -- Historical rows are established before proposed identity-write trigger exists.
 insert into public.hka_messages(id,student_id,sender_id,recipient_id,body,read_at)
 select hka_messaging_test.uid(n),hka_messaging_test.uid(student),hka_messaging_test.uid(sender),hka_messaging_test.uid(recipient),'Historical fixture',
  case when n=105 then timestamptz '2020-01-01 00:00:00+00' else null end
 from (values(101,7,3,5),(102,7,3,7),(103,8,4,8),(104,7,1,6),(105,2,2,3),(106,7,7,1)) v(n,student,sender,recipient);
end
$fixtures$;
insert into hka_messaging_test.fingerprints values('before_migration',hka_messaging_test.fingerprint());
savepoint drift;
alter policy hka_messages_read on public.hka_messages using (true);
select hka_messaging_test.rejects('do $preflight$
begin
 if current_user<>''postgres'' or not exists(select 1 from pg_roles
    where rolname=current_user and (rolsuper or rolbypassrls)) then
  raise exception ''Run only as the reviewed postgres migration owner.'';
 end if;
 if exists(select 1 from (values(''hka_messages''),(''hka_profiles''),(''hka_account_roles''),
    (''hka_guardians''),(''hka_coach_students''),(''hka_link_requests'')) required(name)
   left join pg_class c on c.oid=to_regclass(''public.''||required.name)
   where c.oid is null or not c.relrowsecurity) then
  raise exception ''A required table is absent or its RLS is disabled.'';
 end if;
 if has_column_privilege(''authenticated'',''public.hka_profiles'',''birth_date'',''UPDATE'')
 or has_column_privilege(''authenticated'',''public.hka_profiles'',''role'',''UPDATE'')
 or has_column_privilege(''authenticated'',''public.hka_profiles'',''suspended'',''UPDATE'') then
  raise exception ''Protected age/role/activation columns became client-writable.'';
 end if;
 if (select array_agg(column_name::text order by ordinal_position) from information_schema.columns
   where table_schema=''public'' and table_name=''hka_messages'')
   is distinct from array[''id'',''student_id'',''sender_id'',''recipient_id'',''body'',''read_at'',''created_at''] then
  raise exception ''Message column schema drift: review before applying.'';
 end if;
 -- Full live USING/WITH CHECK expressions, command, permissiveness and exact
 -- authenticated role target captured read-only on 2026-10-31.
 -- Exact deparser whitespace deliberately fails closed.
 if (select count(*) from pg_policies where schemaname=''public'' and tablename=''hka_messages'')<>3
 or exists(
  select 1 from (values
   (''hka_messages_insert'',''INSERT'',null,$baseline$((sender_id = auth.uid()) AND (hka_admin() OR (hka_teach(student_id) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT g.guardian_id
   FROM hka_guardians g
  WHERE ((g.student_id = hka_messages.student_id) AND (g.status = ''approved''::text) AND (g.consent_at IS NOT NULL)))))) OR ((student_id = auth.uid()) AND (recipient_id IN ( SELECT cs.coach_id
   FROM hka_coach_students cs
  WHERE (cs.student_id = auth.uid())))) OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1
   FROM hka_profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ''guardian''::text)))) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT cs.coach_id
   FROM hka_coach_students cs
  WHERE (cs.student_id = hka_messages.student_id)))))))$baseline$),
   (''hka_messages_read'',''SELECT'',$baseline$(((auth.uid() = sender_id) OR (auth.uid() = recipient_id)) OR hka_admin() OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1
   FROM hka_profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ''guardian''::text))))))$baseline$,null),
   (''hka_messages_update_read'',''UPDATE'',$baseline$(recipient_id = auth.uid())$baseline$,$baseline$(recipient_id = auth.uid())$baseline$)
  ) expected(name,command,qual,check_expr)
  left join pg_policies actual on actual.schemaname=''public''
   and actual.tablename=''hka_messages'' and actual.policyname=expected.name
  where actual.policyname is null or actual.cmd<>expected.command
   or actual.permissive<>''PERMISSIVE''
   or actual.roles is distinct from array[''authenticated'']::name[]
   or actual.qual is distinct from expected.qual
   or actual.with_check is distinct from expected.check_expr
 ) then
  raise exception ''Live message policy definition drift: review complete catalog before applying.'';
 end if;
 if exists(select 1 from pg_trigger where tgrelid=''public.hka_messages''::regclass and not tgisinternal) then
  raise exception ''Unexpected message trigger: review before applying.'';
 end if;
 if exists(select 1 from pg_namespace where nspname=''hka_messaging'')
 or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname=''public'' and p.proname like ''hka_message_%'') then
  raise exception ''Messaging helper/schema collision: do not overwrite an existing installation.'';
 end if;
 if not exists(select 1 from information_schema.columns where table_schema=''public''
    and table_name=''hka_profiles'' and column_name=''birth_date''
    and data_type=''date'' and is_nullable=''NO'') then
  raise exception ''Age schema drift: review trusted adulthood evidence; NULL is never proof of adulthood.'';
 end if;
 if not exists(select 1 from public.hka_profiles p join auth.users u on u.id=p.id
  where p.id=''f7c3e52e-4f5e-47d0-8139-b28cb296d526''::uuid
   and not p.suspended and u.email_confirmed_at is not null
   and p.birth_date <= (current_date-interval ''18 years'')::date
   and exists(select 1 from public.hka_account_roles ar
    where ar.user_id=p.id and ar.purpose=''admin'' and ar.status=''authorized'')) then
  raise exception ''Designated Hollie Founder account must be present, confirmed, adult and authorised.'';
 end if;
end
$preflight$;','Live message policy definition drift','same-name SELECT expression drift');
rollback to savepoint drift;
savepoint drift;
alter policy hka_messages_insert on public.hka_messages with check (true);
select hka_messaging_test.rejects('do $preflight$
begin
 if current_user<>''postgres'' or not exists(select 1 from pg_roles
    where rolname=current_user and (rolsuper or rolbypassrls)) then
  raise exception ''Run only as the reviewed postgres migration owner.'';
 end if;
 if exists(select 1 from (values(''hka_messages''),(''hka_profiles''),(''hka_account_roles''),
    (''hka_guardians''),(''hka_coach_students''),(''hka_link_requests'')) required(name)
   left join pg_class c on c.oid=to_regclass(''public.''||required.name)
   where c.oid is null or not c.relrowsecurity) then
  raise exception ''A required table is absent or its RLS is disabled.'';
 end if;
 if has_column_privilege(''authenticated'',''public.hka_profiles'',''birth_date'',''UPDATE'')
 or has_column_privilege(''authenticated'',''public.hka_profiles'',''role'',''UPDATE'')
 or has_column_privilege(''authenticated'',''public.hka_profiles'',''suspended'',''UPDATE'') then
  raise exception ''Protected age/role/activation columns became client-writable.'';
 end if;
 if (select array_agg(column_name::text order by ordinal_position) from information_schema.columns
   where table_schema=''public'' and table_name=''hka_messages'')
   is distinct from array[''id'',''student_id'',''sender_id'',''recipient_id'',''body'',''read_at'',''created_at''] then
  raise exception ''Message column schema drift: review before applying.'';
 end if;
 -- Full live USING/WITH CHECK expressions, command, permissiveness and exact
 -- authenticated role target captured read-only on 2026-10-31.
 -- Exact deparser whitespace deliberately fails closed.
 if (select count(*) from pg_policies where schemaname=''public'' and tablename=''hka_messages'')<>3
 or exists(
  select 1 from (values
   (''hka_messages_insert'',''INSERT'',null,$baseline$((sender_id = auth.uid()) AND (hka_admin() OR (hka_teach(student_id) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT g.guardian_id
   FROM hka_guardians g
  WHERE ((g.student_id = hka_messages.student_id) AND (g.status = ''approved''::text) AND (g.consent_at IS NOT NULL)))))) OR ((student_id = auth.uid()) AND (recipient_id IN ( SELECT cs.coach_id
   FROM hka_coach_students cs
  WHERE (cs.student_id = auth.uid())))) OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1
   FROM hka_profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ''guardian''::text)))) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT cs.coach_id
   FROM hka_coach_students cs
  WHERE (cs.student_id = hka_messages.student_id)))))))$baseline$),
   (''hka_messages_read'',''SELECT'',$baseline$(((auth.uid() = sender_id) OR (auth.uid() = recipient_id)) OR hka_admin() OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1
   FROM hka_profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ''guardian''::text))))))$baseline$,null),
   (''hka_messages_update_read'',''UPDATE'',$baseline$(recipient_id = auth.uid())$baseline$,$baseline$(recipient_id = auth.uid())$baseline$)
  ) expected(name,command,qual,check_expr)
  left join pg_policies actual on actual.schemaname=''public''
   and actual.tablename=''hka_messages'' and actual.policyname=expected.name
  where actual.policyname is null or actual.cmd<>expected.command
   or actual.permissive<>''PERMISSIVE''
   or actual.roles is distinct from array[''authenticated'']::name[]
   or actual.qual is distinct from expected.qual
   or actual.with_check is distinct from expected.check_expr
 ) then
  raise exception ''Live message policy definition drift: review complete catalog before applying.'';
 end if;
 if exists(select 1 from pg_trigger where tgrelid=''public.hka_messages''::regclass and not tgisinternal) then
  raise exception ''Unexpected message trigger: review before applying.'';
 end if;
 if exists(select 1 from pg_namespace where nspname=''hka_messaging'')
 or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname=''public'' and p.proname like ''hka_message_%'') then
  raise exception ''Messaging helper/schema collision: do not overwrite an existing installation.'';
 end if;
 if not exists(select 1 from information_schema.columns where table_schema=''public''
    and table_name=''hka_profiles'' and column_name=''birth_date''
    and data_type=''date'' and is_nullable=''NO'') then
  raise exception ''Age schema drift: review trusted adulthood evidence; NULL is never proof of adulthood.'';
 end if;
 if not exists(select 1 from public.hka_profiles p join auth.users u on u.id=p.id
  where p.id=''f7c3e52e-4f5e-47d0-8139-b28cb296d526''::uuid
   and not p.suspended and u.email_confirmed_at is not null
   and p.birth_date <= (current_date-interval ''18 years'')::date
   and exists(select 1 from public.hka_account_roles ar
    where ar.user_id=p.id and ar.purpose=''admin'' and ar.status=''authorized'')) then
  raise exception ''Designated Hollie Founder account must be present, confirmed, adult and authorised.'';
 end if;
end
$preflight$;','Live message policy definition drift','same-name INSERT expression drift');
rollback to savepoint drift;
savepoint drift;
alter policy hka_messages_read on public.hka_messages to public;
select hka_messaging_test.rejects('do $preflight$
begin
 if current_user<>''postgres'' or not exists(select 1 from pg_roles
    where rolname=current_user and (rolsuper or rolbypassrls)) then
  raise exception ''Run only as the reviewed postgres migration owner.'';
 end if;
 if exists(select 1 from (values(''hka_messages''),(''hka_profiles''),(''hka_account_roles''),
    (''hka_guardians''),(''hka_coach_students''),(''hka_link_requests'')) required(name)
   left join pg_class c on c.oid=to_regclass(''public.''||required.name)
   where c.oid is null or not c.relrowsecurity) then
  raise exception ''A required table is absent or its RLS is disabled.'';
 end if;
 if has_column_privilege(''authenticated'',''public.hka_profiles'',''birth_date'',''UPDATE'')
 or has_column_privilege(''authenticated'',''public.hka_profiles'',''role'',''UPDATE'')
 or has_column_privilege(''authenticated'',''public.hka_profiles'',''suspended'',''UPDATE'') then
  raise exception ''Protected age/role/activation columns became client-writable.'';
 end if;
 if (select array_agg(column_name::text order by ordinal_position) from information_schema.columns
   where table_schema=''public'' and table_name=''hka_messages'')
   is distinct from array[''id'',''student_id'',''sender_id'',''recipient_id'',''body'',''read_at'',''created_at''] then
  raise exception ''Message column schema drift: review before applying.'';
 end if;
 -- Full live USING/WITH CHECK expressions, command, permissiveness and exact
 -- authenticated role target captured read-only on 2026-10-31.
 -- Exact deparser whitespace deliberately fails closed.
 if (select count(*) from pg_policies where schemaname=''public'' and tablename=''hka_messages'')<>3
 or exists(
  select 1 from (values
   (''hka_messages_insert'',''INSERT'',null,$baseline$((sender_id = auth.uid()) AND (hka_admin() OR (hka_teach(student_id) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT g.guardian_id
   FROM hka_guardians g
  WHERE ((g.student_id = hka_messages.student_id) AND (g.status = ''approved''::text) AND (g.consent_at IS NOT NULL)))))) OR ((student_id = auth.uid()) AND (recipient_id IN ( SELECT cs.coach_id
   FROM hka_coach_students cs
  WHERE (cs.student_id = auth.uid())))) OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1
   FROM hka_profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ''guardian''::text)))) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT cs.coach_id
   FROM hka_coach_students cs
  WHERE (cs.student_id = hka_messages.student_id)))))))$baseline$),
   (''hka_messages_read'',''SELECT'',$baseline$(((auth.uid() = sender_id) OR (auth.uid() = recipient_id)) OR hka_admin() OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1
   FROM hka_profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ''guardian''::text))))))$baseline$,null),
   (''hka_messages_update_read'',''UPDATE'',$baseline$(recipient_id = auth.uid())$baseline$,$baseline$(recipient_id = auth.uid())$baseline$)
  ) expected(name,command,qual,check_expr)
  left join pg_policies actual on actual.schemaname=''public''
   and actual.tablename=''hka_messages'' and actual.policyname=expected.name
  where actual.policyname is null or actual.cmd<>expected.command
   or actual.permissive<>''PERMISSIVE''
   or actual.roles is distinct from array[''authenticated'']::name[]
   or actual.qual is distinct from expected.qual
   or actual.with_check is distinct from expected.check_expr
 ) then
  raise exception ''Live message policy definition drift: review complete catalog before applying.'';
 end if;
 if exists(select 1 from pg_trigger where tgrelid=''public.hka_messages''::regclass and not tgisinternal) then
  raise exception ''Unexpected message trigger: review before applying.'';
 end if;
 if exists(select 1 from pg_namespace where nspname=''hka_messaging'')
 or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname=''public'' and p.proname like ''hka_message_%'') then
  raise exception ''Messaging helper/schema collision: do not overwrite an existing installation.'';
 end if;
 if not exists(select 1 from information_schema.columns where table_schema=''public''
    and table_name=''hka_profiles'' and column_name=''birth_date''
    and data_type=''date'' and is_nullable=''NO'') then
  raise exception ''Age schema drift: review trusted adulthood evidence; NULL is never proof of adulthood.'';
 end if;
 if not exists(select 1 from public.hka_profiles p join auth.users u on u.id=p.id
  where p.id=''f7c3e52e-4f5e-47d0-8139-b28cb296d526''::uuid
   and not p.suspended and u.email_confirmed_at is not null
   and p.birth_date <= (current_date-interval ''18 years'')::date
   and exists(select 1 from public.hka_account_roles ar
    where ar.user_id=p.id and ar.purpose=''admin'' and ar.status=''authorized'')) then
  raise exception ''Designated Hollie Founder account must be present, confirmed, adult and authorised.'';
 end if;
end
$preflight$;','Live message policy definition drift','policy role-target drift');
rollback to savepoint drift;
savepoint drift;
alter policy hka_messages_insert on public.hka_messages to public;
select hka_messaging_test.rejects('do $preflight$
begin
 if current_user<>''postgres'' or not exists(select 1 from pg_roles
    where rolname=current_user and (rolsuper or rolbypassrls)) then
  raise exception ''Run only as the reviewed postgres migration owner.'';
 end if;
 if exists(select 1 from (values(''hka_messages''),(''hka_profiles''),(''hka_account_roles''),
    (''hka_guardians''),(''hka_coach_students''),(''hka_link_requests'')) required(name)
   left join pg_class c on c.oid=to_regclass(''public.''||required.name)
   where c.oid is null or not c.relrowsecurity) then
  raise exception ''A required table is absent or its RLS is disabled.'';
 end if;
 if has_column_privilege(''authenticated'',''public.hka_profiles'',''birth_date'',''UPDATE'')
 or has_column_privilege(''authenticated'',''public.hka_profiles'',''role'',''UPDATE'')
 or has_column_privilege(''authenticated'',''public.hka_profiles'',''suspended'',''UPDATE'') then
  raise exception ''Protected age/role/activation columns became client-writable.'';
 end if;
 if (select array_agg(column_name::text order by ordinal_position) from information_schema.columns
   where table_schema=''public'' and table_name=''hka_messages'')
   is distinct from array[''id'',''student_id'',''sender_id'',''recipient_id'',''body'',''read_at'',''created_at''] then
  raise exception ''Message column schema drift: review before applying.'';
 end if;
 -- Full live USING/WITH CHECK expressions, command, permissiveness and exact
 -- authenticated role target captured read-only on 2026-10-31.
 -- Exact deparser whitespace deliberately fails closed.
 if (select count(*) from pg_policies where schemaname=''public'' and tablename=''hka_messages'')<>3
 or exists(
  select 1 from (values
   (''hka_messages_insert'',''INSERT'',null,$baseline$((sender_id = auth.uid()) AND (hka_admin() OR (hka_teach(student_id) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT g.guardian_id
   FROM hka_guardians g
  WHERE ((g.student_id = hka_messages.student_id) AND (g.status = ''approved''::text) AND (g.consent_at IS NOT NULL)))))) OR ((student_id = auth.uid()) AND (recipient_id IN ( SELECT cs.coach_id
   FROM hka_coach_students cs
  WHERE (cs.student_id = auth.uid())))) OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1
   FROM hka_profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ''guardian''::text)))) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT cs.coach_id
   FROM hka_coach_students cs
  WHERE (cs.student_id = hka_messages.student_id)))))))$baseline$),
   (''hka_messages_read'',''SELECT'',$baseline$(((auth.uid() = sender_id) OR (auth.uid() = recipient_id)) OR hka_admin() OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1
   FROM hka_profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ''guardian''::text))))))$baseline$,null),
   (''hka_messages_update_read'',''UPDATE'',$baseline$(recipient_id = auth.uid())$baseline$,$baseline$(recipient_id = auth.uid())$baseline$)
  ) expected(name,command,qual,check_expr)
  left join pg_policies actual on actual.schemaname=''public''
   and actual.tablename=''hka_messages'' and actual.policyname=expected.name
  where actual.policyname is null or actual.cmd<>expected.command
   or actual.permissive<>''PERMISSIVE''
   or actual.roles is distinct from array[''authenticated'']::name[]
   or actual.qual is distinct from expected.qual
   or actual.with_check is distinct from expected.check_expr
 ) then
  raise exception ''Live message policy definition drift: review complete catalog before applying.'';
 end if;
 if exists(select 1 from pg_trigger where tgrelid=''public.hka_messages''::regclass and not tgisinternal) then
  raise exception ''Unexpected message trigger: review before applying.'';
 end if;
 if exists(select 1 from pg_namespace where nspname=''hka_messaging'')
 or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname=''public'' and p.proname like ''hka_message_%'') then
  raise exception ''Messaging helper/schema collision: do not overwrite an existing installation.'';
 end if;
 if not exists(select 1 from information_schema.columns where table_schema=''public''
    and table_name=''hka_profiles'' and column_name=''birth_date''
    and data_type=''date'' and is_nullable=''NO'') then
  raise exception ''Age schema drift: review trusted adulthood evidence; NULL is never proof of adulthood.'';
 end if;
 if not exists(select 1 from public.hka_profiles p join auth.users u on u.id=p.id
  where p.id=''f7c3e52e-4f5e-47d0-8139-b28cb296d526''::uuid
   and not p.suspended and u.email_confirmed_at is not null
   and p.birth_date <= (current_date-interval ''18 years'')::date
   and exists(select 1 from public.hka_account_roles ar
    where ar.user_id=p.id and ar.purpose=''admin'' and ar.status=''authorized'')) then
  raise exception ''Designated Hollie Founder account must be present, confirmed, adult and authorised.'';
 end if;
end
$preflight$;','Live message policy definition drift','INSERT PUBLIC role-target drift');
rollback to savepoint drift;
savepoint drift;
alter policy hka_messages_update_read on public.hka_messages to public;
select hka_messaging_test.rejects('do $preflight$
begin
 if current_user<>''postgres'' or not exists(select 1 from pg_roles
    where rolname=current_user and (rolsuper or rolbypassrls)) then
  raise exception ''Run only as the reviewed postgres migration owner.'';
 end if;
 if exists(select 1 from (values(''hka_messages''),(''hka_profiles''),(''hka_account_roles''),
    (''hka_guardians''),(''hka_coach_students''),(''hka_link_requests'')) required(name)
   left join pg_class c on c.oid=to_regclass(''public.''||required.name)
   where c.oid is null or not c.relrowsecurity) then
  raise exception ''A required table is absent or its RLS is disabled.'';
 end if;
 if has_column_privilege(''authenticated'',''public.hka_profiles'',''birth_date'',''UPDATE'')
 or has_column_privilege(''authenticated'',''public.hka_profiles'',''role'',''UPDATE'')
 or has_column_privilege(''authenticated'',''public.hka_profiles'',''suspended'',''UPDATE'') then
  raise exception ''Protected age/role/activation columns became client-writable.'';
 end if;
 if (select array_agg(column_name::text order by ordinal_position) from information_schema.columns
   where table_schema=''public'' and table_name=''hka_messages'')
   is distinct from array[''id'',''student_id'',''sender_id'',''recipient_id'',''body'',''read_at'',''created_at''] then
  raise exception ''Message column schema drift: review before applying.'';
 end if;
 -- Full live USING/WITH CHECK expressions, command, permissiveness and exact
 -- authenticated role target captured read-only on 2026-10-31.
 -- Exact deparser whitespace deliberately fails closed.
 if (select count(*) from pg_policies where schemaname=''public'' and tablename=''hka_messages'')<>3
 or exists(
  select 1 from (values
   (''hka_messages_insert'',''INSERT'',null,$baseline$((sender_id = auth.uid()) AND (hka_admin() OR (hka_teach(student_id) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT g.guardian_id
   FROM hka_guardians g
  WHERE ((g.student_id = hka_messages.student_id) AND (g.status = ''approved''::text) AND (g.consent_at IS NOT NULL)))))) OR ((student_id = auth.uid()) AND (recipient_id IN ( SELECT cs.coach_id
   FROM hka_coach_students cs
  WHERE (cs.student_id = auth.uid())))) OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1
   FROM hka_profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ''guardian''::text)))) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT cs.coach_id
   FROM hka_coach_students cs
  WHERE (cs.student_id = hka_messages.student_id)))))))$baseline$),
   (''hka_messages_read'',''SELECT'',$baseline$(((auth.uid() = sender_id) OR (auth.uid() = recipient_id)) OR hka_admin() OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1
   FROM hka_profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ''guardian''::text))))))$baseline$,null),
   (''hka_messages_update_read'',''UPDATE'',$baseline$(recipient_id = auth.uid())$baseline$,$baseline$(recipient_id = auth.uid())$baseline$)
  ) expected(name,command,qual,check_expr)
  left join pg_policies actual on actual.schemaname=''public''
   and actual.tablename=''hka_messages'' and actual.policyname=expected.name
  where actual.policyname is null or actual.cmd<>expected.command
   or actual.permissive<>''PERMISSIVE''
   or actual.roles is distinct from array[''authenticated'']::name[]
   or actual.qual is distinct from expected.qual
   or actual.with_check is distinct from expected.check_expr
 ) then
  raise exception ''Live message policy definition drift: review complete catalog before applying.'';
 end if;
 if exists(select 1 from pg_trigger where tgrelid=''public.hka_messages''::regclass and not tgisinternal) then
  raise exception ''Unexpected message trigger: review before applying.'';
 end if;
 if exists(select 1 from pg_namespace where nspname=''hka_messaging'')
 or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname=''public'' and p.proname like ''hka_message_%'') then
  raise exception ''Messaging helper/schema collision: do not overwrite an existing installation.'';
 end if;
 if not exists(select 1 from information_schema.columns where table_schema=''public''
    and table_name=''hka_profiles'' and column_name=''birth_date''
    and data_type=''date'' and is_nullable=''NO'') then
  raise exception ''Age schema drift: review trusted adulthood evidence; NULL is never proof of adulthood.'';
 end if;
 if not exists(select 1 from public.hka_profiles p join auth.users u on u.id=p.id
  where p.id=''f7c3e52e-4f5e-47d0-8139-b28cb296d526''::uuid
   and not p.suspended and u.email_confirmed_at is not null
   and p.birth_date <= (current_date-interval ''18 years'')::date
   and exists(select 1 from public.hka_account_roles ar
    where ar.user_id=p.id and ar.purpose=''admin'' and ar.status=''authorized'')) then
  raise exception ''Designated Hollie Founder account must be present, confirmed, adult and authorised.'';
 end if;
end
$preflight$;','Live message policy definition drift','UPDATE PUBLIC role-target drift');
rollback to savepoint drift;
savepoint drift;
alter policy hka_messages_read on public.hka_messages to anon;
select hka_messaging_test.rejects('do $preflight$
begin
 if current_user<>''postgres'' or not exists(select 1 from pg_roles
    where rolname=current_user and (rolsuper or rolbypassrls)) then
  raise exception ''Run only as the reviewed postgres migration owner.'';
 end if;
 if exists(select 1 from (values(''hka_messages''),(''hka_profiles''),(''hka_account_roles''),
    (''hka_guardians''),(''hka_coach_students''),(''hka_link_requests'')) required(name)
   left join pg_class c on c.oid=to_regclass(''public.''||required.name)
   where c.oid is null or not c.relrowsecurity) then
  raise exception ''A required table is absent or its RLS is disabled.'';
 end if;
 if has_column_privilege(''authenticated'',''public.hka_profiles'',''birth_date'',''UPDATE'')
 or has_column_privilege(''authenticated'',''public.hka_profiles'',''role'',''UPDATE'')
 or has_column_privilege(''authenticated'',''public.hka_profiles'',''suspended'',''UPDATE'') then
  raise exception ''Protected age/role/activation columns became client-writable.'';
 end if;
 if (select array_agg(column_name::text order by ordinal_position) from information_schema.columns
   where table_schema=''public'' and table_name=''hka_messages'')
   is distinct from array[''id'',''student_id'',''sender_id'',''recipient_id'',''body'',''read_at'',''created_at''] then
  raise exception ''Message column schema drift: review before applying.'';
 end if;
 -- Full live USING/WITH CHECK expressions, command, permissiveness and exact
 -- authenticated role target captured read-only on 2026-10-31.
 -- Exact deparser whitespace deliberately fails closed.
 if (select count(*) from pg_policies where schemaname=''public'' and tablename=''hka_messages'')<>3
 or exists(
  select 1 from (values
   (''hka_messages_insert'',''INSERT'',null,$baseline$((sender_id = auth.uid()) AND (hka_admin() OR (hka_teach(student_id) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT g.guardian_id
   FROM hka_guardians g
  WHERE ((g.student_id = hka_messages.student_id) AND (g.status = ''approved''::text) AND (g.consent_at IS NOT NULL)))))) OR ((student_id = auth.uid()) AND (recipient_id IN ( SELECT cs.coach_id
   FROM hka_coach_students cs
  WHERE (cs.student_id = auth.uid())))) OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1
   FROM hka_profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ''guardian''::text)))) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT cs.coach_id
   FROM hka_coach_students cs
  WHERE (cs.student_id = hka_messages.student_id)))))))$baseline$),
   (''hka_messages_read'',''SELECT'',$baseline$(((auth.uid() = sender_id) OR (auth.uid() = recipient_id)) OR hka_admin() OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1
   FROM hka_profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ''guardian''::text))))))$baseline$,null),
   (''hka_messages_update_read'',''UPDATE'',$baseline$(recipient_id = auth.uid())$baseline$,$baseline$(recipient_id = auth.uid())$baseline$)
  ) expected(name,command,qual,check_expr)
  left join pg_policies actual on actual.schemaname=''public''
   and actual.tablename=''hka_messages'' and actual.policyname=expected.name
  where actual.policyname is null or actual.cmd<>expected.command
   or actual.permissive<>''PERMISSIVE''
   or actual.roles is distinct from array[''authenticated'']::name[]
   or actual.qual is distinct from expected.qual
   or actual.with_check is distinct from expected.check_expr
 ) then
  raise exception ''Live message policy definition drift: review complete catalog before applying.'';
 end if;
 if exists(select 1 from pg_trigger where tgrelid=''public.hka_messages''::regclass and not tgisinternal) then
  raise exception ''Unexpected message trigger: review before applying.'';
 end if;
 if exists(select 1 from pg_namespace where nspname=''hka_messaging'')
 or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname=''public'' and p.proname like ''hka_message_%'') then
  raise exception ''Messaging helper/schema collision: do not overwrite an existing installation.'';
 end if;
 if not exists(select 1 from information_schema.columns where table_schema=''public''
    and table_name=''hka_profiles'' and column_name=''birth_date''
    and data_type=''date'' and is_nullable=''NO'') then
  raise exception ''Age schema drift: review trusted adulthood evidence; NULL is never proof of adulthood.'';
 end if;
 if not exists(select 1 from public.hka_profiles p join auth.users u on u.id=p.id
  where p.id=''f7c3e52e-4f5e-47d0-8139-b28cb296d526''::uuid
   and not p.suspended and u.email_confirmed_at is not null
   and p.birth_date <= (current_date-interval ''18 years'')::date
   and exists(select 1 from public.hka_account_roles ar
    where ar.user_id=p.id and ar.purpose=''admin'' and ar.status=''authorized'')) then
  raise exception ''Designated Hollie Founder account must be present, confirmed, adult and authorised.'';
 end if;
end
$preflight$;','Live message policy definition drift','anonymous role-target drift');
rollback to savepoint drift;
savepoint drift;
alter policy hka_messages_read on public.hka_messages to authenticated,anon;
select hka_messaging_test.rejects('do $preflight$
begin
 if current_user<>''postgres'' or not exists(select 1 from pg_roles
    where rolname=current_user and (rolsuper or rolbypassrls)) then
  raise exception ''Run only as the reviewed postgres migration owner.'';
 end if;
 if exists(select 1 from (values(''hka_messages''),(''hka_profiles''),(''hka_account_roles''),
    (''hka_guardians''),(''hka_coach_students''),(''hka_link_requests'')) required(name)
   left join pg_class c on c.oid=to_regclass(''public.''||required.name)
   where c.oid is null or not c.relrowsecurity) then
  raise exception ''A required table is absent or its RLS is disabled.'';
 end if;
 if has_column_privilege(''authenticated'',''public.hka_profiles'',''birth_date'',''UPDATE'')
 or has_column_privilege(''authenticated'',''public.hka_profiles'',''role'',''UPDATE'')
 or has_column_privilege(''authenticated'',''public.hka_profiles'',''suspended'',''UPDATE'') then
  raise exception ''Protected age/role/activation columns became client-writable.'';
 end if;
 if (select array_agg(column_name::text order by ordinal_position) from information_schema.columns
   where table_schema=''public'' and table_name=''hka_messages'')
   is distinct from array[''id'',''student_id'',''sender_id'',''recipient_id'',''body'',''read_at'',''created_at''] then
  raise exception ''Message column schema drift: review before applying.'';
 end if;
 -- Full live USING/WITH CHECK expressions, command, permissiveness and exact
 -- authenticated role target captured read-only on 2026-10-31.
 -- Exact deparser whitespace deliberately fails closed.
 if (select count(*) from pg_policies where schemaname=''public'' and tablename=''hka_messages'')<>3
 or exists(
  select 1 from (values
   (''hka_messages_insert'',''INSERT'',null,$baseline$((sender_id = auth.uid()) AND (hka_admin() OR (hka_teach(student_id) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT g.guardian_id
   FROM hka_guardians g
  WHERE ((g.student_id = hka_messages.student_id) AND (g.status = ''approved''::text) AND (g.consent_at IS NOT NULL)))))) OR ((student_id = auth.uid()) AND (recipient_id IN ( SELECT cs.coach_id
   FROM hka_coach_students cs
  WHERE (cs.student_id = auth.uid())))) OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1
   FROM hka_profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ''guardian''::text)))) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT cs.coach_id
   FROM hka_coach_students cs
  WHERE (cs.student_id = hka_messages.student_id)))))))$baseline$),
   (''hka_messages_read'',''SELECT'',$baseline$(((auth.uid() = sender_id) OR (auth.uid() = recipient_id)) OR hka_admin() OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1
   FROM hka_profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ''guardian''::text))))))$baseline$,null),
   (''hka_messages_update_read'',''UPDATE'',$baseline$(recipient_id = auth.uid())$baseline$,$baseline$(recipient_id = auth.uid())$baseline$)
  ) expected(name,command,qual,check_expr)
  left join pg_policies actual on actual.schemaname=''public''
   and actual.tablename=''hka_messages'' and actual.policyname=expected.name
  where actual.policyname is null or actual.cmd<>expected.command
   or actual.permissive<>''PERMISSIVE''
   or actual.roles is distinct from array[''authenticated'']::name[]
   or actual.qual is distinct from expected.qual
   or actual.with_check is distinct from expected.check_expr
 ) then
  raise exception ''Live message policy definition drift: review complete catalog before applying.'';
 end if;
 if exists(select 1 from pg_trigger where tgrelid=''public.hka_messages''::regclass and not tgisinternal) then
  raise exception ''Unexpected message trigger: review before applying.'';
 end if;
 if exists(select 1 from pg_namespace where nspname=''hka_messaging'')
 or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname=''public'' and p.proname like ''hka_message_%'') then
  raise exception ''Messaging helper/schema collision: do not overwrite an existing installation.'';
 end if;
 if not exists(select 1 from information_schema.columns where table_schema=''public''
    and table_name=''hka_profiles'' and column_name=''birth_date''
    and data_type=''date'' and is_nullable=''NO'') then
  raise exception ''Age schema drift: review trusted adulthood evidence; NULL is never proof of adulthood.'';
 end if;
 if not exists(select 1 from public.hka_profiles p join auth.users u on u.id=p.id
  where p.id=''f7c3e52e-4f5e-47d0-8139-b28cb296d526''::uuid
   and not p.suspended and u.email_confirmed_at is not null
   and p.birth_date <= (current_date-interval ''18 years'')::date
   and exists(select 1 from public.hka_account_roles ar
    where ar.user_id=p.id and ar.purpose=''admin'' and ar.status=''authorized'')) then
  raise exception ''Designated Hollie Founder account must be present, confirmed, adult and authorised.'';
 end if;
end
$preflight$;','Live message policy definition drift','role-target superset drift');
rollback to savepoint drift;
savepoint drift;
alter policy hka_messages_update_read on public.hka_messages using(true);
select hka_messaging_test.rejects('do $preflight$
begin
 if current_user<>''postgres'' or not exists(select 1 from pg_roles
    where rolname=current_user and (rolsuper or rolbypassrls)) then
  raise exception ''Run only as the reviewed postgres migration owner.'';
 end if;
 if exists(select 1 from (values(''hka_messages''),(''hka_profiles''),(''hka_account_roles''),
    (''hka_guardians''),(''hka_coach_students''),(''hka_link_requests'')) required(name)
   left join pg_class c on c.oid=to_regclass(''public.''||required.name)
   where c.oid is null or not c.relrowsecurity) then
  raise exception ''A required table is absent or its RLS is disabled.'';
 end if;
 if has_column_privilege(''authenticated'',''public.hka_profiles'',''birth_date'',''UPDATE'')
 or has_column_privilege(''authenticated'',''public.hka_profiles'',''role'',''UPDATE'')
 or has_column_privilege(''authenticated'',''public.hka_profiles'',''suspended'',''UPDATE'') then
  raise exception ''Protected age/role/activation columns became client-writable.'';
 end if;
 if (select array_agg(column_name::text order by ordinal_position) from information_schema.columns
   where table_schema=''public'' and table_name=''hka_messages'')
   is distinct from array[''id'',''student_id'',''sender_id'',''recipient_id'',''body'',''read_at'',''created_at''] then
  raise exception ''Message column schema drift: review before applying.'';
 end if;
 -- Full live USING/WITH CHECK expressions, command, permissiveness and exact
 -- authenticated role target captured read-only on 2026-10-31.
 -- Exact deparser whitespace deliberately fails closed.
 if (select count(*) from pg_policies where schemaname=''public'' and tablename=''hka_messages'')<>3
 or exists(
  select 1 from (values
   (''hka_messages_insert'',''INSERT'',null,$baseline$((sender_id = auth.uid()) AND (hka_admin() OR (hka_teach(student_id) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT g.guardian_id
   FROM hka_guardians g
  WHERE ((g.student_id = hka_messages.student_id) AND (g.status = ''approved''::text) AND (g.consent_at IS NOT NULL)))))) OR ((student_id = auth.uid()) AND (recipient_id IN ( SELECT cs.coach_id
   FROM hka_coach_students cs
  WHERE (cs.student_id = auth.uid())))) OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1
   FROM hka_profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ''guardian''::text)))) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT cs.coach_id
   FROM hka_coach_students cs
  WHERE (cs.student_id = hka_messages.student_id)))))))$baseline$),
   (''hka_messages_read'',''SELECT'',$baseline$(((auth.uid() = sender_id) OR (auth.uid() = recipient_id)) OR hka_admin() OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1
   FROM hka_profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ''guardian''::text))))))$baseline$,null),
   (''hka_messages_update_read'',''UPDATE'',$baseline$(recipient_id = auth.uid())$baseline$,$baseline$(recipient_id = auth.uid())$baseline$)
  ) expected(name,command,qual,check_expr)
  left join pg_policies actual on actual.schemaname=''public''
   and actual.tablename=''hka_messages'' and actual.policyname=expected.name
  where actual.policyname is null or actual.cmd<>expected.command
   or actual.permissive<>''PERMISSIVE''
   or actual.roles is distinct from array[''authenticated'']::name[]
   or actual.qual is distinct from expected.qual
   or actual.with_check is distinct from expected.check_expr
 ) then
  raise exception ''Live message policy definition drift: review complete catalog before applying.'';
 end if;
 if exists(select 1 from pg_trigger where tgrelid=''public.hka_messages''::regclass and not tgisinternal) then
  raise exception ''Unexpected message trigger: review before applying.'';
 end if;
 if exists(select 1 from pg_namespace where nspname=''hka_messaging'')
 or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname=''public'' and p.proname like ''hka_message_%'') then
  raise exception ''Messaging helper/schema collision: do not overwrite an existing installation.'';
 end if;
 if not exists(select 1 from information_schema.columns where table_schema=''public''
    and table_name=''hka_profiles'' and column_name=''birth_date''
    and data_type=''date'' and is_nullable=''NO'') then
  raise exception ''Age schema drift: review trusted adulthood evidence; NULL is never proof of adulthood.'';
 end if;
 if not exists(select 1 from public.hka_profiles p join auth.users u on u.id=p.id
  where p.id=''f7c3e52e-4f5e-47d0-8139-b28cb296d526''::uuid
   and not p.suspended and u.email_confirmed_at is not null
   and p.birth_date <= (current_date-interval ''18 years'')::date
   and exists(select 1 from public.hka_account_roles ar
    where ar.user_id=p.id and ar.purpose=''admin'' and ar.status=''authorized'')) then
  raise exception ''Designated Hollie Founder account must be present, confirmed, adult and authorised.'';
 end if;
end
$preflight$;','Live message policy definition drift','UPDATE USING expression drift');
rollback to savepoint drift;
savepoint drift;
alter policy hka_messages_update_read on public.hka_messages with check(true);
select hka_messaging_test.rejects('do $preflight$
begin
 if current_user<>''postgres'' or not exists(select 1 from pg_roles
    where rolname=current_user and (rolsuper or rolbypassrls)) then
  raise exception ''Run only as the reviewed postgres migration owner.'';
 end if;
 if exists(select 1 from (values(''hka_messages''),(''hka_profiles''),(''hka_account_roles''),
    (''hka_guardians''),(''hka_coach_students''),(''hka_link_requests'')) required(name)
   left join pg_class c on c.oid=to_regclass(''public.''||required.name)
   where c.oid is null or not c.relrowsecurity) then
  raise exception ''A required table is absent or its RLS is disabled.'';
 end if;
 if has_column_privilege(''authenticated'',''public.hka_profiles'',''birth_date'',''UPDATE'')
 or has_column_privilege(''authenticated'',''public.hka_profiles'',''role'',''UPDATE'')
 or has_column_privilege(''authenticated'',''public.hka_profiles'',''suspended'',''UPDATE'') then
  raise exception ''Protected age/role/activation columns became client-writable.'';
 end if;
 if (select array_agg(column_name::text order by ordinal_position) from information_schema.columns
   where table_schema=''public'' and table_name=''hka_messages'')
   is distinct from array[''id'',''student_id'',''sender_id'',''recipient_id'',''body'',''read_at'',''created_at''] then
  raise exception ''Message column schema drift: review before applying.'';
 end if;
 -- Full live USING/WITH CHECK expressions, command, permissiveness and exact
 -- authenticated role target captured read-only on 2026-10-31.
 -- Exact deparser whitespace deliberately fails closed.
 if (select count(*) from pg_policies where schemaname=''public'' and tablename=''hka_messages'')<>3
 or exists(
  select 1 from (values
   (''hka_messages_insert'',''INSERT'',null,$baseline$((sender_id = auth.uid()) AND (hka_admin() OR (hka_teach(student_id) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT g.guardian_id
   FROM hka_guardians g
  WHERE ((g.student_id = hka_messages.student_id) AND (g.status = ''approved''::text) AND (g.consent_at IS NOT NULL)))))) OR ((student_id = auth.uid()) AND (recipient_id IN ( SELECT cs.coach_id
   FROM hka_coach_students cs
  WHERE (cs.student_id = auth.uid())))) OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1
   FROM hka_profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ''guardian''::text)))) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT cs.coach_id
   FROM hka_coach_students cs
  WHERE (cs.student_id = hka_messages.student_id)))))))$baseline$),
   (''hka_messages_read'',''SELECT'',$baseline$(((auth.uid() = sender_id) OR (auth.uid() = recipient_id)) OR hka_admin() OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1
   FROM hka_profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ''guardian''::text))))))$baseline$,null),
   (''hka_messages_update_read'',''UPDATE'',$baseline$(recipient_id = auth.uid())$baseline$,$baseline$(recipient_id = auth.uid())$baseline$)
  ) expected(name,command,qual,check_expr)
  left join pg_policies actual on actual.schemaname=''public''
   and actual.tablename=''hka_messages'' and actual.policyname=expected.name
  where actual.policyname is null or actual.cmd<>expected.command
   or actual.permissive<>''PERMISSIVE''
   or actual.roles is distinct from array[''authenticated'']::name[]
   or actual.qual is distinct from expected.qual
   or actual.with_check is distinct from expected.check_expr
 ) then
  raise exception ''Live message policy definition drift: review complete catalog before applying.'';
 end if;
 if exists(select 1 from pg_trigger where tgrelid=''public.hka_messages''::regclass and not tgisinternal) then
  raise exception ''Unexpected message trigger: review before applying.'';
 end if;
 if exists(select 1 from pg_namespace where nspname=''hka_messaging'')
 or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname=''public'' and p.proname like ''hka_message_%'') then
  raise exception ''Messaging helper/schema collision: do not overwrite an existing installation.'';
 end if;
 if not exists(select 1 from information_schema.columns where table_schema=''public''
    and table_name=''hka_profiles'' and column_name=''birth_date''
    and data_type=''date'' and is_nullable=''NO'') then
  raise exception ''Age schema drift: review trusted adulthood evidence; NULL is never proof of adulthood.'';
 end if;
 if not exists(select 1 from public.hka_profiles p join auth.users u on u.id=p.id
  where p.id=''f7c3e52e-4f5e-47d0-8139-b28cb296d526''::uuid
   and not p.suspended and u.email_confirmed_at is not null
   and p.birth_date <= (current_date-interval ''18 years'')::date
   and exists(select 1 from public.hka_account_roles ar
    where ar.user_id=p.id and ar.purpose=''admin'' and ar.status=''authorized'')) then
  raise exception ''Designated Hollie Founder account must be present, confirmed, adult and authorised.'';
 end if;
end
$preflight$;','Live message policy definition drift','UPDATE WITH CHECK expression drift');
rollback to savepoint drift;
savepoint drift;
drop policy hka_messages_read on public.hka_messages;
select hka_messaging_test.rejects('do $preflight$
begin
 if current_user<>''postgres'' or not exists(select 1 from pg_roles
    where rolname=current_user and (rolsuper or rolbypassrls)) then
  raise exception ''Run only as the reviewed postgres migration owner.'';
 end if;
 if exists(select 1 from (values(''hka_messages''),(''hka_profiles''),(''hka_account_roles''),
    (''hka_guardians''),(''hka_coach_students''),(''hka_link_requests'')) required(name)
   left join pg_class c on c.oid=to_regclass(''public.''||required.name)
   where c.oid is null or not c.relrowsecurity) then
  raise exception ''A required table is absent or its RLS is disabled.'';
 end if;
 if has_column_privilege(''authenticated'',''public.hka_profiles'',''birth_date'',''UPDATE'')
 or has_column_privilege(''authenticated'',''public.hka_profiles'',''role'',''UPDATE'')
 or has_column_privilege(''authenticated'',''public.hka_profiles'',''suspended'',''UPDATE'') then
  raise exception ''Protected age/role/activation columns became client-writable.'';
 end if;
 if (select array_agg(column_name::text order by ordinal_position) from information_schema.columns
   where table_schema=''public'' and table_name=''hka_messages'')
   is distinct from array[''id'',''student_id'',''sender_id'',''recipient_id'',''body'',''read_at'',''created_at''] then
  raise exception ''Message column schema drift: review before applying.'';
 end if;
 -- Full live USING/WITH CHECK expressions, command, permissiveness and exact
 -- authenticated role target captured read-only on 2026-10-31.
 -- Exact deparser whitespace deliberately fails closed.
 if (select count(*) from pg_policies where schemaname=''public'' and tablename=''hka_messages'')<>3
 or exists(
  select 1 from (values
   (''hka_messages_insert'',''INSERT'',null,$baseline$((sender_id = auth.uid()) AND (hka_admin() OR (hka_teach(student_id) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT g.guardian_id
   FROM hka_guardians g
  WHERE ((g.student_id = hka_messages.student_id) AND (g.status = ''approved''::text) AND (g.consent_at IS NOT NULL)))))) OR ((student_id = auth.uid()) AND (recipient_id IN ( SELECT cs.coach_id
   FROM hka_coach_students cs
  WHERE (cs.student_id = auth.uid())))) OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1
   FROM hka_profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ''guardian''::text)))) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT cs.coach_id
   FROM hka_coach_students cs
  WHERE (cs.student_id = hka_messages.student_id)))))))$baseline$),
   (''hka_messages_read'',''SELECT'',$baseline$(((auth.uid() = sender_id) OR (auth.uid() = recipient_id)) OR hka_admin() OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1
   FROM hka_profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ''guardian''::text))))))$baseline$,null),
   (''hka_messages_update_read'',''UPDATE'',$baseline$(recipient_id = auth.uid())$baseline$,$baseline$(recipient_id = auth.uid())$baseline$)
  ) expected(name,command,qual,check_expr)
  left join pg_policies actual on actual.schemaname=''public''
   and actual.tablename=''hka_messages'' and actual.policyname=expected.name
  where actual.policyname is null or actual.cmd<>expected.command
   or actual.permissive<>''PERMISSIVE''
   or actual.roles is distinct from array[''authenticated'']::name[]
   or actual.qual is distinct from expected.qual
   or actual.with_check is distinct from expected.check_expr
 ) then
  raise exception ''Live message policy definition drift: review complete catalog before applying.'';
 end if;
 if exists(select 1 from pg_trigger where tgrelid=''public.hka_messages''::regclass and not tgisinternal) then
  raise exception ''Unexpected message trigger: review before applying.'';
 end if;
 if exists(select 1 from pg_namespace where nspname=''hka_messaging'')
 or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname=''public'' and p.proname like ''hka_message_%'') then
  raise exception ''Messaging helper/schema collision: do not overwrite an existing installation.'';
 end if;
 if not exists(select 1 from information_schema.columns where table_schema=''public''
    and table_name=''hka_profiles'' and column_name=''birth_date''
    and data_type=''date'' and is_nullable=''NO'') then
  raise exception ''Age schema drift: review trusted adulthood evidence; NULL is never proof of adulthood.'';
 end if;
 if not exists(select 1 from public.hka_profiles p join auth.users u on u.id=p.id
  where p.id=''f7c3e52e-4f5e-47d0-8139-b28cb296d526''::uuid
   and not p.suspended and u.email_confirmed_at is not null
   and p.birth_date <= (current_date-interval ''18 years'')::date
   and exists(select 1 from public.hka_account_roles ar
    where ar.user_id=p.id and ar.purpose=''admin'' and ar.status=''authorized'')) then
  raise exception ''Designated Hollie Founder account must be present, confirmed, adult and authorised.'';
 end if;
end
$preflight$;','Live message policy definition drift','missing baseline policy');
rollback to savepoint drift;
savepoint drift;
alter policy hka_messages_read on public.hka_messages rename to unreviewed_read;
select hka_messaging_test.rejects('do $preflight$
begin
 if current_user<>''postgres'' or not exists(select 1 from pg_roles
    where rolname=current_user and (rolsuper or rolbypassrls)) then
  raise exception ''Run only as the reviewed postgres migration owner.'';
 end if;
 if exists(select 1 from (values(''hka_messages''),(''hka_profiles''),(''hka_account_roles''),
    (''hka_guardians''),(''hka_coach_students''),(''hka_link_requests'')) required(name)
   left join pg_class c on c.oid=to_regclass(''public.''||required.name)
   where c.oid is null or not c.relrowsecurity) then
  raise exception ''A required table is absent or its RLS is disabled.'';
 end if;
 if has_column_privilege(''authenticated'',''public.hka_profiles'',''birth_date'',''UPDATE'')
 or has_column_privilege(''authenticated'',''public.hka_profiles'',''role'',''UPDATE'')
 or has_column_privilege(''authenticated'',''public.hka_profiles'',''suspended'',''UPDATE'') then
  raise exception ''Protected age/role/activation columns became client-writable.'';
 end if;
 if (select array_agg(column_name::text order by ordinal_position) from information_schema.columns
   where table_schema=''public'' and table_name=''hka_messages'')
   is distinct from array[''id'',''student_id'',''sender_id'',''recipient_id'',''body'',''read_at'',''created_at''] then
  raise exception ''Message column schema drift: review before applying.'';
 end if;
 -- Full live USING/WITH CHECK expressions, command, permissiveness and exact
 -- authenticated role target captured read-only on 2026-10-31.
 -- Exact deparser whitespace deliberately fails closed.
 if (select count(*) from pg_policies where schemaname=''public'' and tablename=''hka_messages'')<>3
 or exists(
  select 1 from (values
   (''hka_messages_insert'',''INSERT'',null,$baseline$((sender_id = auth.uid()) AND (hka_admin() OR (hka_teach(student_id) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT g.guardian_id
   FROM hka_guardians g
  WHERE ((g.student_id = hka_messages.student_id) AND (g.status = ''approved''::text) AND (g.consent_at IS NOT NULL)))))) OR ((student_id = auth.uid()) AND (recipient_id IN ( SELECT cs.coach_id
   FROM hka_coach_students cs
  WHERE (cs.student_id = auth.uid())))) OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1
   FROM hka_profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ''guardian''::text)))) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT cs.coach_id
   FROM hka_coach_students cs
  WHERE (cs.student_id = hka_messages.student_id)))))))$baseline$),
   (''hka_messages_read'',''SELECT'',$baseline$(((auth.uid() = sender_id) OR (auth.uid() = recipient_id)) OR hka_admin() OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1
   FROM hka_profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ''guardian''::text))))))$baseline$,null),
   (''hka_messages_update_read'',''UPDATE'',$baseline$(recipient_id = auth.uid())$baseline$,$baseline$(recipient_id = auth.uid())$baseline$)
  ) expected(name,command,qual,check_expr)
  left join pg_policies actual on actual.schemaname=''public''
   and actual.tablename=''hka_messages'' and actual.policyname=expected.name
  where actual.policyname is null or actual.cmd<>expected.command
   or actual.permissive<>''PERMISSIVE''
   or actual.roles is distinct from array[''authenticated'']::name[]
   or actual.qual is distinct from expected.qual
   or actual.with_check is distinct from expected.check_expr
 ) then
  raise exception ''Live message policy definition drift: review complete catalog before applying.'';
 end if;
 if exists(select 1 from pg_trigger where tgrelid=''public.hka_messages''::regclass and not tgisinternal) then
  raise exception ''Unexpected message trigger: review before applying.'';
 end if;
 if exists(select 1 from pg_namespace where nspname=''hka_messaging'')
 or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname=''public'' and p.proname like ''hka_message_%'') then
  raise exception ''Messaging helper/schema collision: do not overwrite an existing installation.'';
 end if;
 if not exists(select 1 from information_schema.columns where table_schema=''public''
    and table_name=''hka_profiles'' and column_name=''birth_date''
    and data_type=''date'' and is_nullable=''NO'') then
  raise exception ''Age schema drift: review trusted adulthood evidence; NULL is never proof of adulthood.'';
 end if;
 if not exists(select 1 from public.hka_profiles p join auth.users u on u.id=p.id
  where p.id=''f7c3e52e-4f5e-47d0-8139-b28cb296d526''::uuid
   and not p.suspended and u.email_confirmed_at is not null
   and p.birth_date <= (current_date-interval ''18 years'')::date
   and exists(select 1 from public.hka_account_roles ar
    where ar.user_id=p.id and ar.purpose=''admin'' and ar.status=''authorized'')) then
  raise exception ''Designated Hollie Founder account must be present, confirmed, adult and authorised.'';
 end if;
end
$preflight$;','Live message policy definition drift','same-count policy name drift');
rollback to savepoint drift;
savepoint drift;
drop policy hka_messages_read on public.hka_messages; create policy hka_messages_read on public.hka_messages for all to authenticated using(true);
select hka_messaging_test.rejects('do $preflight$
begin
 if current_user<>''postgres'' or not exists(select 1 from pg_roles
    where rolname=current_user and (rolsuper or rolbypassrls)) then
  raise exception ''Run only as the reviewed postgres migration owner.'';
 end if;
 if exists(select 1 from (values(''hka_messages''),(''hka_profiles''),(''hka_account_roles''),
    (''hka_guardians''),(''hka_coach_students''),(''hka_link_requests'')) required(name)
   left join pg_class c on c.oid=to_regclass(''public.''||required.name)
   where c.oid is null or not c.relrowsecurity) then
  raise exception ''A required table is absent or its RLS is disabled.'';
 end if;
 if has_column_privilege(''authenticated'',''public.hka_profiles'',''birth_date'',''UPDATE'')
 or has_column_privilege(''authenticated'',''public.hka_profiles'',''role'',''UPDATE'')
 or has_column_privilege(''authenticated'',''public.hka_profiles'',''suspended'',''UPDATE'') then
  raise exception ''Protected age/role/activation columns became client-writable.'';
 end if;
 if (select array_agg(column_name::text order by ordinal_position) from information_schema.columns
   where table_schema=''public'' and table_name=''hka_messages'')
   is distinct from array[''id'',''student_id'',''sender_id'',''recipient_id'',''body'',''read_at'',''created_at''] then
  raise exception ''Message column schema drift: review before applying.'';
 end if;
 -- Full live USING/WITH CHECK expressions, command, permissiveness and exact
 -- authenticated role target captured read-only on 2026-10-31.
 -- Exact deparser whitespace deliberately fails closed.
 if (select count(*) from pg_policies where schemaname=''public'' and tablename=''hka_messages'')<>3
 or exists(
  select 1 from (values
   (''hka_messages_insert'',''INSERT'',null,$baseline$((sender_id = auth.uid()) AND (hka_admin() OR (hka_teach(student_id) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT g.guardian_id
   FROM hka_guardians g
  WHERE ((g.student_id = hka_messages.student_id) AND (g.status = ''approved''::text) AND (g.consent_at IS NOT NULL)))))) OR ((student_id = auth.uid()) AND (recipient_id IN ( SELECT cs.coach_id
   FROM hka_coach_students cs
  WHERE (cs.student_id = auth.uid())))) OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1
   FROM hka_profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ''guardian''::text)))) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT cs.coach_id
   FROM hka_coach_students cs
  WHERE (cs.student_id = hka_messages.student_id)))))))$baseline$),
   (''hka_messages_read'',''SELECT'',$baseline$(((auth.uid() = sender_id) OR (auth.uid() = recipient_id)) OR hka_admin() OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1
   FROM hka_profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ''guardian''::text))))))$baseline$,null),
   (''hka_messages_update_read'',''UPDATE'',$baseline$(recipient_id = auth.uid())$baseline$,$baseline$(recipient_id = auth.uid())$baseline$)
  ) expected(name,command,qual,check_expr)
  left join pg_policies actual on actual.schemaname=''public''
   and actual.tablename=''hka_messages'' and actual.policyname=expected.name
  where actual.policyname is null or actual.cmd<>expected.command
   or actual.permissive<>''PERMISSIVE''
   or actual.roles is distinct from array[''authenticated'']::name[]
   or actual.qual is distinct from expected.qual
   or actual.with_check is distinct from expected.check_expr
 ) then
  raise exception ''Live message policy definition drift: review complete catalog before applying.'';
 end if;
 if exists(select 1 from pg_trigger where tgrelid=''public.hka_messages''::regclass and not tgisinternal) then
  raise exception ''Unexpected message trigger: review before applying.'';
 end if;
 if exists(select 1 from pg_namespace where nspname=''hka_messaging'')
 or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname=''public'' and p.proname like ''hka_message_%'') then
  raise exception ''Messaging helper/schema collision: do not overwrite an existing installation.'';
 end if;
 if not exists(select 1 from information_schema.columns where table_schema=''public''
    and table_name=''hka_profiles'' and column_name=''birth_date''
    and data_type=''date'' and is_nullable=''NO'') then
  raise exception ''Age schema drift: review trusted adulthood evidence; NULL is never proof of adulthood.'';
 end if;
 if not exists(select 1 from public.hka_profiles p join auth.users u on u.id=p.id
  where p.id=''f7c3e52e-4f5e-47d0-8139-b28cb296d526''::uuid
   and not p.suspended and u.email_confirmed_at is not null
   and p.birth_date <= (current_date-interval ''18 years'')::date
   and exists(select 1 from public.hka_account_roles ar
    where ar.user_id=p.id and ar.purpose=''admin'' and ar.status=''authorized'')) then
  raise exception ''Designated Hollie Founder account must be present, confirmed, adult and authorised.'';
 end if;
end
$preflight$;','Live message policy definition drift','policy command drift');
rollback to savepoint drift;
savepoint drift;
drop policy hka_messages_read on public.hka_messages; create policy hka_messages_read on public.hka_messages as restrictive for select to authenticated using(true);
select hka_messaging_test.rejects('do $preflight$
begin
 if current_user<>''postgres'' or not exists(select 1 from pg_roles
    where rolname=current_user and (rolsuper or rolbypassrls)) then
  raise exception ''Run only as the reviewed postgres migration owner.'';
 end if;
 if exists(select 1 from (values(''hka_messages''),(''hka_profiles''),(''hka_account_roles''),
    (''hka_guardians''),(''hka_coach_students''),(''hka_link_requests'')) required(name)
   left join pg_class c on c.oid=to_regclass(''public.''||required.name)
   where c.oid is null or not c.relrowsecurity) then
  raise exception ''A required table is absent or its RLS is disabled.'';
 end if;
 if has_column_privilege(''authenticated'',''public.hka_profiles'',''birth_date'',''UPDATE'')
 or has_column_privilege(''authenticated'',''public.hka_profiles'',''role'',''UPDATE'')
 or has_column_privilege(''authenticated'',''public.hka_profiles'',''suspended'',''UPDATE'') then
  raise exception ''Protected age/role/activation columns became client-writable.'';
 end if;
 if (select array_agg(column_name::text order by ordinal_position) from information_schema.columns
   where table_schema=''public'' and table_name=''hka_messages'')
   is distinct from array[''id'',''student_id'',''sender_id'',''recipient_id'',''body'',''read_at'',''created_at''] then
  raise exception ''Message column schema drift: review before applying.'';
 end if;
 -- Full live USING/WITH CHECK expressions, command, permissiveness and exact
 -- authenticated role target captured read-only on 2026-10-31.
 -- Exact deparser whitespace deliberately fails closed.
 if (select count(*) from pg_policies where schemaname=''public'' and tablename=''hka_messages'')<>3
 or exists(
  select 1 from (values
   (''hka_messages_insert'',''INSERT'',null,$baseline$((sender_id = auth.uid()) AND (hka_admin() OR (hka_teach(student_id) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT g.guardian_id
   FROM hka_guardians g
  WHERE ((g.student_id = hka_messages.student_id) AND (g.status = ''approved''::text) AND (g.consent_at IS NOT NULL)))))) OR ((student_id = auth.uid()) AND (recipient_id IN ( SELECT cs.coach_id
   FROM hka_coach_students cs
  WHERE (cs.student_id = auth.uid())))) OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1
   FROM hka_profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ''guardian''::text)))) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT cs.coach_id
   FROM hka_coach_students cs
  WHERE (cs.student_id = hka_messages.student_id)))))))$baseline$),
   (''hka_messages_read'',''SELECT'',$baseline$(((auth.uid() = sender_id) OR (auth.uid() = recipient_id)) OR hka_admin() OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1
   FROM hka_profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ''guardian''::text))))))$baseline$,null),
   (''hka_messages_update_read'',''UPDATE'',$baseline$(recipient_id = auth.uid())$baseline$,$baseline$(recipient_id = auth.uid())$baseline$)
  ) expected(name,command,qual,check_expr)
  left join pg_policies actual on actual.schemaname=''public''
   and actual.tablename=''hka_messages'' and actual.policyname=expected.name
  where actual.policyname is null or actual.cmd<>expected.command
   or actual.permissive<>''PERMISSIVE''
   or actual.roles is distinct from array[''authenticated'']::name[]
   or actual.qual is distinct from expected.qual
   or actual.with_check is distinct from expected.check_expr
 ) then
  raise exception ''Live message policy definition drift: review complete catalog before applying.'';
 end if;
 if exists(select 1 from pg_trigger where tgrelid=''public.hka_messages''::regclass and not tgisinternal) then
  raise exception ''Unexpected message trigger: review before applying.'';
 end if;
 if exists(select 1 from pg_namespace where nspname=''hka_messaging'')
 or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname=''public'' and p.proname like ''hka_message_%'') then
  raise exception ''Messaging helper/schema collision: do not overwrite an existing installation.'';
 end if;
 if not exists(select 1 from information_schema.columns where table_schema=''public''
    and table_name=''hka_profiles'' and column_name=''birth_date''
    and data_type=''date'' and is_nullable=''NO'') then
  raise exception ''Age schema drift: review trusted adulthood evidence; NULL is never proof of adulthood.'';
 end if;
 if not exists(select 1 from public.hka_profiles p join auth.users u on u.id=p.id
  where p.id=''f7c3e52e-4f5e-47d0-8139-b28cb296d526''::uuid
   and not p.suspended and u.email_confirmed_at is not null
   and p.birth_date <= (current_date-interval ''18 years'')::date
   and exists(select 1 from public.hka_account_roles ar
    where ar.user_id=p.id and ar.purpose=''admin'' and ar.status=''authorized'')) then
  raise exception ''Designated Hollie Founder account must be present, confirmed, adult and authorised.'';
 end if;
end
$preflight$;','Live message policy definition drift','policy permissiveness drift');
rollback to savepoint drift;
savepoint drift;
create policy unrelated_permissive on public.hka_messages for select using(true);
select hka_messaging_test.rejects('do $preflight$
begin
 if current_user<>''postgres'' or not exists(select 1 from pg_roles
    where rolname=current_user and (rolsuper or rolbypassrls)) then
  raise exception ''Run only as the reviewed postgres migration owner.'';
 end if;
 if exists(select 1 from (values(''hka_messages''),(''hka_profiles''),(''hka_account_roles''),
    (''hka_guardians''),(''hka_coach_students''),(''hka_link_requests'')) required(name)
   left join pg_class c on c.oid=to_regclass(''public.''||required.name)
   where c.oid is null or not c.relrowsecurity) then
  raise exception ''A required table is absent or its RLS is disabled.'';
 end if;
 if has_column_privilege(''authenticated'',''public.hka_profiles'',''birth_date'',''UPDATE'')
 or has_column_privilege(''authenticated'',''public.hka_profiles'',''role'',''UPDATE'')
 or has_column_privilege(''authenticated'',''public.hka_profiles'',''suspended'',''UPDATE'') then
  raise exception ''Protected age/role/activation columns became client-writable.'';
 end if;
 if (select array_agg(column_name::text order by ordinal_position) from information_schema.columns
   where table_schema=''public'' and table_name=''hka_messages'')
   is distinct from array[''id'',''student_id'',''sender_id'',''recipient_id'',''body'',''read_at'',''created_at''] then
  raise exception ''Message column schema drift: review before applying.'';
 end if;
 -- Full live USING/WITH CHECK expressions, command, permissiveness and exact
 -- authenticated role target captured read-only on 2026-10-31.
 -- Exact deparser whitespace deliberately fails closed.
 if (select count(*) from pg_policies where schemaname=''public'' and tablename=''hka_messages'')<>3
 or exists(
  select 1 from (values
   (''hka_messages_insert'',''INSERT'',null,$baseline$((sender_id = auth.uid()) AND (hka_admin() OR (hka_teach(student_id) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT g.guardian_id
   FROM hka_guardians g
  WHERE ((g.student_id = hka_messages.student_id) AND (g.status = ''approved''::text) AND (g.consent_at IS NOT NULL)))))) OR ((student_id = auth.uid()) AND (recipient_id IN ( SELECT cs.coach_id
   FROM hka_coach_students cs
  WHERE (cs.student_id = auth.uid())))) OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1
   FROM hka_profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ''guardian''::text)))) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT cs.coach_id
   FROM hka_coach_students cs
  WHERE (cs.student_id = hka_messages.student_id)))))))$baseline$),
   (''hka_messages_read'',''SELECT'',$baseline$(((auth.uid() = sender_id) OR (auth.uid() = recipient_id)) OR hka_admin() OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1
   FROM hka_profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ''guardian''::text))))))$baseline$,null),
   (''hka_messages_update_read'',''UPDATE'',$baseline$(recipient_id = auth.uid())$baseline$,$baseline$(recipient_id = auth.uid())$baseline$)
  ) expected(name,command,qual,check_expr)
  left join pg_policies actual on actual.schemaname=''public''
   and actual.tablename=''hka_messages'' and actual.policyname=expected.name
  where actual.policyname is null or actual.cmd<>expected.command
   or actual.permissive<>''PERMISSIVE''
   or actual.roles is distinct from array[''authenticated'']::name[]
   or actual.qual is distinct from expected.qual
   or actual.with_check is distinct from expected.check_expr
 ) then
  raise exception ''Live message policy definition drift: review complete catalog before applying.'';
 end if;
 if exists(select 1 from pg_trigger where tgrelid=''public.hka_messages''::regclass and not tgisinternal) then
  raise exception ''Unexpected message trigger: review before applying.'';
 end if;
 if exists(select 1 from pg_namespace where nspname=''hka_messaging'')
 or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname=''public'' and p.proname like ''hka_message_%'') then
  raise exception ''Messaging helper/schema collision: do not overwrite an existing installation.'';
 end if;
 if not exists(select 1 from information_schema.columns where table_schema=''public''
    and table_name=''hka_profiles'' and column_name=''birth_date''
    and data_type=''date'' and is_nullable=''NO'') then
  raise exception ''Age schema drift: review trusted adulthood evidence; NULL is never proof of adulthood.'';
 end if;
 if not exists(select 1 from public.hka_profiles p join auth.users u on u.id=p.id
  where p.id=''f7c3e52e-4f5e-47d0-8139-b28cb296d526''::uuid
   and not p.suspended and u.email_confirmed_at is not null
   and p.birth_date <= (current_date-interval ''18 years'')::date
   and exists(select 1 from public.hka_account_roles ar
    where ar.user_id=p.id and ar.purpose=''admin'' and ar.status=''authorized'')) then
  raise exception ''Designated Hollie Founder account must be present, confirmed, adult and authorised.'';
 end if;
end
$preflight$;','Live message policy definition drift','extra permissive policy');
rollback to savepoint drift;
-- REVIEW PROPOSAL ONLY: separate Founder approval required for ANY execution.
-- Project sqaydpbqycvaictieafk; no deployment or data changes authorised.
-- Supersedes October proposal; see docs/MESSAGE_HOLLIE_APPROVAL.md.
-- Existing activation consent suffices; no plan, assignment, link code or chat approval.
-- This proposal has NOT been applied.
-- Designated Founder: Hollie Zietsman, auth.users.id f7c3e52e-4f5e-47d0-8139-b28cb296d526.
-- Identity source: supabase/activation/202610220001_founder_role.sql; never any Admin.

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
 if not exists(select 1 from public.hka_profiles p join auth.users u on u.id=p.id
  where p.id='f7c3e52e-4f5e-47d0-8139-b28cb296d526'::uuid
   and not p.suspended and u.email_confirmed_at is not null
   and p.birth_date <= (current_date-interval '18 years')::date
   and exists(select 1 from public.hka_account_roles ar
    where ar.user_id=p.id and ar.purpose='admin' and ar.status='authorized')) then
  raise exception 'Designated Hollie Founder account must be present, confirmed, adult and authorised.';
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

-- Owner-only identity constant; dashboard, name, sort order and other Admins
-- cannot redirect this channel. Activation/role checks still fail closed.
create function hka_messaging.founder_id() returns uuid
language sql immutable set search_path='' as $founder_identity$
 select 'f7c3e52e-4f5e-47d0-8139-b28cb296d526'::uuid
$founder_identity$;

create function hka_messaging.founder(person uuid) returns boolean
language sql stable security definer set search_path='' as $designated_founder$
 select person=hka_messaging.founder_id() and hka_messaging.ready(person)
  and hka_messaging.adult(person) and hka_messaging.has_role(person,'admin')
$designated_founder$;

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
 student_name text,relationship text,can_message boolean,directory_entry boolean,created_at timestamptz,founder_id uuid)
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
   coalesce((select string_agg(case ar.purpose when 'admin' then case when hka_messaging.founder(p.id) then 'Founder' else 'Admin' end
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
    and hka_messaging.ready(p.id) as directory_entry,p.created_at,hka_messaging.founder_id() as founder_id
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
 student_name text,relationship text,can_message boolean,directory_entry boolean,created_at timestamptz,founder_id uuid)
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
select hka_messaging_test.ok(hka_messaging_test.fingerprint()=(select value from hka_messaging_test.fingerprints where label='before_migration'),'migration preserves every public HKA application row');
select hka_messaging_test.ok(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'hka_message_%' and p.prosecdef),'new exposed API has no SECURITY DEFINER function');
select hka_messaging_test.ok(not has_function_privilege('anon','public.hka_message_contacts()','EXECUTE') and not has_function_privilege('authenticated','hka_messaging.has_role(uuid,text)','EXECUTE'),'anonymous API and arbitrary privileged role helper denied');
select hka_messaging_test.ok(not has_column_privilege('authenticated','public.hka_messages','body','UPDATE') and has_column_privilege('authenticated','public.hka_messages','read_at','UPDATE') and not has_table_privilege('authenticated','public.hka_messages','DELETE'),'only read receipt column updates granted');
select hka_messaging_test.ok(hka_messaging.founder_id()=hka_messaging_test.uid(1) and hka_messaging.founder(hka_messaging_test.uid(1)) and not hka_messaging.founder(hka_messaging_test.uid(18)),'only designated Hollie is Founder despite two authorised Admins');
select hka_messaging_test.ok(not has_function_privilege('authenticated','hka_messaging.founder_id()','EXECUTE'),'identity helper is owner-only');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(1)::text,true); set local role authenticated;
select hka_messaging_test.ok((select count(*)>=10 and bool_and(can_message) from public.hka_message_contacts() where directory_entry),'Founder on Coach dashboard sees active member directory');
select hka_messaging_test.ok((select bool_and(can_message) from public.hka_message_contacts() where directory_entry),'Founder directory flags independent of selected dashboard');
select hka_messaging_test.ok(not exists(select 1 from public.hka_messages where id in (hka_messaging_test.uid(101),hka_messaging_test.uid(102),hka_messaging_test.uid(103))),'Founder cannot read unrelated private conversations');
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(1),hka_messaging_test.uid(2),hka_messaging_test.uid(2),'Isolated test');
select hka_messaging_test.ok(true,'Founder sends to 2 without assignment');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(2)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(2),hka_messaging_test.uid(1),hka_messaging_test.uid(2),'Isolated test');
select hka_messaging_test.ok(true,'recipient 2 replies to Founder');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(1)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(1),hka_messaging_test.uid(3),hka_messaging_test.uid(3),'Isolated test');
select hka_messaging_test.ok(true,'Founder sends to 3 without assignment');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(3)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(3),hka_messaging_test.uid(1),hka_messaging_test.uid(3),'Isolated test');
select hka_messaging_test.ok(true,'recipient 3 replies to Founder');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(1)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(1),hka_messaging_test.uid(5),hka_messaging_test.uid(5),'Isolated test');
select hka_messaging_test.ok(true,'Founder sends to 5 without assignment');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(5)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(5),hka_messaging_test.uid(1),hka_messaging_test.uid(5),'Isolated test');
select hka_messaging_test.ok(true,'recipient 5 replies to Founder');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(1)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(1),hka_messaging_test.uid(6),null,'Isolated test');
select hka_messaging_test.ok(true,'Founder sends to 6 without assignment');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(6)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(6),hka_messaging_test.uid(1),null,'Isolated test');
select hka_messaging_test.ok(true,'recipient 6 replies to Founder');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(1)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(1),hka_messaging_test.uid(9),null,'Isolated test');
select hka_messaging_test.ok(true,'Founder sends to 9 without assignment');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(9)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(9),hka_messaging_test.uid(1),null,'Isolated test');
select hka_messaging_test.ok(true,'recipient 9 replies to Founder');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(1)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(1),hka_messaging_test.uid(7),hka_messaging_test.uid(7),'Isolated test');
select hka_messaging_test.ok(true,'Founder sends to 7 without assignment');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(7)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(7),hka_messaging_test.uid(1),hka_messaging_test.uid(7),'Isolated test');
select hka_messaging_test.ok(true,'recipient 7 replies to Founder');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(1)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(1),hka_messaging_test.uid(16),hka_messaging_test.uid(16),'Isolated test');
select hka_messaging_test.ok(true,'Founder sends to 16 without assignment');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(16)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(16),hka_messaging_test.uid(1),hka_messaging_test.uid(16),'Isolated test');
select hka_messaging_test.ok(true,'recipient 16 replies to Founder');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(1)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(1),hka_messaging_test.uid(18),null,'Isolated test');
select hka_messaging_test.ok(true,'Founder sends to 18 without assignment');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(18)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(18),hka_messaging_test.uid(1),null,'Isolated test');
select hka_messaging_test.ok(true,'recipient 18 replies to Founder');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(1)::text,true); set local role authenticated;
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(9)::text,true); set local role authenticated;
select hka_messaging_test.ok((select student_id is null and can_message and founder_id=hka_messaging_test.uid(1) from public.hka_message_contacts() where id=hka_messaging_test.uid(1)),'adult Horse Owner receives NULL direct scope and designated Founder UUID');
select hka_messaging_test.ok(not exists(select 1 from public.hka_message_contacts() where id=hka_messaging_test.uid(18) or directory_entry),'member cannot discover second Admin or global directory');
select hka_messaging_test.denied('insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(9),hka_messaging_test.uid(1),hka_messaging_test.uid(9),''Isolated test'')','adult-only Horse Owner cannot invent a Student scope');
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(9),hka_messaging_test.uid(1),null,'Adult Horse Owner exact message to Hollie');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(18)::text,true); set local role authenticated;
select hka_messaging_test.ok(not exists(select 1 from public.hka_message_contacts() where directory_entry),'second Admin has no Founder directory');
select hka_messaging_test.ok(not exists(select 1 from public.hka_message_contacts() where id=hka_messaging_test.uid(9)),'second Admin cannot discover unrelated Horse Owner');
select hka_messaging_test.ok(not exists(select 1 from public.hka_messages where sender_id=hka_messaging_test.uid(9) and recipient_id=hka_messaging_test.uid(1) and student_id is null and body='Adult Horse Owner exact message to Hollie'),'second Admin cannot read private Horse Owner to Hollie message');
select hka_messaging_test.denied('insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(18),hka_messaging_test.uid(9),null,''Isolated test'')','second Admin cannot initiate unrelated member direct message');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(1)::text,true); set local role authenticated;
select hka_messaging_test.ok((select count(*)=1 and bool_and(read_at is null) from public.hka_messages where sender_id=hka_messaging_test.uid(9) and recipient_id=hka_messaging_test.uid(1) and student_id is null and body='Adult Horse Owner exact message to Hollie'),'exact Horse Owner message arrives unread for designated Founder only');
update public.hka_messages set read_at=now() where sender_id=hka_messaging_test.uid(9) and recipient_id=hka_messaging_test.uid(1) and student_id is null and body='Adult Horse Owner exact message to Hollie';
select hka_messaging_test.ok((select read_at is not null from public.hka_messages where sender_id=hka_messaging_test.uid(9) and recipient_id=hka_messaging_test.uid(1) and student_id is null and body='Adult Horse Owner exact message to Hollie'),'Founder opening exact Horse Owner message records recipient read receipt');
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(1),hka_messaging_test.uid(9),null,'Hollie exact Horse Owner reply');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(9)::text,true); set local role authenticated;
select hka_messaging_test.ok((select count(*)=1 and bool_and(read_at is null) from public.hka_messages where sender_id=hka_messaging_test.uid(1) and recipient_id=hka_messaging_test.uid(9) and student_id is null and body='Hollie exact Horse Owner reply'),'exact Founder reply arrives unread for Horse Owner');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(1)::text,true); set local role authenticated;
select hka_messaging_test.denied('insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(1),hka_messaging_test.uid(10),hka_messaging_test.uid(10),''Isolated test'')','Founder cannot bypass suspension, verification, role approval or minor consent: 10');
select hka_messaging_test.denied('insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(1),hka_messaging_test.uid(11),hka_messaging_test.uid(11),''Isolated test'')','Founder cannot bypass suspension, verification, role approval or minor consent: 11');
select hka_messaging_test.denied('insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(1),hka_messaging_test.uid(12),hka_messaging_test.uid(12),''Isolated test'')','Founder cannot bypass suspension, verification, role approval or minor consent: 12');
select hka_messaging_test.denied('insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(1),hka_messaging_test.uid(13),hka_messaging_test.uid(13),''Isolated test'')','Founder cannot bypass suspension, verification, role approval or minor consent: 13');
select hka_messaging_test.denied('insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(1),hka_messaging_test.uid(15),hka_messaging_test.uid(15),''Isolated test'')','Founder cannot bypass suspension, verification, role approval or minor consent: 15');
select hka_messaging_test.denied('insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(2),hka_messaging_test.uid(1),hka_messaging_test.uid(2),''Isolated test'')','Founder cannot spoof sender');
select hka_messaging_test.denied('insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(1),hka_messaging_test.uid(2),null,''Isolated test'')','Founder cannot hide Student scope');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(3)::text,true); set local role authenticated;
select hka_messaging_test.ok(not exists(select 1 from public.hka_message_contacts() where id in (hka_messaging_test.uid(4),hka_messaging_test.uid(8),hka_messaging_test.uid(9))),'Coach lacks global directory and unrelated contacts');
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(3),hka_messaging_test.uid(2),hka_messaging_test.uid(2),'Isolated test');
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(3),hka_messaging_test.uid(7),hka_messaging_test.uid(7),'Isolated test');
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(3),hka_messaging_test.uid(5),hka_messaging_test.uid(7),'Isolated test');
select hka_messaging_test.denied('insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(3),hka_messaging_test.uid(8),hka_messaging_test.uid(8),''Isolated test'')','Coach cannot message unrelated Student');
select hka_messaging_test.denied('insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(3),hka_messaging_test.uid(13),hka_messaging_test.uid(13),''Isolated test'')','Coach cannot bypass missing minor consent despite assignment');
select hka_messaging_test.denied('insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(3),hka_messaging_test.uid(2),hka_messaging_test.uid(7),''Isolated test'')','Coach cannot spoof another Student scope');
select hka_messaging_test.ok(not exists(select 1 from public.hka_messages where id=hka_messaging_test.uid(103)),'Coach cannot read another Coach conversation');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(2)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(2),hka_messaging_test.uid(3),hka_messaging_test.uid(2),'Isolated test');
select hka_messaging_test.denied('insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(2),hka_messaging_test.uid(8),hka_messaging_test.uid(2),''Isolated test'')','Student cannot message unrelated Student');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(9)::text,true); set local role authenticated;
select hka_messaging_test.denied('insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(9),hka_messaging_test.uid(2),hka_messaging_test.uid(2),''Isolated test'')','Horse Owner cannot message arbitrary Student');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(5)::text,true); set local role authenticated;
select hka_messaging_test.ok(exists(select 1 from public.hka_messages where id=hka_messaging_test.uid(101)) and exists(select 1 from public.hka_messages where id=hka_messaging_test.uid(102)),'Guardian reads own Coach DM and child conversation');
select hka_messaging_test.ok(not exists(select 1 from public.hka_messages where id=hka_messaging_test.uid(104)),'Guardian cannot read another guardian Founder DM with child scope');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(6)::text,true); set local role authenticated;
select hka_messaging_test.ok(not exists(select 1 from public.hka_messages where id=hka_messaging_test.uid(101)),'second Guardian cannot read first Guardian private Coach DM');
select hka_messaging_test.ok(exists(select 1 from public.hka_messages where id=hka_messaging_test.uid(102)) and exists(select 1 from public.hka_messages where id=hka_messaging_test.uid(106)),'second Guardian retains child/Coach and child/Founder oversight');
do $$ declare changed integer; begin update public.hka_messages set read_at=now() where id=hka_messaging_test.uid(102); get diagnostics changed=row_count; if changed<>0 then raise exception 'Oversight marked another recipient read'; end if; end $$;
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(7)::text,true); set local role authenticated;
update public.hka_messages set read_at=now() where id=hka_messaging_test.uid(102);
select hka_messaging_test.ok(exists(select 1 from public.hka_messages where id=hka_messaging_test.uid(102) and read_at is not null),'actual recipient can mark message read');
select hka_messaging_test.denied('update public.hka_messages set body=''tampered'' where id=hka_messaging_test.uid(102)','recipient cannot rewrite body');
select hka_messaging_test.denied('update public.hka_messages set read_at=null where id=hka_messaging_test.uid(102)','recipient cannot clear read receipt');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(10)::text,true); set local role authenticated;
select hka_messaging_test.ok(not exists(select 1 from public.hka_message_contacts()),'inactive or unapproved actor 10 receives no contacts');
select hka_messaging_test.denied('insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(10),hka_messaging_test.uid(1),hka_messaging_test.uid(10),''Isolated test'')','inactive or unapproved actor 10 cannot initiate Founder message');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(11)::text,true); set local role authenticated;
select hka_messaging_test.ok(not exists(select 1 from public.hka_message_contacts()),'inactive or unapproved actor 11 receives no contacts');
select hka_messaging_test.denied('insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(11),hka_messaging_test.uid(1),hka_messaging_test.uid(11),''Isolated test'')','inactive or unapproved actor 11 cannot initiate Founder message');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(12)::text,true); set local role authenticated;
select hka_messaging_test.ok(not exists(select 1 from public.hka_message_contacts()),'inactive or unapproved actor 12 receives no contacts');
select hka_messaging_test.denied('insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(12),hka_messaging_test.uid(1),hka_messaging_test.uid(12),''Isolated test'')','inactive or unapproved actor 12 cannot initiate Founder message');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(15)::text,true); set local role authenticated;
select hka_messaging_test.ok(not exists(select 1 from public.hka_message_contacts()),'inactive or unapproved actor 15 receives no contacts');
select hka_messaging_test.denied('insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(15),hka_messaging_test.uid(1),hka_messaging_test.uid(15),''Isolated test'')','inactive or unapproved actor 15 cannot initiate Founder message');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(6)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(6),hka_messaging_test.uid(3),hka_messaging_test.uid(7),'Isolated test');
select hka_messaging_test.ok(true,'second approved Guardian can privately message assigned Coach');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(4)::text,true); set local role authenticated;
select hka_messaging_test.denied('insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(4),hka_messaging_test.uid(6),hka_messaging_test.uid(7),''Isolated test'')','unrelated Coach cannot contact another child Guardian');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(7)::text,true); set local role authenticated;
select hka_messaging_test.denied('delete from public.hka_messages where id=hka_messaging_test.uid(102)','recipient cannot delete message history');
select hka_messaging_test.denied('update public.hka_messages set sender_id=hka_messaging_test.uid(5) where id=hka_messaging_test.uid(102)','recipient cannot change sender_id');
select hka_messaging_test.denied('update public.hka_messages set recipient_id=hka_messaging_test.uid(5) where id=hka_messaging_test.uid(102)','recipient cannot change recipient_id');
select hka_messaging_test.denied('update public.hka_messages set student_id=hka_messaging_test.uid(8) where id=hka_messaging_test.uid(102)','recipient cannot change student_id');
select hka_messaging_test.denied('update public.hka_messages set created_at=now() where id=hka_messaging_test.uid(102)','recipient cannot change created_at');
select hka_messaging_test.denied('update public.hka_messages set id=hka_messaging_test.uid(999) where id=hka_messaging_test.uid(102)','recipient cannot change id');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(2)::text,true); set local role authenticated;
select hka_messaging_test.denied('insert into public.hka_messages(sender_id,recipient_id,student_id,body,read_at) values(hka_messaging_test.uid(2),hka_messaging_test.uid(3),hka_messaging_test.uid(2),''Isolated test'' ,now())','sender cannot insert a forged read receipt');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(17)::text,true); set local role authenticated;
select hka_messaging_test.ok(not exists(select 1 from public.hka_messages where student_id=hka_messaging_test.uid(7)),'pending Guardian cannot read child or private guardian history');
reset role; update public.hka_account_roles set is_active=false where user_id=hka_messaging_test.uid(1);
update public.hka_account_roles set is_active=true where user_id=hka_messaging_test.uid(1) and purpose='admin';
update public.hka_profiles set role='admin' where id=hka_messaging_test.uid(1);
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(1)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(1),hka_messaging_test.uid(9),null,'Isolated test');
select hka_messaging_test.ok(true,'multi-role 1 sends from admin dashboard');
reset role; update public.hka_account_roles set is_active=false where user_id=hka_messaging_test.uid(1);
update public.hka_account_roles set is_active=true where user_id=hka_messaging_test.uid(1) and purpose='student';
update public.hka_profiles set role='student' where id=hka_messaging_test.uid(1);
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(1)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(1),hka_messaging_test.uid(9),null,'Isolated test');
select hka_messaging_test.ok(true,'multi-role 1 sends from student dashboard');
reset role; update public.hka_account_roles set is_active=false where user_id=hka_messaging_test.uid(1);
update public.hka_account_roles set is_active=true where user_id=hka_messaging_test.uid(1) and purpose='guardian';
update public.hka_profiles set role='guardian' where id=hka_messaging_test.uid(1);
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(1)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(1),hka_messaging_test.uid(9),null,'Isolated test');
select hka_messaging_test.ok(true,'multi-role 1 sends from guardian dashboard');
reset role; update public.hka_account_roles set is_active=false where user_id=hka_messaging_test.uid(1);
update public.hka_account_roles set is_active=true where user_id=hka_messaging_test.uid(1) and purpose='coach';
update public.hka_profiles set role='coach' where id=hka_messaging_test.uid(1);
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(1)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(1),hka_messaging_test.uid(9),null,'Isolated test');
select hka_messaging_test.ok(true,'multi-role 1 sends from coach dashboard');
reset role; update public.hka_account_roles set is_active=false where user_id=hka_messaging_test.uid(1);
update public.hka_account_roles set is_active=true where user_id=hka_messaging_test.uid(1) and purpose='horse_owner';
update public.hka_profiles set role='student' where id=hka_messaging_test.uid(1);
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(1)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(1),hka_messaging_test.uid(9),null,'Isolated test');
select hka_messaging_test.ok(true,'multi-role 1 sends from horse_owner dashboard');
reset role; update public.hka_account_roles set is_active=false where user_id=hka_messaging_test.uid(3);
update public.hka_account_roles set is_active=true where user_id=hka_messaging_test.uid(3) and purpose='coach';
update public.hka_profiles set role='coach' where id=hka_messaging_test.uid(3);
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(3)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(3),hka_messaging_test.uid(2),hka_messaging_test.uid(2),'Isolated test');
select hka_messaging_test.ok(true,'multi-role 3 sends from coach dashboard');
reset role; update public.hka_account_roles set is_active=false where user_id=hka_messaging_test.uid(3);
update public.hka_account_roles set is_active=true where user_id=hka_messaging_test.uid(3) and purpose='student';
update public.hka_profiles set role='student' where id=hka_messaging_test.uid(3);
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(3)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(3),hka_messaging_test.uid(2),hka_messaging_test.uid(2),'Isolated test');
select hka_messaging_test.ok(true,'multi-role 3 sends from student dashboard');
reset role; update public.hka_account_roles set is_active=false where user_id=hka_messaging_test.uid(3);
update public.hka_account_roles set is_active=true where user_id=hka_messaging_test.uid(3) and purpose='guardian';
update public.hka_profiles set role='guardian' where id=hka_messaging_test.uid(3);
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(3)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(3),hka_messaging_test.uid(2),hka_messaging_test.uid(2),'Isolated test');
select hka_messaging_test.ok(true,'multi-role 3 sends from guardian dashboard');
reset role; update public.hka_account_roles set is_active=false where user_id=hka_messaging_test.uid(3);
update public.hka_account_roles set is_active=true where user_id=hka_messaging_test.uid(3) and purpose='horse_owner';
update public.hka_profiles set role='student' where id=hka_messaging_test.uid(3);
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(3)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(3),hka_messaging_test.uid(2),hka_messaging_test.uid(2),'Isolated test');
select hka_messaging_test.ok(true,'multi-role 3 sends from horse_owner dashboard');
reset role; update public.hka_account_roles set is_active=false where user_id=hka_messaging_test.uid(5);
update public.hka_account_roles set is_active=true where user_id=hka_messaging_test.uid(5) and purpose='guardian';
update public.hka_profiles set role='guardian' where id=hka_messaging_test.uid(5);
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(5)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(5),hka_messaging_test.uid(7),hka_messaging_test.uid(7),'Isolated test');
select hka_messaging_test.ok(true,'multi-role 5 sends from guardian dashboard');
reset role; update public.hka_account_roles set is_active=false where user_id=hka_messaging_test.uid(5);
update public.hka_account_roles set is_active=true where user_id=hka_messaging_test.uid(5) and purpose='student';
update public.hka_profiles set role='student' where id=hka_messaging_test.uid(5);
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(5)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(5),hka_messaging_test.uid(7),hka_messaging_test.uid(7),'Isolated test');
select hka_messaging_test.ok(true,'multi-role 5 sends from student dashboard');
reset role; update public.hka_account_roles set is_active=false where user_id=hka_messaging_test.uid(5);
update public.hka_account_roles set is_active=true where user_id=hka_messaging_test.uid(5) and purpose='coach';
update public.hka_profiles set role='coach' where id=hka_messaging_test.uid(5);
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(5)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(5),hka_messaging_test.uid(7),hka_messaging_test.uid(7),'Isolated test');
select hka_messaging_test.ok(true,'multi-role 5 sends from coach dashboard');
reset role; update public.hka_account_roles set is_active=false where user_id=hka_messaging_test.uid(5);
update public.hka_account_roles set is_active=true where user_id=hka_messaging_test.uid(5) and purpose='horse_owner';
update public.hka_profiles set role='student' where id=hka_messaging_test.uid(5);
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(5)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(5),hka_messaging_test.uid(7),hka_messaging_test.uid(7),'Isolated test');
select hka_messaging_test.ok(true,'multi-role 5 sends from horse_owner dashboard');
reset role; savepoint founder_revoked; update public.hka_account_roles set status='revoked' where user_id=hka_messaging_test.uid(1) and purpose='admin';
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(9)::text,true); set local role authenticated;
select hka_messaging_test.denied('insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(9),hka_messaging_test.uid(1),null,''Isolated test'')','revoked designated Founder cannot receive new direct sends');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(18)::text,true); set local role authenticated;
select hka_messaging_test.ok(not exists(select 1 from public.hka_message_contacts() where directory_entry),'second Admin cannot replace revoked Founder');
reset role; rollback to savepoint founder_revoked;
reset role; savepoint metadata_age; update auth.users set raw_user_meta_data=raw_user_meta_data-'birth_date' where id=hka_messaging_test.uid(2);
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(2)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(2),hka_messaging_test.uid(3),hka_messaging_test.uid(2),'Isolated test');
select hka_messaging_test.ok(true,'adult with stored DOB can message assigned Coach without birth date in auth metadata');
reset role; update auth.users set raw_user_meta_data=jsonb_set(raw_user_meta_data,'{birth_date}','"1990-01-01"'::jsonb) where id=hka_messaging_test.uid(13);
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(13)::text,true); set local role authenticated;
select hka_messaging_test.denied('insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(13),hka_messaging_test.uid(1),hka_messaging_test.uid(13),''Isolated test'')','claimed adult DOB in auth metadata cannot bypass actual minor consent');
reset role; rollback to savepoint metadata_age;
reset role; savepoint legacy_age; alter table public.hka_profiles alter column birth_date drop not null; update public.hka_profiles set birth_date=null where id=hka_messaging_test.uid(14);
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(14)::text,true); set local role authenticated;
select hka_messaging_test.denied('insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(14),hka_messaging_test.uid(3),hka_messaging_test.uid(14),''Isolated test'')','missing DOB is unknown age; approved Student role alone cannot bypass consent');
select hka_messaging_test.denied('insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(14),hka_messaging_test.uid(1),hka_messaging_test.uid(14),''Isolated test'')','missing DOB cannot bypass Founder safeguarding');
reset role; insert into public.hka_guardians(student_id,guardian_id,child_label,status,verified_by,consent_at) values(hka_messaging_test.uid(14),hka_messaging_test.uid(5),'Unknown age fixture','approved',hka_messaging_test.uid(1),now());
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(14)::text,true); set local role authenticated;
select hka_messaging_test.denied('insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(14),hka_messaging_test.uid(3),hka_messaging_test.uid(14),''Isolated test'')','unknown-age Coach messaging still requires specific Coach consent');
reset role; insert into public.hka_student_link_codes(id,student_id,kind,code_hash,expires_at) values(hka_messaging_test.uid(202),hka_messaging_test.uid(14),'coach',decode(repeat('02',32),'hex'),now()+interval '1 day');
insert into public.hka_link_requests(code_id,student_id,claimant_id,kind,status,founder_approved_at,founder_id,guardian_consented_at) values(hka_messaging_test.uid(202),hka_messaging_test.uid(14),hka_messaging_test.uid(3),'coach','approved',now(),hka_messaging_test.uid(1),now());
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(14)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(14),hka_messaging_test.uid(3),hka_messaging_test.uid(14),'Isolated test');
select hka_messaging_test.ok(true,'unknown-age Student allowed only after both activation and specific Coach consent');
reset role; rollback to savepoint legacy_age;
savepoint revoke_assignment; delete from public.hka_coach_students where coach_id=hka_messaging_test.uid(3) and student_id=hka_messaging_test.uid(2);
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(3)::text,true); set local role authenticated;
select hka_messaging_test.denied('insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(3),hka_messaging_test.uid(2),hka_messaging_test.uid(2),''Isolated test'')','assignment revocation blocks new sends');
select hka_messaging_test.ok(exists(select 1 from public.hka_messages where id=hka_messaging_test.uid(105)),'participant history survives assignment revocation');
reset role; rollback to savepoint revoke_assignment; savepoint revoke_consent; update public.hka_link_requests set revoked_at=now() where student_id=hka_messaging_test.uid(7);
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(3)::text,true); set local role authenticated;
select hka_messaging_test.denied('insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(3),hka_messaging_test.uid(7),hka_messaging_test.uid(7),''Isolated test'')','revoked Coach consent blocks new minor messages');
reset role; rollback to savepoint revoke_consent; savepoint revoke_guardian; update public.hka_guardians set status='revoked',consent_at=null where student_id=hka_messaging_test.uid(7);
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(1)::text,true); set local role authenticated;
select hka_messaging_test.denied('insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(1),hka_messaging_test.uid(7),hka_messaging_test.uid(7),''Isolated test'')','Founder cannot bypass revoked account activation consent');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(5)::text,true); set local role authenticated;
select hka_messaging_test.ok(not exists(select 1 from public.hka_messages where id=hka_messaging_test.uid(102)),'revoked Guardian loses child oversight');
reset role; rollback to savepoint revoke_guardian;
set local role anon;
select hka_messaging_test.denied('select * from public.hka_message_contacts()','anonymous contact API denied');
select hka_messaging_test.denied('select * from public.hka_messages','anonymous table reads denied');
reset role;
insert into hka_messaging_test.fingerprints values('before_rollback',hka_messaging_test.fingerprint());
savepoint rollback_drift; alter policy hka_messages_read on public.hka_messages using(true);
select hka_messaging_test.rejects('do $preflight$
declare baseline hka_messaging.installation_snapshot%rowtype;
 actual_policies jsonb; actual_functions jsonb; actual_triggers jsonb;
begin
 if current_user<>''postgres'' then raise exception ''Reviewed postgres owner required.''; end if;
 if not exists(select 1 from pg_class where oid=''public.hka_messages''::regclass and relrowsecurity) then
  raise exception ''Messaging RLS must remain enabled.'';
 end if;
 -- Never accept a disabled/replica/otherwise altered guard, even if an unsafe
 -- snapshot records the same state. Validate origin execution and exact wiring.
 if current_setting(''session_replication_role'')<>''origin''
 or not exists(select 1 from pg_trigger t
  where t.tgrelid=''public.hka_messages''::regclass
   and t.tgname=''hka_message_guard_write'' and not t.tgisinternal
   and t.tgenabled=''O''
   and pg_get_triggerdef(t.oid)=''CREATE TRIGGER hka_message_guard_write BEFORE INSERT OR UPDATE ON public.hka_messages FOR EACH ROW EXECUTE FUNCTION hka_messaging.guard_write()'') then
  raise exception ''Installed policies/helpers/triggers drifted: required enabled origin-mode message guard missing or altered.'';
 end if;
 select * into strict baseline from hka_messaging.installation_snapshot where singleton;
 select jsonb_agg(to_jsonb(p) order by p.policyname) into actual_policies
  from pg_policies p where p.schemaname=''public'' and p.tablename=''hka_messages'';
 select jsonb_object_agg(p.oid::regprocedure::text,jsonb_build_object(''definition'',pg_get_functiondef(p.oid),''owner'',pg_get_userbyid(p.proowner),''acl'',p.proacl::text))
  into actual_functions from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname=''hka_messaging'' or (n.nspname=''public'' and p.proname=''hka_message_contacts'');
 select jsonb_agg(jsonb_build_object(''name'',t.tgname,''definition'',pg_get_triggerdef(t.oid),''enabled'',t.tgenabled::text) order by t.tgname) into actual_triggers
  from pg_trigger t where t.tgrelid=''public.hka_messages''::regclass and not t.tgisinternal;
 if actual_policies is distinct from baseline.policy_definitions
  or actual_functions is distinct from baseline.function_definitions
  or actual_triggers is distinct from baseline.trigger_definitions then
  raise exception ''Installed policies/helpers/triggers drifted or rollback already ran: review before proceeding.'';
 end if;
end
$preflight$;','Installed policies/helpers/triggers drifted','rollback detects same-name policy drift');
rollback to savepoint rollback_drift;
savepoint rollback_guard_drift; alter table public.hka_messages disable trigger hka_message_guard_write;
select hka_messaging_test.rejects('do $preflight$
declare baseline hka_messaging.installation_snapshot%rowtype;
 actual_policies jsonb; actual_functions jsonb; actual_triggers jsonb;
begin
 if current_user<>''postgres'' then raise exception ''Reviewed postgres owner required.''; end if;
 if not exists(select 1 from pg_class where oid=''public.hka_messages''::regclass and relrowsecurity) then
  raise exception ''Messaging RLS must remain enabled.'';
 end if;
 -- Never accept a disabled/replica/otherwise altered guard, even if an unsafe
 -- snapshot records the same state. Validate origin execution and exact wiring.
 if current_setting(''session_replication_role'')<>''origin''
 or not exists(select 1 from pg_trigger t
  where t.tgrelid=''public.hka_messages''::regclass
   and t.tgname=''hka_message_guard_write'' and not t.tgisinternal
   and t.tgenabled=''O''
   and pg_get_triggerdef(t.oid)=''CREATE TRIGGER hka_message_guard_write BEFORE INSERT OR UPDATE ON public.hka_messages FOR EACH ROW EXECUTE FUNCTION hka_messaging.guard_write()'') then
  raise exception ''Installed policies/helpers/triggers drifted: required enabled origin-mode message guard missing or altered.'';
 end if;
 select * into strict baseline from hka_messaging.installation_snapshot where singleton;
 select jsonb_agg(to_jsonb(p) order by p.policyname) into actual_policies
  from pg_policies p where p.schemaname=''public'' and p.tablename=''hka_messages'';
 select jsonb_object_agg(p.oid::regprocedure::text,jsonb_build_object(''definition'',pg_get_functiondef(p.oid),''owner'',pg_get_userbyid(p.proowner),''acl'',p.proacl::text))
  into actual_functions from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname=''hka_messaging'' or (n.nspname=''public'' and p.proname=''hka_message_contacts'');
 select jsonb_agg(jsonb_build_object(''name'',t.tgname,''definition'',pg_get_triggerdef(t.oid),''enabled'',t.tgenabled::text) order by t.tgname) into actual_triggers
  from pg_trigger t where t.tgrelid=''public.hka_messages''::regclass and not t.tgisinternal;
 if actual_policies is distinct from baseline.policy_definitions
  or actual_functions is distinct from baseline.function_definitions
  or actual_triggers is distinct from baseline.trigger_definitions then
  raise exception ''Installed policies/helpers/triggers drifted or rollback already ran: review before proceeding.'';
 end if;
end
$preflight$;','Installed policies/helpers/triggers drifted','rollback rejects disable guard');
rollback to savepoint rollback_guard_drift;
savepoint rollback_guard_drift; alter table public.hka_messages enable replica trigger hka_message_guard_write;
select hka_messaging_test.rejects('do $preflight$
declare baseline hka_messaging.installation_snapshot%rowtype;
 actual_policies jsonb; actual_functions jsonb; actual_triggers jsonb;
begin
 if current_user<>''postgres'' then raise exception ''Reviewed postgres owner required.''; end if;
 if not exists(select 1 from pg_class where oid=''public.hka_messages''::regclass and relrowsecurity) then
  raise exception ''Messaging RLS must remain enabled.'';
 end if;
 -- Never accept a disabled/replica/otherwise altered guard, even if an unsafe
 -- snapshot records the same state. Validate origin execution and exact wiring.
 if current_setting(''session_replication_role'')<>''origin''
 or not exists(select 1 from pg_trigger t
  where t.tgrelid=''public.hka_messages''::regclass
   and t.tgname=''hka_message_guard_write'' and not t.tgisinternal
   and t.tgenabled=''O''
   and pg_get_triggerdef(t.oid)=''CREATE TRIGGER hka_message_guard_write BEFORE INSERT OR UPDATE ON public.hka_messages FOR EACH ROW EXECUTE FUNCTION hka_messaging.guard_write()'') then
  raise exception ''Installed policies/helpers/triggers drifted: required enabled origin-mode message guard missing or altered.'';
 end if;
 select * into strict baseline from hka_messaging.installation_snapshot where singleton;
 select jsonb_agg(to_jsonb(p) order by p.policyname) into actual_policies
  from pg_policies p where p.schemaname=''public'' and p.tablename=''hka_messages'';
 select jsonb_object_agg(p.oid::regprocedure::text,jsonb_build_object(''definition'',pg_get_functiondef(p.oid),''owner'',pg_get_userbyid(p.proowner),''acl'',p.proacl::text))
  into actual_functions from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname=''hka_messaging'' or (n.nspname=''public'' and p.proname=''hka_message_contacts'');
 select jsonb_agg(jsonb_build_object(''name'',t.tgname,''definition'',pg_get_triggerdef(t.oid),''enabled'',t.tgenabled::text) order by t.tgname) into actual_triggers
  from pg_trigger t where t.tgrelid=''public.hka_messages''::regclass and not t.tgisinternal;
 if actual_policies is distinct from baseline.policy_definitions
  or actual_functions is distinct from baseline.function_definitions
  or actual_triggers is distinct from baseline.trigger_definitions then
  raise exception ''Installed policies/helpers/triggers drifted or rollback already ran: review before proceeding.'';
 end if;
end
$preflight$;','Installed policies/helpers/triggers drifted','rollback rejects enable replica guard');
rollback to savepoint rollback_guard_drift;
-- REVIEW PROPOSAL ONLY. Separate Founder approval required for execution.
-- RESTRICTIVE FEATURE ROLLBACK, deliberately NOT restoration of legacy policies.
-- Matches 202611060001_message_hollie.sql only.
-- See docs/MESSAGE_HOLLIE_APPROVAL.md for retained schema/API contract.

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
-- * public.hka_message_contacts() retains its eleven-column contract, including designated founder_id;
-- * owner-only Founder identity constant remains bound to Hollie, never any other Admin;
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
select hka_messaging_test.ok(hka_messaging_test.fingerprint()=(select value from hka_messaging_test.fingerprints where label='before_rollback'),'rollback preserves every public HKA application row');
select hka_messaging_test.ok(hka_messaging.founder_id()=hka_messaging_test.uid(1) and not hka_messaging.founder(hka_messaging_test.uid(18)),'rollback retains designated identity without promoting second Admin');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(1)::text,true); set local role authenticated;
select hka_messaging_test.denied('insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(1),hka_messaging_test.uid(9),null,''Isolated test'')','rollback disables platform Founder direct sends');
select hka_messaging_test.ok(not exists(select 1 from public.hka_message_contacts() where directory_entry),'rollback removes global Founder directory grants');
select hka_messaging_test.ok(exists(select 1 from public.hka_messages where sender_id=hka_messaging_test.uid(1) and recipient_id=hka_messaging_test.uid(9) and student_id is null),'rollback retains NULL-scope Founder history');
select hka_messaging_test.ok(not exists(select 1 from public.hka_messages where id=hka_messaging_test.uid(101)),'rollback never restores global Founder private reads');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(6)::text,true); set local role authenticated;
select hka_messaging_test.ok(not exists(select 1 from public.hka_messages where id=hka_messaging_test.uid(101)) and exists(select 1 from public.hka_messages where id=hka_messaging_test.uid(102)),'rollback preserves cross-guardian isolation and child oversight');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(3)::text,true); set local role authenticated;
insert into public.hka_messages(sender_id,recipient_id,student_id,body) values(hka_messaging_test.uid(3),hka_messaging_test.uid(2),hka_messaging_test.uid(2),'Isolated test');
select hka_messaging_test.ok(true,'assigned Coach messaging survives restrictive rollback');
reset role;
select hka_messaging_test.ok(exists(select 1 from pg_trigger where tgrelid='public.hka_messages'::regclass and tgname='hka_message_guard_write' and tgenabled='O'),'restrictive rollback retains enabled immutable-message guard');
reset role; select set_config('request.jwt.claim.sub',hka_messaging_test.uid(7)::text,true); set local role authenticated;
select hka_messaging_test.denied('update public.hka_messages set read_at=null where id=hka_messaging_test.uid(102)','recipient cannot clear receipt after rollback');
reset role;
rollback;
