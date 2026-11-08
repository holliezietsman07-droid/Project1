const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
module.exports=async function preview(t){
 const {sql,rows,one,quote,json,id,F,R,C,G,U,H,H2,out,results,intake}=t;
 let c,server,deniedSave=false,active=R;const requests=[],storage=new Map(),adapterErrors=[],expectedFailures=[];
 const helper=new Module(path.resolve('.elmony/fitness-cdp.cjs'),module);helper.filename=path.resolve('.elmony/fitness-cdp.cjs');helper.paths=module.paths;
 helper._compile(fs.readFileSync('.elmony/release-cdp.cjs','utf8').replaceAll('release-evidence','fitness-review/browser').replaceAll('9231','9278').replaceAll('8080','8088'),helper.filename);
 const browserOut=path.resolve('.elmony/fitness-review/browser');fs.mkdirSync(browserOut,{recursive:true});
 const vlog=fs.openSync(path.join(browserOut,'vite.log'),'w');
 const label=text=>"Array.from(document.querySelectorAll('label')).filter(e=>e.firstElementChild?.textContent==="+JSON.stringify(text)+"&&e.getClientRects().length).at(-1)";
 const input=text=>label(text)+"?.querySelector('input,textarea,select')";
 const btn=text=>"Array.from(document.querySelectorAll('main button')).find(e=>e.textContent.trim()==="+JSON.stringify(text)+"&&e.getClientRects().length)";
 async function fill(expression,value){await c.evaluate("(()=>{const e="+expression+";if(!e)throw Error('Missing field');e.focus();Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(e,"+JSON.stringify(value)+");e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()");await c.delay(90);}
 async function check(name,fn){try{await fn();}catch(e){await c.screenshot('failure');fs.writeFileSync(path.join(out,'preview-failure.json'),JSON.stringify({name,error:e.message,body:await c.evaluate(`document.querySelector('main')?.innerText`)},null,2));throw e;}results.preview.push({name,status:'PASS'});console.log('PASS PREVIEW',name);}
 function session(user){const now=new Date().toISOString(),exp=Math.floor(Date.now()/1000)+3600;return{access_token:Buffer.from('{"alg":"HS256"}').toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:user,role:'authenticated',exp})).toString('base64url')+'.local-test',refresh_token:'local-only',token_type:'bearer',expires_at:exp,expires_in:3600,user:{id:user,email:'fitness@example.invalid',email_confirmed_at:now,aud:'authenticated',role:'authenticated',created_at:now,app_metadata:{provider:'email'},user_metadata:{},identities:[]}};}
 function actor(req){try{return JSON.parse(Buffer.from((req.headers.Authorization||req.headers.authorization).split('.')[1],'base64url')).sub;}catch{return active;}}
 async function fresh(user,route){
  active=user;await c.navigate('/','document.readyState==="complete"');
  await c.evaluate("localStorage.clear();sessionStorage.clear();localStorage.setItem('sb-sqaydpbqycvaictieafk-auth-token',"+JSON.stringify(JSON.stringify(session(user)))+");");
  await c.navigate(route,"!!document.querySelector('main')");
  await c.until("!document.querySelector('main').innerText.includes('Opening programme records')&&!document.querySelector('main').innerText.includes('Opening your member space')&&!!document.querySelector('main h1')");
 }
 try{
 server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--mode','fitness-review','--host','127.0.0.1','--port','8088','--strictPort'],{env:{...process.env,VITE_FITNESS_DATABASE_ENABLED:'true'},windowsHide:true,stdio:['ignore',vlog,vlog]});
 for(let n=0;n<150;n++){try{if((await fetch('http://127.0.0.1:8088')).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
 c=await helper.exports();
 c.listeners.set('Page.javascriptDialogOpening',()=>c.send('Page.handleJavaScriptDialog',{accept:true}));
 c.listeners.set('Fetch.requestPaused',async({requestId,request:req})=>{
  const url=new URL(req.url),user=actor(req);
  const headers=[{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:'*'},{name:'Access-Control-Allow-Headers',value:'*'},{name:'Access-Control-Allow-Methods',value:'GET,POST,PATCH,OPTIONS,DELETE'}];
  const reply=(data,status=200,contentType)=>{if(status>=400)expectedFailures.push(status);return c.send('Fetch.fulfillRequest',{requestId,responseCode:status,responseHeaders:contentType?headers.map(h=>h.name==='Content-Type'?{...h,value:contentType}:h):headers,body:Buffer.from(typeof data==='string'?data:JSON.stringify(data)).toString('base64')}).catch(e=>{if(!/Invalid InterceptionId/.test(e.message))throw e;});};
  try{
   if(req.method==='OPTIONS')return reply('',204);
   if(url.pathname.startsWith('/auth/v1/'))return reply(session(user).user);
   if(url.pathname.startsWith('/storage/v1/')){
    const object=url.pathname.replace(/^\/storage\/v1\/object\/(?:sign\/)?hka-private\//,'');
    if(req.method==='POST'&&url.pathname.includes('/object/sign/')){
     assert(one('select * from storage.objects where name='+quote(object),user),'Private access denied');return reply({signedURL:'/object/sign/hka-private/'+object+'?token=local-only'});
    }
    if(req.method==='POST'){
     const metadata=one('select * from public.hka_fitness_files where path='+quote(object),user);assert(metadata);
     sql("insert into storage.objects(bucket_id,name,owner_id) values('hka-private',"+quote(object)+","+quote(user)+")",user);
     const data=req.postData||'';storage.set(object,data);return reply({Key:'hka-private/'+object,Id:metadata.id},200);
    }
    if(req.method==='GET'){assert(one('select * from storage.objects where name='+quote(object),user));return reply(storage.get(object)||'',200,'text/plain');}
   }
   if(url.pathname.startsWith('/rest/v1/rpc/')){
    const name=url.pathname.split('/').pop();let body=req.postData?JSON.parse(req.postData):{};
    if(!name.startsWith('hka_fitness_'))return reply(name==='hka_message_contacts'?[]:null);
    requests.push({name,actor:user,body});
    if(deniedSave&&name==='hka_fitness_record')return reply({code:'42501',message:'Test database rejected save'},403);
    const args={
    hka_fitness_save_intake:['target_student','target_horse','new_payload'],
    hka_fitness_save_programme:['target_programme','target_student','target_horse','new_kind','new_source','new_title','new_intake','new_sessions'],
    hka_fitness_assign:['target_programme','expected_draft'],
    hka_fitness_record:['target_version','target_key','work_date','new_status','actual_minutes','recovery_notes']}[name];
    assert(args,'Unknown fitness RPC');
    const values=args.map(key=>body[key]==null?'null':typeof body[key]==='object'?json(body[key]):typeof body[key]==='number'?String(body[key]):quote(body[key]));
    const result=sql('select public.'+name+'('+values.join(',')+')',user);
    return reply(JSON.stringify(result||null));
   }
   if(url.pathname.startsWith('/rest/v1/')){
    const table=url.pathname.split('/').pop();assert(/^hka_[a-z_]+$/.test(table));
    const known=one('select to_regclass('+quote('public.'+table)+') is not null as present').present;
    if(!known)return reply([]);
    const where=[];
    for(const [key,value]of url.searchParams)if(value.startsWith('eq.')){assert(/^[a-z_]+$/.test(key));where.push('"'+key+'"='+quote(value.slice(3)));}
    if(req.method==='GET'){
     const data=rows('select * from public.'+table+(where.length?' where '+where.join(' and '):'')+' order by id',user);
     if((req.headers.Accept||req.headers.accept||'').includes('vnd.pgrst.object'))return data.length?reply(data[0]):reply({code:'PGRST116',message:'No visible row'},406);
     return reply(data);
    }
    if(req.method==='POST'&&['hka_fitness_templates','hka_fitness_files'].includes(table)){
     const body=JSON.parse(req.postData),keys=Object.keys(body);assert(keys.every(k=>/^[a-z_]+$/.test(k)));
     sql('insert into public.'+table+'('+keys.join(',')+') values('+keys.map(k=>body[k]==null?'null':typeof body[k]==='object'?json(body[k]):typeof body[k]==='number'?String(body[k]):quote(body[k])).join(',')+')',user);
     return reply(null,201);
    }
    throw Error('Unexpected operation '+req.method+' '+table);
   }
   return reply('<svg xmlns="http://www.w3.org/2000/svg"/>',200,'image/svg+xml');
  }catch(e){adapterErrors.push({url:url.pathname,error:e.message});await reply({code:'LOCAL_TEST_ERROR',message:e.message},500);}
 });
 await c.send('Fetch.enable',{patterns:[{urlPattern:'https://*'}]});
 await c.send('Network.setBlockedURLs',{urls:['wss://*.supabase.co/*']});
 await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await check('Rider visible navigation and profile-prefilled intake save/reload use real database',async()=>{
  await fresh(R,'/dashboard/fitness/rider');
  assert(await c.evaluate("!!Array.from(document.querySelectorAll('a')).find(e=>e.getAttribute('href')==='/dashboard/fitness/rider'&&e.getClientRects().length)"));
  await c.click("document.querySelector('main summary')");
  await fill(input('Goals for this programme'),'Preview rider goal persisted');
  await c.click(btn('Save intake'));await c.until("document.querySelector('main').innerText.includes('Intake saved.')");
  await fresh(R,'/dashboard/fitness/rider');await c.click("document.querySelector('main summary')");
  assert.equal(await c.evaluate(input('Goals for this programme')+'.value'),'Preview rider goal persisted');
  assert.equal(one('select payload from public.hka_fitness_intakes where horse_id is null',R).payload.goals,'Preview rider goal persisted');
  await c.screenshot('rider-intake-reloaded');
 });
 await check('Rider completes and updates notes; browser reload keeps exact progress',async()=>{
  await c.click("document.querySelector('button[aria-label=\"Previous week\"]')");
  const card="Array.from(document.querySelectorAll('main article')).find(e=>e.querySelector('h4'))";
  await fill(card+".querySelector('textarea')",'Preview completed rider notes');
  await c.click(btn('Complete'));await c.until("document.querySelector('main').innerText.includes('Progress saved.')");
  await fresh(R,'/dashboard/fitness/rider');await c.click("document.querySelector('button[aria-label=\"Previous week\"]')");
  assert.equal(await c.evaluate(card+".querySelector('textarea').value"),'Preview completed rider notes');
 });
 await check('Founder creates age-appropriate HKA draft, reviews and approves with save/reload',async()=>{
  await fresh(F,'/dashboard/programmes');
  await fill(input('Select rider or horse'),R);
  await c.click(btn('Create HKA draft'));
  await fill(input('Programme title'),'Preview Founder rider programme');
  await c.click(btn('Prepare age-appropriate draft'));
  await c.click(btn('Save HKA draft'));
  await c.until("!!"+input('Programme · HKA and your own plans stay separate'));
  const p=one("select id,draft_version_id from public.hka_fitness_programmes where title='Preview Founder rider programme'",F);
  assert(p?.draft_version_id);assert.equal(rows('select * from public.hka_fitness_versions where id='+quote(p.draft_version_id),R).length,0);
  await fill(input('Programme · HKA and your own plans stay separate'),p.id);
  await c.until("!!"+btn('Approve & assign draft'));await c.click(btn('Approve & assign draft'));
  await c.until("document.querySelector('main').innerText.includes('HKA programme approved and assigned.')");
  await fresh(R,'/dashboard/fitness/rider');assert((await c.evaluate("document.querySelector('main').innerText")).includes('Preview Founder rider programme'));
  await c.screenshot('founder-assigned-rider');
 });
 await check('Founder revision displays newest draft; approval preserves prior versions',async()=>{
  await fresh(F,'/dashboard/programmes');await fill(input('Select rider or horse'),R);
  const p=one("select id from public.hka_fitness_programmes where title='Preview Founder rider programme'",F);
  await fill(input('Programme · HKA and your own plans stay separate'),p.id);
  await c.click(btn('Revise programme'));await fill(input('Programme title'),'Preview Founder revised programme');
  await c.click(btn('Save HKA draft'));await c.until("!!"+btn('Approve & assign draft'));
  assert((await c.evaluate("document.querySelector('main').innerText")).includes('Preview Founder revised programme'));
  await c.click(btn('Approve & assign draft'));await c.until("document.querySelector('main').innerText.includes('HKA programme approved and assigned.')");
  assert.equal(rows('select * from public.hka_fitness_versions where programme_id='+quote(p.id),R).length,2);
 });
 await check('Rider skips a scheduled session; skipped status survives browser reload',async()=>{
  await fresh(R,'/dashboard/fitness/rider');await c.click(`document.querySelector('[aria-label="Previous week"]')`);
  await c.click(btn('Skip session'));await c.until(`document.querySelector('main').innerText.includes('Progress saved.')`);
  await fresh(R,'/dashboard/fitness/rider');await c.click(`document.querySelector('[aria-label="Previous week"]')`);
  assert((await c.evaluate(`document.querySelector('main').innerText`)).includes('SKIPPED'));
 });
 await check('Horse profile route prefills records; manual owner programme saves/reloads independently',async()=>{
  await fresh(R,'/dashboard/fitness/horse/'+H);
  await c.click("document.querySelector('main summary')");
  assert((await c.evaluate(input('Recent workload · prefilled from ride logs')+'.value')).includes('Horse recovered well'));
  await c.click(btn('My own / vet programme'));await fill(input('Programme title'),'Preview Willow manual plan');
  await fill(input('Goals for this programme'),'Owner goal stays separate');
  await c.click(btn('Add session'));await fill(input('Session title'),'Hand walk original programme');
  await fill(input('Session instructions'),'Walk quietly with warm-up and cool-down as directed.');
  await c.click(btn('Save & follow my programme'));
  await c.until("!!"+input('Programme · HKA and your own plans stay separate'));
  const p=one("select id from public.hka_fitness_programmes where title='Preview Willow manual plan'",R);
  await fill(input('Programme · HKA and your own plans stay separate'),p.id);
  await c.until("document.querySelector('main').innerText.includes('Hand walk original programme')");
  await fresh(R,'/dashboard/fitness/horse/'+H);
  await fill(input('Programme · HKA and your own plans stay separate'),p.id);
  assert((await c.evaluate("document.querySelector('main').innerText")).includes('Owner goal stays separate'));
  await c.screenshot('horse-owner-plan-reloaded');
 });
 await check('Horse completion retry makes one ride log with correct horse; notes survive reload',async()=>{
  await c.click("document.querySelector('button[aria-label=\"Previous week\"]')");
  const card="Array.from(document.querySelectorAll('main article')).find(e=>e.querySelector('h4'))";
  await fill(card+".querySelector('textarea')",'Preview horse recovery notes');
  await c.click(btn('Complete'));await c.until("document.querySelector('main').innerText.includes('linked to this horse’s ride log.')");
  const p=one("select current_version_id from public.hka_fitness_programmes where title='Preview Willow manual plan'",R);
  const count=()=>rows('select * from public.hka_training_records where id in (select training_record_id from public.hka_fitness_progress where version_id='+quote(p.current_version_id)+')',R);
  assert.equal(count().length,1);assert.equal(count()[0].horse_id,H);
  await c.click(btn('Save notes'));await c.delay(500);assert.equal(count().length,1);
  await fresh(R,'/dashboard/fitness/horse/'+H);const prog=one("select id from public.hka_fitness_programmes where title='Preview Willow manual plan'",R);
  await fill(input('Programme · HKA and your own plans stay separate'),prog.id);await c.click("document.querySelector('button[aria-label=\"Previous week\"]')");
  assert.equal(await c.evaluate(card+".querySelector('textarea').value"),'Preview horse recovery notes');
 });
 await check('Owner original attachment metadata and permitted object survive reload',async()=>{
  const originalPath=path.join(browserOut,'owner-original.txt');fs.writeFileSync(originalPath,'Synthetic owner programme original');
  const {root}=await c.send('DOM.getDocument');
  const {nodeId}=await c.send('DOM.querySelector',{nodeId:root.nodeId,selector:'main input[type=file]'});
  assert(nodeId);await c.send('DOM.setFileInputFiles',{nodeId,files:[originalPath]});
  await c.until(`document.querySelector('main').innerText.includes('Private attachment saved.')`);
  const p=one(`select id,current_version_id from public.hka_fitness_programmes where title='Preview Willow manual plan'`,R);
  const material=one('select * from public.hka_fitness_files where version_id='+quote(p.current_version_id),R);
  assert.equal(material.original_name,'owner-original.txt');assert(one('select * from storage.objects where name='+quote(material.path),R));
  await fresh(R,'/dashboard/fitness/horse/'+H);
  await fill(input('Programme · HKA and your own plans stay separate'),p.id);
  assert((await c.evaluate(`document.querySelector('main').innerText`)).includes('owner-original.txt'));
  await c.click(`document.querySelector('[aria-label="Previous week"]')`);
 });
 await check('Rejected save retains entered notes and reports failure without success',async()=>{
  deniedSave=true;const card="Array.from(document.querySelectorAll('main article')).find(e=>e.querySelector('h4'))";
  await fill(card+".querySelector('textarea')",'Keep notes after database failure');await c.click(btn('Save notes'));
  await c.until("document.querySelector('main').innerText.includes('Test database rejected save')");
  assert.equal(await c.evaluate(card+".querySelector('textarea').value"),'Keep notes after database failure');deniedSave=false;
 });
 await check('Second horse route is separate; Message Hollie entry remains reachable; mobile fits',async()=>{
  await fresh(R,'/dashboard/fitness/horse/'+H2);
  assert(!(await c.evaluate("document.querySelector('main').innerText")).includes('Preview Willow manual plan'));
  assert(await c.evaluate("Array.from(document.querySelectorAll('main a')).some(e=>e.textContent.includes('Message Hollie')&&e.getAttribute('href').includes('section=messages'))"));
  await c.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  assert(await c.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));await c.screenshot('horse-mobile');
  await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 });
 await check('Founder reusable template is persisted and available after reload',async()=>{
  await fresh(F,'/dashboard/programmes');await c.click("Array.from(document.querySelectorAll('[role=tab]')).find(e=>e.textContent==='Reusable templates')");
  await fill(input('Template title'),'Preview reusable mobility');
  await c.click(btn('Add session'));await fill(input('Session title'),'Comfortable mobility');
  await fill(input('Session instructions'),'Gentle pain-free joint movement.');
  await c.click(btn('Save reusable template'));await c.until("document.querySelector('main').innerText.includes('Reusable template saved.')");
  await fresh(F,'/dashboard/programmes');await c.click("Array.from(document.querySelectorAll('[role=tab]')).find(e=>e.textContent==='Reusable templates')");
  assert((await c.evaluate("document.querySelector('main').innerText")).includes('Preview reusable mobility'));
 });
 await check('Founder health flag holds template suggestions; coach/guardian views stay read-only',async()=>{
  await fresh(F,'/dashboard/programmes');await fill(input('Select rider or horse'),H2);await c.click(btn('Create HKA draft'));
  await c.click("Array.from(document.querySelectorAll('label')).find(e=>e.textContent.trim()==='Lameness').querySelector('input')");
  assert.equal(await c.evaluate(btn('Prepare age-appropriate draft')+'.disabled'),true);
  for(const actor of [C,G]){await fresh(actor,'/dashboard/fitness/rider/'+R);assert.equal(await c.evaluate("Array.from(document.querySelectorAll('main button')).filter(e=>['Complete','Skip session','Save notes'].includes(e.textContent.trim())).length"),0);}
 });
 await check('Unrelated rider cannot open another member fitness; non-Founder management denied',async()=>{
  await fresh(U,'/dashboard/fitness/rider/'+R);assert((await c.evaluate("document.querySelector('main').innerText")).includes('No authorised rider records'));
  await fresh(C,'/dashboard/programmes');assert((await c.evaluate("document.querySelector('main').innerText")).includes('Access restricted'));
 });
 assert.deepEqual(adapterErrors,[]);assert.equal(c.errors.length,0,c.errors.join('\n'));
 const unexpected=c.consoleErrors.filter(e=>!/Failed to load resource: the server responded with a status of 403/.test(e));
 assert.deepEqual(unexpected,[]);
 results.previewTransport='Actual React routes, Supabase SDK and UI handlers; intercepted transport executes real local PostgreSQL RPCs and RLS reads in independent connections. Synthetic auth, no hosted API/JWT or real Supabase object storage.';
 results.previewRequests=requests;results.expectedFailureCases=expectedFailures;results.previewScreenshots=browserOut;
 }finally{if(c){if(adapterErrors.length)console.error('Adapter errors',adapterErrors);if(c.errors.length)console.error('Browser errors',c.errors);await c.close();}if(server)server.kill();fs.closeSync(vlog);}
};
