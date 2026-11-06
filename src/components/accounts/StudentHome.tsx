import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from '@/contexts/SessionContext';
import { useRows } from '@/hooks/use-academy';
import { RiderPreferencesEditor } from '@/components/accounts/RiderPreferencesEditor';
import { studentJourney, riderPreferences } from '@/lib/dashboard-workspace';
import { formatCoachingTime } from '@/lib/coaching';
import { pathways } from '@/lib/hka-content';

export function StudentHome() {
  const { profile } = useSession();
  const roles=useRows('hka_account_roles'), courses=useRows('hka_courses'), lessons=useRows('hka_lessons');
  const filters = { student_id: profile?.id ?? '' };
  const enrolments=useRows('hka_enrolments',filters), progress=useRows('hka_progress',filters);
  const submissions=useRows('hka_submissions',filters), appointments=useRows('hka_appointments',filters);
  const requests=useRows('hka_coaching_requests',filters), achievements=useRows('hka_achievements',filters);
  const assessments=useRows('hka_assessments');
  const [editing,setEditing]=useState(false);
  const queries=[roles,courses,lessons,enrolments,progress,submissions,appointments,requests,achievements,assessments];
  if(!profile)return null;
  if(queries.some(query=>query.isLoading))return <p role='status' className='mt-8 text-sm text-muted-foreground'>Preparing your next steps…</p>;
  if(queries.some(query=>query.error))return <div role='alert' className='paper-card mt-8 p-6'><p>Some learning records could not be loaded.</p><Button className='mt-4' variant='outline' onClick={()=>{for(const query of queries)if(query.error)void query.refetch();}}>Try again</Button></div>;
  const preferences=riderPreferences(roles.data??[],profile.id);
  const savedPathway=pathways.find(row=>row.id===preferences.learning_pathway);
  const enrolled=(enrolments.data??[]).filter(row=>row.status==='active');
  const enrolIds=new Set(enrolled.map(row=>row.course_id));
  const published=(courses.data??[]).filter(row=>row.published&&!row.archived_at);
  const ownLessons=(lessons.data??[]).filter(row=>row.published&&enrolIds.has(row.course_id)&&published.some(course=>course.id===row.course_id));
  const complete=new Set((progress.data??[]).filter(row=>row.completed_at).map(row=>row.lesson_id));
  const started=[...(progress.data??[])].filter(row=>!row.completed_at).sort((a,b)=>String(b.updated_at??'').localeCompare(String(a.updated_at??'')));
  const next=ownLessons.find(row=>row.id===started[0]?.lesson_id)??[...ownLessons].sort((a,b)=>Number(a.position)-Number(b.position)).find(row=>!complete.has(row.id));
  const upcoming=(appointments.data??[]).filter(row=>row.status==='scheduled'&&Date.parse(String(row.starts_at))>Date.now()).sort((a,b)=>Date.parse(String(a.starts_at))-Date.parse(String(b.starts_at)));
  const pendingWork=ownLessons.filter(row=>row.kind==='assignment'&&!(submissions.data??[]).some(item=>item.lesson_id===row.id&&!['draft','resubmission_requested'].includes(String(item.status))));
  const ownSubmissionIds=new Set((submissions.data??[]).map(row=>row.id));
  const feedback=[...(assessments.data??[])].filter(row=>ownSubmissionIds.has(String(row.submission_id))).sort((a,b)=>String(b.assessed_at??'').localeCompare(String(a.assessed_at??'')));
  const returning=Boolean(enrolled.length||progress.data?.length||submissions.data?.length);
  const done=studentJourney(profile,preferences,enrolments.data??[],requests.data??[],appointments.data??[]);
  const setupComplete=done.slice(0,3).every(Boolean) && (!published.length || done[3]);
  if(!returning)return <details key={String(setupComplete)} open={!setupComplete} className='paper-card mt-6 p-5 sm:p-6' aria-labelledby='getting-started'>
    <summary className='cursor-pointer text-sm'><h2 id='getting-started' className='inline font-serif text-2xl'>Getting Started</h2>{setupComplete && <span className='ml-3 text-xs text-muted-foreground'>Available setup complete · view saved steps</span>}</summary>
 
    <p className='mt-3 text-sm leading-6 text-muted-foreground'>Begin with your riding goals. Your saved details stay with your account.</p>
    <ol className='mt-5 space-y-3'>
      {[
        {title:'Complete your rider profile',detail:'Check your name and account time zone.',href:'/dashboard/account'},
        {title:'Confirm discipline, level and goals',detail:'Tell us what you would like to learn.',action:()=>setEditing(true)},
        {title:'Explore a suitable learning pathway',detail:savedPathway?.title??'Discover the HKA pathways at your own pace.',href:savedPathway?'/learning-pathways/'+savedPathway.id:'/learning-pathways'},
        {title:'Enrol in an available course',detail:published.length?'Choose from published courses in My Learning.':'Hollie is preparing your first courses. Enrolment opens when a course is published.',href:'/dashboard/student?section=courses'},
        {title:'Request a coaching lesson',detail:'Optional: suggest a time for Founder confirmation.',href:'/dashboard/student?section=coaching'},
      ].map((step,index)=><li key={step.title} className='flex items-start gap-3 rounded-lg border border-primary/15 p-4'>
        {done[index]?<CheckCircle2 aria-label='Complete' className='mt-1 size-5 shrink-0 text-primary'/>:<Circle aria-label='Not complete' className='mt-1 size-5 shrink-0 text-[#826e45]'/>}
        <div className='min-w-0 flex-1'><p className='text-sm font-medium'>{index+1}. {step.title}{index===4?' · optional':''}</p><p className='mt-1 text-xs leading-5 text-muted-foreground'>{step.detail}</p></div>
        {step.href?<Link className='inline-flex min-h-11 shrink-0 items-center gap-1 text-xs font-medium underline underline-offset-4' to={step.href}>{done[index]?'View':'Open'}<ArrowRight className='size-3' aria-hidden='true'/></Link>:<Button variant='ghost' size='sm' className='min-h-11 shrink-0' onClick={step.action}>{done[index]?'Edit':'Begin'}</Button>}
      </li>)}
    </ol>
    {editing&&<RiderPreferencesEditor open={editing} onOpenChange={setEditing}/>}
  </details>;
  return <div className='mt-8 grid gap-5 lg:grid-cols-2'>
    <section className='paper-card p-6'><p className='eyebrow text-[#826e45]'>Your next step</p><h2 className='mt-2 font-serif text-3xl'>Continue Learning</h2>{next?<><p className='mt-4 font-medium'>{String(next.title)}</p><p className='mt-1 text-xs text-muted-foreground'>{String(published.find(course=>course.id===next.course_id)?.title??'Your course')}</p><Button asChild className='mt-5'><Link to={'/academy/courses/'+next.course_id+'?lesson='+next.id}>Resume lesson</Link></Button></>:<><p className='mt-4 text-sm leading-6 text-muted-foreground'>{published.length?'Your current lessons are complete, or your next lesson is being prepared.':'No courses are published yet. Your saved learning records remain available.'}</p><Button asChild variant='outline' className='mt-5'><Link to='/dashboard/student?section=courses'>Open My Learning</Link></Button></>}</section>
    <section className='paper-card p-6'><h2 className='font-serif text-3xl'>Upcoming Coaching</h2>{upcoming.length?<ul className='mt-4 space-y-3'>{upcoming.slice(0,3).map(row=><li key={row.id}><Link className='block rounded-lg border border-primary/15 p-3 hover:bg-primary/5' to={'/dashboard/student?section=coaching&appointment='+row.id}><strong className='text-sm'>{String(row.title)}</strong><span className='mt-1 block text-xs text-muted-foreground'>{formatCoachingTime(row.starts_at,profile.timezone)} · confirmed</span></Link></li>)}</ul>:<><p className='mt-4 text-sm text-muted-foreground'>No confirmed lessons are scheduled.</p><Button asChild variant='outline' className='mt-5'><Link to='/dashboard/student?section=coaching'>View requests or request a lesson</Link></Button></>}</section>
    <section className='paper-card p-6'><h2 className='font-serif text-3xl'>Assignments Awaiting Submission</h2>{pendingWork.length?<ul className='mt-4 space-y-3'>{pendingWork.map(row=><li key={row.id}><Link className='text-sm underline underline-offset-4' to={'/academy/courses/'+row.course_id+'?lesson='+row.id}>{String(row.title)}</Link></li>)}</ul>:<p className='mt-4 text-sm text-muted-foreground'>No course assignments await submission.</p>}</section>
    <section className='paper-card p-6'><h2 className='font-serif text-3xl'>Recent Coach Feedback</h2>{feedback.length?<><ul className='mt-4 space-y-3'>{feedback.slice(0,2).map(row=><li key={row.id} className='border-b border-primary/10 pb-3 text-sm leading-6'>{String(row.feedback)}</li>)}</ul><Link className='mt-4 inline-flex min-h-11 items-center text-xs underline' to='/dashboard/student?section=records'>Open feedback and achievements</Link></>:<p className='mt-4 text-sm text-muted-foreground'>Coach feedback will appear after your work has been reviewed.</p>}{Boolean(achievements.data?.length)&&<p className='mt-4 text-sm'>{achievements.data!.length} saved learning achievement{achievements.data!.length===1?'':'s'}.</p>}</section>
  </div>;
}
