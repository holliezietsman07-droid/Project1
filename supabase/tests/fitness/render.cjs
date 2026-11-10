const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {createElement}=require('react');
const {renderToStaticMarkup}=require('react-dom/server');

process.chdir(path.resolve(__dirname,'../../..'));
const out='docs/fitness-review-20261110';

async function run(){
 const {createServer}=await import('vite');
 const vite=await createServer({
  server:{middlewareMode:true,hmr:false},
  optimizeDeps:{noDiscovery:true,include:[]},
  appType:'custom'
 });
 try{
  const {ProgrammeManagement}=await vite.ssrLoadModule('/src/components/fitness/ProgrammeManagement.tsx');
  const {MemberProgrammes,Materials}=await vite.ssrLoadModule('/src/components/fitness/WeeklyProgramme.tsx');
  const {emptyIntake}=await vite.ssrLoadModule('/src/lib/fitness/model.ts');
  const intake=emptyIntake();
  const subject={id:'archived-horse:owner:horse',student_id:'owner',kind:'horse',name:'Atlas',intake,archivedHorseId:'horse'};
  const programme={id:'programme',student_id:'owner',horse_id:null,archived_horse_id:'horse',kind:'horse',source:'hka',title:'Retained training plan',status:'archived',current_version_id:'approved',draft_version_id:'draft'};
  const approved={id:'approved',programme_id:programme.id,version_number:1,title:programme.title,intake,approved_at:'2026-11-10',sessions:[
   {key:'monday',day:0,title:'Saved session',category:'conditioning',minutes:15,instructions:'Recorded fixture session.'}
  ]};
  const draft={...approved,id:'draft',version_number:2,approved_at:null};
  const data={subjects:[subject],programmes:[programme],versions:[approved,draft],progress:[],templates:[],files:[
   {id:'file',version_id:approved.id,template_id:null,original_name:'original.pdf',path:'fitness/fixture'}
  ]};
  const controller=isFounder=>({isFounder,data,writable:true,profile:{timezone:'Africa/Johannesburg'},canRecord:()=>true});
  const render=(Component,props)=>renderToStaticMarkup(createElement(Component,props));
  const results=[];
  function check(name,fn){fn();results.push({name,status:'PASS'});console.log('PASS RENDER',name);}
  check('A non-Founder session sees the Programme Management access message',()=>{
   const html=render(ProgrammeManagement,{c:controller(false)});
   assert.match(html,/Programme Management requires Founder access/);
   assert.doesNotMatch(html,/Create HKA draft|Reusable templates/);
  });
  check('An owner can read archived history and attachments',()=>{
   const html=render(MemberProgrammes,{subject,c:controller(false)});
   assert.match(html,/Archived programme history for Atlas/);
   assert.match(html,/Retained training plan/);
   assert.match(html,/original\.pdf/);
   assert.doesNotMatch(html,/Save intake|My own \/ vet programme|Revise programme|Approve &amp; assign draft/);
  });
  check('Archived draft controls stay hidden for the Founder',()=>{
   const html=render(MemberProgrammes,{subject,c:controller(true),management:true});
   assert.match(html,/Archived programme history for Atlas/);
   assert.doesNotMatch(html,/Create HKA draft|Revise programme|Approve &amp; assign draft/);
   const queue=render(ProgrammeManagement,{c:controller(true)});
   assert.match(queue,/No programmes need review/);
   assert.doesNotMatch(queue,/Review draft: Retained training plan/);
  });
  check('Attachment picker accepts the reviewed PDF, PNG and JPEG formats',()=>{
   const html=render(Materials,{c:controller(false),versionId:approved.id,editable:true});
   assert.match(html,/accept="\.pdf,\.png,\.jpg,\.jpeg"/);
   assert.match(html,/10 MB maximum/);
   assert.doesNotMatch(html,/\.txt/);
  });
  fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(out+'/render-results.json',JSON.stringify({status:'PASS',results},null,2)+'\n');
 }finally{
  await vite.close();
 }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
