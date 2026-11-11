import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, FilePlus2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from '@/contexts/SessionContext';
import { useRows } from '@/hooks/use-academy';
import { FounderLinkApprovals, FounderRoleApprovals } from '@/components/accounts/AccountRoles';
import { founderDay } from '@/lib/dashboard-workspace';
import { formatCoachingTime } from '@/lib/coaching';
import { scheduleRegion } from '@/lib/schedule-region';

export function FounderDailyWorkspace() {
  const { profile }=useSession();
  const profiles=useRows('hka_profiles'), courses=useRows('hka_courses'), submissions=useRows('hka_submissions');
  const requests=useRows('hka_coaching_requests'), appointments=useRows('hka_appointments');
  const messages=useRows('hka_messages'), audit=useRows('hka_audit');
  const queries=[profiles,courses,submissions,requests,appointments,messages,audit];
  if(!profile||profile.role!=='admin')return null;
  if(queries.some(query=>query.isLoading))return <p role='status' className='text-sm'>Preparing your teaching day…</p>;
  if(queries.some(query=>query.error))return <section className='paper-card p-6'><p role='alert'>Some workspace records could not be loaded.</p><Button variant='outline' className='mt-4' onClick={()=>{for(const query of queries)if(query.error)void query.refetch();}}>Try again</Button></section>;
  const day=founderDay(appointments.data??[],requests.data??[],submissions.data??[],courses.data??[],profile.timezone);
  const students=(profiles.data??[]).filter(row=>row.role==='student');
  const name=(id:unknown)=>String((profiles.data??[]).find(row=>row.id===id)?.full_name??'Academy student');
  const unread=(messages.data??[]).filter(row=>row.recipient_id===profile.id&&!row.read_at);
  const attentionIds=[...new Set([...day.attentionIds,...unread.map(row=>String(row.student_id))])];
  const cards=[
    {title:'Pending Coaching Requests',count:day.pending.length,to:'/dashboard/admin?section=coaching&filter=pending'},
    {title:'Upcoming Lessons',count:day.upcoming.length,to:'/dashboard/admin?section=coaching&filter=upcoming'},
    {title:'Assignments to Mark',count:day.marking.length,to:'/dashboard/academy?tab=reviews'},
    {title:'Course Drafts',count:day.drafts.length,to:'/dashboard/academy?tab=courses&filter=drafts'},
    {title:'Students Requiring Attention',count:attentionIds.length,to:'/dashboard/admin?section=students&filter=attention'},
  ];
  return <div className='space-y-6'>
    <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-5'>{cards.map(card=><Link key={card.title} to={card.to} className='paper-card flex min-h-28 flex-col justify-between p-5 transition hover:border-[#B79B62] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'><span className='flex items-start justify-between gap-2 text-xs text-muted-foreground'>{card.title}<ArrowRight aria-hidden='true' className='size-4 shrink-0'/></span><strong className='mt-3 font-serif text-3xl'>{card.count}</strong></Link>)}</div>
    <div className='grid gap-6 lg:grid-cols-2'>
      <section className='paper-card p-6'><div className='flex flex-wrap items-center justify-between gap-3'><h2 className='font-serif text-3xl'>Today’s Schedule</h2><Link to='/dashboard/account' title={'Schedule time zone '+profile.timezone} className='rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10'>{scheduleRegion(profile.timezone)}</Link></div>
        {day.today.length?<ol className='mt-5 space-y-3'>{day.today.map(row=><li key={row.id}><Link to={'/dashboard/admin?section=coaching&appointment='+row.id} className='block rounded-lg border border-primary/15 p-4 hover:bg-primary/5'><strong className='text-sm'>{String(row.title)}</strong><span className='mt-1 block text-xs text-muted-foreground'>{name(row.student_id)} · {formatCoachingTime(row.starts_at,profile.timezone)} · {String(row.duration_minutes)} min</span>{row.location&&<span className='mt-1 block text-xs'>{String(row.location)}</span>}</Link></li>)}</ol>:<p className='mt-4 text-sm text-muted-foreground'>No confirmed lessons today.</p>}
        {day.upcoming.find(row=>!day.today.some(today=>today.id===row.id))&&<p className='mt-4 text-xs leading-6 text-muted-foreground'>Next lesson: {formatCoachingTime(day.upcoming.find(row=>!day.today.some(today=>today.id===row.id))!.starts_at,profile.timezone)}</p>}
      </section>
      <section className='paper-card p-6'><h2 className='font-serif text-3xl'>Items Needing Attention</h2><ul className='mt-5 space-y-3'>
        {day.pending.slice(0,3).map(row=><li key={row.id} className='flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/15 p-4'><span className='text-sm'><strong>{name(row.student_id)}</strong><span className='mt-1 block text-xs text-muted-foreground'>{String(row.status).replace(/_/g,' ')} · coaching</span></span><Button asChild size='sm' variant='outline'><Link to={'/dashboard/admin?section=coaching&request='+row.id}>Review</Link></Button></li>)}
        {day.marking.slice(0,3).map(row=><li key={row.id} className='flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/15 p-4'><span className='text-sm'><strong>{name(row.student_id)}</strong><span className='mt-1 block text-xs text-muted-foreground'>Submitted work awaiting marking</span></span><Button asChild size='sm' variant='outline'><Link to={'/dashboard/academy?tab=reviews&submission='+row.id}>Mark</Link></Button></li>)}
        {unread.slice(0,2).map(row=><li key={row.id} className='flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/15 p-4'><span className='text-sm'>Unread message from {name(row.sender_id)}</span><Button asChild size='sm' variant='outline'><Link to={'/dashboard/admin?section=messages&student='+row.student_id}>Respond</Link></Button></li>)}
      </ul>{!day.pending.length&&!day.marking.length&&!unread.length&&<p className='mt-4 text-sm text-muted-foreground'>No outstanding coaching requests, submitted work or unread messages.</p>}</section>
    </div>
    <section className='paper-card p-6'><h2 className='font-serif text-2xl'>Quick Actions</h2><div className='mt-4 flex flex-wrap gap-3'>
      <Button asChild><Link to='/dashboard/academy?tab=courses&action=create'><FilePlus2 aria-hidden='true'/>Create Course</Link></Button>
      <Button asChild variant='outline'><Link to='/dashboard/admin?section=coaching&action=schedule'><CalendarDays aria-hidden='true'/>Schedule Lesson</Link></Button>
      <Button asChild variant='outline'><Link to='/dashboard/admin?section=students'><Users aria-hidden='true'/>Open Student Directory</Link></Button>
      <Button asChild variant='outline'><Link to='/dashboard/admin?section=students&action=assignment'><FilePlus2 aria-hidden='true'/>Create Assignment</Link></Button>
    </div></section>
    <section className='paper-card p-6'><h2 className='font-serif text-2xl'>Courses in Preparation</h2>{day.drafts.length?<ul className='mt-4 space-y-3'>{day.drafts.map(row=><li key={row.id}><Link className='flex items-center justify-between gap-3 rounded-lg border border-primary/15 p-4 text-sm hover:bg-primary/5' to={'/dashboard/academy?tab=courses&course='+row.id}><span>{String(row.title)}<span className='mt-1 block text-xs text-muted-foreground'>Draft · open, complete and preview</span></span><ArrowRight className='size-4 shrink-0' aria-hidden='true'/></Link></li>)}</ul>:<p className='mt-4 text-sm text-muted-foreground'>No unpublished course drafts.</p>}{!(courses.data??[]).some(row=>row.published&&!row.archived_at)&&<p className='mt-4 rounded-lg bg-[#F6F1E7] p-4 text-sm leading-6'>No courses are published. Complete a real draft, preview its lessons, then choose Publish when ready.</p>}</section>
    <div className='grid gap-6 lg:grid-cols-2'><FounderRoleApprovals/><FounderLinkApprovals/></div>
    <details className='paper-card p-6'><summary className='cursor-pointer font-serif text-2xl'>Recent academy activity</summary><ul className='mt-4 divide-y divide-primary/10'>{[...(audit.data??[])].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,8).map(row=><li key={row.id} className='py-3 text-sm'>{String(row.action)}<span className='mt-1 block text-xs text-muted-foreground'>{formatCoachingTime(row.created_at,profile.timezone)}</span></li>)}</ul>{!audit.data?.length&&<p className='mt-4 text-sm text-muted-foreground'>No activity recorded.</p>}</details>
  </div>;
}
