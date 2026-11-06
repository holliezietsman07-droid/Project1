// Extra adversarial cases; preserve observed failures instead of stopping coverage.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..');
module.exports=function() {
 const read=p=>fs.readFileSync(path.join(root,p),'utf8');
 const unwrap=s=>s.replace(/^begin;\s*$/mi,'').replace(/^commit;\s*$/mi,'');
 const migration=read('supabase/proposals/202610310001_founder_direct_messaging.sql');
 const rollback=read('supabase/proposals/202610310001_founder_direct_messaging.rollback.sql');
 const preflight=rollback.match(/do \$preflight\$[\s\S]*?\$preflight\$;/)[0];
 const q=s=>"'"+s.replaceAll("'","''")+"'";
 const uid=n=>'hka_messaging_test.uid('+n+')';
 const user=n=>"reset role; select set_config('request.jwt.claim.sub',"+uid(n)+"::text,true); set local role authenticated;\n";
 const send=(a,b,s,body='Extra synthetic fixture')=>'insert into public.hka_messages(sender_id,recipient_id,student_id,body) values('+uid(a)+','+uid(b)+','+(s===null?'null':uid(s))+','+q(body)+')';
 const ok=(cond,label)=>'select hka_messaging_test.observe('+cond+','+q(label)+');\n';
 const deny=(stmt,label)=>'select hka_messaging_test.denied('+q(stmt)+','+q(label)+');\n';
 let sql="begin; set local search_path=pg_catalog,public;\n";
 sql+="do $$ begin if current_database() !~ '^hka_messaging_security_[a-z0-9_]+$' or current_user<>'postgres' or exists(select 1 from auth.users) or exists(select 1 from public.hka_profiles) then raise exception 'Only empty disposable local database permitted'; end if; end $$;\n";
 sql+=read('supabase/tests/founder_messaging/fixtures.sql')+unwrap(migration);
 sql+=`create function hka_messaging_test.observe(condition boolean,label text) returns text language sql as $$ select case when condition is true then 'PASS: ' else 'FAIL: ' end || label $$;
create function hka_messaging_test.was_rejected(statement text,expected_message text) returns boolean language plpgsql as $$
begin begin execute statement; exception when raise_exception then if position(expected_message in sqlerrm)>0 then return true; end if; raise; end; return false; end $$;
`;
 sql+=ok("not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='hka_messaging' and (pg_get_userbyid(p.proowner)<>'postgres' or not ('search_path=\"\"'=any(p.proconfig))))",'all private helpers retain reviewed owner and empty search path');
 sql+=ok("not has_schema_privilege('anon','hka_messaging','USAGE') and not has_table_privilege('authenticated','hka_messaging.installation_snapshot','SELECT')",'anonymous private schema and client installation snapshot access denied');
 sql+=user(1)+ok('exists(select 1 from public.hka_message_contacts() where id='+uid(13)+' and not can_message)','Founder directory marks unconsented minor unavailable');
 sql+=user(3)+ok('not hka_messaging.can_send('+uid(1)+',null,'+uid(9)+')','caller-bound send helper refuses another actor identity');
 sql+=deny('select hka_messaging.has_role('+uid(1)+", 'admin')",'authenticated caller cannot invoke arbitrary privileged role helper');
 sql+=deny(send(3,2,2,'   '),'whitespace-only message denied');
 sql+=user(6)+send(6,3,7,'Second guardian private fixture')+';\n';
 sql+=user(5)+ok("not exists(select 1 from public.hka_messages where body='Second guardian private fixture')",'first Guardian cannot read second Guardian private Coach DM');
 sql+=user(3)+send(3,2,2,'Server timestamps fixture').replace('body) values','body,created_at) values').replace(/\)$/,",timestamptz '2000-01-01')")+';\n';
 sql+=user(2)+ok("exists(select 1 from public.hka_messages where body='Server timestamps fixture' and created_at=now())",'insert ignores forged creation timestamp');
 sql+="update public.hka_messages set read_at=timestamptz '2100-01-01' where body='Server timestamps fixture';\n";
 sql+=ok("exists(select 1 from public.hka_messages where body='Server timestamps fixture' and read_at=now())",'recipient read receipt uses server time');
 sql+="reset role; savepoint role_revoke; update public.hka_account_roles set status='revoked',is_active=false where user_id="+uid(1)+" and purpose='admin';\n";
 sql+=user(1)+deny(send(1,9,null),'revoked Founder purpose cannot retain direct privileges through another approved role');
 sql+="reset role; rollback to savepoint role_revoke;\n";
 for(const [change,label] of [
  ["update public.hka_link_requests set founder_approved_at=null where student_id="+uid(7),'minor assigned Coach requires Founder approval timestamp'],
  ["update public.hka_link_requests set guardian_consented_at=null where student_id="+uid(7),'minor assigned Coach requires specific guardian consent timestamp'],
  ["update public.hka_link_requests set status='awaiting_consent' where student_id="+uid(7),'minor assigned Coach requires approved link status']
 ]) {
  sql+='savepoint consent_case; '+change+';\n'+user(3)+deny(send(3,7,7),label)+'reset role; rollback to savepoint consent_case;\n';
 }
 sql+="savepoint one_guardian; update public.hka_guardians set status='revoked',consent_at=null where student_id="+uid(7)+' and guardian_id='+uid(5)+';\n';
 sql+=user(1)+send(1,7,7)+';\n'+ok('true','remaining approved Guardian preserves minor activation');
 sql+=user(6)+ok('exists(select 1 from public.hka_messages where id='+uid(106)+')','remaining approved Guardian retains Founder-child oversight');
 sql+=user(5)+ok('not exists(select 1 from public.hka_messages where id='+uid(106)+')','revoked first Guardian cannot oversee Founder-child messages');
 sql+='reset role; rollback to savepoint one_guardian; savepoint bad_guardians; update public.hka_profiles set suspended=true where id in ('+uid(5)+','+uid(6)+');\n';
 sql+=user(1)+deny(send(1,7,7),'suspended guardians cannot activate minor Founder messaging');
 sql+='reset role; rollback to savepoint bad_guardians;\n';
 sql+='savepoint owner_consent; update public.hka_guardians set status=\'revoked\',consent_at=null where student_id='+uid(16)+';\n';
 sql+=user(1)+deny(send(1,16,16),'minor Horse Owner still requires approved guardian consent');
 sql+='reset role; rollback to savepoint owner_consent;\n';
 for(const [alter,label] of [
  ["grant execute on function hka_messaging.has_role(uuid,text) to anon;",'rollback rejects private-helper ACL drift'],
  ["alter function hka_messaging.has_role(uuid,text) owner to service_role;",'rollback rejects private-helper owner drift'],
  ["create or replace function hka_messaging.direct_enabled() returns boolean language sql stable set search_path='' as $$ select false $$;",'rollback rejects helper-definition drift'],
  ["drop trigger hka_message_guard_write on public.hka_messages;",'rollback rejects missing immutable-message trigger'],
  ["alter table public.hka_messages disable trigger hka_message_guard_write;",'rollback rejects disabled immutable-message trigger'],
 ]) {
  sql+='savepoint rollback_case; '+alter+'\n'+ok('hka_messaging_test.was_rejected('+q(preflight)+","+q('Installed policies/helpers/triggers drifted')+')',label)+'rollback to savepoint rollback_case;\n';
 }
 // The required safe state is independent of the installation snapshot.
 for(const [alter,label] of [
  ["alter table public.hka_messages enable replica trigger hka_message_guard_write;",'rollback rejects replica-only message guard'],
  ["alter table public.hka_messages enable always trigger hka_message_guard_write;",'rollback rejects unreviewed ALWAYS trigger state'],
  ["drop trigger hka_message_guard_write on public.hka_messages; create trigger hka_message_guard_write before update on public.hka_messages for each row execute function hka_messaging.guard_write();",'rollback rejects changed guard event definition'],
  ["alter table public.hka_messages disable trigger hka_message_guard_write; update hka_messaging.installation_snapshot set trigger_definitions=(select jsonb_agg(jsonb_build_object('name',t.tgname,'definition',pg_get_triggerdef(t.oid),'enabled',t.tgenabled::text) order by t.tgname) from pg_trigger t where t.tgrelid='public.hka_messages'::regclass and not t.tgisinternal);",'rollback rejects disabled guard even when snapshot matches unsafe state'],
  ["set local session_replication_role=replica;",'rollback rejects session that bypasses origin-mode triggers'],
  ["create or replace function hka_messaging.guard_write() returns trigger language plpgsql security invoker set search_path='' as $tampered$ begin return new; end $tampered$;",'rollback rejects altered message guard implementation']
 ]) {
  sql+='savepoint unsafe_guard; '+alter+'\n'+ok('hka_messaging_test.was_rejected('+q(preflight)+','+q('Installed policies/helpers/triggers drifted')+')',label)+'rollback to savepoint unsafe_guard;\n';
 }
 for(const [script,phase] of [[migration,'migration'],[rollback,'rollback']]) {
  const finalCheck=script.match(/do \$guard_state\$[\s\S]*?\$guard_state\$;/)[0];
  for(const [alter,label] of [
   ["alter table public.hka_messages disable trigger hka_message_guard_write;",'disabled guard'],
   ["drop trigger hka_message_guard_write on public.hka_messages;",'missing guard'],
   ["drop trigger hka_message_guard_write on public.hka_messages; create trigger hka_message_guard_write before update on public.hka_messages for each row execute function hka_messaging.guard_write();",'altered trigger definition'],
   ["set local session_replication_role=replica;",'replication bypass']
  ]) {
   sql+='savepoint final_guard; '+alter+'\n'+ok('hka_messaging_test.was_rejected('+q(finalCheck)+','+q('Required message guard missing, disabled or altered')+')',phase+' precommit check rejects '+label)+'rollback to savepoint final_guard;\n';
  }
  sql+='savepoint final_body; create or replace function hka_messaging.guard_write() returns trigger language plpgsql security invoker set search_path=\'\' as $tampered$ begin return new; end $tampered$;\n'+
   ok('hka_messaging_test.was_rejected('+q(finalCheck)+','+q('Message guard definition/state changed before commit')+')',phase+' precommit check rejects altered guard function')+'rollback to savepoint final_body;\n';
 }
 sql+="insert into hka_messaging_test.fingerprints values('extra_before_rollback',hka_messaging_test.fingerprint());\n";
 sql+=require('./disabled-trigger-cases.cjs')({user,uid,ok,deny,rollback:unwrap(rollback)});
 // Demonstrate rollback resets accidental message-table privilege widening.
 sql+='grant select on public.hka_messages to anon; grant update(body) on public.hka_messages to authenticated;\n';
 sql+=unwrap(rollback);
 sql+=ok("not has_table_privilege('anon','public.hka_messages','SELECT') and not has_column_privilege('authenticated','public.hka_messages','body','UPDATE')",'rollback removes accidental anonymous reads and body-update grants');
 sql+=ok("hka_messaging_test.fingerprint()=(select value from hka_messaging_test.fingerprints where label='extra_before_rollback')",'additional rollback preserves all reconstructed HKA table fingerprints');
 // Prove the retained trigger itself rejects immutable fields, even with widened grants.
 sql+='savepoint effective_guard; grant update(id,student_id,sender_id,recipient_id,body,created_at) on public.hka_messages to authenticated;\n'+user(7);
 for(const [field,value] of [['id',uid(999)],['student_id',uid(8)],['sender_id',uid(5)],['recipient_id',uid(5)],['body',q('Tampered rollback body')],['created_at',"timestamptz '2000-01-01'"]]) {
  sql+=deny('update public.hka_messages set '+field+'='+value+' where id='+uid(102),'rollback guard rejects mutation of '+field+' even with accidental UPDATE grant');
 }
 sql+='reset role; rollback to savepoint effective_guard;\n';
 sql+=user(9)+deny(send(9,1,null),'rollback denies Horse Owner reply to Founder without independent relationship');
 sql+=user(7)+deny(send(7,1,7),'rollback denies minor reply to Founder without independent relationship');
 sql+=user(3)+send(3,7,7)+';\n'+ok('true','approved minor assigned-Coach messaging survives rollback');
 sql+=user(6)+send(6,3,7)+';\n'+ok('true','approved Guardian private Coach messaging survives rollback');
 sql+=user(7)+send(7,5,7)+';\n'+ok('true','approved child-to-Guardian messaging survives rollback');
 sql+='reset role;\n'+ok('hka_messaging_test.was_rejected('+q(preflight)+","+q('Installed policies/helpers/triggers drifted')+')','rollback replay fails closed');
 sql+='rollback;\n';
 return sql;
};
