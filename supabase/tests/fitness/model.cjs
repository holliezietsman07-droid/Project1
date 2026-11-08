const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module'),ts=require('typescript');
const file=path.resolve('src/lib/fitness/model.ts'),mod=new Module(file,module);
mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,file);
const m=mod.exports,results=[];
function check(name,fn){fn();results.push({name,status:'PASS'});}
const base={...m.emptyIntake(),age:28,timeOff:'None'};
check('Available weekday sequence includes strength/balance, mobility and stamina',()=>{const s=m.templateDraft('rider',base).filter(s=>s.category!=='rest');assert.deepEqual(s.map(s=>s.category),['strength','mobility','stamina']);assert(s[0].instructions.includes('balance'));});
check('Health concerns hold rider and horse templates',()=>{for(const kind of ['rider','horse'])assert.throws(()=>m.templateDraft(kind,{...base,health:['Injury']}));});
check('Unknown time off, older or young horse hold standard conditioning',()=>{for(const patch of [{timeOff:''},{age:4},{age:18}])assert.throws(()=>m.templateDraft('horse',{...base,age:9,...patch}));});
check('Younger rider draft is short, supervised and unloaded',()=>{const s=m.templateDraft('rider',{...base,age:12});assert(s.every(s=>s.minutes<=15));assert(s.filter(s=>s.category!=='rest').every(s=>s.instructions.includes('appropriate adult')&&s.instructions.includes('No loaded training')));});
check('Programme copies keep separate goals and original intake',()=>{const a=structuredClone(base),b=structuredClone(base);a.goals='Programme A';b.goals='Programme B';assert.equal(base.goals,'');assert.notEqual(a.goals,b.goals);});
check('Week boundaries use member timezone across year rollover',()=>{assert.equal(m.weekStart('Africa/Johannesburg',new Date('2026-12-31T23:30:00Z')),'2026-12-28');assert.equal(m.sessionDate('2026-12-28',6),'2027-01-03');assert.equal(m.weekStart('Pacific/Auckland',new Date('2026-11-08T20:00:00Z')),'2026-11-09');});
check('Duplicate session keys and invalid duration are rejected',()=>{const s=m.templateDraft('rider',base);assert.throws(()=>m.validateSessions([s[0],s[0]]));assert.throws(()=>m.validateSessions([{...s[0],minutes:241}]));});
fs.mkdirSync('docs/fitness-review-20261108',{recursive:true});fs.writeFileSync('docs/fitness-review-20261108/model-results.json',JSON.stringify({status:'PASS',results},null,2));console.log(JSON.stringify({status:'PASS',passed:results.length}));
