// Consume real local SQL contact rows with current production TypeScript helpers.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const ts=require('typescript'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
function load(name){
 const file=path.join(root,'src/lib/'+name+'.ts'),m=new Module(file,module);
 m.filename=file;m.paths=module.paths;
 const original=m.require.bind(m);
 m.require=id=>id==='@/lib/messaging'?load('messaging'):original(id);
 m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
 return m.exports;
}
function sql(){
 return `select set_config('request.jwt.claim.sub',hka_messaging_test.uid(1)::text,false);
set role authenticated;
select 'HKA_CONTACT_CONTRACT:'||jsonb_build_object('actor',auth.uid(),'owner',hka_messaging_test.uid(9),
 'contacts',(select jsonb_agg(to_jsonb(c)) from public.hka_message_contacts() c),
 'messages',(select jsonb_agg(to_jsonb(m)) from public.hka_messages m))::text;
reset role;`;
}
function verify(log,rolledBack){
 const match=log.match(/HKA_CONTACT_CONTRACT:(\{[^\r\n]+\})/);
 assert(match,'Missing SQL contact projection');
 const payload=JSON.parse(match[1]),{contacts,messages,actor,owner}=payload;
 const {canSendMessage,messagingSetupPending}=load('messaging');
 const {buildConversations}=load('conversations');
 const columns=['id','full_name','role','role_label','student_id','student_name','relationship','can_message','directory_entry','created_at'].sort();
 assert(contacts.length>0);
 for(const c of contacts){
  assert.deepEqual(Object.keys(c).sort(),columns);
  for(const key of ['id','full_name','role','role_label','relationship','created_at'])assert.equal(typeof c[key],'string');
  for(const key of ['can_message','directory_entry'])assert.equal(typeof c[key],'boolean');
  for(const key of ['student_id','student_name'])assert(c[key]===null||typeof c[key]==='string');
  assert(Number.isFinite(Date.parse(c.created_at)));
  assert.equal(canSendMessage({userId:actor,studentId:String(c.student_id??''),recipientId:c.id,contacts}),c.can_message);
 }
 const peer=contacts.find(c=>c.id===owner);
 assert(peer);assert.equal(peer.student_id,null);assert.equal(peer.can_message,!rolledBack);
 assert.equal(contacts.some(c=>c.directory_entry),!rolledBack);
 const threads=buildConversations(messages,contacts,actor,undefined,[],undefined,{contacts});
 const thread=threads.find(t=>t.recipientId===owner);
 assert(thread?.thread.some(m=>m.body==='Committed synthetic direct message'));
 assert.equal(thread.studentId,'');assert.equal(thread.canReply,!rolledBack);
 assert(messagingSetupPending({code:'PGRST202'}));
 assert(!canSendMessage({userId:actor,studentId:'',recipientId:actor,contacts}));
 return {status:'PASS',rolledBack,contactRows:contacts.length,messageRows:messages.length,
 checks:['exact ten-column contact projection and runtime types','current canSendMessage consumes real SQL grants','nullable adult peer scope','persisted direct thread displayed','rollback history-only controls','missing hosted RPC pending state','self-send denied']};
}
module.exports={sql,verify};
