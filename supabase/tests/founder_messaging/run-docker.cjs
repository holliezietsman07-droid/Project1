// Approved local-only Docker runner. No environment files or remote SQL clients.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {localSchema,metadata}=require('./local-schema.cjs');
const root=path.resolve(__dirname,'../../..');
process.chdir(root);
if(process.env.HKA_APPROVE_ISOLATED_SQL!=='FOUNDER_APPROVED_LOCAL_ONLY') {
 console.error('BLOCKED: explicit local SQL authorization required.');process.exit(2);
}
const evidenceDir=path.join(root,'docs/founder-messaging-evidence');
const runId=Date.now().toString();
const name='hka-messaging-security-'+runId,db='hka_messaging_security_'+runId;
const image='public.ecr.aws/supabase/postgres:17.11.0.003';
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.toUpperCase().startsWith('PG')));
const result={date:new Date().toISOString(),status:'FAIL',scope:'Disposable network-disabled Docker PostgreSQL; synthetic rows only; reconstructed relevant current HKA schema, not a full Supabase restore or hosted API test',authorization:'Founder approval in current request: isolated local testing only',runId,container:name,database:db,liveMutations:false,deployments:false,fixtureAccounts:17,metadataLimitations:metadata.limitations,phases:[],logs:[],cleanup:false};
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
for(const [k,p] of [['docker_runner','supabase/tests/founder_messaging/run-docker.cjs'],['additional_cases','supabase/tests/founder_messaging/additional-cases.cjs'],['disabled_trigger_cases','supabase/tests/founder_messaging/disabled-trigger-cases.cjs'],['committed_cycle','supabase/tests/founder_messaging/committed-cycle.cjs'],['metadata','docs/founder-messaging-evidence/local-schema-metadata.json'],['catalog','docs/founder-messaging-evidence/security-catalog.json'],['migration','supabase/proposals/202610310001_founder_direct_messaging.sql'],['rollback','supabase/proposals/202610310001_founder_direct_messaging.rollback.sql'],['fixtures','supabase/tests/founder_messaging/fixtures.sql'],['schema','supabase/tests/founder_messaging/local-schema.cjs'],['runner','supabase/tests/founder_messaging/run-isolated.cjs']])
 result[k+'_sha256']=hash(fs.readFileSync(p));
function command(args,input,allowFailure=false) {
 const p=spawnSync('docker',args,{input,encoding:'utf8',maxBuffer:12*1024*1024,timeout:60000,env});
 if(!allowFailure&&(p.error||p.status!==0))throw new Error('Docker '+args.slice(0,2).join(' ')+': '+(p.error?.message||p.stderr||p.stdout));
 return p;
}
function psql(sql,label) {
 const p=command(['exec','-i',name,'psql','-X','--no-password','--set=ON_ERROR_STOP=1','--set=VERBOSITY=verbose','-h','127.0.0.1','-U','postgres','-d',db],sql,true);
 const log=(p.stdout||'')+(p.stderr||'');
 const logName='docker-'+runId+'-'+label+'.log';
 fs.writeFileSync(path.join(evidenceDir,logName),log);
 result.logs.push(logName);
 const passes=[...log.matchAll(/^\s*PASS: (.+)$/gm)].map(m=>m[1].trim());
 const failures=[...log.matchAll(/^\s*FAIL: (.+)$/gm)].map(m=>m[1].trim());
 result.phases.push({name:label,status:!p.error&&p.status===0&&failures.length===0?'PASS':'FAIL',exitCode:p.status,passedAssertions:passes.length,failedAssertions:failures.length,failures,assertions:passes,error:p.error?.message});
 if(p.error||p.status!==0)throw new Error(label+' failed: '+(p.stderr||p.error?.message||'SQL assertion failure'));
 return log;
}
let started=false;
try {
 if(env.DOCKER_HOST&&!env.DOCKER_HOST.startsWith('npipe://')&&!env.DOCKER_HOST.startsWith('unix://'))throw new Error('Remote DOCKER_HOST overrides refused');
 const context=JSON.parse(command(['context','inspect']).stdout)[0];
 const endpoint=context.Endpoints?.docker?.Host||'';
 if(!endpoint.startsWith('npipe://')&&!endpoint.startsWith('unix://'))throw new Error('Docker daemon must be local; remote endpoints refused');
 result.dockerEndpoint=endpoint;
 const prep=spawnSync(process.execPath,['supabase/tests/founder_messaging/run-isolated.cjs','--prepare-only'],{encoding:'utf8',env});
 if(prep.status!==0)throw new Error('Suite preparation failed: '+prep.stderr);
 const suite=fs.readFileSync('.elmony/founder-messaging-security-suite.sql','utf8');
 result.expectedAssertions=JSON.parse(fs.readFileSync('docs/founder-messaging-evidence/suite-preparation.json','utf8')).assertions;
 result.suite_sha256=hash(suite);
 const schema=localSchema();result.schemaSQL_sha256=hash(schema);
 fs.writeFileSync('.elmony/founder-messaging-local-schema.sql',schema);
 command(['run','-d','--name',name,'--network','none','--label','hka.security-test=founder-local-only','--user','postgres','--tmpfs','/tmp:rw,nosuid,nodev,size=512m','--entrypoint','/bin/bash',image,'-c','initdb -D /tmp/hka-pg -A trust --no-locale > /tmp/init.log && exec postgres -D /tmp/hka-pg -c listen_addresses=127.0.0.1 -c shared_preload_libraries=']);
 started=true;
 const inspection=JSON.parse(command(['inspect',name]).stdout)[0];
 if(inspection.HostConfig.NetworkMode!=='none'||Object.keys(inspection.HostConfig.PortBindings||{}).length||(inspection.Mounts||[]).some(m=>m.Type==='bind')||inspection.Config.Labels['hka.security-test']!=='founder-local-only')
  throw new Error('Container isolation check failed');
 result.isolation={network:inspection.HostConfig.NetworkMode,portsPublished:false,hostBindMounts:false,containerId:inspection.Id,imageId:inspection.Image};
 let ready=false;
 for(let i=0;i<30;i++){
  if(command(['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres'],undefined,true).status===0){ready=true;break;}
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,200);
 }
 if(!ready)throw new Error('Disposable PostgreSQL did not become ready');
 command(['exec',name,'createdb','-h','127.0.0.1','-U','postgres',db]);
 result.postgresVersion=psql('select version();','version').trim();
 psql('begin;\n'+schema+'\ncommit;','schema');
 psql('set search_path=pg_catalog,public; select json_agg(p) from pg_policies p where schemaname=\'public\' and tablename=\'hka_messages\';','baseline-policies');
 psql(suite,'suite');
 const additional=require('./additional-cases.cjs')();
 result.additionalExpectedAssertions=[...additional.matchAll(/select hka_messaging_test\.(?:observe|denied)\(/g)].length;
 result.additionalSuite_sha256=hash(additional);
 psql(additional,'additional-cases');
 const extra=result.phases.find(x=>x.name==='additional-cases');
 if(extra.passedAssertions+extra.failedAssertions!==result.additionalExpectedAssertions)throw new Error('Incomplete additional-case output');
 const suitePhase=result.phases.find(x=>x.name==='suite');
 if(suitePhase.passedAssertions!==result.expectedAssertions)throw new Error('Incomplete assertion output: '+suitePhase.passedAssertions+'/'+result.expectedAssertions);
 psql("do $$ begin if exists(select 1 from public.hka_profiles) or exists(select 1 from auth.users) or exists(select 1 from public.hka_messages) or to_regnamespace('hka_messaging') is not null or to_regnamespace('hka_messaging_test') is not null then raise exception 'Test transaction cleanup failed'; end if; end $$;",'transaction-cleanup');
 const committed=require('./committed-cycle.cjs')();
 result.committedExpectedAssertions=committed.reduce((n,p)=>n+[...p.sql.matchAll(/select hka_messaging_test\.(?:ok|denied)\(/g)].length,0);
 for(const phase of committed)psql(phase.sql,phase.name);
 const committedCount=result.phases.filter(p=>p.name.startsWith('committed-')).reduce((n,p)=>n+p.passedAssertions+p.failedAssertions,0);
 if(committedCount!==result.committedExpectedAssertions)throw new Error('Incomplete committed-cycle output');
 result.status=result.phases.some(x=>x.status==='FAIL')?'FAIL':'PASS';
} catch(e) {
 result.error=e.message;console.error(e.message);
} finally {
 if(started) {
  const cleanup=command(['rm','-f','-v',name],undefined,true);
  result.cleanup=cleanup.status===0;
  if(!result.cleanup){result.status='FAIL';result.cleanupError=cleanup.stderr||cleanup.error?.message;}
 }
 fs.writeFileSync(path.join(evidenceDir,'isolated-run.json'),JSON.stringify(result,null,2));
 result.passedAssertions=result.phases.reduce((n,p)=>n+p.passedAssertions,0);
 result.failedAssertions=result.phases.reduce((n,p)=>n+(p.failedAssertions||0),0);
 result.totalAssertions=result.expectedAssertions+(result.additionalExpectedAssertions||0)+(result.committedExpectedAssertions||0);
 fs.writeFileSync(path.join(evidenceDir,'isolated-run.json'),JSON.stringify(result,null,2));
 console.log(result.status,result.passedAssertions+' PASS, '+result.failedAssertions+' FAIL / '+result.totalAssertions+' SQL assertions; container removed: '+result.cleanup);
}
process.exitCode=result.status==='PASS'?0:1;
