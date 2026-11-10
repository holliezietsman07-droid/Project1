import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFitness, type FitnessController } from '@/hooks/use-fitness';
import { errorText } from '@/lib/academy';
import { programmeMatchesSubject, validateSessions, type SessionPlan } from '@/lib/fitness/model';
import { Field, PlanEditor, SessionEditor, selectClass } from './ProgrammeEditor';
import { Materials, MemberProgrammes } from './WeeklyProgramme';
import { ProgrammeRequestCard } from './ProgrammeRequestCard';
import { ProgrammeRequestReview } from './ProgrammeRequestReview';
function Templates({c}:{c:FitnessController}){
 const [kind,setKind]=useState<'rider'|'horse'>('rider'),[title,setTitle]=useState(''),[age,setAge]=useState('adult'),[sessions,setSessions]=useState<SessionPlan[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 return <div className='grid gap-6 xl:grid-cols-2'><aside className='space-y-4'>{c.data.templates.map(t=><article key={t.id} className='paper-card space-y-4 p-5'><p className='eyebrow text-[#826e45]'>{t.age_group} · {t.kind}</p><h3 className='font-serif text-2xl'>{t.title}</h3><Button variant='outline' onClick={()=>{setKind(t.kind);setAge(t.age_group);setTitle(t.title+' · revised copy');setSessions(structuredClone(t.sessions));}}>Customise template copy</Button><Materials c={c} templateId={t.id} editable/></article>)}</aside><form className='paper-card grid h-fit gap-5 p-5' onSubmit={async e=>{e.preventDefault();setBusy(true);try{validateSessions(sessions);await c.saveTemplate(kind,title,kind==='horse'?'horse':age,sessions);setTitle('');setSessions([]);setMessage('Reusable template saved.');}catch(e){setMessage(errorText(e));}finally{setBusy(false);}}}><h3 className='font-serif text-2xl'>Create reusable template</h3><Field label='Template title'><Input required maxLength={160} value={title} onChange={e=>setTitle(e.target.value)}/></Field><Field label='Programme type'><select className={selectClass} value={kind} onChange={e=>{setKind(e.target.value as 'rider'|'horse');setSessions([]);}}><option value='rider'>Rider fitness & mobility</option><option value='horse'>Horse fitness & conditioning</option></select></Field>{kind==='rider'&&<Field label='Age group'><select className={selectClass} value={age} onChange={e=>setAge(e.target.value)}><option value='adult'>Adult rider</option><option value='young'>Younger rider · supervised</option></select></Field>}<SessionEditor sessions={sessions} onChange={setSessions}/><Button disabled={busy||!c.writable||!sessions.length}>Save reusable template</Button>{message&&<p role='status'>{message}</p>}</form></div>;
}
export function ProgrammeManagement({c,studentId,requestId,onRequestChange}:{
  c:FitnessController; studentId?:string; requestId?:string; onRequestChange?:(id?:string)=>void;
}){
  const [tab,setTab]=useState(studentId?'assign':'review');
  const [target,setTarget]=useState('');
  const [reviewing,setReviewing]=useState('');
  const [creating,setCreating]=useState(false);
  if(!c.isFounder)return <p role='alert' className='paper-card p-6'>Programme Management requires Founder access.</p>;
  if(requestId&&c.requestsEnabled){
    const request=c.requests.find(item=>item.id===requestId);
    if(c.requestsLoading)return <p role='status'>Opening programme request…</p>;
    if(c.requestsError)return <p role='alert' className='paper-card p-5'>Programme requests could not be loaded. Try refreshing the page.</p>;
    if(!request)return <p role='alert' className='paper-card p-5'>This programme request is unavailable.</p>;
    return <ProgrammeRequestReview key={request.id} request={request} c={c} onBack={()=>onRequestChange?.()}/>;
  }
  const subjects=studentId?c.data.subjects.filter(item=>item.student_id===studentId):c.data.subjects;
  const subject=subjects.find(item=>item.id===target)??subjects[0];
  const drafts=c.data.programmes.flatMap(programme=>{
    if(programme.source!=='hka'||programme.status==='archived'||!programme.draft_version_id)return [];
    const version=c.data.versions.find(item=>item.id===programme.draft_version_id&&!item.approved_at);
    const owner=subjects.find(item=>!item.archivedHorseId&&programmeMatchesSubject(programme,item));
    return version&&owner ? [{programme,version,owner}] : [];
  }).sort((a,b)=>b.version.created_at.localeCompare(a.version.created_at));

  return <Tabs value={tab} onValueChange={setTab}>
    <TabsList className='mb-4 h-auto flex-wrap gap-1'>
      <TabsTrigger value='review' className='min-h-11'>Needs review</TabsTrigger>
      <TabsTrigger value='assign' className='min-h-11'>Intakes &amp; assignments</TabsTrigger>
      <TabsTrigger value='templates' className='min-h-11'>Reusable templates</TabsTrigger>
      {c.requestsEnabled&&onRequestChange&&<TabsTrigger value='requests' className='min-h-11'>{c.sample?'Sample chat':'Programme requests'}</TabsTrigger>}
    </TabsList>
    <TabsContent value='review'>
      <section aria-label='Programmes needing review' className='paper-card space-y-4 p-5 sm:p-6'>
        <div className='flex flex-wrap items-baseline justify-between gap-2'>
          <h2 className='font-serif text-2xl'>Ready for your review</h2>
          <p className='text-sm text-muted-foreground'>{drafts.length} {drafts.length===1?'draft':'drafts'}</p>
        </div>
        {drafts.length ? <ul className='divide-y divide-primary/10'>
          {drafts.map(({programme,version,owner})=><li key={programme.id} className='flex flex-wrap items-center justify-between gap-3 py-4'>
            <div className='min-w-0'>
              <p className='eyebrow text-[#826e45]'>{owner.kind==='horse'?'Horse conditioning':'Rider fitness'}</p>
              <h3 className='mt-1 break-words font-serif text-xl'>{version.title}</h3>
              <p className='break-words text-sm text-muted-foreground'>{owner.name} · Version {version.version_number}</p>
            </div>
            <Button type='button' variant='outline' className='min-h-11' aria-label={'Review draft: '+version.title} onClick={()=>{
              setTarget(owner.id);
              setReviewing(programme.id);
              setCreating(false);
              setTab('assign');
            }}>Review draft</Button>
          </li>)}
        </ul> : <p className='text-sm text-muted-foreground'>No programmes need review.</p>}
      </section>
    </TabsContent>
    <TabsContent value='assign'>
      <div className='space-y-5'>
        <Field label='Select rider or horse'><select className={selectClass} value={subject?.id??''} onChange={event=>{
          setTarget(event.target.value);
          setReviewing('');
          setCreating(false);
        }}>
          {subjects.map(item=><option key={item.id} value={item.id}>{item.archivedHorseId?'archived horse':item.kind} · {item.name}</option>)}
        </select></Field>
        {subject&&<>
          <div className='paper-card flex flex-wrap items-center justify-between gap-4 p-5'>
            <div><h2 className='font-serif text-2xl'>{subject.name}</h2><p className='mt-2 text-sm text-muted-foreground'>{subject.intake.condition||'Intake awaiting member update'} · {subject.intake.disciplines.join(', ')}</p></div>
            {!subject.archivedHorseId&&<Button type='button' disabled={!c.writable} onClick={()=>setCreating(true)}><Plus className='mr-2 size-4'/>Create HKA draft</Button>}
          </div>
          {creating&&!subject.archivedHorseId
            ? <PlanEditor key={subject.id} subject={subject} c={c} close={()=>setCreating(false)}/>
            : <MemberProgrammes key={subject.id+':'+reviewing} subject={subject} c={c} management initialProgrammeId={reviewing}/>}
        </>}
      </div>
    </TabsContent>
    <TabsContent value='templates'><Templates c={c}/></TabsContent>
    {c.requestsEnabled&&onRequestChange&&<TabsContent value='requests'>
      <section className='paper-card space-y-4 p-5 sm:p-6'>
        <h2 className='font-serif text-2xl'>{c.sample?'Sample Founder chat':'Programme requests'}</h2>
        {c.requestsLoading ? <p role='status'>Opening programme requests…</p>
          : c.requestsError ? <p role='alert'>Programme requests could not be loaded.</p>
          : c.requests.length ? <div className='grid gap-3 lg:grid-cols-2'>
            {c.requests.map(request=><ProgrammeRequestCard key={request.id} request={request} viewerId={request.founder_id}
              requesterName={subjects.find(item=>item.id===request.student_id)?.name} onOpen={()=>onRequestChange(request.id)}/>)}
          </div> : <p className='text-sm text-muted-foreground'>Programme requests appear here when members send them.</p>}
      </section>
    </TabsContent>}
  </Tabs>;
}

export function StudentFitnessProgrammes({studentId}:{studentId:string}){
  const c=useFitness(false);
  if(c.loading)return <p role='status'>Opening this student’s fitness programmes…</p>;
  if(c.error)return <p role='alert' className='paper-card p-5'>{errorText(c.error)}</p>;
  if(!c.writable)return <div className='paper-card space-y-3 p-5'>
    <p>Fitness programmes open when fitness is activated.</p>
    {import.meta.env.VITE_HKA_PUBLIC_SITE!=='true'&&<Link to='/dashboard/fitness-preview?view=manage' className='text-link'>View sample programmes</Link>}
  </div>;
  return <div className='space-y-4'>
    {c.isFounder&&<p className='text-sm leading-6 text-muted-foreground'>Choose the rider or one of their horses. Save a draft, then attach the personalised file under Private programme materials.</p>}
    <ProgrammeManagement c={c} studentId={studentId}/>
  </div>;
}
