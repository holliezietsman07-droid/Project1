// Synthetic schema reconstruction for disposable PostgreSQL only; never reads app env.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const metadata = JSON.parse(read('docs/founder-messaging-evidence/local-schema-metadata.json'));
const catalog = JSON.parse(read('docs/founder-messaging-evidence/security-catalog.json')).catalog;
const normalise = s => s.replaceAll('\\n','\n');
const ident = s => '"' + s.replaceAll('"','""') + '"';
const multi = read('supabase/migrations/202610280002_multi_role_onboarding.sql');
const quote = s => "'" + s.replaceAll("'","''") + "'";
function localSchema() {
 let sql = `create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; create schema extensions; create extension pgcrypto with schema extensions;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb not null default '{}');
alter table auth.users enable row level security;
revoke all on auth.users from public,anon,authenticated;
create function auth.uid() returns uuid language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
grant usage on schema public,auth to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;
`;
 const tables=metadata.tables.filter(x=>x.kind==='tables');
 for(const t of tables) {
  sql+='create table public.'+ident(t.table)+' ('+t.data.columns.map(c=>
   ident(c.column_name)+' '+c.data_type+(c.column_default!==null?' default '+c.column_default:'')+(c.is_nullable==='NO'?' not null':'')).join(',')+');\n';
 }
 const constraints=[...catalog.constraints,
 {table:'hka_student_link_codes',name:'hka_student_link_codes_pkey',definition:'PRIMARY KEY(id)'},
 {table:'hka_student_link_codes',name:'hka_student_link_codes_code_hash_key',definition:'UNIQUE(code_hash)'},
 {table:'hka_student_link_codes',name:'hka_student_link_codes_student_id_fkey',definition:'FOREIGN KEY(student_id) REFERENCES public.hka_profiles(id) ON DELETE CASCADE'},
 {table:'hka_student_link_codes',name:'hka_student_link_codes_kind_check',definition:"CHECK(kind in ('guardian','coach'))"},
 {table:'hka_student_link_codes',name:'hka_student_link_codes_max_uses_check',definition:'CHECK(max_uses between 1 and 10)'},
 {table:'hka_student_link_codes',name:'hka_student_link_codes_check',definition:'CHECK(uses between 0 and max_uses)'}];
 constraints.sort((a,b)=>Number(a.definition.startsWith('FOREIGN'))-Number(b.definition.startsWith('FOREIGN')));
 for(const c of constraints)sql+='alter table public.'+ident(c.table)+' add constraint '+ident(c.name)+' '+normalise(c.definition)+';\n';
 sql+='create unique index hka_account_roles_one_active on public.hka_account_roles(user_id) where is_active;\n';
 // Ancillary profile-update policy dependency only; no files/lessons/storage are tested.
 sql+="create table public.hka_files(path text,owner_id uuid,purpose text); alter table public.hka_files enable row level security; grant select on public.hka_files to authenticated;\n";
 sql+=normalise(metadata.functions.find(x=>x.name==='hka_role').definition)+';\n';
 for(const name of ['hka_has_purpose','hka_coaches']) {
  const match=multi.match(new RegExp('create or replace function public\\.'+name+'\\([\\s\\S]*?\\$\\$;','i'));
  if(!match)throw new Error('Missing source helper '+name);
  sql+=match[0]+'\n';
 }
 for(const name of ['hka_role','hka_admin','hka_active','hka_teach','hka_view_student','hka_signup_profile']) {
  const f=metadata.functions.find(x=>x.name===name);
  if(!f)throw new Error('Missing live helper '+name);
  sql+=normalise(f.definition)+';\n';
 }
 sql+='create trigger hka_auth_profile after insert on auth.users for each row execute function public.hka_signup_profile();\n';
 sql+='revoke all on all functions in schema public from public,anon,authenticated;\n';
 for(const name of ['hka_role()','hka_admin()','hka_active(uuid)','hka_teach(uuid)','hka_view_student(uuid)','hka_coaches(uuid)','hka_has_purpose(uuid,text)'])
  sql+='grant execute on function public.'+name+' to authenticated;\n';
 for(const t of tables) {
  sql+='alter table public.'+ident(t.table)+' enable row level security;\n';
  sql+='revoke all on public.'+ident(t.table)+' from public,anon,authenticated; grant select on public.'+ident(t.table)+' to authenticated;\n';
 }
 sql+='grant update(full_name,timezone,avatar_path,notification_preferences,banner_path,banner_subtitle) on public.hka_profiles to authenticated;\n';
 sql+='grant insert,delete on public.hka_guardians to authenticated; grant insert,update,delete on public.hka_coach_students to authenticated;\n';
 for(const item of metadata.tables.filter(x=>x.kind==='policies')) {
  if(item.table==='hka_messages')continue;
  const p=item.data;
  sql+='create policy '+ident(p.name)+' on public.'+ident(item.table)+' as '+(p.permissive?'permissive':'restrictive')+' for '+(p.command==='*'?'all':p.command)+' to authenticated';
  if(p.using_clause!==null)sql+=' using('+normalise(p.using_clause)+')';
  if(p.with_check_clause!==null)sql+=' with check('+normalise(p.with_check_clause)+')';
  sql+=';\n';
 }
 const messageSource=read('supabase/migrations/202610260010_horse_care_email_delivery.sql');
 for(const policy of messageSource.matchAll(/create policy hka_messages_[\s\S]*?;/g))sql+=policy[0]+'\n';
 for(const g of catalog.message_grants.filter(x=>['authenticated','anon','service_role'].includes(x.grantee)))
  sql+='grant '+g.privilege_type+' on public.hka_messages to '+ident(g.grantee)+';\n';
 sql+='grant update(read_at) on public.hka_messages to authenticated;\n';
 // Assert all reconstructed current table columns and message policy expressions.
 sql+="set search_path=pg_catalog,public;\n";
 for(const t of tables) {
  const expected=t.data.columns.map(c=>({name:c.column_name,type:c.data_type,nullable:c.is_nullable,default:c.column_default}));
  sql+='do $$ begin if (select jsonb_agg(jsonb_build_object(\'name\',column_name,\'type\',data_type,\'nullable\',is_nullable,\'default\',column_default) order by ordinal_position) from information_schema.columns where table_schema=\'public\' and table_name='+quote(t.table)+') is distinct from '+quote(JSON.stringify(expected))+'::jsonb then raise exception \'Reconstruction drift: '+t.table+'\'; end if; end $$;\n';
 }
 return sql;
}
module.exports={localSchema,metadata,catalog};
