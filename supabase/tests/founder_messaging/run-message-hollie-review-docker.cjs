// Founder approval in current request is local disposable SQL only.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
process.chdir(path.resolve(__dirname,'../../..'));
assert(process.argv.includes('--founder-approved-local-only'),'Current-request local-only approval required');
const out='docs/message-hollie-review-20261108';fs.mkdirSync(out,{recursive:true});
const hash=x=>crypto.createHash('sha256').update(x).digest('hex'),read=p=>fs.readFileSync(p,'utf8');
const manifestFile='docs/message-hollie-checksums.json',manifest=JSON.parse(read(manifestFile));
const forward='supabase/proposals/202611060001_message_hollie.sql',rollback='supabase/proposals/202611060001_message_hollie.rollback.sql';
const runId=Date.now().toString(),name='hka-message-hollie-review-'+runId,db='hka_messaging_security_20261106_designated_founder',image='public.ecr.aws/supabase/postgres:17.11.0.003',label='hka.message-hollie-review';
const result={startedAt:new Date().toISOString(),status:'NOT_EXECUTED',authorization:'Founder current request: forward/rollback in empty disposable local database with synthetic accounts',scope:'Relevant HKA schema reconstructed from reviewed catalog; real PostgreSQL roles/RLS, synthetic auth shim; no live API/JWT verification',connectedProject:'sqaydpbqycvaictieafk',connectedStatus:'PENDING_SEPARATE_FOUNDER_APPROVAL',connectedMutations:false,deployments:false,runId,target:{container:name,database:db,image},inputManifest:{path:manifestFile,sha256:hash(fs.readFileSync(manifestFile))},hashChecks:[],phases:[],cleanup:false};
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.toUpperCase().startsWith('PG')&&!k.toUpperCase().startsWith('DOCKER_')));
function docker(args,input,allow=false){const p=spawnSync('docker',['--context','desktop-linux',...args],{input,env,encoding:'utf8',timeout:60000,maxBuffer:16*1024*1024,windowsHide:true});if(!allow&&(p.error||p.status!==0))throw Error('Docker '+args[0]+': '+(p.error?.message||p.stderr||p.stdout));return p;}
function sql(text,phase,count){
 fs.writeFileSync(path.join(out,phase+'.sql'),text);
 const p=docker(['exec','-i',name,'psql','-X','--no-password','--set=ON_ERROR_STOP=1','--set=VERBOSITY=verbose','--no-align','--tuples-only','-h','127.0.0.1','-U','postgres','-d',db],text,true);
 const log=(p.stdout||'')+(p.stderr||'');fs.writeFileSync(path.join(out,phase+'.log'),log);
 const passes=[...log.matchAll(/^PASS: (.+)$/gm)].map(m=>m[1].trim()),errors=[...log.matchAll(/^(?:psql:[^\n]*:\s*)?(?:ERROR|FATAL):[^\n]*/gm)].map(m=>m[0]);
 const success=!p.error&&p.status===0&&!errors.length&&(count===undefined||passes.length===count);
 result.phases.push({name:phase,status:success?'PASS':'FAIL',exitCode:p.status,assertionsPassed:passes.length,expectedAssertions:count,passes,errors,error:p.error?.message,sqlSHA256:hash(text),log:out+'/'+phase+'.log'});
 console.log(phase,success?'PASS':'FAIL',passes.length,'assertions');
 if(!success)throw Error(phase+' failed: '+(p.error?.message||p.stderr||'assertion count mismatch'));
 return log;
}
const uid=n=>'hka_messaging_test.uid('+n+')',quote=s=>"'"+s.replaceAll("'","''")+"'";
const actor=n=>"reset role; select set_config('request.jwt.claim.sub',"+uid(n)+"::text,false); set role authenticated;\n";
const ok=(s,l)=>'select hka_messaging_test.ok('+s+','+quote(l)+');\n',deny=(s,l)=>'select hka_messaging_test.denied('+quote(s)+','+quote(l)+');\n';
const send=(s,r,b)=>'insert into public.hka_messages(sender_id,recipient_id,student_id,body) values('+uid(s)+','+uid(r)+',null,'+quote(b)+')';
const ownerBody='Adult Horse Owner exact message to Hollie',replyBody='Hollie exact Horse Owner reply';
const ownerWhere='sender_id='+uid(9)+' and recipient_id='+uid(1)+' and student_id is null and body='+quote(ownerBody),replyWhere='sender_id='+uid(1)+' and recipient_id='+uid(9)+' and student_id is null and body='+quote(replyBody);
let started=false;
try{
 for(const f of manifest.files){const b=fs.readFileSync(f.path),actual=hash(b);result.hashChecks.push({path:f.path,expected:f.sha256,actual,bytes:b.length,matches:actual===f.sha256&&b.length===f.bytes});}
 assert(result.hashChecks.every(x=>x.matches),'STOP: reviewed input checksum mismatch');
 for(const p of [forward,rollback])assert(result.hashChecks.find(x=>x.path===p)?.matches,'STOP: approved SQL hash missing');
 result.hashGate='PASS';result.runnerSHA256=hash(fs.readFileSync(__filename));
 const endpoint=JSON.parse(docker(['context','inspect','desktop-linux']).stdout)[0].Endpoints?.docker?.Host;
 assert.equal(endpoint,'npipe:////./pipe/dockerDesktopLinuxEngine','STOP: local Docker named pipe required');result.target.dockerEndpoint=endpoint;
 result.dockerVersion=JSON.parse(docker(['version','--format','json']).stdout);
 const cached=JSON.parse(docker(['image','inspect',image]).stdout)[0];result.target.imageId=cached.Id;result.target.imageDigests=cached.RepoDigests;
 assert.equal(cached.Id,'sha256:7374d196da7e301512cc5329e18040e0f7bb856287b323777cdadecccbc6c7e4','STOP: cached image changed');
 docker(['run','-d','--pull=never','--name',name,'--network','none','--label',label+'='+runId,'--user','postgres','--read-only','--tmpfs','/tmp:rw,nosuid,nodev,size=512m','--entrypoint','/bin/bash',image,'-c','initdb -D /tmp/hka-pg -A trust --no-locale > /tmp/init.log && exec postgres -D /tmp/hka-pg -c listen_addresses=127.0.0.1 -c unix_socket_directories=/tmp -c shared_preload_libraries=']);
 started=true;
 const inspection=JSON.parse(docker(['inspect',name]).stdout)[0];
 assert.equal(inspection.Name,'/'+name);assert.equal(inspection.Config.Labels[label],runId);assert.equal(inspection.Image,cached.Id);
 assert.equal(inspection.HostConfig.NetworkMode,'none');assert.equal(Object.keys(inspection.HostConfig.PortBindings||{}).length,0);assert.equal(inspection.HostConfig.ReadonlyRootfs,true);
 assert((inspection.Mounts||[]).every(m=>m.Type==='tmpfs'&&m.Destination==='/tmp'));assert(!inspection.HostConfig.Binds?.length);
 Object.assign(result.target,{containerId:inspection.Id,isolationVerifiedAt:new Date().toISOString(),network:'none',publishedPorts:[],hostBindMounts:[],storage:'tmpfs /tmp only; read-only root filesystem'});
 fs.writeFileSync(path.join(out,'container-inspection.json'),JSON.stringify(inspection,null,2));
 fs.writeFileSync(path.join(out,'pre-execution-gates.json'),JSON.stringify({recordedAt:new Date().toISOString(),hashGate:result.hashGate,hashChecks:result.hashChecks,target:result.target,connectedMutations:false},null,2));
 console.log('CONFIRMED',name,db,'network=none, ports=none, tmpfs only; approved input hashes PASS');
 let ready=false;for(let i=0;i<50;i++){if(docker(['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres'],undefined,true).status===0){ready=true;break;}Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,200);}if(!ready){const logs=docker(['logs',name],undefined,true);fs.writeFileSync(path.join(out,'postgres-startup.log'),(logs.stdout||'')+(logs.stderr||''));}assert(ready,'Disposable PostgreSQL unavailable');
 docker(['exec',name,'createdb','-h','127.0.0.1','-U','postgres',db]);
 sql("select version(),current_database(),current_user,inet_server_addr(); do $$ begin if current_database()<>'"+db+"' or current_user<>'postgres' or exists(select 1 from pg_tables where schemaname='public') or to_regnamespace('auth') is not null then raise exception 'STOP: wrong or nonempty target'; end if; end $$;",'empty-target',0);
 sql('begin;\n'+read('.elmony/message-hollie-local-schema.sql')+'\ncommit;','schema-parity',0);
 sql("do $$ begin if exists(select 1 from auth.users) or exists(select 1 from public.hka_profiles) or exists(select 1 from public.hka_messages) then raise exception 'STOP: baseline contains data'; end if; end $$;",'empty-baseline',0);
 result.status='RUNNING';sql(read('.elmony/message-hollie-security-suite.sql'),'reviewed-forward-rollback-suite',129);
 sql("do $$ begin if exists(select 1 from public.hka_profiles) or exists(select 1 from auth.users) or exists(select 1 from public.hka_messages) or to_regnamespace('hka_messaging') is not null or to_regnamespace('hka_messaging_test') is not null then raise exception 'Test transaction cleanup failed'; end if; end $$;",'transaction-cleanup',0);
 sql('begin;\n'+read('supabase/tests/founder_messaging/fixtures.sql')+'\ncommit;','committed-fixtures',0);
 sql(read(forward),'committed-forward-exact',0);
 let checks=ok("hka_messaging_test.fingerprint()=(select value from hka_messaging_test.fingerprints where label='before_migration')",'committed forward preserves all application rows');
 checks+=actor(9)+deny(send(9,18,ownerBody),'Horse Owner cannot divert Message Hollie to second Admin')+send(9,1,ownerBody)+';\n';
 checks+=actor(18)+ok('not exists(select 1 from public.hka_messages where body='+quote(ownerBody)+')','second Admin cannot receive or read committed owner message');
 checks+="do $$ declare changed integer; begin update public.hka_messages set read_at=now() where body="+quote(ownerBody)+"; get diagnostics changed=row_count; if changed<>0 then raise exception 'Second Admin changed private read receipt'; end if; end $$;\n";
 checks+=actor(1)+ok('(select count(*)=1 and bool_and(read_at is null) from public.hka_messages where '+ownerWhere+')','committed exact Horse Owner message arrives unread in Founder inbox');
 checks+='select row_to_json(m) from public.hka_messages m where '+ownerWhere+';\nupdate public.hka_messages set read_at=now() where '+ownerWhere+';\n'+send(1,9,replyBody)+';\n';
 sql(checks,'committed-owner-send-founder-reply',4);
 checks=actor(9)+ok('(select count(*)=1 and bool_and(read_at is null) from public.hka_messages where '+replyWhere+')','exact Founder reply persists unread for Horse Owner across connections');
 checks+='select row_to_json(m) from public.hka_messages m where '+replyWhere+';\n';
 checks+=actor(18)+ok('not exists(select 1 from public.hka_messages where body in ('+quote(ownerBody)+','+quote(replyBody)+'))','second Admin cannot read either side of committed private conversation');
 checks+="reset role; insert into hka_messaging_test.fingerprints values('committed_before_rollback',hka_messaging_test.fingerprint()); select label,value from hka_messaging_test.fingerprints where label='committed_before_rollback';\n";
 sql(checks,'committed-reply-receipt',2);sql(read(rollback),'committed-rollback-exact',0);
 checks=ok("hka_messaging_test.fingerprint()=(select value from hka_messaging_test.fingerprints where label='committed_before_rollback')",'committed rollback preserves every application row including private content and read receipts');
 checks+="select 'after_rollback',hka_messaging_test.fingerprint();\n";
 checks+=actor(1)+ok('exists(select 1 from public.hka_messages where '+ownerWhere+' and read_at is not null) and exists(select 1 from public.hka_messages where '+replyWhere+' and read_at is null)','Founder retains exact owner history and reply state after committed rollback');
 checks+=deny(send(1,9,'Blocked after rollback'),'rollback freezes new Founder direct sends')+ok('not exists(select 1 from public.hka_message_contacts() where directory_entry)','rollback removes Founder directory');
 checks+=actor(9)+ok('exists(select 1 from public.hka_messages where '+ownerWhere+') and exists(select 1 from public.hka_messages where '+replyWhere+' and read_at is null)','Horse Owner retains both private messages after rollback');
 checks+=actor(18)+ok('not exists(select 1 from public.hka_messages where body in ('+quote(ownerBody)+','+quote(replyBody)+'))','second Admin still cannot read private history after rollback')+deny(send(18,9,'Unrelated Admin after rollback'),'second Admin cannot send unrelated messages after rollback');
 sql(checks,'committed-rollback-history-privacy',7);result.status='PASS';
}catch(e){result.status=result.status==='NOT_EXECUTED'?'BLOCKED':'FAIL';result.error=e.message;console.error(e.message);}
finally{
 if(started){try{const actual=JSON.parse(docker(['inspect',name]).stdout)[0];assert.equal(actual.Id,result.target.containerId);assert.equal(actual.Config.Labels[label],runId);assert.equal(actual.Name,'/'+name);docker(['rm','-f',name]);const after=docker(['inspect',name],undefined,true);result.cleanup=after.status!==0&&JSON.parse(after.stdout||'[]').length===0;assert(result.cleanup,'Container removal not confirmed');}catch(e){result.cleanupError=e.message;result.status='FAIL';}}
 result.finishedAt=new Date().toISOString();result.assertionsPassed=result.phases.reduce((n,p)=>n+p.assertionsPassed,0);result.failedPhases=result.phases.filter(p=>p.status==='FAIL').length;
 fs.writeFileSync(path.join(out,'database-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({status:result.status,assertionsPassed:result.assertionsPassed,failedPhases:result.failedPhases,cleanup:result.cleanup,error:result.error,results:out+'/database-results.json'},null,2));process.exitCode=result.status==='PASS'?0:1;
}
