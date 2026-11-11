import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, FilePlus2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from '@/contexts/SessionContext';
import { useRows } from '@/hooks/use-academy';
import { useFitnessRequests } from '@/hooks/use-fitness-requests';
import { FounderLinkApprovals, FounderRoleApprovals } from '@/components/accounts/AccountRoles';
import { founderDay } from '@/lib/dashboard-workspace';
import { formatCoachingTime } from '@/lib/coaching';
import { scheduleRegion } from '@/lib/schedule-region';

export function FounderDailyWorkspace() {
  const { profile }=useSession();
  const profiles=useRows('hka_profiles'), courses=useRows('hka_courses'), submissions=useRows('hka_submissions');
  const requests=useRows('hka_coaching_requests'), appointments=useRows('hka_appointments');
  const messages=useRows('hka_messages'), audit=useRows('hka_audit');
  const fitness=useFitnessRequests(profile?.role==='admin');
  const queries=[profiles,courses,submissions,requests,appointments,messages,audit];
  if(!profile||profile.role!=='admin')return null;
  if(queries.some(query=>query.isLoading))return <p role='status' className='text-sm'>Preparing your teaching day…</p>;
  if(queries.some(query=>query.error))return <section className='paper-card p-6'><p role='alert'>Some workspace records could not be loaded.</p><Button variant='outline' className='mt-4' onClick={()=>{for(const query of queries)if(query.error)void query.refetch();}}>Try again</Button></section>;
  const day=founderDay(appointments.data??[],requests.data??[],submissions.data??[],courses.data??[],profile.timezone);
  const name=(id:unknown)=>String((profiles.data??[]).find(row=>row.id===id)?.full_name??'Academy student');
  const unread=(messages.data??[]).filter(row=>row.recipient_id===profile.id&&!row.read_at);
  const pendingFitness=(fitness.data??[]).filter(row=>row.founder_id===profile.id&&!row.reply_message_id);
  const queues=[
    {label:'Coaching requests',count:day.pending.length,href:'/dashboard/admin?section=coaching&filter=pending',detail:day.pending[0]&&'/dashboard/admin?section=coaching&request='+day.pending[0].id},
    {label:'Fitness requests',count:pendingFitness.length,href:'/dashboard/programmes',detail:pendingFitness[0]&&'/dashboard/programmes?request='+pendingFitness[0].id},
    {label:'Assignments to mark',count:day.marking.length,href:'/dashboard/academy?tab=reviews',detail:day.marking[0]&&'/dashboard/academy?tab=reviews&submission='+day.marking[0].id},
    {label:'Unread messages',count:unread.length,href:'/dashboard/admin?section=messages',detail:unread[0]&&'/dashboard/admin?section=messages&contact='+unread[0].sender_id},
  ];
  const outstanding=queues.filter(queue=>queue.count>0);
  return <div className='space-y-4'>
    <div className='grid gap-3 lg:grid-cols-2'>
      <section className='paper-card p-4 sm:p-5' aria-labelledby='founder-attention'>
        <h2 id='founder-attention' className='font-serif text-2xl'>Needs your attention</h2>
        {outstanding.length?<ul className='mt-2 space-y-1'>{outstanding.map(queue=><li key={queue.label} className='flex items-center gap-2 rounded-lg border border-primary/10 px-3'>
          <Link to={queue.detail||queue.href} className='flex min-h-11 min-w-0 flex-1 items-center gap-2 text-sm font-medium hover:underline'>
            <span className='rounded-full bg-primary/10 px-2 py-0.5 text-xs'>{queue.count}</span>{queue.label}<ArrowRight className='ml-auto size-4 shrink-0' aria-hidden='true'/>
          </Link>
          {queue.count>1&&<Link to={queue.href} className='inline-flex min-h-11 items-center px-1 text-xs underline' aria-label={'View all '+queue.label.toLowerCase()}>View all</Link>}
        </li>)}</ul>:<p className='mt-2 text-sm text-muted-foreground'>You’re caught up.</p>}
        {fitness.isError&&<p role='status' className='mt-2 text-sm text-muted-foreground'>Fitness requests could not be loaded. <Link to='/dashboard/programmes' className='underline'>Open Programme Management</Link></p>}
      </section>
      <section className='paper-card p-4 sm:p-5 order-3 lg:col-start-2 lg:row-start-1 lg:row-span-2'><div className='flex flex-wrap items-center justify-between gap-3'><h2 className='font-serif text-2xl'>Today’s Schedule</h2><Link to='/dashboard/account' title={'Schedule time zone '+profile.timezone} className='rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10'>{scheduleRegion(profile.timezone)}</Link></div>
        {day.today.length?<ol className='mt-5 space-y-3'>{day.today.slice(0,2).map(row=><li key={row.id}><Link to={'/dashboard/admin?section=coaching&appointment='+row.id} className='block rounded-lg border border-primary/15 p-4 hover:bg-primary/5'><strong className='text-sm'>{String(row.title)}</strong><span className='mt-1 block text-xs text-muted-foreground'>{name(row.student_id)} · {formatCoachingTime(row.starts_at,profile.timezone)} · {String(row.duration_minutes)} min</span>{row.location&&<span className='mt-1 block text-xs'>{String(row.location)}</span>}</Link></li>)}</ol>:<p className='mt-4 text-sm text-muted-foreground'>No confirmed lessons today.</p>}
        {day.upcoming.find(row=>!day.today.some(today=>today.id===row.id))&&<p className='mt-4 text-xs leading-6 text-muted-foreground'>Next lesson: {formatCoachingTime(day.upcoming.find(row=>!day.today.some(today=>today.id===row.id))!.starts_at,profile.timezone)}</p>}
        <Link className='mt-2 inline-flex min-h-10 items-center text-sm underline' to='/dashboard/admin?section=coaching&filter=upcoming'>View schedule</Link>
      </section>
    <section className='paper-card p-4 sm:p-5 lg:col-start-1 lg:row-start-2'><h2 className='font-serif text-xl'>Quick actions</h2><div className='mt-2 flex flex-wrap gap-2'>
      <Button asChild><Link to='/dashboard/academy?tab=courses&action=create'><FilePlus2 aria-hidden='true'/>Create Course</Link></Button>
      <Button asChild variant='outline'><Link to='/dashboard/admin?section=coaching&action=schedule'><CalendarDays aria-hidden='true'/>Schedule Lesson</Link></Button>
      <Button asChild variant='outline'><Link to='/dashboard/admin?section=students'><Users aria-hidden='true'/>Open Student Directory</Link></Button>
      <Button asChild variant='outline'><Link to='/dashboard/admin?section=students&action=assignment'><FilePlus2 aria-hidden='true'/>Create Assignment</Link></Button>
    </div></section>
    </div>
    <section className='paper-card p-6'><h2 className='font-serif text-2xl'>Courses in Preparation</h2>{day.drafts.length?<ul className='mt-4 space-y-3'>{day.drafts.map(row=><li key={row.id}><Link className='flex items-center justify-between gap-3 rounded-lg border border-primary/15 p-4 text-sm hover:bg-primary/5' to={'/dashboard/academy?tab=courses&course='+row.id}><span>{String(row.title)}<span className='mt-1 block text-xs text-muted-foreground'>Draft · open, complete and preview</span></span><ArrowRight className='size-4 shrink-0' aria-hidden='true'/></Link></li>)}</ul>:<p className='mt-4 text-sm text-muted-foreground'>No unpublished course drafts.</p>}{!(courses.data??[]).some(row=>row.published&&!row.archived_at)&&<p className='mt-4 rounded-lg bg-[#F6F1E7] p-4 text-sm leading-6'>No courses are published. Complete a real draft, preview its lessons, then choose Publish when ready.</p>}</section>
    <div className='grid gap-6 lg:grid-cols-2'><FounderRoleApprovals/><FounderLinkApprovals/></div>
    <details className='paper-card p-6'><summary className='cursor-pointer font-serif text-2xl'>Recent academy activity</summary><ul className='mt-4 divide-y divide-primary/10'>{[...(audit.data??[])].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,8).map(row=><li key={row.id} className='py-3 text-sm'>{String(row.action)}<span className='mt-1 block text-xs text-muted-foreground'>{formatCoachingTime(row.created_at,profile.timezone)}</span></li>)}</ul>{!audit.data?.length&&<p className='mt-4 text-sm text-muted-foreground'>No activity recorded.</p>}</details>
  </div>;
}
