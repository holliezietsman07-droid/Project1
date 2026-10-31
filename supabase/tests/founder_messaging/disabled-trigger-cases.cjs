// Reproduce disabled-trigger rollback impact without altering proposal SQL.
module.exports=({user,uid,ok,rollback})=>
 'savepoint disabled_rollback;\n'+user(7)+
 'update public.hka_messages set read_at=now() where id='+uid(102)+'; reset role; alter table public.hka_messages disable trigger hka_message_guard_write;\n'+
 rollback+
 ok("exists(select 1 from pg_trigger where tgrelid='public.hka_messages'::regclass and tgname='hka_message_guard_write' and tgenabled in ('O','A'))",'rollback does not leave immutable-message trigger disabled')+
 user(7)+'update public.hka_messages set read_at=null where id='+uid(102)+';\n'+
 ok('exists(select 1 from public.hka_messages where id='+uid(102)+' and read_at is not null)','rollback preserves read-receipt immutability after disabled-trigger drift')+
 'reset role; rollback to savepoint disabled_rollback;\n';
