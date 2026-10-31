// Requires separate explicit Founder approval. Never imports credentials/env files.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const prepareOnly = process.argv.includes('--prepare-only');
const approval = process.env.HKA_APPROVE_ISOLATED_SQL;
if (!prepareOnly) {
if (approval !== 'FOUNDER_APPROVED_LOCAL_ONLY') {
  console.error('BLOCKED: separate Founder approval for disposable local SQL mutations is required.');
  process.exit(2);
}
const approvedTarget = process.env.HKA_ISOLATED_DATABASE_URL;
if (!approvedTarget) { console.error('BLOCKED: provide approved disposable local database URL.'); process.exit(2); }
const u = new URL(approvedTarget);
if (!['postgres:', 'postgresql:'].includes(u.protocol) ||
    !['localhost','127.0.0.1','[::1]'].includes(u.hostname) ||
    !/^\/hka_messaging_security_[a-z0-9_]+$/.test(u.pathname) ||
    u.search || decodeURIComponent(u.username) !== 'postgres') {
  throw new Error('Only postgres on loopback, named hka_messaging_security_*, with no connection overrides, is permitted.');
}
}
const target = process.env.HKA_ISOLATED_DATABASE_URL;
const root = path.resolve(__dirname, '../../..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const migrationPath = 'supabase/proposals/202610310001_founder_direct_messaging.sql';
const rollbackPath = 'supabase/proposals/202610310001_founder_direct_messaging.rollback.sql';
const migration = read(migrationPath), rollback = read(rollbackPath);
const unwrap = text => text.replace(/^begin;\s*$/mi,'').replace(/^commit;\s*$/mi,'');
const quote = value => "'" + value.replaceAll("'", "''") + "'";
const uid = n => "hka_messaging_test.uid(" + n + ")";
const scalar = sql => '('+sql+')';
let assertions = 0;
const ok = (condition,label) => { assertions++; return 'select hka_messaging_test.ok('+condition+','+quote(label)+');\n'; };
const deny = (sql,label) => { assertions++; return 'select hka_messaging_test.denied('+quote(sql)+','+quote(label)+');\n'; };
const user = n => "reset role; select set_config('request.jwt.claim.sub',"+uid(n)+"::text,true); set local role authenticated;\n";
const send = (sender,recipient,student,body='Isolated test') => 'insert into public.hka_messages(sender_id,recipient_id,student_id,body) values('+uid(sender)+','+uid(recipient)+','+(student===null?'null':uid(student))+','+quote(body)+')';
const preflight = migration.match(/do \$preflight\$[\s\S]*?\$preflight\$;/)[0];
let sql = "begin;\nset local search_path=pg_catalog,public;\n";
sql += "do $$ begin if current_database() !~ '^hka_messaging_security_[a-z0-9_]+$' or current_user<>'postgres' then raise exception 'Wrong isolated target'; end if; if exists(select 1 from public.hka_profiles) or exists(select 1 from auth.users) then raise exception 'Schema-only empty database required; never test on existing accounts'; end if; end $$;\n";
sql += read('supabase/tests/founder_messaging/fixtures.sql');
// Same-name policy widening, role-target drift and added policies must all fail.
for (const [alter,label] of [
 ["alter policy hka_messages_read on public.hka_messages using (true);","same-name SELECT expression drift"],
 ["alter policy hka_messages_insert on public.hka_messages with check (true);","same-name INSERT expression drift"],
 ["alter policy hka_messages_read on public.hka_messages to public;","policy role-target drift"],
 ["create policy unrelated_permissive on public.hka_messages for select using(true);","extra permissive policy"]]) {
 sql += 'savepoint drift;\n'+alter+'\n';
 assertions++;
 sql += 'select hka_messaging_test.rejects('+quote(preflight)+",'Live message policy definition drift',"+quote(label)+');\nrollback to savepoint drift;\n';
}
sql += unwrap(migration);
sql += ok("hka_messaging_test.fingerprint()=(select value from hka_messaging_test.fingerprints where label='before_migration')",'migration preserves every public HKA application row');
sql += ok("not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'hka_message_%' and p.prosecdef)",'new exposed API has no SECURITY DEFINER function');
sql += ok("not has_function_privilege('anon','public.hka_message_contacts()','EXECUTE') and not has_function_privilege('authenticated','hka_messaging.has_role(uuid,text)','EXECUTE')",'anonymous API and arbitrary privileged role helper denied');
sql += ok("not has_column_privilege('authenticated','public.hka_messages','body','UPDATE') and has_column_privilege('authenticated','public.hka_messages','read_at','UPDATE') and not has_table_privilege('authenticated','public.hka_messages','DELETE')",'only read receipt column updates granted');
sql += user(1);
sql += ok(scalar('select count(*)=16 from public.hka_message_contacts()'),'Founder on Coach dashboard sees complete registered directory');
sql += ok(scalar('select bool_and(directory_entry) from public.hka_message_contacts()'),'Founder directory flags independent of selected dashboard');
sql += ok('not exists(select 1 from public.hka_messages where id in ('+uid(101)+','+uid(102)+','+uid(103)+'))','Founder cannot read unrelated private conversations');
for (const [recipient,scope] of [[2,2],[3,3],[5,5],[6,null],[9,null],[7,7],[16,16]]) {
 sql += send(1,recipient,scope)+';\n';
 sql += ok('true','Founder sends to '+recipient+' without assignment');
 sql += user(recipient)+send(recipient,1,scope)+';\n'+ok('true','recipient '+recipient+' replies to Founder');
 sql += user(1);
}
for (const denied of [10,11,12,13,15]) sql += deny(send(1,denied,denied),'Founder cannot bypass suspension, verification, role approval or minor consent: '+denied);
sql += deny(send(2,1,2),'Founder cannot spoof sender');
sql += deny(send(1,2,null),'Founder cannot hide Student scope');
sql += user(3);
sql += ok('not exists(select 1 from public.hka_message_contacts() where id in ('+uid(4)+','+uid(8)+','+uid(9)+'))','Coach lacks global directory and unrelated contacts');
sql += send(3,2,2)+';\n'+send(3,7,7)+';\n'+send(3,5,7)+';\n';
sql += deny(send(3,8,8),'Coach cannot message unrelated Student');
sql += deny(send(3,13,13),'Coach cannot bypass missing minor consent despite assignment');
sql += deny(send(3,2,7),'Coach cannot spoof another Student scope');
sql += ok('not exists(select 1 from public.hka_messages where id='+uid(103)+')','Coach cannot read another Coach conversation');
sql += user(2)+send(2,3,2)+';\n'+deny(send(2,8,2),'Student cannot message unrelated Student');
sql += user(9)+deny(send(9,2,2),'Horse Owner cannot message arbitrary Student');
sql += user(5);
sql += ok('exists(select 1 from public.hka_messages where id='+uid(101)+') and exists(select 1 from public.hka_messages where id='+uid(102)+')','Guardian reads own Coach DM and child conversation');
sql += ok('not exists(select 1 from public.hka_messages where id='+uid(104)+')','Guardian cannot read another guardian Founder DM with child scope');
sql += user(6);
sql += ok('not exists(select 1 from public.hka_messages where id='+uid(101)+')','second Guardian cannot read first Guardian private Coach DM');
sql += ok('exists(select 1 from public.hka_messages where id='+uid(102)+') and exists(select 1 from public.hka_messages where id='+uid(106)+')','second Guardian retains child/Coach and child/Founder oversight');
sql += "do $$ declare changed integer; begin update public.hka_messages set read_at=now() where id="+uid(102)+"; get diagnostics changed=row_count; if changed<>0 then raise exception 'Oversight marked another recipient read'; end if; end $$;\n";
sql += user(7);
sql += 'update public.hka_messages set read_at=now() where id='+uid(102)+';\n';
sql += ok('exists(select 1 from public.hka_messages where id='+uid(102)+' and read_at is not null)','actual recipient can mark message read');
sql += deny('update public.hka_messages set body=\'tampered\' where id='+uid(102),'recipient cannot rewrite body');
sql += deny('update public.hka_messages set read_at=null where id='+uid(102),'recipient cannot clear read receipt');
for (const actor of [10,11,12,15]) {
 sql += user(actor)+ok('not exists(select 1 from public.hka_message_contacts())','inactive or unapproved actor '+actor+' receives no contacts');
 sql += deny(send(actor,1,actor),'inactive or unapproved actor '+actor+' cannot initiate Founder message');
}
sql += user(6)+send(6,3,7)+';\n'+ok('true','second approved Guardian can privately message assigned Coach');
sql += user(4)+deny(send(4,6,7),'unrelated Coach cannot contact another child Guardian');
sql += user(7)+deny('delete from public.hka_messages where id='+uid(102),'recipient cannot delete message history');
for (const [field,value] of [['sender_id',uid(5)],['recipient_id',uid(5)],['student_id',uid(8)],['created_at','now()'],['id',uid(999)]]) {
 sql += deny('update public.hka_messages set '+field+'='+value+' where id='+uid(102),'recipient cannot change '+field);
}
sql += user(2)+deny(send(2,3,2).replace('body) values','body,read_at) values').replace(/\)$/," ,now())"),'sender cannot insert a forged read receipt');
sql += user(17)+ok('not exists(select 1 from public.hka_messages where student_id='+uid(7)+')','pending Guardian cannot read child or private guardian history');
// Exercise every authorised dashboard combination while keeping durable roles unchanged.
for (const [actor,purposes,peer,scope] of [[1,['admin','student','guardian','coach','horse_owner'],9,null],[3,['coach','student','guardian','horse_owner'],2,2],[5,['guardian','student','coach','horse_owner'],7,7]]) {
 for (const purpose of purposes) {
  const profileRole=['student','horse_owner'].includes(purpose)?'student':purpose;
  sql += 'reset role; update public.hka_account_roles set is_active=false where user_id='+uid(actor)+';\n';
  sql += 'update public.hka_account_roles set is_active=true where user_id='+uid(actor)+' and purpose='+quote(purpose)+';\n';
  sql += 'update public.hka_profiles set role='+quote(profileRole)+' where id='+uid(actor)+';\n';
  sql += user(actor)+send(actor,peer,scope)+';\n'+ok('true','multi-role '+actor+' sends from '+purpose+' dashboard');
 }
}
// Auth metadata is not the trusted age source.
sql += "reset role; savepoint metadata_age; update auth.users set raw_user_meta_data=raw_user_meta_data-'birth_date' where id="+uid(2)+";\n";
sql += user(2)+send(2,3,2)+';\n'+ok('true','adult with stored DOB can message assigned Coach without birth date in auth metadata');
sql += "reset role; update auth.users set raw_user_meta_data=jsonb_set(raw_user_meta_data,'{birth_date}','\"1990-01-01\"'::jsonb) where id="+uid(13)+";\n";
sql += user(13)+deny(send(13,1,13),'claimed adult DOB in auth metadata cannot bypass actual minor consent');
sql += 'reset role; rollback to savepoint metadata_age;\n';
// Controlled schema fault injection ONLY: live DOB is NOT NULL.
sql += "reset role; savepoint legacy_age; alter table public.hka_profiles alter column birth_date drop not null; update public.hka_profiles set birth_date=null where id="+uid(14)+";\n";
sql += user(14)+deny(send(14,3,14),'missing DOB is unknown age; approved Student role alone cannot bypass consent');
sql += deny(send(14,1,14),'missing DOB cannot bypass Founder safeguarding');
sql += 'reset role; insert into public.hka_guardians(student_id,guardian_id,child_label,status,verified_by,consent_at) values('+uid(14)+','+uid(5)+",'Unknown age fixture','approved',"+uid(1)+',now());\n';
sql += user(14)+deny(send(14,3,14),'unknown-age Coach messaging still requires specific Coach consent');
sql += 'reset role; insert into public.hka_student_link_codes(id,student_id,kind,code_hash,expires_at) values('+uid(202)+','+uid(14)+",'coach',decode(repeat('02',32),'hex'),now()+interval '1 day');\n";
sql += 'insert into public.hka_link_requests(code_id,student_id,claimant_id,kind,status,founder_approved_at,founder_id,guardian_consented_at) values('+uid(202)+','+uid(14)+','+uid(3)+",'coach','approved',now(),"+uid(1)+',now());\n';
sql += user(14)+send(14,3,14)+';\n'+ok('true','unknown-age Student allowed only after both activation and specific Coach consent');
sql += 'reset role; rollback to savepoint legacy_age;\n';
// Revoke and restore inside savepoints to keep other tests independent.
sql += 'savepoint revoke_assignment; delete from public.hka_coach_students where coach_id='+uid(3)+' and student_id='+uid(2)+';\n';
sql += user(3)+deny(send(3,2,2),'assignment revocation blocks new sends');
sql += ok('exists(select 1 from public.hka_messages where id='+uid(105)+')','participant history survives assignment revocation');
sql += 'reset role; rollback to savepoint revoke_assignment; savepoint revoke_consent; update public.hka_link_requests set revoked_at=now() where student_id='+uid(7)+';\n';
sql += user(3)+deny(send(3,7,7),'revoked Coach consent blocks new minor messages');
sql += 'reset role; rollback to savepoint revoke_consent; savepoint revoke_guardian; update public.hka_guardians set status=\'revoked\',consent_at=null where student_id='+uid(7)+';\n';
sql += user(1)+deny(send(1,7,7),'Founder cannot bypass revoked account activation consent');
sql += user(5)+ok('not exists(select 1 from public.hka_messages where id='+uid(102)+')','revoked Guardian loses child oversight');
sql += 'reset role; rollback to savepoint revoke_guardian;\n';
sql += "set local role anon;\n"+deny('select * from public.hka_message_contacts()','anonymous contact API denied')+deny('select * from public.hka_messages','anonymous table reads denied')+'reset role;\n';
sql += "insert into hka_messaging_test.fingerprints values('before_rollback',hka_messaging_test.fingerprint());\n";
const rollbackPreflight=rollback.match(/do \$preflight\$[\s\S]*?\$preflight\$;/)[0];
sql += "savepoint rollback_drift; alter policy hka_messages_read on public.hka_messages using(true);\n";
assertions++;
sql += 'select hka_messaging_test.rejects('+quote(rollbackPreflight)+",'Installed policies/helpers/triggers drifted',"+quote('rollback detects same-name policy drift')+');\nrollback to savepoint rollback_drift;\n';
sql += unwrap(rollback);
sql += ok("hka_messaging_test.fingerprint()=(select value from hka_messaging_test.fingerprints where label='before_rollback')",'rollback preserves every public HKA application row');
sql += user(1)+deny(send(1,9,null),'rollback disables platform Founder direct sends');
sql += ok('not exists(select 1 from public.hka_message_contacts() where directory_entry)','rollback removes global Founder directory grants');
sql += ok('exists(select 1 from public.hka_messages where sender_id='+uid(1)+' and recipient_id='+uid(9)+' and student_id is null)','rollback retains NULL-scope Founder history');
sql += ok('not exists(select 1 from public.hka_messages where id='+uid(101)+')','rollback never restores global Founder private reads');
sql += user(6)+ok('not exists(select 1 from public.hka_messages where id='+uid(101)+') and exists(select 1 from public.hka_messages where id='+uid(102)+')','rollback preserves cross-guardian isolation and child oversight');
sql += user(3)+send(3,2,2)+';\n'+ok('true','assigned Coach messaging survives restrictive rollback');
sql += 'reset role;\nrollback;\n';
if (prepareOnly) {
 const evidence = {date:new Date().toISOString(),status:'PREPARED_NOT_EXECUTED',assertions,
  scope:'SQL suite generated locally; no SQL parser or database execution',
  migration_sha256:crypto.createHash('sha256').update(migration).digest('hex'),
  rollback_sha256:crypto.createHash('sha256').update(rollback).digest('hex')};
 fs.mkdirSync(path.join(root,'.elmony'),{recursive:true});
 fs.writeFileSync(path.join(root,'.elmony/founder-messaging-security-suite.sql'),sql);
 fs.writeFileSync(path.join(root,'docs/founder-messaging-evidence/suite-preparation.json'),JSON.stringify(evidence,null,2));
 console.log('PREPARED_NOT_EXECUTED',assertions,'assertions; no database connection');
 process.exit(0);
}
const cleanEnvironment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('PG')));
const psql = spawnSync('psql',['-X','--no-password','--set=ON_ERROR_STOP=1','--dbname',target],{input:sql,encoding:'utf8',maxBuffer:8*1024*1024,env:cleanEnvironment});
const output = (psql.stdout||'')+(psql.stderr||'');
const result = {date:new Date().toISOString(),scope:'Disposable local PostgreSQL, real restored schema and authenticated/anon SQL roles; NOT live API/browser acceptance',status:psql.status===0?'PASS':'BLOCKED_OR_FAIL',assertions,executed:!psql.error,migration_sha256:crypto.createHash('sha256').update(migration).digest('hex'),rollback_sha256:crypto.createHash('sha256').update(rollback).digest('hex'),output:output.replaceAll(target,'[LOCAL DATABASE]'),error:psql.error?.code};
fs.writeFileSync(path.join(root,'docs/founder-messaging-evidence/isolated-run.json'),JSON.stringify(result,null,2));
console.log(result.status,assertions,'assertions');
if (psql.status!==0) console.error(result.error||result.output);
process.exit(psql.status??2);
