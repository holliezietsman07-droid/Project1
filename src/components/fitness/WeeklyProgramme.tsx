import { showSuccess } from '@/utils/toast';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Check, FileText, Play, Plus, ShieldCheck } from 'lucide-react';
import quoteGraphic from '@/assets/HKA-Rider-Fitness-Quote.png';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress as ProgressBar } from '@/components/ui/progress';
import { errorText } from '@/lib/academy';
import type { FitnessController } from '@/hooks/use-fitness';
import { days, demonstrationLink, holdReason, programmeDate, programmeMatchesSubject, sessionDate, weekStart, type Programme, type SessionPlan, type Subject, type Version } from '@/lib/fitness/model';
import { Field, IntakePanel, PlanEditor, selectClass } from './ProgrammeEditor';
import { FitnessProfileWizard } from './FitnessProfileWizard';
export function Materials({c,versionId,templateId,editable=false}:{c:FitnessController;versionId?:string;templateId?:string;editable?:boolean}){
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const files=c.data.files.filter(f=>versionId?f.version_id===versionId:f.template_id===templateId);
 async function upload(e:React.ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];e.target.value='';if(!file)return;setBusy(true);setMessage('');try{await c.upload(file,versionId??null,templateId??null);setMessage(showSuccess(c.sample?'Sample attachment held in memory for this preview session.':'Private attachment saved.'));}catch(e){setMessage(errorText(e));}finally{setBusy(false);}}
 async function open(file:typeof files[number]){const tab=window.open('','_blank');if(tab)tab.opener=null;try{if(!tab)throw new Error('Allow a new tab to open your attachment.');const url=await c.fileUrl(file);tab.location.replace(url);if(c.sample)window.setTimeout(()=>URL.revokeObjectURL(url),60000);}catch(e){tab?.close();setMessage(errorText(e));}}
 return <div className='space-y-3 border-t border-primary/10 pt-4'><p className='flex items-center gap-2 text-sm font-medium'><ShieldCheck className='size-4 text-[#826e45]'/>Private programme materials</p>{files.map(f=><Button key={f.id} type='button' variant='outline' className='h-auto min-h-11 max-w-full whitespace-normal break-all text-left' onClick={()=>void open(f)}><FileText className='mr-2 size-4 shrink-0'/>{f.original_name}</Button>)}{!files.length&&<p className='text-xs text-muted-foreground'>No original or supporting materials attached.</p>}{editable&&<Field label='Attach original programme or ChatGPT material · PDF, PNG, JPEG · 10 MB maximum'><Input type='file' accept='.pdf,.png,.jpg,.jpeg' disabled={busy||!c.writable} onChange={upload}/></Field>}{message&&<p role='status' className='text-sm'>{message}</p>}</div>;
}
function SessionCard({c,p,v,s,date,editable}:{c:FitnessController;p:Programme;v:Version;s:SessionPlan;date:string;editable:boolean}){
 const progress=c.data.progress.find(r=>r.version_id===v.id&&r.session_key===s.key&&r.session_date===date);
 const [notes,setNotes]=useState(progress?.notes??''),[minutes,setMinutes]=useState(progress?.minutes??s.minutes),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),lock=useRef(false);
 const future=date>programmeDate(c.profile?.timezone||'Africa/Johannesburg');
 async function save(status:'complete'|'skipped'){if(lock.current)return;lock.current=true;setBusy(true);setMessage('');try{await c.record(v.id,s.key,date,status,minutes,notes);setMessage(showSuccess(c.sample?'Sample progress updated; no database write.':'Progress saved.'));}catch(e){setMessage(errorText(e));}finally{lock.current=false;setBusy(false);}}
 const [logging,setLogging]=useState(false);
 const rest=s.category==='rest';
 const video=demonstrationLink(s.demonstrationUrl);
 const steps=s.instructions.split('\n').map(step=>step.trim()).filter(Boolean);
 const canLog=editable&&c.writable&&!future&&!rest;
 return <article className='space-y-3 rounded-xl border border-primary/15 bg-background p-4 sm:p-5'>
  <div className='flex flex-wrap items-center justify-between gap-2'>
   <p className='eyebrow text-[#826e45]'>{days[s.day]} · {date.slice(5)}</p>
   <span className='rounded-full bg-primary/5 px-3 py-1 text-xs capitalize'>{progress?.status??(rest?'Rest day':s.category)}</span>
  </div>
  <h4 className='font-serif text-2xl'>{s.title}</h4>
  {!rest&&<p className='text-sm text-muted-foreground'>{s.minutes} minutes planned</p>}
  {steps.length>1 ? <div>
   <p className='mb-2 text-sm font-semibold'>Workout flow</p>
   <ol className='list-decimal space-y-2 pl-5 text-sm leading-6'>{steps.map((step,index)=><li key={index}>{step}</li>)}</ol>
  </div> : <p className='text-sm leading-6 text-muted-foreground'>{s.instructions}</p>}
  {!rest&&video&&<Button asChild variant='outline' className='min-h-11 gap-2'>
   <a href={video} target='_blank' rel='noopener noreferrer'><Play className='size-4' aria-hidden='true'/>Watch demonstration <span className='sr-only'>(opens in a new tab)</span></a>
  </Button>}
  {progress&&!logging&&<div className='space-y-1 text-sm text-muted-foreground'>
   <p>{progress.minutes} minutes logged</p>{progress.notes&&<p className='whitespace-pre-wrap break-words'>{progress.notes}</p>}
  </div>}
  {canLog&&<Button type='button' variant='outline' className='min-h-11' aria-expanded={logging} onClick={()=>setLogging(value=>!value)}>
   {logging?'Hide log':progress?'Edit session log':'Log session'}
  </Button>}
  {canLog&&logging&&<div className='grid gap-3'>
   <Field label={p.kind==='horse'?'Work duration · minutes':'Actual minutes'}><Input type='number' min={0} max={240} value={minutes} disabled={busy} onChange={e=>setMinutes(Number(e.target.value))}/></Field>
   <Field label={p.kind==='horse'?'Recovery & work notes':'Session notes'}><Textarea value={notes} maxLength={5000} disabled={busy} onChange={e=>setNotes(e.target.value)} placeholder={p.kind==='horse'?'How did your horse respond and recover?':'How did the session feel?'}/></Field>
   <div className='flex flex-wrap gap-2'>
    <Button type='button' className='min-h-11' disabled={busy} onClick={()=>void save('complete')}><Check className='mr-1 size-4'/>{progress?.status==='complete'?'Save notes':'Complete'}</Button>
    {progress?.status!=='complete'&&<Button type='button' variant='outline' className='min-h-11' disabled={busy} onClick={()=>void save('skipped')}>Skip session</Button>}
   </div>
  </div>}
  {future&&editable&&!rest&&<p className='text-xs text-muted-foreground'>Log this session on its scheduled day or later.</p>}
  {message&&<p role='status' className='text-sm'>{message}</p>}
 </article>;
}
export function WeeklyPlan({c,subject,p,requestId,historyOnly=false}:{c:FitnessController;subject:Subject;p:Programme;requestId?:string;historyOnly?:boolean}){
 const [selected,setSelected]=useState((c.isFounder&&p.draft_version_id)||p.current_version_id||''),[week,setWeek]=useState(()=>weekStart(c.profile?.timezone||'Africa/Johannesburg')),[editing,setEditing]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{setSelected((c.isFounder&&p.draft_version_id)||p.current_version_id||'');},[c.isFounder,p.current_version_id,p.draft_version_id]);
 const versions=c.data.versions.filter(v=>v.programme_id===p.id).sort((a,b)=>b.version_number-a.version_number);
 const v=versions.find(v=>v.id===selected)??versions.find(v=>v.id===p.current_version_id)??versions[0];
 if(!v)return null;
 const editable=c.canRecord(subject)&&p.status==='assigned'&&p.current_version_id===v.id;
 const done=c.data.progress.filter(r=>r.version_id===v.id&&r.status==='complete'&&r.session_date>=week&&r.session_date<=sessionDate(week,6)).length;
 const work=v.sessions.filter(s=>s.category!=='rest').length;
 const logged=c.data.progress.filter(row=>row.version_id===v.id).sort((a,b)=>b.session_date.localeCompare(a.session_date));
 const canEdit=!subject.archivedHorseId&&(c.isFounder&&p.source==='hka'||c.canRecord(subject)&&p.source!=='hka');
 if(editing&&canEdit)return <PlanEditor subject={subject} c={c} programme={p} version={v} close={()=>setEditing(false)}/>;
 async function approve(){
  if(busy)return;
  setBusy(true);setMessage('');
  try{
   if(requestId){
    await c.sendRequestedProgramme(requestId,v.id);
    setMessage(showSuccess(c.sample?'Programme assigned and sent in the sample chat.':'Programme assigned and sent in chat.'));
   }else{
    await c.assign(p.id);
    setMessage(showSuccess(c.sample?'Sample HKA programme assigned.':'HKA programme approved and assigned.'));
   }
   setSelected('');
  }catch(e){setMessage(errorText(e));}finally{setBusy(false);}
 }
 return <section className='space-y-5'><div className='paper-card p-5 sm:p-6'><div className='flex flex-col justify-between gap-4 sm:flex-row'><div><p className='eyebrow text-[#826e45]'>{p.source==='hka'?'HKA programme':p.source==='vet'?'Your vet’s instructions':'Your own programme'} · {p.status}</p><h3 className='mt-2 font-serif text-3xl'>{v.title}</h3><p className='mt-3 text-sm text-muted-foreground'>{v.intake.goals}</p></div><div className='flex flex-wrap items-start gap-2'>{canEdit&&<Button type='button' variant='outline' onClick={()=>setEditing(true)}>Revise programme</Button>}{!subject.archivedHorseId&&c.isFounder&&p.draft_version_id&&<Button type='button' disabled={busy||!c.writable||Boolean(requestId&&v.id!==p.draft_version_id)} onClick={()=>void approve()}>{requestId?'Approve & send in chat':'Approve & assign draft'}</Button>}</div></div><div className='mt-5 grid gap-4 sm:grid-cols-2'><Field label='Version & history'><select className={selectClass} value={v.id} onChange={e=>setSelected(e.target.value)}>{versions.map(version=><option key={version.id} value={version.id}>Version {version.version_number} · {version.approved_at?'approved':'draft'}{version.id===p.current_version_id?' · current':''}</option>)}</select></Field>{!historyOnly&&<div className='self-end'><p className='mb-2 text-xs text-muted-foreground'>{done} of {work} sessions complete this week</p><ProgressBar value={work?Math.min(100,done/work*100):0}/></div>}</div>{v.intake.professionalInstructions&&<div className='mt-4 rounded-lg border border-[#B79B62]/35 p-4 text-sm leading-6'><strong>Professional instructions</strong><p className='whitespace-pre-line'>{v.intake.professionalInstructions}</p></div>}{holdReason(subject.kind,v.intake)&&<p role='status' className='mt-4 text-sm text-amber-800'>{holdReason(subject.kind,v.intake)}</p>}<div className='mt-5'><Materials c={c} versionId={v.id} editable={canEdit&&(p.source!=='hka'||!v.approved_at)}/></div>{message&&<p role='status' className='mt-4 text-sm'>{message}</p>}</div>
  {historyOnly ? <section aria-label='Session history' className='space-y-3'>
   <h3 className='font-serif text-2xl'>Session history</h3>
   {!logged.length&&<p className='text-sm text-muted-foreground'>Completed and skipped sessions will appear here as you log them.</p>}
   {logged.map(row=>{
    const session=v.sessions.find(item=>item.key===row.session_key);
    return session&&<details key={row.id} className='paper-card p-3'>
     <summary className='min-h-11 cursor-pointer py-2 text-sm font-medium'>{session.title} · {describeDate(row.session_date)} · {row.status==='complete'?'Complete':'Skipped'}</summary>
     <SessionCard c={c} p={p} v={v} s={session} date={row.session_date} editable={editable}/>
    </details>;
   })}
    {subject.kind==='rider'&&<figure className='flex justify-center rounded-xl border border-[#B79B62]/35 bg-[#2F4A3C] px-4'>
      <img src={quoteGraphic} alt='HKA Equestrian. Train with purpose. Ride with confidence.' width={1600} height={900} className='h-24 w-auto object-contain sm:h-28'/>
    </figure>}
  </section> : <>
  <div className='flex flex-wrap items-center justify-between gap-3'><div><p className='eyebrow text-[#826e45]'>A little progress, every week</p><h3 className='mt-1 font-serif text-2xl'>Week of {new Date(week+'T12:00:00').toLocaleDateString(undefined,{day:'numeric',month:'long',year:'numeric'})}</h3></div><div className='flex items-center gap-1'><Button type='button' variant='outline' size='icon' aria-label='Previous week' onClick={()=>setWeek(sessionDate(week,-7))}>←</Button><Button type='button' variant='ghost' onClick={()=>setWeek(weekStart(c.profile?.timezone||'Africa/Johannesburg'))}>This week</Button><Button type='button' variant='outline' size='icon' aria-label='Next week' onClick={()=>setWeek(sessionDate(week,7))}>→</Button></div></div>
  {!editable&&<p className='text-xs text-muted-foreground'>{v.approved_at?'Read-only history or authorised overview.':'Draft · visible to Founder only.'}</p>}
  <div className='grid gap-4 md:grid-cols-2'>{[...v.sessions].sort((a,b)=>a.day-b.day).map(s=><SessionCard key={v.id+s.key+week} c={c} p={p} v={v} s={s} date={sessionDate(week,s.day)} editable={editable}/>)}</div>
  </>}
 </section>;
}
function describeDate(date:string){
 return new Date(date+'T12:00:00Z').toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'short',timeZone:'UTC'});
}

function TodayCard({title,children}:{title:string;children:ReactNode}){
 return <section aria-label='Today' className='min-w-0 space-y-3 rounded-2xl border border-[#B79B62]/40 bg-[#2F4A3C] p-5 text-[#F6F1E7] sm:p-6'>
  <p className='eyebrow text-[#DFCEA3]'>Today</p>
  <h2 className='break-words font-serif text-3xl sm:text-4xl'>{title}</h2>
  {children}
 </section>;
}

function TrainingDashboard({c,subject,p,v,actions}:{c:FitnessController;subject:Subject;p:Programme;v:Version;actions:ReactNode}){
  const [openDay,setOpenDay]=useState<{day:number;date:string}|null>(null);
  const opener=useRef<HTMLButtonElement|null>(null);
  const timezone=c.profile?.timezone||'Africa/Johannesburg';
  const now=new Date();
  const today=programmeDate(timezone,now);
  const currentWeek=weekStart(timezone,now);
  const [browsingWeek,setBrowsingWeek]=useState<string|null>(null);
  const week=browsingWeek??currentWeek;
  const entries=[...v.sessions].sort((a,b)=>a.day-b.day).map(session=>{
    const date=sessionDate(week,session.day);
    const progress=c.data.progress.find(row=>row.version_id===v.id && row.session_key===session.key && row.session_date===date);
    return {session,date,progress};
  });
  const work=entries.filter(entry=>entry.session.category!=='rest');
  const currentWork=week===currentWeek ? work : work.map(entry=>({...entry,date:sessionDate(currentWeek,entry.session.day),progress:c.data.progress.find(row=>row.version_id===v.id&&row.session_key===entry.session.key&&row.session_date===sessionDate(currentWeek,entry.session.day))}));
  const todaysWork=currentWork.filter(entry=>entry.date===today);
  const todaySession=todaysWork.find(entry=>!entry.progress)??todaysWork[0];
  const firstSession=currentWork[0];
  const nextSession=currentWork.find(entry=>entry.date>today)??(firstSession && {
    ...firstSession,
    date:sessionDate(currentWeek,7+firstSession.session.day)
  });
  const complete=work.filter(entry=>entry.progress?.status==='complete').length;
  const focusSession=todaySession??nextSession;
  const hold=holdReason(subject.kind,v.intake);
  const editable=c.canRecord(subject);
  const daySessions=openDay?v.sessions.filter(session=>session.day===openDay.day):[];
  const hasFiles=c.data.files.some(file=>file.version_id===v.id);
  function viewDay(button:HTMLButtonElement,day:number,date:string){
    opener.current=button;
    setOpenDay({day,date});
  }

  return <div className='space-y-4'>
    <div className='grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]'>
    <TodayCard title={todaySession?.session.title??(work.length?'Rest day':'No sessions planned')}>
      <p className='break-words text-sm text-[#F6F1E7]/90'>{v.title}</p>
      {todaySession && <p className='text-sm text-[#F6F1E7]/90'>
        {todaySession.session.minutes} min
        {todaySession.progress && ' · '+(todaySession.progress.status==='complete'?'Complete':'Skipped')}
      </p>}
      {!todaySession && nextSession && <p className='break-words text-sm text-[#F6F1E7]/90'>
        Next session on {describeDate(nextSession.date)} · {nextSession.session.title} · {nextSession.session.minutes} min
      </p>}
      {focusSession && <Button type='button' variant='secondary' className='min-h-11 rounded-lg px-4 focus-visible:ring-[#DFCEA3]' onClick={event=>viewDay(event.currentTarget,focusSession.session.day,focusSession.date)}>
        {todaySession?'View session':'View next session'} <ArrowRight className='ml-2 size-4' aria-hidden='true'/>
      </Button>}
    </TodayCard>

    <section aria-label='This week' className='paper-card space-y-4 p-4 sm:p-5'>
      <div className='flex flex-wrap items-baseline justify-between gap-2'>
        <h2 className='font-serif text-2xl'>{week===currentWeek?'This week':'Week of '+describeDate(week)}</h2>
        <p className='text-sm text-muted-foreground'>{complete} of {work.length} sessions complete</p>
      </div>
      <div className='flex items-center justify-between gap-1'>
        <Button type='button' size='icon' variant='outline' className='min-h-11 min-w-11' aria-label='Previous week' onClick={()=>setBrowsingWeek(sessionDate(week,-7))}>←</Button>
        <Button type='button' variant='ghost' className='min-h-11' onClick={()=>setBrowsingWeek(null)}>Current week</Button>
        <Button type='button' size='icon' variant='outline' className='min-h-11 min-w-11' aria-label='Next week' onClick={()=>setBrowsingWeek(sessionDate(week,7))}>→</Button>
      </div>
      <ProgressBar aria-label='Sessions complete for the selected week' value={work.length ? complete/work.length*100 : 0} className='h-1.5 [&>div]:bg-[#B79B62]'/>
      <ol className='grid grid-cols-7 gap-1 sm:gap-2'>
        {days.map((day,index)=>{
          const date=sessionDate(week,index);
          const dayWork=work.filter(entry=>entry.session.day===index);
          const dayComplete=dayWork.length>0 && dayWork.every(entry=>entry.progress?.status==='complete');
          const dayLogged=dayWork.length>0 && dayWork.every(entry=>entry.progress);
          const status=dayComplete?'Done':dayLogged?'Logged':dayWork.length?'Plan':'Rest';
          const label=day+': '+(dayWork.length ? dayWork.length+' scheduled, '+dayWork.filter(entry=>entry.progress?.status==='complete').length+' complete' : 'Rest day');
          const classes='flex min-h-12 w-full min-w-0 flex-col items-center justify-center gap-1 rounded-md border px-0.5 py-2 text-xs '+(date===today?'border-primary bg-primary/10':'border-primary/10 bg-primary/5');
          const summary=<><span className='font-semibold'>{day.slice(0,3)}</span><span className='flex min-h-4 items-center text-[10px] text-muted-foreground'>{dayComplete ? <Check className='size-4 text-primary' aria-hidden='true'/> : status}</span></>;
          return <li key={day} className='min-w-0'>
            <button type='button' aria-label={label} aria-current={date===today?'date':undefined} className={classes+' hover:border-primary/50'} onClick={event=>viewDay(event.currentTarget,index,date)}>{summary}</button>
          </li>;
        })}
      </ol>
    </section>
    </div>
    {actions}
    {hasFiles&&<details className='paper-card p-4'>
      <summary className='min-h-11 cursor-pointer py-2 text-sm font-medium'>Programme downloads</summary>
      <Materials c={c} versionId={v.id}/>
    </details>}
    {hold && <p role='status' className='rounded-lg border border-amber-600/30 bg-amber-50 p-4 text-sm text-amber-900'>{hold}</p>}
    <Dialog open={Boolean(openDay)} onOpenChange={open=>{if(!open)setOpenDay(null);}}>
      {openDay && <DialogContent className='max-h-[90dvh] max-w-2xl overflow-y-auto p-4 sm:p-6' onCloseAutoFocus={event=>{
        event.preventDefault();
        opener.current?.focus();
      }}>
        <DialogHeader>
          <DialogTitle className='pr-7 font-serif text-2xl'>{describeDate(openDay.date)}</DialogTitle>
          <DialogDescription>{v.title}</DialogDescription>
        </DialogHeader>
        {v.intake.professionalInstructions && <p className='whitespace-pre-line rounded-lg border border-[#B79B62]/35 p-4 text-sm'><strong>Professional instructions</strong><br/>{v.intake.professionalInstructions}</p>}
        {(!daySessions.length||daySessions.every(session=>session.category==='rest'))&&<p className='rounded-lg border border-primary/15 p-3 text-sm'>Rest day · {daySessions.map(session=>session.instructions).join(' ')||'No training is scheduled.'}</p>}
        {daySessions.filter(session=>session.category!=='rest').map(session=><SessionCard key={v.id+session.key+openDay.date} c={c} p={p} v={v} s={session} date={openDay.date} editable={editable}/>)}
      </DialogContent>}
    </Dialog>
  </div>;
}

export type FitnessPanel = 'today' | 'profile' | 'progress';

export function MemberProgrammes({subject,c,panel='today',onPanelChange,management=false,initialProgrammeId='',sampleProfileLink}:{
  subject:Subject; c:FitnessController; panel?:FitnessPanel; onPanelChange?:(panel:FitnessPanel)=>void;
  management?:boolean; initialProgrammeId?:string; sampleProfileLink?:ReactNode;
}){
  const [creating,setCreating]=useState(false);
  const [selected,setSelected]=useState(initialProgrammeId);
  const [notice,setNotice]=useState('');
  const programmes=c.data.programmes.filter(programme=>programmeMatchesSubject(programme,subject));
  const history=management || panel==='progress' || Boolean(subject.archivedHorseId);
  const choices=history ? programmes : programmes.filter(programme=>programme.status==='assigned');
  const active=choices.find(programme=>programme.id===selected)
    ?? choices.find(programme=>programme.source==='hka'&&programme.status==='assigned')
    ?? choices.find(programme=>programme.status==='assigned'||management&&programme.status==='draft')
    ?? choices[0];
  const currentVersion=c.data.versions.find(version=>version.id===active?.current_version_id && version.approved_at);
  const editable=c.canRecord(subject);

  const awaitingRequest=editable&&c.requests?.some(request=>request.student_id===subject.student_id &&
    request.horse_id===(subject.kind==='horse'?subject.id:null) && !request.reply_message_id &&
    !c.data.programmes.some(programme=>programme.id===request.programme_id && programme.current_version_id));
  if(creating && editable) return <PlanEditor subject={subject} c={c} close={()=>setCreating(false)}/>;

  const picker=(choices.length>1 || management && choices.length>0) && <Field label='Programme'>
    <select className={selectClass} value={active?.id??''} onChange={e=>setSelected(e.target.value)}>
      {choices.map(programme=><option key={programme.id} value={programme.id}>{programme.title} · {programme.source} · {programme.status}</option>)}
    </select>
  </Field>;

  if(history) return <div className='space-y-5'>
    {subject.archivedHorseId && <p className='paper-card p-5' role='status'>Archived programme history for {subject.name}.</p>}
    {management && !subject.archivedHorseId && <IntakePanel subject={subject} c={c}/>}
    {picker}
    {active ? <WeeklyPlan key={active.id} c={c} subject={subject} p={active} historyOnly={!management}/>
      : <p role='status' className='paper-card p-5'>Programme history will appear here once a plan is available.</p>}
  </div>;

  const requestLabel=editable&&c.requestsEnabled ? 'Request a programme' : editable ? 'Fitness profile' : 'View fitness profile';
  const actions=(currentVersion || programmes.length>0) && <nav aria-label='Fitness tools' className='flex flex-wrap gap-2'>
      {currentVersion && <Button type='button' variant={editable&&c.requestsEnabled?'default':'outline'} className='min-h-11 rounded-lg' onClick={()=>onPanelChange?.('profile')}>{requestLabel}</Button>}
      <Button type='button' variant='outline' className='min-h-11 rounded-lg' onClick={()=>onPanelChange?.('progress')}>History</Button>
    </nav>;
  return <div className='space-y-4'>
    {panel==='profile'&&<FitnessProfileWizard c={c} subject={subject} sampleLink={sampleProfileLink} onClose={message=>{
      if(message)setNotice(message);
      onPanelChange?.('today');
    }}/>}
    {notice&&<p role='status' className='rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm'>{notice}</p>}
    {picker}
    {active && currentVersion
      ? <TrainingDashboard key={currentVersion.id} c={c} subject={subject} p={active} v={currentVersion} actions={actions}/>
      : <TodayCard title={awaitingRequest?'Programme request sent':subject.profileSaved?'Fitness profile ready':'Build your fitness profile'}>
        <p className='text-sm leading-6 text-[#F6F1E7]/90'>
          {awaitingRequest ? 'Hollie has your details. Your programme will appear here after she assigns it.'
            : subject.profileSaved && editable && !c.sample && !c.requestsEnabled ? 'Use Message Hollie to ask about a programme.'
            : 'An assigned programme will appear here when it’s ready.'}
        </p>
        <Button type='button' variant='secondary' className='min-h-11 rounded-lg focus-visible:ring-[#DFCEA3]' onClick={()=>onPanelChange?.('profile')}>
          {requestLabel}
        </Button>
      </TodayCard>}
    {!currentVersion&&actions}
    {subject.kind==='horse' && <div className='space-y-3 rounded-lg border border-[#B79B62]/35 bg-[#F6F1E7] p-4'>
      <p className='max-w-xl text-sm leading-6'>When workload changes, review feeding with your usual adviser.</p>
      {editable && <Button type='button' variant='outline' disabled={!c.writable} onClick={()=>setCreating(true)}><Plus className='mr-2 size-4'/>My own / vet programme</Button>}
    </div>}
  </div>;
}
