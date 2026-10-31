-- DISPOSABLE LOCAL DATABASE ONLY. Runner rejects non-loopback/non-test targets.
-- Uses current restored HKA schema and real signup triggers; never copies live rows.
create schema hka_messaging_test;
grant usage on schema hka_messaging_test to authenticated,anon;
create function hka_messaging_test.uid(n integer) returns uuid
language sql immutable as $$ select ('f1000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid $$;
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
  (17,'Pending Guardian',array['guardian'],'guardian',false,true)
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
 insert into public.hka_messages(id,student_id,sender_id,recipient_id,body)
 select hka_messaging_test.uid(n),hka_messaging_test.uid(student),hka_messaging_test.uid(sender),hka_messaging_test.uid(recipient),'Historical fixture'
 from (values(101,7,3,5),(102,7,3,7),(103,8,4,8),(104,7,1,6),(105,2,2,3),(106,7,7,1)) v(n,student,sender,recipient);
end
$fixtures$;
insert into hka_messaging_test.fingerprints values('before_migration',hka_messaging_test.fingerprint());
