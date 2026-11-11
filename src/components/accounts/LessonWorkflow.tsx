import { useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { WorkflowDialog } from '@/components/accounts/WorkflowDialog';
import { coachingInstant, coachingConflict, coachingWallTime, dayInTimezone, formatCoachingTime, publishedLessonTimes, validateCoachingRange } from '@/lib/coaching';
import { errorText, type Row } from '@/lib/academy';

export type LessonMode = 'request' | 'schedule' | 'reschedule' | 'available' | 'unavailable' | 'approve' | 'alternative';
export type LessonDraft = { student: string; service: string; format: string; start: string; end: string; alternate: string | null; duration: number; location: string; goals: string; note: string; title: string };
type Props = { day: string; timezone: string; mode: LessonMode; students: Row[]; services: Row[]; appointments: Row[]; availability: Row[]; coachId: string; request?: Row; onClose:()=>void; onSave:(draft:LessonDraft)=>Promise<void> };
const selectStyle='h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm';
export function LessonWorkflow({day,timezone,mode,students,services,appointments,availability,coachId,request,onClose,onSave}:Props) {
  const windowMode=mode==='available'||mode==='unavailable';
  const managing=mode!=='request';
  const minimumDuration=mode==='schedule'||mode==='reschedule'?10:30;
  const [step,setStep]=useState(0), [busy,setBusy]=useState(false), [dirty,setDirty]=useState(false), [error,setError]=useState('');
  const lock=useRef(false), formRef=useRef<HTMLFormElement>(null);
  const [student,setStudent]=useState(String(request?.student_id||'')), [service,setService]=useState(String(request?.service_id||''));
  const [format,setFormat]=useState(String(request?.lesson_format||'online')), [duration,setDuration]=useState(Number(request?.duration_minutes||60));
  const [start,setStart]=useState(request?coachingWallTime(request.preferred_starts_at,timezone):day+'T');
  const [end,setEnd]=useState(day+'T'), [alternate,setAlternate]=useState(request?.alternate_starts_at?coachingWallTime(request.alternate_starts_at,timezone):'');
  const [location,setLocation]=useState(String(request?.location||'')), [goals,setGoals]=useState(String(request?.learning_goals||'')), [note,setNote]=useState(String(request?.owner_message||''));
  const [title,setTitle]=useState(String(request?.title||''));
  const activeServices=services.filter(row=>row.active);
  const slots=publishedLessonTimes(start.slice(0,10)||day,duration,timezone,appointments,availability);
  const titles:Record<LessonMode,string>={request:'Request a Lesson',schedule:'Schedule a lesson',reschedule:'Reschedule confirmed lesson',available:'Publish teaching availability',unavailable:'Block teaching time',approve:'Review and approve lesson',alternative:'Propose an alternative'};
  const steps=windowMode?['Details','Time','Review']:['Lesson','Time','Notes','Review'];
  const finalStep=steps.length-1;
  function draft():LessonDraft {
    const instant=coachingInstant(start,timezone);
    const finish=windowMode?coachingInstant(end,timezone):new Date(Date.parse(instant)+duration*60000).toISOString();
    validateCoachingRange(instant,finish);
    if(!windowMode){
      if(!Number.isInteger(duration)||duration<minimumDuration||duration>240)throw new Error('Choose a duration from '+minimumDuration+' to 240 minutes.');
      if(managing&&!students.some(row=>row.id===student&&!row.suspended))throw new Error('Choose an authorised active student.');
      if(service&&!activeServices.some(row=>row.id===service))throw new Error('This lesson type is no longer available.');
      const conflict=coachingConflict(instant,duration,appointments,availability,managing?coachId:undefined,student||undefined,String(request?.appointment_id||''));
      if(conflict)throw new Error(conflict);
    }else if(mode==='unavailable'&&appointments.some(row=>row.coach_id===coachId&&row.status==='scheduled'&&Date.parse(String(row.starts_at))<Date.parse(finish)&&Date.parse(String(row.starts_at))+Number(row.duration_minutes)*60000>Date.parse(instant)))throw new Error('A confirmed lesson overlaps this block. Resolve the lesson first.');
    const alternateInstant=alternate?coachingInstant(alternate,timezone):null;
    if(alternateInstant)validateCoachingRange(alternateInstant,new Date(Date.parse(alternateInstant)+duration*60000).toISOString());
    return {student,service,format,start:instant,end:finish,alternate:alternateInstant,duration,location:location.trim(),goals:goals.trim()||'No learning goals specified.',note:note.trim(),title:title.trim()||String(activeServices.find(row=>row.id===service)?.title|| (format==='online'?'Online coaching lesson':'In-person coaching lesson'))};
  }
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault(); if(lock.current)return;setError('');
    const fields=formRef.current?.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('[data-step="'+step+'"] input, [data-step="'+step+'"] select, [data-step="'+step+'"] textarea');
    for(const field of fields??[])if(!field.reportValidity())return;
    try{
      if(step===0){if(managing&&!windowMode&&!students.some(row=>row.id===student&&!row.suspended))throw new Error('Choose an authorised active student.');setStep(1);return;}
      const data=draft();
      if(step<finalStep){setStep(step+1);return;}
      lock.current=true;setBusy(true);await onSave(data);onClose();
    }catch(failure){setError(errorText(failure));}finally{lock.current=false;setBusy(false);}
  }
  let review:LessonDraft|null=null;
  if(step===finalStep){try{review=draft();}catch{/* submit displays current validation failure */}}
  return <WorkflowDialog open onOpenChange={open=>{if(!open)onClose();}} title={titles[mode]} description={'Step '+(step+1)+' of '+steps.length+' · '+steps[step]} dirty={dirty} busy={busy}>
    <ol className='flex gap-2' aria-label='Booking progress'>{steps.map((label,index)=><li key={label} aria-current={index===step?'step':undefined} className={'flex-1 border-t-2 pt-2 text-xs '+(index<=step?'border-[#B79B62] text-primary':'border-primary/15 text-muted-foreground')}>{index+1}. {label}</li>)}</ol>
    <form ref={formRef} onSubmit={submit} onChange={()=>setDirty(true)} noValidate className='grid min-w-0 gap-3'>
      <fieldset data-step='0' hidden={step!==0} className='space-y-2'>
        {windowMode?<><p className='text-sm leading-6'>{mode==='available'?'Publish a teaching window for Founder scheduling. Student visibility follows existing permissions.':'Block time without cancelling or changing existing lessons.'}</p><div><Label htmlFor='window-note'>Teaching window or reason (optional)</Label><Input id='window-note' value={note} onChange={e=>setNote(e.target.value)} maxLength={1000}/></div></>:<>
          {managing&&<div><Label htmlFor='lesson-student'>Authorised student</Label><select id='lesson-student' className={selectStyle} value={student} onChange={e=>setStudent(e.target.value)} required disabled={Boolean(request)}><option value=''>Choose student</option>{students.filter(row=>!row.suspended).map(row=><option key={row.id} value={row.id}>{String(row.full_name)}{students.filter(item=>item.full_name===row.full_name).length>1?' · '+(row.created_at?'Joined '+new Date(String(row.created_at)).toLocaleDateString():'Separate account'):''}</option>)}</select></div>}
          <div hidden={mode==='reschedule'}><Label htmlFor='lesson-service'>Lesson type</Label><select id='lesson-service' className={selectStyle} value={service} onChange={e=>setService(e.target.value)} disabled={Boolean(request)}><option value=''>General coaching · discuss with Founder</option>{activeServices.map(row=><option key={row.id} value={row.id}>{String(row.title)}</option>)}</select></div>
          <div className='grid gap-4 sm:grid-cols-2'><div hidden={mode==='reschedule'}><Label htmlFor='lesson-format'>Format</Label><select id='lesson-format' className={selectStyle} value={format} onChange={e=>setFormat(e.target.value)} disabled={Boolean(request)}><option value='online'>Online</option><option value='in_person'>In person</option></select></div><div><Label htmlFor='lesson-duration'>Duration in minutes</Label><Input id='lesson-duration' type='number' min={minimumDuration} max={240} value={duration} onChange={e=>setDuration(Number(e.target.value))} required disabled={Boolean(request)&&mode!=='reschedule'}/></div></div>
          {(mode==='schedule'||mode==='reschedule')&&<div><Label htmlFor='lesson-title'>Lesson title (optional)</Label><Input id='lesson-title' value={title} onChange={e=>setTitle(e.target.value)} maxLength={150}/></div>}
        </>}
      </fieldset>
      <fieldset data-step='1' hidden={step!==1} className='space-y-2'>
        {!windowMode&&<div className='rounded-lg border border-[#B79B62]/40 p-4 text-sm'>{slots.length?<><Label htmlFor='published-time'>Published teaching windows · subject to confirmation</Label><select id='published-time' className={selectStyle+' mt-2'} value={slots.includes(start)?start:''} onChange={e=>{if(e.target.value)setStart(e.target.value);}}><option value=''>Propose your preferred time</option>{slots.map(time=><option key={time} value={time}>{time.slice(11)}</option>)}</select></>:<p>No available times published for this date. Propose a preferred time for Founder review.</p>}</div>}
        <div className='grid gap-4 sm:grid-cols-2'><div><Label htmlFor='lesson-date'>Selected date ({timezone})</Label><Input id='lesson-date' type='date' value={start.slice(0,10)} min={dayInTimezone(new Date(),timezone)} onChange={e=>setStart(e.target.value+'T'+start.slice(11))} required/></div><div><Label htmlFor='lesson-time'>{windowMode?'Start time':'Preferred time'}</Label><Input id='lesson-time' type='time' value={start.slice(11)} onChange={e=>setStart(start.slice(0,10)+'T'+e.target.value)} required/></div></div>
        {windowMode&&<div><Label htmlFor='lesson-end'>Ends ({timezone})</Label><Input id='lesson-end' type='datetime-local' value={end} onChange={e=>setEnd(e.target.value)} required/></div>}
      </fieldset>
      {!windowMode&&<fieldset data-step='2' hidden={step!==2} className='space-y-2'>
          {mode==='request'&&<div><Label htmlFor='lesson-alternate'>Alternative date and time (optional)</Label><Input id='lesson-alternate' type='datetime-local' value={alternate} onChange={e=>setAlternate(e.target.value)}/></div>}
          <div><Label htmlFor='lesson-location'>Location or online preference (optional)</Label><Input id='lesson-location' value={location} onChange={e=>setLocation(e.target.value)} maxLength={500} disabled={Boolean(request)&&mode!=='reschedule'}/></div>
          {mode==='request'&&<div><Label htmlFor='lesson-goals'>Learning goals (optional)</Label><Textarea rows={2} className='min-h-0' id='lesson-goals' value={goals} onChange={e=>setGoals(e.target.value)} maxLength={5000}/></div>}
          {mode==='alternative'&&<div><Label htmlFor='lesson-note'>Message to student</Label><Textarea rows={2} className='min-h-0' id='lesson-note' value={note} onChange={e=>setNote(e.target.value)} required maxLength={4500}/></div>}
      </fieldset>}
      {step===finalStep&&review&&<div className='space-y-1.5 rounded-lg border border-[#B79B62]/50 bg-background/70 p-3 text-sm'><h3 className='font-serif text-2xl'>Review {windowMode?'teaching time':'lesson details'}</h3>{managing&&!windowMode&&<p>Student: {String(students.find(row=>row.id===student)?.full_name)}</p>}{!windowMode&&<p>{review.title}{mode!=='reschedule'?' · '+(format==='online'?'Online':'In person'):''} · {duration} minutes</p>}<p>{formatCoachingTime(review.start,timezone)}{windowMode?' – '+formatCoachingTime(review.end,timezone):''}</p>{review.alternate&&<p>Alternative: {formatCoachingTime(review.alternate,timezone)}</p>}{review.location&&<p>Location: {review.location}</p>}{mode==='request'&&<p className='line-clamp-2 whitespace-pre-wrap break-words'>Goals: {review.goals}</p>}{review.note&&<p className='line-clamp-2 whitespace-pre-wrap break-words'>{review.note}</p>}<p className='border-t border-primary/15 pt-3 text-xs leading-6'>{mode==='request'?'Pending confirmation: only Founder approval confirms a lesson. No payment is taken.':mode==='alternative'?'The alternative stays pending until Founder approval. The current appointment remains unchanged.':'Save applies this change using your existing permissions.'}</p></div>}
      {error&&<p role='alert' className='text-sm text-destructive'>{error}</p>}
      <div className='flex flex-wrap gap-2 border-t border-primary/15 pt-2'>
        <Button type='submit' disabled={busy} className='min-h-11'>{busy?'Saving…':step<finalStep?'Next':mode==='request'?'Submit lesson request':'Confirm and save'}</Button>
        {step>0&&<Button type='button' variant='outline' disabled={busy} onClick={()=>{setError('');setStep(step-1);}}>Back</Button>}
        <DialogClose asChild><Button type='button' variant='ghost' disabled={busy}>Cancel</Button></DialogClose>
      </div>
    </form>
  </WorkflowDialog>;
}
