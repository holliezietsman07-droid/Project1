import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Check, FileText, Plus, ShieldCheck } from 'lucide-react';
import quoteGraphic from '@/assets/HKA-Rider-Fitness-Quote.png';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress as ProgressBar } from '@/components/ui/progress';
import { errorText } from '@/lib/academy';
import type { FitnessController } from '@/hooks/use-fitness';
import { days, holdReason, programmeDate, programmeMatchesSubject, sessionDate, weekStart, type Programme, type SessionPlan, type Subject, type Version } from '@/lib/fitness/model';
import { Field, IntakePanel, PlanEditor, selectClass } from './ProgrammeEditor';
export function Materials({c,versionId,templateId,editable=false}:{c:FitnessController;versionId?:string;templateId?:string;editable?:boolean}){
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const files=c.data.files.filter(f=>versionId?f.version_id===versionId:f.template_id===templateId);
 async function upload(e:React.ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];e.target.value='';if(!file)return;setBusy(true);setMessage('');try{await c.upload(file,versionId??null,templateId??null);setMessage(c.sample?'Sample attachment held in memory for this preview session.':'Private attachment saved.');}catch(e){setMessage(errorText(e));}finally{setBusy(false);}}
 async function open(file:typeof files[number]){const tab=window.open('','_blank');if(tab)tab.opener=null;try{if(!tab)throw new Error('Allow a new tab to open your attachment.');const url=await c.fileUrl(file);tab.location.replace(url);if(c.sample)window.setTimeout(()=>URL.revokeObjectURL(url),60000);}catch(e){tab?.close();setMessage(errorText(e));}}
 return <div className='space-y-3 border-t border-primary/10 pt-4'><p className='flex items-center gap-2 text-sm font-medium'><ShieldCheck className='size-4 text-[#826e45]'/>Private programme materials</p>{files.map(f=><Button key={f.id} type='button' variant='outline' className='h-auto min-h-11 max-w-full whitespace-normal break-all text-left' onClick={()=>void open(f)}><FileText className='mr-2 size-4 shrink-0'/>{f.original_name}</Button>)}{!files.length&&<p className='text-xs text-muted-foreground'>No original or supporting materials attached.</p>}{editable&&<Field label='Attach original programme or ChatGPT material · PDF, PNG, JPEG · 10 MB maximum'><Input type='file' accept='.pdf,.png,.jpg,.jpeg' disabled={busy||!c.writable} onChange={upload}/></Field>}{message&&<p role='status' className='text-sm'>{message}</p>}</div>;
}
function SessionCard({c,p,v,s,date,editable}:{c:FitnessController;p:Programme;v:Version;s:SessionPlan;date:string;editable:boolean}){
 const progress=c.data.progress.find(r=>r.version_id===v.id&&r.session_key===s.key&&r.session_date===date);
 const [notes,setNotes]=useState(progress?.notes??''),[minutes,setMinutes]=useState(progress?.minutes??s.minutes),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),lock=useRef(false);
 const future=date>programmeDate(c.profile?.timezone||'Africa/Johannesburg');
 async function save(status:'complete'|'skipped'){if(lock.current)return;lock.current=true;setBusy(true);setMessage('');try{await c.record(v.id,s.key,date,status,minutes,notes);setMessage(c.sample?'Sample progress updated; no database write.':'Progress saved.');}catch(e){setMessage(errorText(e));}finally{lock.current=false;setBusy(false);}}
 const rest=s.category==='rest';
 return <article className={'rounded-xl border p-5 '+(progress?.status==='complete'?'border-primary/30 bg-primary/5':rest?'border-primary/10 bg-[#F6F1E7]/60':'border-primary/15 bg-background')}><div className='mb-3 flex flex-wrap items-center justify-between gap-2'><p className='text-[11px] font-semibold uppercase tracking-[0.12em] text-[#826e45]'>{days[s.day]} · {date.slice(5)}</p><span className='rounded-full bg-primary/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider'>{progress?.status??(rest?'Rest day':s.category)}</span></div><h4 className='font-serif text-2xl'>{s.title}</h4><p className='mt-1 text-xs text-muted-foreground'>{rest?'Recovery matters':s.minutes+' minutes planned'}</p><p className='mt-4 whitespace-pre-line text-sm leading-7 text-muted-foreground'>{s.instructions}</p>{!rest&&<div className='mt-4 grid gap-3'><Field label={p.kind==='horse'?'Work duration · minutes':'Actual minutes'}><Input type='number' min={0} max={240} value={minutes} disabled={!editable||busy} onChange={e=>setMinutes(Number(e.target.value))}/></Field><Field label={p.kind==='horse'?'Recovery & work notes':'Session notes'}><Textarea value={notes} maxLength={5000} disabled={!editable||busy} onChange={e=>setNotes(e.target.value)} placeholder={p.kind==='horse'?'How did your horse respond and recover?':'How did the session feel?'}/></Field>{editable&&<div className='flex flex-wrap gap-2'><Button type='button' size='sm' disabled={busy||!c.writable||future} onClick={()=>void save('complete')}><Check className='mr-1 size-4'/>{progress?.status==='complete'?'Save notes':'Complete'}</Button><Button type='button' size='sm' variant='outline' disabled={busy||!c.writable||future||progress?.status==='complete'} onClick={()=>void save('skipped')}>Skip session</Button></div>}{future&&editable&&<p className='text-xs text-muted-foreground'>Log this session on its scheduled day or later.</p>}</div>}{message&&<p role='status' className='mt-3 text-xs'>{message}</p>}</article>;
}
export function WeeklyPlan({c,subject,p}:{c:FitnessController;subject:Subject;p:Programme}){
 const [selected,setSelected]=useState((c.isFounder&&p.draft_version_id)||p.current_version_id||''),[week,setWeek]=useState(()=>weekStart(c.profile?.timezone||'Africa/Johannesburg')),[editing,setEditing]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{setSelected((c.isFounder&&p.draft_version_id)||p.current_version_id||'');},[c.isFounder,p.current_version_id,p.draft_version_id]);
 const versions=c.data.versions.filter(v=>v.programme_id===p.id).sort((a,b)=>b.version_number-a.version_number);
 const v=versions.find(v=>v.id===selected)??versions.find(v=>v.id===p.current_version_id)??versions[0];
 if(!v)return null;
 const editable=c.canRecord(subject)&&p.status==='assigned'&&p.current_version_id===v.id;
 const done=c.data.progress.filter(r=>r.version_id===v.id&&r.status==='complete'&&r.session_date>=week&&r.session_date<=sessionDate(week,6)).length;
 const work=v.sessions.filter(s=>s.category!=='rest').length;
 const canEdit=!subject.archivedHorseId&&(c.isFounder&&p.source==='hka'||c.canRecord(subject)&&p.source!=='hka');
 if(editing&&canEdit)return <PlanEditor subject={subject} c={c} programme={p} version={v} close={()=>setEditing(false)}/>;
 async function approve(){setBusy(true);setMessage('');try{await c.assign(p.id);setSelected('');setMessage(c.sample?'Sample HKA programme assigned.':'HKA programme approved and assigned.');}catch(e){setMessage(errorText(e));}finally{setBusy(false);}}
 return <section className='space-y-5'><div className='paper-card p-5 sm:p-6'><div className='flex flex-col justify-between gap-4 sm:flex-row'><div><p className='eyebrow text-[#826e45]'>{p.source==='hka'?'HKA programme':p.source==='vet'?'Your vet’s instructions':'Your own programme'} · {p.status}</p><h3 className='mt-2 font-serif text-3xl'>{v.title}</h3><p className='mt-3 text-sm text-muted-foreground'>{v.intake.goals}</p></div><div className='flex flex-wrap items-start gap-2'>{canEdit&&<Button type='button' variant='outline' onClick={()=>setEditing(true)}>Revise programme</Button>}{!subject.archivedHorseId&&c.isFounder&&p.draft_version_id&&<Button type='button' disabled={busy||!c.writable} onClick={()=>void approve()}>Approve & assign draft</Button>}</div></div><div className='mt-5 grid gap-4 sm:grid-cols-2'><Field label='Version & history'><select className={selectClass} value={v.id} onChange={e=>setSelected(e.target.value)}>{versions.map(version=><option key={version.id} value={version.id}>Version {version.version_number} · {version.approved_at?'approved':'draft'}{version.id===p.current_version_id?' · current':''}</option>)}</select></Field><div className='self-end'><p className='mb-2 text-xs text-muted-foreground'>{done} of {work} sessions complete this week</p><ProgressBar value={work?Math.min(100,done/work*100):0}/></div></div>{v.intake.professionalInstructions&&<div className='mt-4 rounded-lg border border-[#B79B62]/35 p-4 text-sm leading-6'><strong>Professional instructions</strong><p className='whitespace-pre-line'>{v.intake.professionalInstructions}</p></div>}{holdReason(subject.kind,v.intake)&&<p role='status' className='mt-4 text-sm text-amber-800'>{holdReason(subject.kind,v.intake)}</p>}<div className='mt-5'><Materials c={c} versionId={v.id} editable={canEdit&&(p.source!=='hka'||!v.approved_at)}/></div>{message&&<p role='status' className='mt-4 text-sm'>{message}</p>}</div>
  <div className='flex flex-wrap items-center justify-between gap-3'><div><p className='eyebrow text-[#826e45]'>A little progress, every week</p><h3 className='mt-1 font-serif text-2xl'>Week of {new Date(week+'T12:00:00').toLocaleDateString(undefined,{day:'numeric',month:'long',year:'numeric'})}</h3></div><div className='flex items-center gap-1'><Button type='button' variant='outline' size='icon' aria-label='Previous week' onClick={()=>setWeek(sessionDate(week,-7))}>←</Button><Button type='button' variant='ghost' onClick={()=>setWeek(weekStart(c.profile?.timezone||'Africa/Johannesburg'))}>This week</Button><Button type='button' variant='outline' size='icon' aria-label='Next week' onClick={()=>setWeek(sessionDate(week,7))}>→</Button></div></div>
  {!editable&&<p className='text-xs text-muted-foreground'>{v.approved_at?'Read-only history or authorised overview.':'Draft · visible to Founder only.'}</p>}
  <div className='grid gap-4 md:grid-cols-2'>{[...v.sessions].sort((a,b)=>a.day-b.day).map(s=><SessionCard key={v.id+s.key+week} c={c} p={p} v={v} s={s} date={sessionDate(week,s.day)} editable={editable}/>)}</div>
 </section>;
}
function TodayCard({kind,title,children}:{kind:Subject['kind'];title:string;children:ReactNode}){
  return <section aria-label='Today' className={'grid min-w-0 items-center gap-5 rounded-2xl border border-[#B79B62]/40 bg-[#2F4A3C] p-5 text-[#F6F1E7] sm:p-6 '+(kind==='rider'?'md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]':'')}>
    <div className='min-w-0 space-y-3'>
      <p className='eyebrow text-[#DFCEA3]'>Today</p>
      <h2 className='break-words font-serif text-3xl sm:text-4xl'>{title}</h2>
      {children}
    </div>
    {kind==='rider' && <img
      src={quoteGraphic}
      alt='HKA Equestrian. Train with purpose. Ride with confidence.'
      width={1600}
      height={900}
      className='h-auto w-full max-w-[18rem] rounded-lg object-contain md:max-w-[26rem] md:justify-self-end'
    />}
  </section>;
}

function TrainingDashboard({c,subject,p,v}:{c:FitnessController;subject:Subject;p:Programme;v:Version}){
  const [openDay,setOpenDay]=useState<{day:number;date:string}|null>(null);
  const opener=useRef<HTMLButtonElement|null>(null);
  const timezone=c.profile?.timezone||'Africa/Johannesburg';
  const now=new Date();
  const today=programmeDate(timezone,now);
  const week=weekStart(timezone,now);
  const entries=[...v.sessions].sort((a,b)=>a.day-b.day).map(session=>{
    const date=sessionDate(week,session.day);
    const progress=c.data.progress.find(row=>row.version_id===v.id && row.session_key===session.key && row.session_date===date);
    return {session,date,progress};
  });
  const work=entries.filter(entry=>entry.session.category!=='rest');
  const todaysWork=work.filter(entry=>entry.date===today);
  const todaySession=todaysWork.find(entry=>!entry.progress)??todaysWork[0];
  const firstSession=work[0];
  const nextSession=work.find(entry=>entry.date>today)??(firstSession && {
    ...firstSession,
    date:sessionDate(week,7+firstSession.session.day)
  });
  const complete=work.filter(entry=>entry.progress?.status==='complete').length;
  const focusSession=todaySession??nextSession;
  const hold=holdReason(subject.kind,v.intake);
  const editable=c.canRecord(subject);
  const describeDate=(date:string)=>new Date(date+'T12:00:00Z').toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'short',timeZone:'UTC'});
  function viewDay(button:HTMLButtonElement,day:number,date:string){
    opener.current=button;
    setOpenDay({day,date});
  }

  return <div className='space-y-4'>
    <TodayCard kind={subject.kind} title={todaySession?.session.title??(work.length?'Rest day':'No sessions planned')}>
      <p className='break-words text-sm text-[#F6F1E7]/90'>{v.title}</p>
      {todaySession && <p className='text-sm text-[#F6F1E7]/90'>
        {todaySession.session.minutes} min
        {todaySession.progress && ' · '+(todaySession.progress.status==='complete'?'Complete':'Skipped')}
      </p>}
      {!todaySession && nextSession && <p className='break-words text-sm text-[#F6F1E7]/90'>
        Next session on {describeDate(nextSession.date)} · {nextSession.session.title} · {nextSession.session.minutes} min
      </p>}
      {focusSession && <Button type='button' variant='secondary' className='min-h-11 rounded-lg px-4 focus-visible:ring-[#DFCEA3]' onClick={event=>viewDay(event.currentTarget,focusSession.session.day,focusSession.date)}>
        View session <ArrowRight className='ml-2 size-4' aria-hidden='true'/>
      </Button>}
    </TodayCard>

    <section aria-label='This week' className='paper-card space-y-4 p-4 sm:p-5'>
      <div className='flex flex-wrap items-baseline justify-between gap-2'>
        <h2 className='font-serif text-2xl'>This week</h2>
        <p className='text-sm text-muted-foreground'>{complete} of {work.length} sessions complete</p>
      </div>
      <ProgressBar aria-label='Sessions complete this week' value={work.length ? complete/work.length*100 : 0} className='h-1.5 [&>div]:bg-[#B79B62]'/>
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
            {entries.some(entry=>entry.session.day===index)
              ? <button type='button' aria-label={label} aria-current={date===today?'date':undefined} className={classes+' hover:border-primary/50'} onClick={event=>viewDay(event.currentTarget,index,date)}>{summary}</button>
              : <span aria-label={label} aria-current={date===today?'date':undefined} className={classes}>{summary}</span>}
          </li>;
        })}
      </ol>
    </section>
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
        {v.sessions.filter(session=>session.day===openDay.day).map(session=><SessionCard key={v.id+session.key+openDay.date} c={c} p={p} v={v} s={session} date={openDay.date} editable={editable}/>)}
      </DialogContent>}
    </Dialog>
  </div>;
}

export type FitnessPanel = 'today' | 'profile' | 'progress';

export function MemberProgrammes({subject,c,panel='today',onPanelChange,management=false,initialProgrammeId=''}:{
  subject:Subject; c:FitnessController; panel?:FitnessPanel; onPanelChange?:(panel:FitnessPanel)=>void;
  management?:boolean; initialProgrammeId?:string;
}){
  const [creating,setCreating]=useState(false);
  const [selected,setSelected]=useState(initialProgrammeId);
  const programmes=c.data.programmes.filter(programme=>programmeMatchesSubject(programme,subject));
  const history=management || panel==='progress' || Boolean(subject.archivedHorseId);
  const choices=history ? programmes : programmes.filter(programme=>programme.status==='assigned');
  const active=choices.find(programme=>programme.id===selected)??choices.find(programme=>programme.status==='assigned'||management&&programme.status==='draft')??choices[0];
  const currentVersion=c.data.versions.find(version=>version.id===active?.current_version_id && version.approved_at);
  const editable=c.canRecord(subject);

  if(panel==='profile' && !subject.archivedHorseId) return <IntakePanel subject={subject} c={c} standalone/>;
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
    {active ? <WeeklyPlan key={active.id} c={c} subject={subject} p={active}/>
      : <p role='status' className='paper-card p-5'>Programme history will appear here once a plan is available.</p>}
  </div>;

  return <div className='space-y-4'>
    {(currentVersion || programmes.length>0) && <nav aria-label='Fitness tools' className='flex flex-wrap gap-2'>
      {currentVersion && <Button type='button' variant='outline' className='min-h-11 rounded-lg' onClick={()=>onPanelChange?.('profile')}>Fitness profile</Button>}
      <Button type='button' variant='outline' className='min-h-11 rounded-lg' onClick={()=>onPanelChange?.('progress')}>Progress &amp; history</Button>
    </nav>}
    {picker}
    {active && currentVersion
      ? <TrainingDashboard key={currentVersion.id} c={c} subject={subject} p={active} v={currentVersion}/>
      : <TodayCard kind={subject.kind} title={subject.profileSaved?'Fitness profile ready':'Build your fitness profile'}>
        <p className='text-sm leading-6 text-[#F6F1E7]/90'>
          {subject.profileSaved && editable && !c.sample
            ? 'Use Message Hollie to ask about a programme.'
            : 'An assigned programme will appear here when it’s ready.'}
        </p>
        <Button type='button' variant='secondary' className='min-h-11 rounded-lg focus-visible:ring-[#DFCEA3]' onClick={()=>onPanelChange?.('profile')}>
          {editable ? subject.profileSaved ? 'Edit fitness profile' : subject.kind==='rider' ? 'Set up my fitness profile' : 'Set up fitness profile' : 'View fitness profile'}
        </Button>
      </TodayCard>}
    {subject.kind==='horse' && <div className='space-y-3 rounded-lg border border-[#B79B62]/35 bg-[#F6F1E7] p-4'>
      <p className='max-w-xl text-sm leading-6'>When workload changes, review feeding with your usual adviser.</p>
      {editable && <Button type='button' variant='outline' disabled={!c.writable} onClick={()=>setCreating(true)}><Plus className='mr-2 size-4'/>My own / vet programme</Button>}
    </div>}
  </div>;
}
