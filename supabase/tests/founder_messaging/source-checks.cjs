const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const ts=require('typescript'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..');
process.chdir(root);
const results=[];
function test(name,fn){try{fn();results.push({name,status:'PASS'});}catch(e){results.push({name,status:'FAIL',error:e.message});}}
const modules=new Map();let sessionProfile={id:'founder',role:'coach',full_name:'Founder'},grants=[];
const messagingState=()=>({contacts:grants,drafts:{},messages:[],profiles:[],loading:false,error:'',allowed:()=>true});
function load(file){
 file=path.resolve(file);if(modules.has(file))return modules.get(file).exports;
 const m=new Module(file,module);modules.set(file,m);m.filename=file;m.paths=module.paths;
 const original=m.require.bind(m);
 m.require=name=>{
  if(name==='@/contexts/SessionContext')return {useSession:()=>({profile:sessionProfile})};
  if(name==='@/hooks/use-messaging')return {useMessaging:messagingState};
  if(name==='@/hooks/use-unsaved-work')return {useUnsavedWork:()=>{}};
  if(name==='@/components/accounts/ConversationWorkspace')return {ConversationWorkspace:()=>null};
  if(name==='react-router-dom')return {useSearchParams:()=>[new URLSearchParams()]};
  if(name.startsWith('@/'))return load('src/'+name.slice(2)+'.ts');
  return original(name);
 };
 m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,file);
 return m.exports;
}
const {buildConversations}=load('src/lib/conversations.ts');
const {canSendMessage}=load('src/lib/messaging.ts');
const {AcademyMessages}=load('src/components/accounts/AcademyMessages.tsx');
const people=[{id:'founder',role:'coach',full_name:'Founder'}, {id:'owner',role:'student',full_name:'Horse Owner'}, {id:'child',role:'student',full_name:'Child'}, {id:'guardian',role:'coach',full_name:'Guardian'}];
const contact=(id,student_id,extra={})=>({id,student_id,full_name:id,can_message:true,relationship:'Founder direct message',...extra});
const message=(student_id,sender_id='founder',recipient_id='owner')=>({id:String(student_id),student_id,sender_id,recipient_id,body:'Saved',created_at:'2026-10-31T10:00:00Z'});
test('Founder on Coach dashboard keeps canonical NULL Horse Owner scope',()=>{
 const c=buildConversations([message(null)],people,'founder',undefined,[],undefined,{contacts:[contact('owner',null)]});
 assert.equal(c[0].studentId,'');assert.equal(c[0].recipientId,'owner');assert(c[0].canReply);
});
test('Server grant merges legacy scoped direct history while dashboard is Coach',()=>{
 const c=buildConversations([message('child'),message(null)],people,'founder',undefined,[],undefined,{contacts:[contact('owner',null)]});
 assert.equal(c.length,1);assert.equal(c[0].thread.length,2);assert.equal(c[0].studentId,'');
});
test('History-only NULL grants remain canonical after restrictive rollback',()=>{
 const c=buildConversations([message('child'),message(null)],people,'founder',undefined,[],undefined,{contacts:[contact('owner',null,{can_message:false})]});
 assert.equal(c.length,1);assert(!c[0].canReply);assert.equal(c[0].studentId,'');
});
test('Guardian oversight preserves actual child scope and cannot impersonate recipient',()=>{
 const p=people.map(p=>p.id==='founder'?{...p,role:'admin'}:p);
 const c=buildConversations([message('child','child','founder')],p,'guardian',undefined,[],undefined,{contacts:[contact('founder','guardian')]});
 assert.equal(c[0].studentId,'child');assert.equal(c[0].recipientId,'');assert(!c[0].canReply);assert.equal(c[0].unread,0);
});
test('Approved Student purpose scope survives Guardian dashboard selection',()=>{
 const p=people.map(p=>p.id==='child'?{...p,role:'guardian'}:p);
 const c=buildConversations([message('child','child','founder')],p,'child',undefined,[],undefined,{contacts:[contact('founder','child')]});
 assert.equal(c[0].studentId,'child');assert(c[0].canReply);
});
test('Client requires exact current server grant and scope',()=>{
 assert(canSendMessage({userId:'founder',recipientId:'owner',studentId:'',contacts:[contact('owner',null)]}));
 assert(!canSendMessage({userId:'founder',recipientId:'owner',studentId:'owner',contacts:[contact('owner',null)]}));
 assert(!canSendMessage({userId:'founder',recipientId:'owner',studentId:'',contacts:[contact('owner',null,{can_message:false})]}));
});
test('Founder directory follows server grants on Coach dashboard',()=>{
 sessionProfile={id:'founder',role:'coach',full_name:'Founder'};
 grants=[contact('owner',null,{directory_entry:true})];
 const tree=AcademyMessages({});
 const workspace=tree.props.children.find(child=>child?.props&&'founderDirectory'in child.props);
 assert.equal(workspace.props.founderDirectory,true);
});
test('Coach dashboard alone never creates Founder directory',()=>{
 sessionProfile={id:'coach',role:'coach',full_name:'Coach'};
 grants=[contact('child','child',{directory_entry:false})];
 const tree=AcademyMessages({});
 const workspace=tree.props.children.find(child=>child?.props&&'founderDirectory'in child.props);
 assert.equal(workspace.props.founderDirectory,false);
});
const migration=fs.readFileSync('supabase/proposals/202610310001_founder_direct_messaging.sql','utf8');
const rollback=fs.readFileSync('supabase/proposals/202610310001_founder_direct_messaging.rollback.sql','utf8');
const {catalog}=require('./hosted-schema-input.cjs');
test('Preflight embeds each actual complete live policy expression',()=>{
 for(const policy of catalog.policies){
  for(const expression of [policy.qual,policy.with_check])if(expression!==null)assert(migration.includes('$baseline$'+expression+'$baseline$'));
  assert.deepEqual(policy.roles,['authenticated']);assert.equal(policy.permissive,'PERMISSIVE');
 }
 assert(migration.includes("actual.roles is distinct from array['authenticated']::name[]"));
 assert(migration.includes('actual.qual is distinct from expected.qual'));
 assert(migration.includes('actual.with_check is distinct from expected.check_expr'));
 assert(migration.includes('actual.cmd<>expected.command'));
});
test('Privileged functions all live outside public and use fixed search paths',()=>{
 const definitions=[...migration.matchAll(/create function\s+([\w.]+)[\s\S]*?as (\$[\w]*\$)[\s\S]*?\2;/gi)].map(m=>({name:m[1],sql:m[0]}));
 assert.equal(definitions.length,14);
 for(const f of definitions){assert(f.sql.includes("set search_path=''"));if(/security definer/i.test(f.sql))assert(f.name.startsWith('hka_messaging.'));}
 const api=definitions.find(f=>f.name==='public.hka_message_contacts');assert(api.sql.includes('security invoker'));
});
test('Messaging authorisation has no dashboard-state or global legacy helper dependency',()=>{
 const helpers=migration.slice(migration.indexOf('create function hka_messaging.has_role'),migration.indexOf('-- Public API'));
 assert(!/p\.role\s*=|ar\.is_active|public\.hka_active\(|public\.hka_admin\(/.test(helpers));
});
test('Migration and rollback never mutate existing public application rows',()=>{
 for(const sql of [migration,rollback])assert(!/\b(insert into|update|delete from|truncate(?: table)?)\s+public\./i.test(sql));
 assert(!/drop table|set not null|drop function/i.test(rollback));
 assert(!fs.existsSync('supabase/migrations/202610310001_founder_direct_messaging.sql'));
});
test('Rollback only freezes direct feature and retains strict policies/API',()=>{
 assert(rollback.includes('as $$ select false $$'));
 assert(!/create policy|drop policy|public\.hka_admin\(/i.test(rollback));
 assert(rollback.includes('baseline.policy_definitions'));
 assert(rollback.includes('baseline.function_definitions'));
 assert(rollback.includes('baseline.trigger_definitions'));
});
const suite=JSON.parse(fs.readFileSync('docs/founder-messaging-evidence/suite-preparation.json','utf8'));
test('Prepared PostgreSQL suite is bound to current scripts and explicitly unexecuted',()=>{
 assert.equal(suite.status,'PREPARED_NOT_EXECUTED');assert(suite.assertions>=79);
 assert.equal(suite.migration_sha256,crypto.createHash('sha256').update(migration).digest('hex'));
 assert.equal(suite.rollback_sha256,crypto.createHash('sha256').update(rollback).digest('hex'));
});
const evidence={date:new Date().toISOString(),scope:'Executed source/catalog and real conversation/React element regression checks; not SQL parsing, RLS execution or browser/live delivery',results};
fs.writeFileSync('docs/founder-messaging-evidence/source-checks.json',JSON.stringify(evidence,null,2));
for(const result of results)console.log(result.status,result.name,result.error||'');
process.exitCode=results.some(r=>r.status==='FAIL')?1:0;
