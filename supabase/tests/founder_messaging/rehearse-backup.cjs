const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=process.cwd(),out=path.join(root,'docs/founder-messaging-readiness-evidence');
const audit=JSON.parse(fs.readFileSync(path.join(out,'backup-audit.json'),'utf8'));
const backup=audit.sets.find(s=>s.directory.endsWith('pre-horse-organiser-20261026-064025'));
if(!backup||!backup.allFourPartsPresent)throw new Error('Expected historical four-part backup unavailable');
const name='hka-backup-rehearsal-'+Date.now(),db='hka_restore_rehearsal';
const image='public.ecr.aws/supabase/postgres:17.11.0.003';
const result={capturedAt:new Date().toISOString(),status:'NOT_RUN',purpose:'Restore actual historical backup as supplied; not the synthetic security fixture',sourceDirectory:backup.directory,sourceFiles:backup.files.map(f=>({file:f.file,sha256:f.sha256})),currentBackup:false,liveMutations:false,rawDataLogged:false,phases:[],cleanup:false};
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/^PG|DATABASE_URL|DB_URL|SUPABASE/i.test(k)));
function command(args,input){return cp.spawnSync('docker',args,{input,env,encoding:'utf8',maxBuffer:4*1024*1024,timeout:30000,windowsHide:true});}
function requireOk(p,label){if(p.status!==0||p.error)throw new Error(label+' failed; exit '+p.status+'; raw output withheld');return p;}
let created=false;
try {
if(env.DOCKER_HOST&&!env.DOCKER_HOST.startsWith('npipe://'))throw new Error('Non-local Docker host refused');
const ctx=JSON.parse(requireOk(command(['context','inspect']),'Docker context').stdout)[0];
if(!ctx.Endpoints?.docker?.Host?.startsWith('npipe://'))throw new Error('Local Windows named-pipe Docker required');
requireOk(command(['image','inspect',image]),'Existing PostgreSQL image');
requireOk(command(['run','-d','--name',name,'--network','none','--log-driver','none','--label','hka.backup-rehearsal=local-only','--user','postgres','--tmpfs','/tmp:rw,nosuid,nodev,size=512m,mode=1777','--entrypoint','/bin/bash',image,'-c','initdb -D /tmp/hka-pg -A trust --no-locale >/tmp/init.log 2>&1 && exec postgres -D /tmp/hka-pg -c listen_addresses=127.0.0.1 -c shared_preload_libraries= -c logging_collector=off -c log_statement=none -c log_min_error_statement=panic -c log_min_messages=panic']),'Create isolated container');
created=true;
const info=JSON.parse(requireOk(command(['inspect',name]),'Inspect isolation').stdout)[0];
if(info.HostConfig.NetworkMode!=='none'||Object.keys(info.HostConfig.PortBindings||{}).length||info.Mounts.some(m=>m.Type==='bind'||m.Type==='volume')||info.HostConfig.LogConfig.Type!=='none')throw new Error('Required isolation missing');
result.isolation={network:'none',publishedPorts:false,hostMounts:false,loggingDriver:'none',databaseStorage:'tmpfs /tmp only',containerId:info.Id,imageId:info.Image};
let ready=false;for(let n=0;n<30;n++){if(command(['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres']).status===0){ready=true;break;}Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,200);}
if(!ready)throw new Error('Isolated PostgreSQL startup unavailable');
requireOk(command(['exec',name,'createdb','-h','127.0.0.1','-U','postgres',db]),'Create disposable database');
const psql=sql=>command(['exec','-i',name,'psql','-X','--no-password','-q','-t','-A','-1','--set=ON_ERROR_STOP=1','--set=VERBOSITY=sqlstate','-h','127.0.0.1','-U','postgres','-d',db],sql);
const inventory=requireOk(psql("SELECT json_build_object('version',version(),'auth_schema',to_regnamespace('auth') IS NOT NULL,'storage_schema',to_regnamespace('storage') IS NOT NULL,'supabase_admin',exists(select 1 from pg_roles where rolname='supabase_admin'));"),'Target inventory');
result.target=JSON.parse(inventory.stdout.trim());
for(const part of ['roles.sql','schema.sql','data.sql','auth-data.sql']){
const p=psql(fs.readFileSync(path.join(backup.directory,part),'utf8'));
const codes=[...(p.stderr||'').matchAll(/(?:ERROR|FATAL):\s+([0-9A-Z]{5})\b/g)].map(m=>m[1]);
result.phases.push({file:part,exitCode:p.status,status:p.status===0&&!p.error?'PASS':'FAIL',sqlstates:codes,reason:codes.includes('42704')?'Undefined prerequisite object in clean target':codes.includes('3F000')?'Required managed schema absent in clean target':codes.includes('42P01')?'Required relation absent in clean target':codes.includes('23505')?'Duplicate key in supplied backup parts':p.status!==0?'Restore stopped; raw diagnostic withheld to protect data':null,rawDiagnosticWithheld:true});
if(p.status!==0||p.error){result.status='FAIL';result.notAttempted=['roles.sql','schema.sql','data.sql','auth-data.sql'].slice(result.phases.length);break;}
}
if(result.phases.length===4&&result.phases.every(p=>p.status==='PASS'))result.status='PASS';
} catch(e){result.status='BLOCKED';result.blocker=e.message;}
finally{
if(created){const removed=command(['rm','-f','-v',name]);result.cleanup=removed.status===0;if(result.cleanup){const check=command(['inspect',name]);result.removalConfirmed=check.status!==0;}if(!result.cleanup){result.status='BLOCKED';result.blocker='Disposable container removal failed; operator cleanup required: '+name;}}
fs.writeFileSync(path.join(out,'historical-restore-rehearsal.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
}
process.exitCode=result.cleanup||!created?0:1;
