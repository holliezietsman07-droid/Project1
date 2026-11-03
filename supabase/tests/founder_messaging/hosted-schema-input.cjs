// Fresh read-only hosted metadata; contains no application rows or credentials.
const fs=require('node:fs'),path=require('node:path');
const snapshot=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../../docs/founder-messaging-evidence/hosted-compatibility-snapshot.json'),'utf8'));
const normalise=s=>s===null?null:s.replaceAll('\\n','\n');
const metadata={
 observedAt:snapshot.captured_at,project:snapshot.project,
 tables:snapshot.metadata,
 functions:snapshot.functions,
 limitations:[
  'Synthetic minimal auth.users and auth.uid() claim shim; no hosted JWT verification.',
  'Only seven messaging-related public tables reconstructed; hka_files is a minimal policy dependency.',
  'No hosted PostgREST, realtime, storage, auth service or full Supabase schema restore.'
 ]
};
const catalog={...snapshot,policies:snapshot.policies.filter(p=>p.tablename==='hka_messages')};
function schemaAssertions() {
 const quote=s=>"'"+s.replaceAll("'","''")+"'";
 const expected=snapshot.policies.map(p=>({...p,qual:normalise(p.qual),with_check:normalise(p.with_check)})).sort((a,b)=>a.tablename.localeCompare(b.tablename)||a.policyname.localeCompare(b.policyname));
 const functions=snapshot.functions.map(f=>({...f,definition:normalise(f.definition)}));
 let checks='';
 for(const f of functions) {
  checks+=`do $hosted_check$ begin if pg_get_functiondef('public.${f.signature}'::regprocedure) is distinct from ${quote(f.definition)}
   or (select pg_get_userbyid(proowner) from pg_proc where oid='public.${f.signature}'::regprocedure) is distinct from ${quote(f.owner)}
   or (select jsonb_agg(a order by a) from pg_proc p cross join unnest(p.proacl::text[]) a where p.oid='public.${f.signature}'::regprocedure)
    is distinct from ${quote(JSON.stringify([...f.acl].sort()))}::jsonb
   then raise exception 'Hosted dependency definition/owner/ACL reconstruction drift: ${f.name}'; end if; end $hosted_check$;\n`;
 }
 const tables=metadata.tables.filter(t=>t.kind==='tables').map(t=>t.table);
 const constraints=[...snapshot.constraints].sort((a,b)=>a.table.localeCompare(b.table)||a.name.localeCompare(b.name));
 checks+=`do $hosted_check$ begin if (select jsonb_agg(jsonb_build_object('table',c.conrelid::regclass::text,'name',c.conname,'definition',pg_get_constraintdef(c.oid)) order by c.conrelid::regclass::text,c.conname)
 from pg_constraint c where c.conrelid in (select cl.oid from pg_class cl join pg_namespace n on n.oid=cl.relnamespace
 where n.nspname='public' and cl.relname=any(array[${tables.map(quote).join(',')}])))
 is distinct from ${quote(JSON.stringify(constraints))}::jsonb then raise exception 'Hosted constraint reconstruction drift'; end if; end $hosted_check$;\n`;
 return checks+`set search_path=pg_catalog,public;
do $$ begin
 if (select jsonb_agg(to_jsonb(p) order by p.tablename,p.policyname) from pg_policies p
 where schemaname='public' and tablename=any(array['hka_messages','hka_profiles','hka_account_roles','hka_guardians','hka_coach_students','hka_link_requests','hka_student_link_codes']))
 is distinct from ${quote(JSON.stringify(expected))}::jsonb then
 raise exception 'Hosted baseline policy reconstruction drift' using detail=(
 select jsonb_agg(jsonb_build_object('name',e->>'policyname','expected',e,'actual',to_jsonb(p)))::text
 from jsonb_array_elements(${quote(JSON.stringify(expected))}::jsonb) e left join pg_policies p
 on p.schemaname='public' and p.tablename=e->>'tablename' and p.policyname=e->>'policyname'
 where e is distinct from to_jsonb(p));
 end if;
 if has_function_privilege('authenticated','public.hka_has_purpose(uuid,text)','EXECUTE') then raise exception 'Hosted helper ACL reconstruction drift'; end if;
 if exists(select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal) then raise exception 'Unexpected reconstructed public trigger'; end if;
end $$;
`;
}
module.exports={metadata,catalog,schemaAssertions};
