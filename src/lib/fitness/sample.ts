import { emptyIntake, templateDraft, validateSessions, type FitnessData, type Intake, type Programme, type SessionPlan } from './model';
export type SampleRole = 'founder' | 'rider' | 'coach' | 'guardian' | 'unrelated' | 'unapproved-coach' | 'unverified-guardian';
export function createSampleData(): FitnessData {
  const rider = { ...emptyIntake(), age: 28, disciplines: ['Dressage','Show jumping'], condition: 'Returning to regular movement', goals: 'More stable balance and comfortable mobility', equipment: 'Stable chair, comfortable shoes' };
  const horse = { ...emptyIntake(), age: 9, disciplines: ['Dressage'], condition: 'Comfortable easy work', goals: 'Maintain a steady foundation', recentWork: 'Three easy sessions last week', timeOff: 'None', equipment: 'Level arena and safe walking track' };
  const now = new Date().toISOString();
  const programmes: Programme[] = [
    { id:'sample-rider-plan',student_id:'sample-rider',horse_id:null,kind:'rider',source:'hka',title:'Your balanced foundations',status:'assigned',current_version_id:'sample-rider-v1',draft_version_id:null },
    ...['Willow','Atlas'].map((name,i): Programme => ({id:'sample-horse-plan-'+i, student_id:'sample-rider',horse_id:'sample-horse-'+i,kind:'horse',source:'owner',title:name+' · owner’s programme',status:'assigned',current_version_id:'sample-horse-v'+i,draft_version_id:null})),
  ];
  return {
    subjects:[{id:'sample-rider',student_id:'sample-rider',kind:'rider',name:'Alex · test rider',intake:rider},
      ...['Willow','Atlas'].map((name,i)=>({id:'sample-horse-'+i,student_id:'sample-rider',kind:'horse' as const,name,intake:{...horse,age:9+i*3}}))],
    programmes,
    versions:programmes.map((p,i)=>({id:p.current_version_id!,programme_id:p.id,version_number:1,title:p.title,intake:i===0?rider:horse,sessions:templateDraft(p.kind,i===0?rider:horse),approved_at:now,created_at:now})),
    progress:[],files:[],
    templates:[{id:'sample-template-adult',kind:'rider',title:'Adult · movement foundations',age_group:'adult',sessions:templateDraft('rider',rider)},
      {id:'sample-template-young',kind:'rider',title:'Young rider · supported movement',age_group:'young',sessions:templateDraft('rider',{...rider,age:12})},
      {id:'sample-template-horse',kind:'horse',title:'Horse · easy foundation week',age_group:'horse',sessions:templateDraft('horse',horse)}],
  };
}
export function sampleCanView(role: SampleRole) {
  return ['founder','rider','coach','guardian'].includes(role);
}
export function sampleVisible(data: FitnessData, role: SampleRole): FitnessData {
  if (!sampleCanView(role)) return {subjects:[],programmes:[],versions:[],progress:[],files:[],templates:[]};
  const programmes=data.programmes.filter(p=>role==='founder'||p.status==='assigned');
  const versions=data.versions.filter(v=>role==='founder'||v.approved_at&&programmes.some(p=>p.id===v.programme_id));
  return {...data,programmes,versions,progress:data.progress.filter(p=>versions.some(v=>v.id===p.version_id)),files:data.files.filter(f=>role==='founder'||versions.some(v=>v.id===f.version_id)),templates:role==='founder'?data.templates:[]};
}
export function sampleSave(data: FitnessData, role: SampleRole, subjectId: string, source: 'hka'|'owner'|'vet', title: string, intake: Intake, sessions: SessionPlan[], existingId?:string) {
  const subject=data.subjects.find(s=>s.id===subjectId);
  if(!subject||!title.trim()||!sampleCanView(role)||source==='hka'&&role!=='founder'||source!=='hka'&&(subject.kind!=='horse'||role!=='rider')) throw new Error('Programme editing is restricted to Founder or horse owner.');
  validateSessions(sessions);
  let programme=data.programmes.find(p=>p.id===existingId);
  if(programme && (programme.student_id!==subject.student_id||programme.horse_id!==(subject.kind==='horse'?subject.id:null)||programme.source!==source)) throw new Error('Programme subject cannot change.');
  if(!programme) { programme={id:crypto.randomUUID(),student_id:subject.student_id,horse_id:subject.kind==='horse'?subject.id:null,kind:subject.kind,source,title,status:'draft',current_version_id:null,draft_version_id:null};data.programmes.push(programme); }
  const id=crypto.randomUUID(), now=new Date().toISOString();
  data.versions.push({id,programme_id:programme.id,title,version_number:Math.max(0,...data.versions.filter(v=>v.programme_id===programme!.id).map(v=>v.version_number))+1,intake:structuredClone(intake),sessions:structuredClone(sessions),approved_at:source==='hka'?null:now,created_at:now});
  if(source==='hka') programme.draft_version_id=id;
  else { for(const p of data.programmes) if(p.id!==programme.id&&p.horse_id===programme.horse_id&&p.source===source&&p.status==='assigned')p.status='archived'; programme.current_version_id=id;programme.status='assigned'; }
  return programme.id;
}
export function sampleAssign(data: FitnessData, role: SampleRole, programmeId:string) {
  if(role!=='founder')throw new Error('Founder approval required.');
  const p=data.programmes.find(p=>p.id===programmeId);
  const v=data.versions.find(v=>v.id===p?.draft_version_id);
  if(!p||!v)throw new Error('No draft is ready for approval.');
  for(const other of data.programmes) if(other.id!==p.id&&other.student_id===p.student_id&&other.horse_id===p.horse_id&&other.source===p.source&&other.status==='assigned')other.status='archived';
  v.approved_at=new Date().toISOString();p.current_version_id=v.id;p.draft_version_id=null;p.status='assigned';p.title=v.title;
}
export function sampleRecord(data: FitnessData, role:SampleRole, versionId:string, key:string, date:string, status:'complete'|'skipped', minutes:number, notes:string) {
  if(role!=='rider')throw new Error('Only the rider or horse owner can record progress.');
  const v=data.versions.find(v=>v.id===versionId), p=data.programmes.find(p=>p.current_version_id===v?.id&&p.status==='assigned');
  const session=v?.sessions.find(s=>s.key===key);
  if(!v||!p||!session||session.category==='rest'||!Number.isInteger(minutes)||minutes<0||minutes>240)throw new Error('Session unavailable.');
  let progress=data.progress.find(r=>r.version_id===versionId&&r.session_key===key&&r.session_date===date);
  if(progress?.status==='complete'&&status!=='complete')throw new Error('Completed work is retained in history.');
  if(progress) Object.assign(progress,{status,minutes,notes});
  else { progress={id:crypto.randomUUID(),version_id:versionId,session_key:key,session_date:date,status,minutes,notes};data.progress.push(progress); }
  return progress;
}
