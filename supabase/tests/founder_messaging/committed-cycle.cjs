// Execute unchanged submitted transaction boundaries in separate local sessions.
const fs=require('node:fs'),path=require('node:path');
module.exports=function(){
 const root=path.resolve(__dirname,'../../..');
 const read=p=>fs.readFileSync(path.join(root,p),'utf8');
 const uid=n=>'hka_messaging_test.uid('+n+')';
 const actor=n=>"reset role; select set_config('request.jwt.claim.sub',"+uid(n)+"::text,false); set role authenticated;\n";
 const ok=(s,label)=>"select hka_messaging_test.ok("+s+",'"+label+"');\n";
 return [
 {name:'committed-fixtures',sql:'begin;\n'+read('supabase/tests/founder_messaging/fixtures.sql')+'\ncommit;'},
 {name:'committed-migration',sql:read('supabase/proposals/202610310001_founder_direct_messaging.sql')},
 {name:'committed-send',sql:
  ok("hka_messaging_test.fingerprint()=(select value from hka_messaging_test.fingerprints where label='before_migration')",'committed migration preserves every reconstructed HKA row')+
  actor(1)+"insert into public.hka_messages(sender_id,recipient_id,student_id,body) values("+uid(1)+','+uid(9)+",null,'Committed synthetic direct message');\n"+
  ok("exists(select 1 from public.hka_messages where body='Committed synthetic direct message')",'committed Founder send is persisted')+
  ok('not exists(select 1 from public.hka_messages where id='+uid(101)+')','committed Founder cannot read unrelated private Coach DM')+
  actor(9)+ok("exists(select 1 from public.hka_messages where body='Committed synthetic direct message')",'recipient sees persisted Founder direct message')+
  "reset role; insert into hka_messaging_test.fingerprints values('committed_before_rollback',hka_messaging_test.fingerprint());\n"},
 {name:'committed-rollback',sql:read('supabase/proposals/202610310001_founder_direct_messaging.rollback.sql')},
 {name:'committed-rollback-checks',sql:
  ok("hka_messaging_test.fingerprint()=(select value from hka_messaging_test.fingerprints where label='committed_before_rollback')",'committed rollback preserves all reconstructed HKA rows')+
  actor(1)+ok("exists(select 1 from public.hka_messages where body='Committed synthetic direct message' and student_id is null)",'committed rollback preserves NULL-scope Founder history')+
  "select hka_messaging_test.denied('insert into public.hka_messages(sender_id,recipient_id,student_id,body) values("+uid(1)+','+uid(9)+",null,''Blocked synthetic send'')','committed rollback denies new Founder direct send');\n"+
  ok('not exists(select 1 from public.hka_messages where id='+uid(101)+')','committed rollback does not restore global Founder reads')+
  actor(6)+ok('not exists(select 1 from public.hka_messages where id='+uid(101)+') and exists(select 1 from public.hka_messages where id='+uid(102)+')','committed rollback preserves guardian privacy and legitimate child oversight')+
  'reset role;\n'}
 ];
};
