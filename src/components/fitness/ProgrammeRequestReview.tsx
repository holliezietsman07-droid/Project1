import { showSuccess } from '@/utils/toast';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { errorText } from '@/lib/academy';
import type { FitnessController } from '@/hooks/use-fitness';
import type { ProgrammeRequest } from '@/lib/fitness/requests';
import { PlanEditor } from './ProgrammeEditor';
import { WeeklyPlan } from './WeeklyProgramme';

export function ProgrammeRequestReview({c,request,onBack}:{
  c:FitnessController;request:ProgrammeRequest;onBack:()=>void;
}){
  const detail=useQuery({
    queryKey:['fitness-request-detail',c.sample?'sample':c.profile?.id,request.id],
    queryFn:()=>c.openRequest(request.id),
    gcTime:0,
    staleTime:Infinity,
    retry:false,
  });
  const [creating,setCreating]=useState(false);
  const [sending,setSending]=useState(false);
  const [message,setMessage]=useState('');
  const subject=c.data.subjects.find(item=>item.id===(request.horse_id??request.student_id)&&item.student_id===request.student_id&&!item.archivedHorseId);
  const programme=c.data.programmes.find(item=>item.id===request.programme_id);
  const member=c.data.subjects.find(item=>item.id===request.student_id&&item.kind==='rider')?.name??'HKA member';

  async function sendAssignedProgramme(){
    if(sending)return;
    setSending(true);
    setMessage('');
    try{await c.sendRequestedProgramme(request.id,null);showSuccess(c.sample?'Programme sent in the sample chat.':'Programme sent in chat.');}
    catch(error){setMessage(errorText(error));}
    finally{setSending(false);}
  }

  return <div className='space-y-5'>
    {c.sample ? <Button type='button' variant='ghost' className='min-h-11 gap-2' onClick={onBack}><ArrowLeft className='size-4' aria-hidden='true'/>Back to sample chat</Button>
      : <Button asChild variant='ghost' className='min-h-11 gap-2'><Link to={'/dashboard/admin?section=messages&contact='+encodeURIComponent(request.student_id)}><ArrowLeft className='size-4' aria-hidden='true'/>Back to chat</Link></Button>}
    <section className='paper-card space-y-4 p-5 sm:p-6'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0'>
          <p className='eyebrow text-[#826e45]'>Private programme request</p>
          <h2 className='mt-2 break-words font-serif text-3xl'>{request.kind==='horse'?request.horse_name+' · Conditioning':member+' · Rider Fitness'}</h2>
          <p className='mt-2 text-sm text-muted-foreground'>{request.kind==='horse'?member+' · ':''}{new Date(request.created_at).toLocaleDateString(undefined,{dateStyle:'medium'})}</p>
        </div>
        {request.reply_message_id&&<span className='rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold'>Programme sent</span>}
      </div>
      {detail.isLoading&&<p role='status' className='text-sm'>Opening the submitted details…</p>}
      {detail.error&&<p role='alert' className='text-sm text-destructive'>{errorText(detail.error)}</p>}
      {detail.data&&<dl className='grid gap-3 sm:grid-cols-2'>
        <div className='space-y-1 rounded-lg bg-primary/5 p-3'>
          <dt className='font-semibold'>Goals &amp; profile</dt>
          <dd className='whitespace-pre-wrap break-words text-sm'>{detail.data.intake.goals||'Goals pending'}</dd>
          <dd className='break-words text-xs text-muted-foreground'>
            {[detail.data.intake.age===null?'':detail.data.intake.age+' years',detail.data.intake.condition,...detail.data.intake.disciplines].filter(Boolean).join(' · ')}
          </dd>
        </div>
        <div className='space-y-1 rounded-lg bg-primary/5 p-3'>
          <dt className='font-semibold'>Training schedule</dt>
          <dd className='break-words text-sm'>{detail.data.intake.days.join(', ')||'Days pending'} · {detail.data.intake.minutes} minutes per session</dd>
          <dd className='whitespace-pre-wrap break-words text-xs text-muted-foreground'>{detail.data.intake.equipment}</dd>
        </div>
        {request.kind==='horse'&&<div className='space-y-1 rounded-lg bg-primary/5 p-3'>
          <dt className='font-semibold'>Recent work &amp; time off</dt>
          <dd className='whitespace-pre-wrap break-words text-sm'>{detail.data.intake.recentWork||'Recent workload pending'}</dd>
          <dd className='break-words text-xs text-muted-foreground'>Time off · {detail.data.intake.timeOff||'Review with the owner'}</dd>
        </div>}
        <div className='space-y-1 rounded-lg bg-primary/5 p-3'>
          <dt className='font-semibold'>Wellbeing</dt>
          <dd className='break-words text-sm'>{detail.data.intake.health.join(', ')||'No concerns selected'}</dd>
          <dd className='whitespace-pre-wrap break-words text-sm'>{detail.data.intake.professionalInstructions}</dd>
        </div>
      </dl>}
      {detail.data&&<div className='flex flex-wrap gap-2'>
        {subject&&!programme&&!creating&&<Button type='button' disabled={!c.writable} className='min-h-11 rounded-lg' onClick={()=>setCreating(true)}>Create personalised programme</Button>}
        {programme?.status==='assigned'&&!programme.draft_version_id&&!request.reply_message_id&&
          <Button type='button' disabled={sending||!c.writable} className='min-h-11 rounded-lg' onClick={()=>void sendAssignedProgramme()}>Send programme in chat</Button>}
        {!c.sample&&<Button asChild variant='outline' className='min-h-11 rounded-lg'><Link to={'/dashboard/students/'+encodeURIComponent(request.student_id)+'?section=fitness'}>Open student fitness record</Link></Button>}
      </div>}
      {!subject&&<p role='status' className='text-sm text-muted-foreground'>The original fitness profile is archived or unavailable.</p>}
      {message&&<p role='alert' className='text-sm text-destructive'>{message}</p>}
    </section>
    {creating&&detail.data&&subject&&!programme&&<PlanEditor c={c} subject={{...subject,intake:detail.data.intake}} requestId={request.id} close={()=>setCreating(false)}/>}
    {programme&&subject&&<WeeklyPlan key={programme.id} c={c} subject={subject} p={programme} requestId={request.reply_message_id?undefined:request.id}/>}
  </div>;
}
