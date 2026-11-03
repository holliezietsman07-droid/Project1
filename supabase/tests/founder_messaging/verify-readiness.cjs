const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dir='docs/founder-messaging-readiness-evidence';
const baseline=JSON.parse(fs.readFileSync('docs/founder-messaging-evidence/hosted-compatibility-snapshot.json','utf8'));
const receipts=JSON.parse(fs.readFileSync(dir+'/fresh-metadata-receipts.json','utf8'));
function unpack(r){if(r?.status!=='fulfilled'||r.value?.isError)return null;const c=r.value.content.find(c=>c.type==='text');try{const j=JSON.parse(c.text);if(j.nextOffset!==null)throw new Error('Incomplete page');return JSON.parse(j.content);}catch{return null;}}
const fresh=receipts.tables.flatMap(r=>unpack(r)?.metadata??[]);
const canonical=o=>JSON.stringify(o);
const tables=fresh.filter(m=>m.kind==='tables').map(m=>{const old=baseline.metadata.find(x=>x.kind==='tables'&&x.table===m.table);return {table:m.table,rlsEnabled:m.data.rls_enabled,columnsMatch:canonical(m.data.columns)===canonical(old?.data.columns),columnCount:m.data.columns.length};});
const policies=fresh.filter(m=>m.kind==='policies').map(m=>{const p=m.data,old=baseline.policies.find(x=>x.tablename===m.table&&x.policyname===p.name);return {table:m.table,name:p.name,expressionCommandPermissivenessMatch:!!old&&p.command===(old.cmd==='ALL'?'*':old.cmd)&&p.permissive===(old.permissive==='PERMISSIVE')&&p.using_clause===old.qual&&p.with_check_clause===old.with_check,roles:'UNVERIFIED: metadata helper omits policy target roles'};});
const functions=Object.entries(receipts.functions).map(([name,r])=>{const f=unpack(r);return {name,status:f?'OBSERVED':'UNAVAILABLE',definitionMatches:f?f.length===1&&f[0].definition===baseline.functions.find(o=>o.name===name)?.definition:null,ownerAcl:'UNVERIFIED: metadata helper omits owner and ACL'};});
const result={capturedAt:new Date().toISOString(),project:'sqaydpbqycvaictieafk',status:'PARTIAL',tables,policies,functions,publicTriggers:{count:fresh.filter(m=>m.kind==='triggers').length,scope:'Only seven requested public tables; auth.users trigger not inspected'},unverified:['Exact policy role targets','Table, column and function effective grants and memberships','Constraints and indexes','Remaining three helper bodies','Auth signup trigger and auth.uid dependency','Migration history','Private schema collision','GraphQL resolver and configuration','Non-superuser migration privileges'],toolLimit:'Elmony context exploration budget reached; no retries attempted',liveMutations:false};
if(tables.length!==7||policies.length!==13||tables.some(t=>!t.columnsMatch)||policies.some(p=>!p.expressionCommandPermissivenessMatch)||functions.some(f=>f.definitionMatches===false))result.status='DIFFERENCE';
fs.writeFileSync(dir+'/fresh-comparison.json',JSON.stringify(result,null,2)+'\n');
async function api(){
const values={};for(const line of fs.readFileSync('.env.local','utf8').split(/\r?\n/)){const m=line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);if(m)values[m[1]]=m[2].trim().replace(/^["']|["']$/g,'');}
if(new URL(values.VITE_SUPABASE_URL).hostname!=='sqaydpbqycvaictieafk.supabase.co')throw new Error('Unexpected project');
const observations=await Promise.all(['hka_messaging','hka_readiness_invalid_profile'].map(async profile=>{
try{const r=await fetch(values.VITE_SUPABASE_URL+'/rest/v1/hka_messages?select=id&limit=0',{headers:{apikey:values.VITE_SUPABASE_ANON_KEY,Authorization:'Bearer '+values.VITE_SUPABASE_ANON_KEY,'Accept-Profile':profile},signal:AbortSignal.timeout(20000)});
let code=null,message=null;if(r.status===406){const j=await r.json();code=j.code;message=j.message;}else await r.body?.cancel();
return {profile,status:r.status,code,message,serverDate:r.headers.get('date'),expectedRejection:r.status===406&&code==='PGRST106'};}catch{return {profile,status:'UNAVAILABLE',expectedRejection:false};}}));
const api={capturedAt:new Date().toISOString(),project:'sqaydpbqycvaictieafk',method:'GET',resource:'hka_messages?select=id&limit=0',dataRowsRequested:0,observations,status:observations.every(r=>r.expectedRejection)?'PASS':'UNPROVEN',scope:'Effective PostgREST schema allowlist only; not GraphQL, grants or JWT acceptance'};
fs.writeFileSync(dir+'/fresh-api-exposure.json',JSON.stringify(api,null,2)+'\n');console.log(JSON.stringify({comparison:result,api},null,2));
}
api().catch(()=>{console.log('API exposure unavailable; no private diagnostics emitted');process.exitCode=1;});
