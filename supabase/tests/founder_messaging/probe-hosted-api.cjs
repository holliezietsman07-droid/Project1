// Read-only public API configuration probe. Never saves API keys or application rows.
const fs=require('node:fs'),assert=require('node:assert/strict');
const env=fs.readFileSync('.env.local','utf8');
function value(name){const line=env.split(/\r?\n/).find(s=>s.startsWith(name+'='));return line?.slice(name.length+1).trim().replace(/^['"]|['"]$/g,'');}
const url=value('VITE_SUPABASE_URL'),key=value('VITE_SUPABASE_ANON_KEY');
assert.equal(url,'https://sqaydpbqycvaictieafk.supabase.co');
assert(key,'Generated public Supabase config unavailable');
async function main(){
 const result={date:new Date().toISOString(),project:'sqaydpbqycvaictieafk',scope:'GET/HEAD metadata probes only; no RPC invocation or application rows',requests:[]};
 for(const schema of ['hka_preflight_nonexistent','hka_messaging']){
  const path='/rest/v1/hka_messages?select=id&limit=0';
  const r=await fetch(url+path,{method:'GET',headers:{apikey:key,Authorization:'Bearer '+key,'Accept-Profile':schema},signal:AbortSignal.timeout(20000)});
  const body=await r.json();
  result.requests.push({method:'GET',path,acceptProfile:schema,status:r.status,body});
  assert.equal(r.status,406);assert.equal(body.code,'PGRST106');
 }
 const message=result.requests[0].body.hint;
 result.postgrestExposedSchemas=message;
 assert(!/(?:^|[,\s])hka_messaging(?:[,\s]|$)/.test(message));
 const rpcPath='/rest/v1/rpc/hka_message_contacts';
 const r=await fetch(url+rpcPath,{method:'HEAD',headers:{apikey:key,Authorization:'Bearer '+key,'Accept-Profile':'public'},signal:AbortSignal.timeout(20000)});
 result.requests.push({method:'HEAD',path:rpcPath,status:r.status});
 result.contactRpcPresent=false;assert.equal(r.status,404);
 result.status='PASS';result.limit='Confirms current PostgREST exposure and missing pre-migration RPC; no authenticated hosted messaging or future configuration guarantee.';
 fs.writeFileSync('docs/founder-messaging-evidence/hosted-api-exposure.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{fs.writeFileSync('docs/founder-messaging-evidence/hosted-api-exposure.json',JSON.stringify({date:new Date().toISOString(),status:'BLOCKED',error:e.message},null,2));console.error(e.message);process.exitCode=1;});
