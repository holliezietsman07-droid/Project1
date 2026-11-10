import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/contexts/SessionContext';
import { useRows } from '@/hooks/use-academy';
import { db, rpc, type Row } from '@/lib/academy';
import { riderPreferences } from '@/lib/dashboard-workspace';
import { ageFromBirth, emptyIntake, type FitnessData, type FitnessKind, type Intake, type Material, type ProgrammeSource, type SessionPlan, type Subject } from '@/lib/fitness/model';
import { createSampleData, sampleAssign, sampleRecord, sampleSave, sampleVisible, type SampleRole } from '@/lib/fitness/sample';

// Founder enables this only after separately approving and applying the prepared schema.
// Default preview cannot write fitness data, files, or ride logs to the connected live project.
export const fitnessDatabaseEnabled = import.meta.env.VITE_FITNESS_DATABASE_ENABLED === 'true';
export function useFitness(sample: boolean, initialSampleRole: SampleRole = 'rider') {
  const { profile } = useSession();
  const cache = useQueryClient();
  const [sampleRole, setSampleRole] = useState<SampleRole>(initialSampleRole);
  const [revision, setRevision] = useState(0);
  const fixture = useRef(createSampleData());
  const sampleFiles = useRef(new Map<string, File>());
  const profiles=useRows('hka_profiles',{},!sample), horses=useRows('hka_horses',{},!sample);
  const roles=useRows('hka_account_roles',{},!sample), rides=useRows('hka_training_records',{},!sample);
  const healthRecords=useRows('hka_horse_records',{},!sample);
  const remote=useQuery({
    queryKey:['fitness',profile?.id,profile?.role],enabled:!sample&&fitnessDatabaseEnabled&&Boolean(profile),retry:0,
    queryFn:async()=>{
      const names=['hka_fitness_intakes','hka_fitness_programmes','hka_fitness_versions','hka_fitness_progress','hka_fitness_templates','hka_fitness_files'];
      const [result, founder] = await Promise.all([
        Promise.all(names.map(name=>db().from(name).select('*'))),
        profile?.role==='admin' ? db().rpc('hka_fitness_is_founder') : {data:false,error:null}
      ]);
      for(const row of result) if(row.error)throw row.error;
      if(founder.error)throw founder.error;
      return {intakes:result[0].data??[],programmes:result[1].data??[],versions:result[2].data??[],progress:result[3].data??[],templates:result[4].data??[],files:result[5].data??[],isFounder:founder.data===true};
    }
  });
  const subjects = useMemo<Subject[]>(()=>{
    const people=(profiles.data??[]).filter(p=>p.role==='student');
    const riders=people.map(p=>{
      const prefs=riderPreferences(roles.data??[],p.id);
      return {id:p.id,student_id:p.id,kind:'rider' as const,name:String(p.full_name),intake:{...emptyIntake(),age:ageFromBirth(String(p.birth_date??'')),disciplines:[String(prefs.primary_discipline??''),...String(prefs.additional_disciplines??'').split(',')].map(s=>s.trim()).filter(Boolean),condition:String(prefs.experience_level??''),goals:String(prefs.riding_goals??'')}};
    });
    const animals=(horses.data??[]).map(h=>{
      const recent=(rides.data??[]).filter(r=>r.horse_id===h.id).sort((a,b)=>String(b.recorded_on).localeCompare(String(a.recorded_on))).slice(0,5);
      const records=(healthRecords.data??[]).filter(r=>r.horse_id===h.id);
      const concern=[h.details,...records.filter(r=>r.record_type==='veterinary').map(r=>r.title+' '+r.notes)].join(' ');
      return {id:h.id,student_id:String(h.student_id),kind:'horse' as const,name:String(h.name),photoPath:typeof h.photo_path==='string'?h.photo_path:undefined,intake:{...emptyIntake(),age:h.birth_year?new Date().getFullYear()-Number(h.birth_year):null,disciplines:String(h.discipline??'').split(',').map(s=>s.trim()).filter(Boolean),goals:String(h.training_goals??''),recentWork:recent.map(r=>String(r.recorded_on)+' · '+String(r.notes)).join('\n'),health:/lameness|lame|injur|rehab/i.test(concern)?['Existing record needs review']:[]}};
    });
    const current=[...riders,...animals].map(subject=>{
      const saved=remote.data?.intakes.find(i=>i.student_id===subject.student_id&&(subject.kind==='rider'?i.horse_id===null:i.horse_id===subject.id));
      return saved?{...subject,profileSaved:true,intake:{...subject.intake,...saved.payload,health:[...new Set([...subject.intake.health,...saved.payload.health])]}}:subject;
    });
    const archived=new Map<string,Subject>();
    for(const programme of remote.data?.programmes??[]){
      if(programme.kind!=='horse'||!programme.archived_horse_id)continue;
      const id='archived-horse:'+programme.student_id+':'+programme.archived_horse_id;
      if(archived.has(id))continue;
      const version=remote.data?.versions.find(v=>v.id===(programme.current_version_id??programme.draft_version_id));
      archived.set(id,{
        id,student_id:programme.student_id,kind:'horse',archivedHorseId:programme.archived_horse_id,
        name:programme.archived_horse_name??'Archived horse',intake:version?.intake??emptyIntake()
      });
    }
    return [...current,...archived.values()];
  },[profiles.data,horses.data,roles.data,rides.data,healthRecords.data,remote.data]);
  const sampleData=sampleVisible(fixture.current,sampleRole);
  const data:FitnessData=sample?sampleData:{subjects,programmes:remote.data?.programmes??[],versions:remote.data?.versions??[],progress:remote.data?.progress??[],templates:remote.data?.templates??[],files:remote.data?.files??[]};
  const isFounder=sample?sampleRole==='founder':profile?.role==='admin'&&remote.data?.isFounder===true;
  const canRecord=(subject:Subject)=>!subject.archivedHorseId&&(sample?sampleRole==='rider':profile?.id===subject.student_id);
  const writable=sample||fitnessDatabaseEnabled;
  function requireSaving(){if(!sample&&!fitnessDatabaseEnabled)throw new Error('Database saving is pending Founder approval of the prepared database update.');}
  async function refresh(){if(sample)setRevision(v=>v+1);else await remote.refetch();}
  async function saveIntake(subject:Subject,payload:Intake){
    requireSaving();
    if(sample){if(!canRecord(subject))throw new Error('Only the member can update their intake.');const item=fixture.current.subjects.find(s=>s.id===subject.id)!;item.intake=structuredClone(payload);item.profileSaved=true;}
    else {const {error}=await db().rpc('hka_fitness_save_intake',{target_student:subject.student_id,target_horse:subject.kind==='horse'?subject.id:null,new_payload:payload});if(error)throw error;}
    await refresh();
  }
  async function saveProgramme(subject:Subject,source:ProgrammeSource,title:string,intake:Intake,sessions:SessionPlan[],existingId?:string){
    requireSaving();let id:string;
    if(subject.archivedHorseId)throw new Error('Removed horse programmes are read-only.');
    if(sample) id=sampleSave(fixture.current,sampleRole,subject.id,source,title,intake,sessions,existingId);
    else id=String(await rpc('hka_fitness_save_programme',{target_programme:existingId||null,target_student:subject.student_id,target_horse:subject.kind==='horse'?subject.id:null,new_kind:subject.kind,new_source:source,new_title:title,new_intake:intake,new_sessions:sessions}));
    await refresh();return id;
  }
  async function assign(programmeId:string){
    requireSaving();
    if(sample)sampleAssign(fixture.current,sampleRole,programmeId);
    else await rpc('hka_fitness_assign',{target_programme:programmeId,expected_draft:data.programmes.find(p=>p.id===programmeId)?.draft_version_id});
    await refresh();
  }
  async function record(versionId:string,key:string,date:string,status:'complete'|'skipped',minutes:number,notes:string){
    requireSaving();
    if(sample)sampleRecord(fixture.current,sampleRole,versionId,key,date,status,minutes,notes);
    else {
      await rpc('hka_fitness_record',{target_version:versionId,target_key:key,work_date:date,new_status:status,actual_minutes:minutes,recovery_notes:notes});
      await cache.invalidateQueries({queryKey:['academy',profile?.id,'hka_training_records']});
    }
    await refresh();
  }
  async function saveTemplate(kind:FitnessKind,title:string,ageGroup:string,sessions:SessionPlan[]){
    requireSaving();if(!isFounder)throw new Error('Founder access required.');
    if(sample)fixture.current.templates.push({id:crypto.randomUUID(),kind,title,age_group:ageGroup as 'adult'|'young'|'horse',sessions:structuredClone(sessions)});
    else {const {error}=await db().from('hka_fitness_templates').insert({kind,title,age_group:ageGroup,sessions});if(error)throw error;}
    await refresh();
  }
  async function upload(file:File,versionId:string|null,templateId:string|null){
    requireSaving();
    if(!['application/pdf','image/png','image/jpeg'].includes(file.type)||file.size<=0||file.size>10485760)throw new Error('Choose a PDF, PNG or JPEG up to 10 MB.');
    const id=crypto.randomUUID(),path='fitness/'+id;
    const metadata={id,version_id:versionId,template_id:templateId,original_name:file.name,path};
    if(sample){
      const version=fixture.current.versions.find(v=>v.id===versionId), programme=fixture.current.programmes.find(p=>p.id===version?.programme_id);
      if(!(isFounder&&(!version||!version.approved_at)||sampleRole==='rider'&&programme?.source!=='hka'&&version))throw new Error('Attach materials to a draft or your own horse programme.');
      sampleFiles.current.set(id,file);fixture.current.files.push(metadata);
    }else{
      const {error:prepareError}=await db().from('hka_fitness_files').insert({...metadata,uploaded_by:profile!.id,mime_type:file.type,size_bytes:file.size});if(prepareError)throw prepareError;
      const {error}=await db().storage.from('hka-private').upload(path,file,{contentType:file.type,upsert:false});
      if(error){const cleanup=await db().from('hka_fitness_files').delete().eq('id',id);if(cleanup.error)throw new Error(error.message+' File reservation cleanup needs review.');throw error;}
    }
    await refresh();
  }
  async function fileUrl(file:Material){
    if(sample){const blob=sampleFiles.current.get(file.id);if(!blob)throw new Error('Sample file is no longer available.');return URL.createObjectURL(blob);}
    const {data:link,error}=await db().storage.from('hka-private').createSignedUrl(file.path,60);if(error)throw error;return link.signedUrl;
  }
  return {data,isFounder,canRecord,writable,sample,sampleRole,setSampleRole,revision,saveIntake,saveProgramme,assign,record,saveTemplate,upload,fileUrl,
    loading:!sample&&(profiles.isLoading||horses.isLoading||roles.isLoading||rides.isLoading||healthRecords.isLoading||remote.isLoading&&fitnessDatabaseEnabled),
    error:sample?null:remote.error||profiles.error||horses.error||roles.error||rides.error||healthRecords.error,refresh,profile};
}
export type FitnessController = ReturnType<typeof useFitness>;
