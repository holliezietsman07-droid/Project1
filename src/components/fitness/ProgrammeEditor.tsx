import { useState, type FormEvent, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { errorText } from '@/lib/academy';
import type { FitnessController } from '@/hooks/use-fitness';
import { days, disciplineOptions, holdReason, templateDraft, validateSessions, type Intake, type Programme, type ProgrammeSource, type SessionPlan, type Subject, type Version } from '@/lib/fitness/model';
export const selectClass='min-h-11 w-full rounded-md border border-primary/20 bg-background px-3 py-2 text-sm';
export function Field({label,children}:{label:string;children:ReactNode}){return <label className='grid gap-2 text-sm font-medium'><span>{label}</span>{children}</label>;}
export type IntakeStep = 'goals' | 'schedule' | 'workload' | 'wellbeing';
const presetMinutes = [10, 15, 20, 30, 45];
const detailClass = 'rounded-lg border border-primary/15 bg-background/70 p-3';

export function IntakeFields({value,onChange,kind,step}:{
  value:Intake; onChange:(value:Intake)=>void; kind:'rider'|'horse'; step?:IntakeStep;
}){
  const update = (changes: Partial<Intake>) => onChange({...value, ...changes});
  const horse = kind === 'horse';
  const healthFlags = horse ? ['Lameness', 'Injury', 'Rehabilitation'] : ['Pain', 'Injury', 'Returning from injury'];
  const [customDuration,setCustomDuration] = useState(!presetMinutes.includes(value.minutes));
  const ageLimit = horse ? 50 : 110;
  const invalidAge = value.age!==null && (value.age<0 || value.age>ageLimit);
  const details = <>
    <div className='grid gap-4 sm:grid-cols-2'>
      <Field label={horse ? 'Horse age' : 'Rider age'}><Input type='number' min={0} max={ageLimit} value={value.age ?? ''} onChange={e=>update({age:e.target.value === '' ? null : Number(e.target.value)})}/></Field>
      <Field label={horse ? 'Current condition' : 'Current fitness & experience'}><Input value={value.condition} maxLength={500} onChange={e=>update({condition:e.target.value})}/></Field>
    </div>
    <fieldset>
      <legend className='mb-2 text-sm font-medium'>Disciplines · choose all that apply</legend>
      <div className='flex flex-wrap gap-2'>
        {[...new Set([...disciplineOptions,...value.disciplines])].map(name=><label key={name} className={'flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-xs '+(value.disciplines.includes(name)?'border-primary bg-primary/10':'border-primary/15')}>
          <input type='checkbox' checked={value.disciplines.includes(name)} onChange={e=>update({disciplines:e.target.checked?[...value.disciplines,name]:value.disciplines.filter(d=>d!==name)})}/>{name}
        </label>)}
      </div>
    </fieldset>
  </>;
  const goal = <Field label='Goals for this programme'><Textarea value={value.goals} maxLength={3000} onChange={e=>update({goals:e.target.value})} placeholder='What would you like this programme to help with?'/></Field>;
  const duration = <Field label='Minutes available per session'><Input type='number' min={5} max={240} value={step&&!value.minutes?'':value.minutes} required={Boolean(step)} onChange={e=>update({minutes:Number(e.target.value)})}/></Field>;
  const equipment = <Field label={horse ? 'Facilities & equipment' : 'Available equipment'}><Input value={value.equipment} maxLength={1000} onChange={e=>update({equipment:e.target.value})}/></Field>;
  const workload = <>
    <Field label='Recent workload · prefilled from ride logs'><Textarea value={value.recentWork} maxLength={5000} onChange={e=>update({recentWork:e.target.value})}/></Field>
    <Field label='Time off · enter None if no break'><Input value={value.timeOff} maxLength={1000} onChange={e=>update({timeOff:e.target.value})}/></Field>
  </>;
  const guidance = <Field label={horse ? 'Instructions supplied by your vet' : 'Guidance supplied by your health professional'}><Textarea value={value.professionalInstructions} maxLength={5000} onChange={e=>update({professionalInstructions:e.target.value})} placeholder='Record provider, date, permitted work, limits and review date.'/></Field>;

  return <div className='grid min-w-0 gap-6'>
    {(!step || step==='goals') && <fieldset className='grid min-w-0 gap-4'>
      <legend className={step?'sr-only':'mb-3 font-serif text-2xl'}>Goals</legend>
      {step ? <>
        {goal}
        <details className={detailClass} open={invalidAge||undefined} onInvalid={event=>{event.currentTarget.open=true;}}>
          <summary className='min-h-8 cursor-pointer text-sm font-medium'>
            Review profile details
            <span className='mt-1 block break-words text-xs font-normal leading-5 text-muted-foreground'>
              {[value.age===null?'':value.age+' years',value.condition,...value.disciplines].filter(Boolean).join(' · ')||'Add age, experience and disciplines.'}
            </span>
          </summary>
          <div className='mt-3 grid gap-4 border-t border-primary/10 pt-3'>{details}</div>
        </details>
      </> : <>{details}{goal}</>}
    </fieldset>}
    {(!step || step==='schedule') && <fieldset className='grid min-w-0 gap-4'>
      <legend className={step?'sr-only':'mb-3 font-serif text-2xl'}>Schedule &amp; equipment</legend>
      <fieldset>
        <legend className='mb-2 text-sm font-medium'>Available days</legend>
        <div className={'flex flex-wrap '+(step?'gap-2':'gap-3')}>
          {days.map(day=><label key={day} className={step
            ? 'flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border px-2.5 text-xs font-medium focus-within:ring-2 focus-within:ring-primary '+(value.days.includes(day)?'border-primary bg-primary text-primary-foreground':'border-primary/20 bg-background')
            : 'flex min-h-10 items-center gap-2 text-xs'}>
            <input type='checkbox' aria-label={day} className={step?'sr-only':undefined} checked={value.days.includes(day)} onChange={e=>update({days:e.target.checked?[...value.days,day]:value.days.filter(d=>d!==day)})}/>{day.slice(0,3)}
          </label>)}
        </div>
      </fieldset>
      {step ? <>
        <fieldset>
          <legend className='mb-2 text-sm font-medium'>Session length</legend>
          <div className='flex flex-wrap gap-2'>
            {presetMinutes.map(minutes=><Button key={minutes} type='button' variant={!customDuration&&value.minutes===minutes?'default':'outline'} aria-pressed={!customDuration&&value.minutes===minutes} className='min-h-11 rounded-lg' onClick={()=>{setCustomDuration(false);update({minutes});}}>{minutes} min</Button>)}
            <Button type='button' variant={customDuration?'default':'outline'} aria-pressed={customDuration} className='min-h-11 rounded-lg' onClick={()=>setCustomDuration(true)}>Custom</Button>
          </div>
          {customDuration && <div className='mt-3 max-w-xs'>{duration}</div>}
        </fieldset>
        <details className={detailClass} open={Boolean(value.equipment)||undefined}>
          <summary className='min-h-8 cursor-pointer text-sm font-medium'>Equipment <span className='text-xs font-normal text-muted-foreground'>· optional</span></summary>
          <div className='pt-2'>{equipment}</div>
        </details>
      </> : <>
        <div className='grid gap-4 sm:grid-cols-2'>{duration}{equipment}</div>
        {horse&&workload}
      </>}
    </fieldset>}
    {step==='workload' && <div className='grid gap-3'>
      {workload}
      <Button type='button' variant='outline' className='min-h-11 w-fit rounded-lg' aria-pressed={value.timeOff.trim().toLowerCase()==='none'} onClick={()=>update({timeOff:'None'})}>No recent break</Button>
    </div>}
    {(!step || step==='wellbeing') && <fieldset className='grid min-w-0 gap-4'>
      <legend className={step?'sr-only':'mb-3 font-serif text-2xl'}>Wellbeing</legend>
      <fieldset className='rounded-lg border border-[#B79B62]/40 bg-[#F6F1E7] p-4'>
        <legend className='px-1 text-sm font-medium'>Health &amp; wellbeing</legend>
        <div className='grid gap-2 sm:grid-cols-2'>
          {healthFlags.map(flag=><label key={flag} className={'flex min-h-11 items-center gap-2 text-sm '+(step?'cursor-pointer rounded-lg border border-primary/15 px-3':'')}>
            <input type='checkbox' checked={value.health.includes(flag)} onChange={e=>update({health:e.target.checked?[...value.health,flag]:value.health.filter(v=>v!==flag)})}/>{flag}
          </label>)}
        </div>
        {value.health.filter(flag=>!healthFlags.includes(flag)).map(flag=><p key={flag} className='mt-2 text-xs'>{flag} · review existing records with Hollie.</p>)}
        <p className='mt-3 text-xs leading-6 text-muted-foreground'>Flagged concerns hold standard suggestions. Professional instructions can still be recorded and tracked.</p>
      </fieldset>
      {step ? <details className={detailClass} open={Boolean(value.health.length||value.professionalInstructions)||undefined}>
        <summary className='min-h-8 cursor-pointer text-sm font-medium'>{horse?'Vet guidance':'Professional guidance'} <span className='text-xs font-normal text-muted-foreground'>· optional</span></summary>
        <div className='pt-2'>{guidance}</div>
      </details> : guidance}
    </fieldset>}
  </div>;
}
export function IntakePanel({subject,c}:{subject:Subject;c:FitnessController}){
  const [intake,setIntake] = useState(subject.intake);
  const [message,setMessage] = useState('');
  const [busy,setBusy] = useState(false);
  const editable = c.canRecord(subject);
  const reason = holdReason(subject.kind,intake);
  async function save(e:FormEvent){
    e.preventDefault();
    if (busy || !editable || !c.writable) return;
    setBusy(true);
    setMessage('');
    try {
      await c.saveIntake(subject,intake);
      setMessage(c.sample ? 'Sample fitness profile saved for this preview.' : 'Fitness profile saved.');
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  const content = <>
    <p className='mb-5 text-sm leading-6 text-muted-foreground'>Start with the details already in your HKA profile. Each programme has its own goals.</p>
    <form onSubmit={save} className='grid gap-5'>
      <fieldset disabled={!editable || busy} className='grid min-w-0 gap-5'>
        <IntakeFields value={intake} onChange={setIntake} kind={subject.kind}/>
        {editable && <Button className='w-fit' disabled={!c.writable} type='submit'>{busy ? 'Saving…' : 'Save fitness profile'}</Button>}
      </fieldset>
      {editable && !c.writable && <p className='text-xs text-muted-foreground'>Saving is unavailable in this preview.</p>}
      {reason && <p className='rounded-lg border border-amber-600/30 bg-amber-50 p-4 text-sm' role='status'>{reason}</p>}
      {message && <p role='status' className='text-sm'>{message}</p>}
    </form>
  </>;
  return <details className='paper-card p-5 sm:p-6'><summary className='mb-4 cursor-pointer font-serif text-2xl'>Fitness profile &amp; goals</summary>{content}</details>;
}
export function SessionEditor({sessions,onChange}:{sessions:SessionPlan[];onChange:(s:SessionPlan[])=>void}){
 function update(index:number,patch:Partial<SessionPlan>){onChange(sessions.map((s,i)=>i===index?{...s,...patch}:s));}
 return <div className='space-y-4'>{sessions.map((session,i)=><article key={session.key} className='grid gap-3 rounded-lg border border-primary/15 bg-background p-4'><div className='grid gap-3 sm:grid-cols-[1fr_2fr_1fr]'><Field label='Day'><select className={selectClass} value={session.day} onChange={e=>update(i,{day:Number(e.target.value)})}>{days.map((d,index)=><option key={d} value={index}>{d}</option>)}</select></Field><Field label='Session title'><Input required value={session.title} maxLength={160} onChange={e=>update(i,{title:e.target.value})}/></Field><Field label='Minutes'><Input type='number' required min={0} max={240} value={session.minutes} onChange={e=>update(i,{minutes:Number(e.target.value)})}/></Field></div><Field label='Work type'><select className={selectClass} value={session.category} onChange={e=>update(i,{category:e.target.value,minutes:e.target.value==='rest'?0:session.minutes})}>{['strength','balance','mobility','stamina','conditioning','professional','rest'].map(v=><option key={v} value={v}>{v}</option>)}</select></Field><Field label='Session instructions'><Textarea required value={session.instructions} maxLength={5000} onChange={e=>update(i,{instructions:e.target.value})}/></Field><Button type='button' variant='ghost' className='w-fit' onClick={()=>onChange(sessions.filter((_,n)=>n!==i))}>Remove session</Button></article>)}<Button type='button' variant='outline' disabled={sessions.length>=35} onClick={()=>onChange([...sessions,{key:crypto.randomUUID(),day:0,title:'',category:'professional',minutes:20,instructions:''}])}><Plus className='mr-2 size-4'/>Add session</Button></div>;
}
export function PlanEditor({subject,c,programme,version,close,requestId}:{subject:Subject;c:FitnessController;programme?:Programme;version?:Version;close:()=>void;requestId?:string}){
 const [title,setTitle]=useState(version?.title??(subject.name+' · '+(c.isFounder?'HKA programme':'my own programme')));
 const [intake,setIntake]=useState(version?.intake??subject.intake),[source,setSource]=useState<ProgrammeSource>(programme?.source??(c.isFounder?'hka':'owner'));
 const [sessions,setSessions]=useState<SessionPlan[]>(version?.sessions??[]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function save(e:FormEvent){e.preventDefault();if(busy)return;setBusy(true);setMessage('');try{validateSessions(sessions);await c.saveProgramme(subject,source,title,intake,sessions,programme?.id,requestId);close();}catch(e){setMessage(errorText(e));}finally{setBusy(false);}}
 const reason=holdReason(subject.kind,intake);
 return <form onSubmit={save} className='paper-card grid gap-5 p-5 sm:p-7'><div><p className='eyebrow text-[#826e45]'>{c.isFounder?'Founder draft':'Your own horse programme'}</p><h3 className='mt-2 font-serif text-2xl'>{version?'Revise as a new version':'Create programme'}</h3><p className='mt-2 text-sm text-muted-foreground'>Previous versions and completed work stay in history. HKA drafts require Founder approval. Save the draft to attach a programme file.</p></div><fieldset disabled={busy} className='grid gap-5'><Field label='Programme title'><Input value={title} required maxLength={160} onChange={e=>setTitle(e.target.value)}/></Field>{!c.isFounder&&!programme&&<Field label='Programme source'><select className={selectClass} value={source} onChange={e=>setSource(e.target.value as ProgrammeSource)}><option value='owner'>My existing programme</option><option value='vet'>Instructions supplied by my vet</option></select></Field>}<IntakeFields value={intake} onChange={setIntake} kind={subject.kind}/>
  {c.isFounder&&<div className='grid gap-3 rounded-lg bg-primary/5 p-4'><p className='text-sm font-medium'>Choose an editable starting point</p>{reason&&<p role='status' className='text-sm text-amber-800'>{reason}</p>}<select className={selectClass} aria-label='Reusable template' defaultValue='' disabled={Boolean(reason)} onChange={e=>{const t=c.data.templates.find(t=>t.id===e.target.value);if(t)setSessions(structuredClone(t.sessions));}}><option value=''>Choose matching reusable template</option>{c.data.templates.filter(t=>t.kind===subject.kind&&(subject.kind==='horse'||t.age_group===(intake.age!==null&&intake.age<18?'young':'adult'))).map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select><Button type='button' variant='outline' disabled={Boolean(reason)} onClick={()=>{try{setSessions(templateDraft(subject.kind,intake));setMessage('Starting point prepared. Review every session before assigning.');}catch(e){setMessage(errorText(e));}}}>Prepare age-appropriate draft</Button><p className='text-xs text-muted-foreground'>Horse drafts keep effort gradual. Review recovery before increasing workload.</p></div>}
  <SessionEditor sessions={sessions} onChange={setSessions}/>{!sessions.length&&!c.isFounder&&<p className='text-sm text-muted-foreground'>Enter existing instructions, or add a session directing you to your private original attachment.</p>}<div className='flex flex-wrap gap-3'><Button type='submit' disabled={!c.writable||!sessions.length}>{busy?'Saving…':c.isFounder?'Save HKA draft':'Save & follow my programme'}</Button><Button type='button' variant='ghost' onClick={close}>Cancel</Button></div></fieldset>{message&&<p role='status' className='text-sm'>{message}</p>}</form>;
}
