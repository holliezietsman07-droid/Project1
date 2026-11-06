// A rejected rollback aborts its transaction; never silently repairs prior drift.
// After the failed attempt is reverted, normal rollback must retain an effective guard.
module.exports=({user,uid,ok,rollback,deny})=>{
 const q=s=>"'"+s.replaceAll("'","''")+"'";
 return 'savepoint disabled_rollback;\n'+user(7)+
 'update public.hka_messages set read_at=now() where id='+uid(102)+'; reset role;\n'+
 "insert into hka_messaging_test.fingerprints values('disabled_before_rollback',hka_messaging_test.fingerprint());\n"+
 ok('hka_messaging_test.was_rejected('+q('alter table public.hka_messages disable trigger hka_message_guard_write;\n'+rollback)+','+q('Installed policies/helpers/triggers drifted')+')','full rollback rejects disabled guard and aborts attempted transaction')+
 ok("exists(select 1 from pg_trigger where tgrelid='public.hka_messages'::regclass and tgname='hka_message_guard_write' and tgenabled='O')",'rollback does not leave immutable-message trigger disabled')+
 ok("hka_messaging.direct_enabled() and hka_messaging_test.fingerprint()=(select value from hka_messaging_test.fingerprints where label='disabled_before_rollback')",'rejected rollback preserves feature state and every message/receipt')+
 rollback+
 ok("exists(select 1 from pg_trigger where tgrelid='public.hka_messages'::regclass and tgname='hka_message_guard_write' and tgenabled='O')",'normal rollback retains enabled message guard in PostgreSQL metadata')+
 user(7)+deny('update public.hka_messages set read_at=null where id='+uid(102),'authenticated recipient cannot clear receipt after normal rollback')+
 'reset role;\n'+
 ok("hka_messaging_test.fingerprint()=(select value from hka_messaging_test.fingerprints where label='disabled_before_rollback')",'rollback preserves read-receipt immutability after disabled-trigger drift')+
 'rollback to savepoint disabled_rollback;\n';
};
