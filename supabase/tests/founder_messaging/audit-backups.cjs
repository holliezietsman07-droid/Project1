const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=process.cwd(),base='C:/Users/Hollie/HKA-Private-Backup',out=path.join(root,'docs/founder-messaging-readiness-evidence');
fs.mkdirSync(out,{recursive:true});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const report={capturedAt:new Date().toISOString(),scope:'Local structural backup audit; no raw data, passwords or identities emitted',backupRoot:base,sets:[],connectionAvailability:{},artifacts:{}};
for(const name of ['202610310001_founder_direct_messaging.sql','202610310001_founder_direct_messaging.rollback.sql'])report.artifacts[name]=sha(fs.readFileSync(path.join(root,'supabase/proposals',name)));
const relevant=['public.hka_messages','public.hka_profiles','public.hka_account_roles','public.hka_guardians','public.hka_coach_students','public.hka_link_requests','public.hka_student_link_codes','public.hka_files','auth.users','auth.identities','storage.objects','storage.buckets'];
function auditFile(p){const b=fs.readFileSync(p),s=b.toString('utf8'),stat=fs.statSync(p);
const copies=[];let current=null;
for(const line of s.split(/\r?\n/)){
const m=line.match(/^COPY ([\w".]+) \(([^)]+)\) FROM stdin;$/);
if(m){current={table:m[1].replaceAll('"',''),columns:m[2].replaceAll('"','').split(', '),rowCount:0};copies.push(current);}
else if(current&&line==='\\.')current=null;
else if(current)current.rowCount++;
}
const inserts=[...s.matchAll(/^INSERT INTO ([\w".]+)/gm)].map(m=>m[1].replaceAll('"',''));
const creates=[...s.matchAll(/^CREATE TABLE (?:IF NOT EXISTS )?([\w".]+)/gm)].map(m=>m[1].replaceAll('"',''));
return {file:path.basename(p),bytes:b.length,lastWriteTimeUtc:stat.mtime.toISOString(),sha256:sha(b),
dumpVersion:s.match(/^-- Dumped by pg_dump version ([^\r\n]+)/m)?.[1]??null,
serverVersion:s.match(/^-- Dumped from database version ([^\r\n]+)/m)?.[1]??null,
completionMarker:/-- PostgreSQL database dump complete/.test(s),copyTerminated:current===null,
transactionSnapshotRecorded:/snapshot|export_snapshot/i.test(s),
copyTables:copies,insertTables:[...new Set(inserts)],createdTables:creates,
createFunctionCount:[...s.matchAll(/^CREATE (?:OR REPLACE )?FUNCTION /gm)].length,
createPolicyCount:[...s.matchAll(/^CREATE POLICY /gm)].length,
grantStatementCount:[...s.matchAll(/^GRANT /gm)].length,
passwordClausePresent:/\bPASSWORD\s+/i.test(s)};
}
for(const dir of [base,...fs.readdirSync(base,{withFileTypes:true}).filter(e=>e.isDirectory()&&e.name!=='supabase').map(e=>path.join(base,e.name))]){
const names=fs.readdirSync(dir).filter(n=>/\.sql$/i.test(n));if(!names.length)continue;
const files=names.map(n=>auditFile(path.join(dir,n)));
const dataTables=new Set(files.flatMap(f=>[...f.copyTables.map(t=>t.table),...f.insertTables]));
const schemaTables=new Set(files.flatMap(f=>f.createdTables));
const manifests=fs.readdirSync(dir).filter(n=>/sha256|manifest|checksum/i.test(n));
const manifestResults=manifests.map(name=>{const text=fs.readFileSync(path.join(dir,name),'utf8');const entries=[...text.matchAll(/([a-fA-F0-9]{64})\s+\*?([^\r\n]+)/g)];return {name,parseableEntries:entries.length,results:entries.map(m=>{const file=path.basename(m[2].trim());const f=files.find(f=>f.file===file);return {file,matched:!!f&&f.sha256===m[1].toLowerCase()};})};});
const data=files.find(f=>f.file==='data.sql'),auth=files.find(f=>f.file==='auth-data.sql'); const overlappingAuthTables=data&&auth?auth.copyTables.filter(t=>data.copyTables.some(d=>d.table===t.table)).map(t=>t.table):[]; report.sets.push({directory:dir,files,overlappingAuthTables,existingManifests:manifestResults,allFourPartsPresent:['roles.sql','schema.sql','data.sql','auth-data.sql'].every(n=>names.includes(n)),
relevantCoverage:relevant.map(table=>({table,schema:schemaTables.has(table),dataSection:dataTables.has(table)})),
storageFileExportPresent:fs.readdirSync(dir,{withFileTypes:true}).some(e=>e.isDirectory()&&/storage|hka-private|objects/i.test(e.name)),
integrity:'SHA-256 calculated now; only existing manifest equality establishes prior byte integrity; neither proves restore'});
}
for(const n of ['.env.local','.env','.env.example']){if(!fs.existsSync(n))continue;report.connectionAvailability[n]={databaseCredentialKeys:fs.readFileSync(n,'utf8').split(/\r?\n/).map(l=>l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/)?.[1]).filter(k=>k&&/DATABASE|DB_URL|POSTGRES|PGHOST|PGUSER|PGPASS|SUPABASE_DB/.test(k))};}
report.connectionAvailability.environmentKeyNames=Object.keys(process.env).filter(k=>/DATABASE_URL|DB_URL|PGHOST|PGUSER|PGPASS|PGSERVICE|SUPABASE_DB/.test(k));
for(const n of ['supabase/.temp/pooler-url','supabase/.temp/linked-project.json']){
if(!fs.existsSync(n))continue;
if(n.endsWith('pooler-url')){try{const u=new URL(fs.readFileSync(n,'utf8').trim());report.connectionAvailability.pooler={exists:true,passwordPresent:!!u.password,expectedProject:u.username.includes('sqaydpbqycvaictieafk')};}catch{report.connectionAvailability.pooler={exists:true,parseable:false};}}
else{try{const j=JSON.parse(fs.readFileSync(n,'utf8'));report.connectionAvailability.linkedProject={exists:true,keys:Object.keys(j),expectedProject:JSON.stringify(j).includes('sqaydpbqycvaictieafk')};}catch{report.connectionAvailability.linkedProject={exists:true,parseable:false};}}
}
report.connectionAvailability.standardPgpassPresent=fs.existsSync(path.join(process.env.APPDATA||'','postgresql/pgpass.conf'));
fs.writeFileSync(path.join(out,'backup-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({capturedAt:report.capturedAt,artifacts:report.artifacts,connectionAvailability:report.connectionAvailability,sets:report.sets.map(s=>({directory:s.directory,files:s.files.map(f=>({file:f.file,bytes:f.bytes,date:f.lastWriteTimeUtc,copyTables:f.copyTables.length,completion:f.completionMarker,openCopy:!f.copyTerminated})),missingRelevantData:s.relevantCoverage.filter(t=>!t.dataSection).map(t=>t.table),storageFileExport:s.storageFileExportPresent,manifests:s.existingManifests}))},null,2));
