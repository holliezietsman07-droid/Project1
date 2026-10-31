import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import { useRows, useRefreshAcademy } from '@/hooks/use-academy';
import { Button } from '@/components/ui/button';
import { CoachingCalendar } from '@/components/accounts/CoachingCalendar';
import { WorkflowDialog } from '@/components/accounts/WorkflowDialog';
import { LessonWorkflow, type LessonDraft, type LessonMode } from '@/components/accounts/LessonWorkflow';
import { coachingConflict, dayInTimezone, formatCoachingTime, validateCoachingRange } from '@/lib/coaching';
import { errorText, listRows, rpc, saveRow, type Row } from '@/lib/academy';

export function CoachingWorkspace() {
  const {profile}=useSession(), refresh=useRefreshAcademy();
  const [searchParams,setSearchParams]=useSearchParams();
  const handledLink=useRef('');
  const admin=profile?.role==='admin', student=profile?.role==='student', coach=profile?.role==='coach';
  const ready=profile?.membership_tier!==undefined;
  const appointments=useRows('hka_appointments');
  const requests=useRows('hka_coaching_requests',{},ready&&(admin||student||coach));
  // Existing availability policy is Founder-only; never infer availability from an empty protected response.
  const availability=useRows('hka_owner_availability',{},ready&&admin);
  const services=useRows('hka_coaching_services',{},admin||student);
  const profiles=useRows('hka_profiles',{},admin||coach||profile?.role==='guardian');
  const links=useRows(profile?.role==='guardian'?'hka_guardians':'hka_coach_students',{},!admin&&!student);
  const [action,setAction]=useState<{day:string;mode:LessonMode;request?:Row;appointment?:Row}|null>(null);
  const [dayActions,setDayActions]=useState(''), [detail,setDetail]=useState<Row|null>(null);
  const [cancelAppointment,setCancelAppointment]=useState<Row|null>(null);
  const [message,setMessage]=useState(''), [failure,setFailure]=useState(''), [busy,setBusy]=useState(false);
  const lock=useRef(false);
  const timezone=profile?.timezone||'Africa/Lusaka';
  const authorisedStudents=(profiles.data??[]).filter(row=>row.role==='student'&&!row.suspended);
  const linkedIds=new Set((links.data??[]).filter(row=>coach?row.coach_id===profile?.id:row.guardian_id===profile?.id&&row.status==='approved'&&Boolean(row.consent_at)).map(row=>row.student_id));
  const visibleAppointments=(appointments.data??[]).filter(row=>admin||student&&row.student_id===profile?.id||coach&&row.coach_id===profile?.id&&linkedIds.has(row.student_id)||profile?.role==='guardian'&&linkedIds.has(row.student_id));
  const visibleRequests=useMemo(()=>{const assigned=new Set((links.data??[]).filter(link=>link.coach_id===profile?.id).map(link=>link.student_id));return (requests.data??[]).filter(row=>admin||student&&row.student_id===profile?.id||coach&&assigned.has(row.student_id));},[requests.data,links.data,admin,student,coach,profile?.id]);
  const studentLabel=(row:Row)=>String(row.student_id===profile?.id?profile.full_name:(profiles.data??[]).find(person=>person.id===row.student_id)?.full_name||'Academy student');
  const windows=admin?availability.data??[]:[];
  const loading=appointments.isLoading||((admin||student||coach)&&ready&&requests.isLoading)||(admin&&availability.isLoading)||(!admin&&!student&&links.isLoading);
  const loadError=Boolean(appointments.error||((admin||student||coach)&&requests.error)||(admin&&availability.error)||(!admin&&!student&&links.error));
  useEffect(() => {
    const requestId=searchParams.get('request'), schedule=searchParams.get('action')==='schedule';
    const link=requestId||(schedule?'schedule':'');
    if(!link||loading||loadError||handledLink.current===link)return;
    if(requestId){const row=visibleRequests.find(item=>item.id===requestId);if(!row)return;setDetail(row);}
    else if(admin)setAction({day:dayInTimezone(new Date(),timezone),mode:'schedule'});
    handledLink.current=link;
  }, [searchParams,loading,loadError,admin,visibleRequests,timezone]);
  const displayedRequests=searchParams.get('filter')==='pending'?visibleRequests.filter(row=>['pending','reschedule_requested','cancellation_requested'].includes(String(row.status))):visibleRequests;
  async function save(data:LessonDraft) {
    if(!profile||!action)throw new Error('Sign in again to save.');
    if(!admin&&!student)throw new Error('Founder scheduling approval is required.');
    if(student&&action.mode!=='request')throw new Error('Student accounts may submit lesson requests only.');
    validateCoachingRange(data.start,data.end);
    // Re-read current rows before saving; server policies, approval RPC and exclusion constraint remain authoritative.
    const currentAppointments=await listRows('hka_appointments');
    const currentWindows=admin?await listRows('hka_owner_availability'):[];
    if(action.mode==='available'||action.mode==='unavailable'){
      if(action.mode==='unavailable'&&currentAppointments.some(row=>row.coach_id===profile.id&&row.status==='scheduled'&&Date.parse(String(row.starts_at))<Date.parse(data.end)&&Date.parse(String(row.starts_at))+Number(row.duration_minutes)*60000>Date.parse(data.start)))throw new Error('A confirmed lesson overlaps this block.');
      await saveRow('hka_owner_availability',{coach_id:profile.id,starts_at:data.start,ends_at:data.end,availability_type:action.mode,note:data.note});
      setMessage(action.mode==='available'?'Teaching window saved.':'Blocked time saved.');
    }else{
      const conflict=coachingConflict(data.start,data.duration,currentAppointments,currentWindows,admin?String(action.appointment?.coach_id||profile.id):undefined,admin?data.student:profile.id,String(action.request?.appointment_id||''));
      if(conflict)throw new Error(conflict);
      if(action.mode==='request'){
        await saveRow('hka_coaching_requests',{student_id:profile.id,service_id:data.service||null,lesson_format:data.format,preferred_starts_at:data.start,alternate_starts_at:data.alternate,duration_minutes:data.duration,learning_goals:data.goals,location:data.location,status:'pending'});
        setMessage('Lesson request sent · pending Founder confirmation. This is not a confirmed booking.');
      }else if(action.mode==='reschedule'&&action.appointment){
        await saveRow('hka_appointments',{starts_at:data.start,duration_minutes:data.duration,location:data.location,title:data.title},action.appointment.id);
        setMessage('Confirmed lesson rescheduled.');
      }else if(action.mode==='schedule'){
        if(!authorisedStudents.some(row=>row.id===data.student))throw new Error('Choose an authorised student.');
        await saveRow('hka_appointments',{student_id:data.student,coach_id:profile.id,title:data.title,starts_at:data.start,duration_minutes:data.duration,location:data.location,status:'scheduled'});
        setMessage('Lesson saved and confirmed.');
      }else if(action.mode==='approve'&&action.request){
        await rpc('hka_approve_coaching_request',{target_request:action.request.id,approved_start:data.start,assigned_coach:profile.id});
        setMessage('Lesson approved and added to calendar.');
      }else if(action.mode==='alternative'&&action.request){
        await saveRow('hka_coaching_requests',{status:'alternative_proposed',preferred_starts_at:data.start,owner_message:data.note+'\nProposed time: '+formatCoachingTime(data.start,timezone),updated_at:new Date().toISOString()},action.request.id);
        setMessage('Alternative proposed. Confirmation remains pending.');
      }else throw new Error('Choose a supported scheduling action.');
    }
    await refresh();setFailure('');
  }
  async function confirmAppointmentCancellation(){
    if(!admin||!cancelAppointment||lock.current)return;
    lock.current=true;setBusy(true);setFailure('');
    try{const linked=visibleRequests.find(row=>row.appointment_id===cancelAppointment.id);
      if(linked){if(linked.status!=='cancellation_requested')await saveRow('hka_coaching_requests',{status:'cancellation_requested'},linked.id);await rpc('hka_review_coaching_cancellation',{target_request:linked.id,approve:true});}
      else await saveRow('hka_appointments',{status:'cancelled'},cancelAppointment.id);
      await refresh();setCancelAppointment(null);setMessage('Lesson cancellation confirmed.');
    }catch(error){setFailure(errorText(error));}finally{setBusy(false);lock.current=false;}
  }
  async function transition(row:Row,kind:'reschedule'|'cancel'|'decline'|'keep'|'cancel-approve'|'cancel-decline',close?:()=>void){
    if(!profile||lock.current)return;lock.current=true;setBusy(true);setFailure('');setMessage('');
    try{
      if(student){
        if(row.student_id!==profile.id)throw new Error('This request belongs to another account.');
        if(!['pending','approved','alternative_proposed'].includes(String(row.status)))throw new Error('Request no longer supports this action.');
        const status=kind==='reschedule'?'reschedule_requested':row.status==='approved'?'cancellation_requested':'cancelled';
        if(kind!=='reschedule'&&kind!=='cancel')throw new Error('Founder approval required.');
        await saveRow('hka_coaching_requests',{status,updated_at:new Date().toISOString()},row.id);
        setMessage(status==='cancelled'?'Request cancelled.':'Request sent for Founder review. Confirmed lesson stays unchanged until approved.');
      }else if(admin){
        if(kind==='cancel-approve'||kind==='cancel-decline')await rpc('hka_review_coaching_cancellation',{target_request:row.id,approve:kind==='cancel-approve'});
        else if(kind==='decline'||kind==='keep')await saveRow('hka_coaching_requests',{status:row.appointment_id?'approved':'declined',updated_at:new Date().toISOString()},row.id);
        else throw new Error('Choose a permitted Founder action.');
        setMessage('Founder decision saved.');
      }else throw new Error('Founder approval required.');
      await refresh();setDetail(null);close?.();
    }catch(error){setFailure(errorText(error));}finally{setBusy(false);lock.current=false;}
  }
  function actions(row:Row,kind:'appointment'|'request',close?:()=>void){
    if(admin&&kind==='appointment')return <div className='flex flex-wrap gap-2'><Button type='button' onClick={()=>{close?.();setAction({day:dayInTimezone(new Date(String(row.starts_at)),timezone),mode:'reschedule',appointment:row,request:{...row,appointment_id:row.id,preferred_starts_at:row.starts_at,lesson_format:String(row.title).toLowerCase().includes('in-person')?'in_person':'online'}});}}>Reschedule lesson</Button><Button type='button' variant='outline' onClick={()=>{close?.();setCancelAppointment(row);}}>Cancel lesson</Button></div>;

    const request=kind==='request'?row:visibleRequests.find(item=>item.appointment_id===row.id);
    if(!request)return <p className='text-xs text-muted-foreground'>Contact Founder to request changes to this appointment.</p>;
    return <div className='space-y-3'><div className='flex flex-wrap gap-2'>
      {student&&request.student_id===profile?.id&&['pending','alternative_proposed','approved'].includes(String(request.status))&&<><Button type='button' variant='outline' disabled={busy} onClick={()=>void transition(request,'reschedule',close)}>Request reschedule</Button><Button type='button' variant='outline' disabled={busy} onClick={()=>void transition(request,'cancel',close)}>{request.status==='approved'?'Request cancellation':'Cancel request'}</Button></>}
      {admin&&['pending','reschedule_requested','alternative_proposed'].includes(String(request.status))&&<><Button type='button' disabled={busy} onClick={()=>{close?.();setDetail(null);setAction({day:dayInTimezone(new Date(String(request.preferred_starts_at)),timezone),mode:'approve',request});}}>Review and approve</Button><Button type='button' variant='outline' disabled={busy} onClick={()=>{close?.();setDetail(null);setAction({day:dayInTimezone(new Date(String(request.preferred_starts_at)),timezone),mode:'alternative',request});}}>Propose alternative</Button><Button type='button' variant='ghost' disabled={busy} onClick={()=>void transition(request,request.appointment_id?'keep':'decline',close)}>{request.appointment_id?'Keep lesson':'Decline request'}</Button></>}
      {admin&&request.status==='cancellation_requested'&&<><Button type='button' disabled={busy} onClick={()=>void transition(request,'cancel-approve',close)}>Approve cancellation</Button><Button type='button' variant='outline' disabled={busy} onClick={()=>void transition(request,'cancel-decline',close)}>Keep lesson</Button></>}
    </div>{failure&&<p role='alert' className='text-sm text-destructive'>{failure}</p>}</div>;
  }
  if(!profile)return null;
  if(!ready&&(admin||student))return <p className='paper-card p-6'>Coaching requests await academy activation.</p>;
  return <div className='space-y-6'>
    <div className='flex flex-wrap items-center justify-between gap-3'><div><p className='eyebrow text-[#826e45]'>Coaching workspace</p><h2 className='mt-2 font-serif text-3xl'>Make time to progress.</h2></div>{(admin||student)&&<Button type='button' disabled={loading||loadError} onClick={()=>{setFailure('');const day=dayInTimezone(new Date(),timezone);if(admin){setDayActions(day);}else{setAction({day,mode:'request'});}}}>{admin?'Plan a lesson':'Request a Lesson'}</Button>}</div>
    {message&&<p role='status' className='rounded-lg border border-[#B79B62]/40 bg-background p-4 text-sm'>{message}</p>}
    {failure&&!detail&&<p role='alert' className='text-sm text-destructive'>{failure}</p>}
    {!admin&&<p className='text-xs leading-6 text-muted-foreground'>{student?'Suggest a preferred time; teaching availability is unconfirmed until Founder approval.':coach?'You can view lessons for your authorised students. Scheduling and teaching availability are managed by Founder.':'Only verified linked children appear. Existing permissions require lesson requests to be submitted by the student or arranged with Founder.'}</p>}
    <CoachingCalendar selectedAppointmentId={searchParams.get('appointment')??undefined} appointments={visibleAppointments.map(row=>({...row,participant_label:studentLabel(row)}))} availability={windows} requests={visibleRequests.map(row=>({...row,participant_label:studentLabel(row)}))} timezone={timezone} loading={loading} error={loadError}
      heading={admin?'Academy teaching calendar':student?'Your lesson calendar':coach?'Your authorised teaching schedule':'Family lesson calendar'}
      actionLabel={admin?'Plan this day':'Request a Lesson'} onRequest={admin||student?day=>{setFailure('');if(admin){setDayActions(day);}else{setAction({day,mode:'request'});}}:undefined}
      renderActions={actions}/>
    <section className='paper-card p-5 sm:p-6'><h3 className='font-serif text-2xl'>Lesson requests</h3><p className='mt-2 text-xs text-muted-foreground'>Open a request to see details and permitted actions.</p>{searchParams.get('filter')==='pending'&&<Button type='button' variant='ghost' className='mt-2' onClick={()=>{const next=new URLSearchParams(searchParams);next.delete('filter');setSearchParams(next);}}>Show all requests</Button>}<div className='mt-4 grid gap-3 sm:grid-cols-2'>{displayedRequests.map(row=><button key={row.id} type='button' className='rounded-lg border border-primary/15 p-4 text-left hover:bg-primary/5' onClick={()=>{setFailure('');setDetail(row);}}><strong className='text-sm capitalize'>{String(row.lesson_format).replace('_',' ')} lesson</strong><span className='mt-1 block text-xs text-muted-foreground'>{formatCoachingTime(row.preferred_starts_at,timezone)}</span><span className='mt-2 inline-block rounded-full bg-[#B79B62]/15 px-2 py-1 text-[11px]'>{String(row.status).replace(/_/g,' ')}</span></button>)}</div>{!loading&&!displayedRequests.length&&<p className='mt-4 text-sm text-muted-foreground'>{profile.role==='guardian'?'Lesson requests follow student and Founder permissions.':'No lesson requests recorded.'}</p>}</section>
    <WorkflowDialog open={Boolean(dayActions)} onOpenChange={open=>{if(!open)setDayActions('');}} title='Plan your teaching day' description={dayActions+' · '+timezone}>
      <div className='grid gap-3'>{([['schedule','Schedule a lesson','Choose a student and confirm lesson details.'],['available','Publish availability','Record a teaching window.'],['unavailable','Block time','Keep time clear of new lessons.']] as const).map(([mode,title,description])=><Button key={mode} type='button' variant='outline' className='h-auto justify-start whitespace-normal p-4 text-left' disabled={profiles.isLoading||Boolean(profiles.error)} onClick={()=>{setAction({day:dayActions,mode});setDayActions('');}}><span><strong className='block'>{title}</strong><span className='mt-1 block text-xs font-normal'>{description}</span></span></Button>)}{profiles.error&&<p role='alert'>Authorised student records could not be loaded.</p>}<h3 className='mt-3 font-serif text-xl'>Appointments on this day</h3>{visibleAppointments.filter(row=>row.status==='scheduled'&&dayInTimezone(new Date(String(row.starts_at)),timezone)===dayActions).map(row=><p key={row.id} className='rounded-lg border border-primary/15 p-3 text-sm'>{String(row.title)} · {formatCoachingTime(row.starts_at,timezone)}</p>)}{!visibleAppointments.some(row=>row.status==='scheduled'&&dayInTimezone(new Date(String(row.starts_at)),timezone)===dayActions)&&<p className='text-sm text-muted-foreground'>No confirmed appointments.</p>}</div>
    </WorkflowDialog>
    {action&&<LessonWorkflow key={action.mode+action.day+action.request?.id} {...action} timezone={timezone} students={authorisedStudents} services={services.data??[]} appointments={visibleAppointments} availability={windows} coachId={String(action.appointment?.coach_id||profile.id)} onClose={()=>setAction(null)} onSave={save}/>}
    <WorkflowDialog open={Boolean(cancelAppointment)} onOpenChange={open=>{if(!open)setCancelAppointment(null);}} title='Cancel confirmed lesson?' description='Founder approval removes this appointment from the confirmed schedule.' busy={busy}>{cancelAppointment&&<div className='space-y-4'><p className='text-sm'>{String(cancelAppointment.title)} · {formatCoachingTime(cancelAppointment.starts_at,timezone)}</p>{failure&&<p role='alert' className='text-sm text-destructive'>{failure}</p>}<div className='flex flex-wrap gap-2'><Button type='button' variant='destructive' disabled={busy} onClick={()=>void confirmAppointmentCancellation()}>{busy?'Saving…':'Confirm cancellation'}</Button><Button type='button' variant='outline' disabled={busy} onClick={()=>setCancelAppointment(null)}>Keep lesson</Button></div></div>}</WorkflowDialog><WorkflowDialog open={Boolean(detail)} onOpenChange={open=>{if(!open)setDetail(null);}} title='Lesson request details' description={'Saved request · '+timezone} busy={busy}>{detail&&<div className='space-y-4 text-sm'><p className='capitalize'>{String(detail.status).replace(/_/g,' ')}</p><p>{formatCoachingTime(detail.preferred_starts_at,timezone)} · {String(detail.duration_minutes)} minutes</p>{detail.alternate_starts_at&&<p>Alternative: {formatCoachingTime(detail.alternate_starts_at,timezone)}</p>}<p className='whitespace-pre-wrap'>{String(detail.learning_goals)}</p>{detail.location&&<p>Location: {String(detail.location)}</p>}{detail.owner_message&&<p className='whitespace-pre-wrap'>Founder: {String(detail.owner_message)}</p>}{actions(detail,'request')}</div>}</WorkflowDialog>
  </div>;
}
