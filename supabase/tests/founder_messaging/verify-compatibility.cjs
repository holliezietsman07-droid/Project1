// Compare saved read-only hosted metadata with proposal and prior fixture inputs.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const dir='docs/founder-messaging-evidence/';
const read=p=>fs.readFileSync(p,'utf8'),json=p=>JSON.parse(read(dir+p));
const live=json('hosted-compatibility-snapshot.json'),old=json('local-schema-metadata.json');
const prior=json('historical-20261031-isolated-run.json'),run=json('isolated-run.json'),api=json('hosted-api-exposure.json');
const normalise=s=>s===null?null:s.replaceAll('\\n','\n');
const migration=read('supabase/proposals/202610310001_founder_direct_messaging.sql');
const policyResults=live.policies.filter(p=>p.tablename==='hka_messages').map(p=>{
 assert.deepEqual(p.roles,['authenticated']);assert.equal(p.permissive,'PERMISSIVE');
 for(const expression of [p.qual,p.with_check])if(expression!==null)assert(migration.includes('$baseline$'+normalise(expression)+'$baseline$'));
 return {name:p.policyname,roles:p.roles,command:p.cmd,permissive:p.permissive,exactExpressionsMatch:true};
});
assert.equal(policyResults.length,3);
assert(migration.includes("actual.roles is distinct from array['authenticated']::name[]"));
const migrationFiles=fs.readdirSync('supabase/migrations').filter(p=>p.endsWith('.sql'));
const missingMigrationVersions=migrationFiles.map(p=>p.split('_')[0]).filter(v=>!live.migration_history.some(m=>m.version===v));
assert.deepEqual(missingMigrationVersions,[]);
const columnDifferences=[];
for(const t of live.metadata.filter(t=>t.kind==='tables')){
 const previous=old.tables.find(x=>x.table===t.table&&x.kind==='tables');
 if(!previous||JSON.stringify(previous.data.columns)!==JSON.stringify(t.data.columns))columnDifferences.push(t.table);
}
const newlyCapturedFunctions=live.functions.filter(f=>!old.functions.some(p=>p.name===f.name)).map(f=>f.name);
const changedPreviouslyCapturedFunctions=live.functions.filter(f=>old.functions.some(p=>p.name===f.name&&normalise(p.definition)!==normalise(f.definition))).map(f=>f.name);
const hashes={};
for(const [label,file]of [['migration','202610310001_founder_direct_messaging.sql'],['rollback','202610310001_founder_direct_messaging.rollback.sql']]){
 hashes[label]=crypto.createHash('sha256').update(read('supabase/proposals/'+file)).digest('hex');
 assert.equal(hashes[label],prior[label+'_sha256']);assert.equal(hashes[label],run[label+'_sha256']);
}
assert.equal(run.status,'PASS');assert.equal(run.passedAssertions,183);assert(run.cleanup);
assert(run.frontendContracts.length===2&&run.frontendContracts.every(c=>c.status==='PASS'));
assert.equal(api.status,'PASS');assert.equal(api.postgrestExposedSchemas,'Only the following schemas are exposed: public, graphql_public');
assert.equal(live.graphql_extension,null);
const report={date:new Date().toISOString(),project:live.project,status:'PASS',policyResults,proposalChanged:false,proposalHashes:hashes,
 migrationHistory:{recorded:live.migration_history.length,local: migrationFiles.length,missingLocalVersions:missingMigrationVersions,proposalRecorded:live.migration_history.some(m=>m.version==='202610310001')},
 fixtureComparison:{columnDifferences,newlyCapturedFunctions,changedPreviouslyCapturedFunctions,refreshedFunctions:live.functions.map(f=>f.name),constraints:live.constraints.length,
 corrections:['Removed synthetic authenticated EXECUTE on hka_has_purpose; restored current service_role helper grants.',
 'Use freshly captured constraints, policy role targets and helper definitions instead of source-only fallbacks.',
 'Recreate SELECT participant IN expression before exact catalog comparison; reparsing deparsed OR text flattens PostgreSQL expression tree.',
 'Reconstruct current message and account-role secondary indexes.'],
 remainingDifferences:run.metadataLimitations},
 exposure:{postgrest:api.postgrestExposedSchemas,privateSchemaExposed:false,graphqlExtensionInstalled:false,catalogSettings:live.api_settings},
 sqlAssertions:{passed:run.passedAssertions,failed:run.failedAssertions,runId:run.runId},
 frontendContracts:run.frontendContracts,liveMutations:false,deployment:false};
fs.writeFileSync(dir+'compatibility-comparison.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
