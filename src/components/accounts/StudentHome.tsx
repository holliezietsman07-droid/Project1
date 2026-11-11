import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, Circle, HeartPulse, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from '@/contexts/SessionContext';
import { useRows } from '@/hooks/use-academy';
import { RiderPreferencesEditor } from '@/components/accounts/RiderPreferencesEditor';
import { studentJourney, riderPreferences } from '@/lib/dashboard-workspace';
import { formatCoachingTime } from '@/lib/coaching';
import { pathways } from '@/lib/hka-content';
import { db, errorText } from '@/lib/academy';
import { useFitnessRequests } from '@/hooks/use-fitness-requests';
import { WorkflowDialog } from '@/components/accounts/WorkflowDialog';
import { Progress } from '@/components/ui/progress';
import { days, programmeDate, sessionDate, weekStart, type Version } from '@/lib/fitness/model';
import { showSuccess } from '@/utils/toast';

const choices = [
  { id: 'learning', label: 'Learning', icon: BookOpen },
  { id: 'coaching', label: 'Coaching', icon: CalendarDays },
  { id: 'fitness', label: 'Fitness', icon: HeartPulse },
] as const;
type HomeChoice = typeof choices[number]['id'];
const coachingLink = '/dashboard/student?section=coaching';
const coursesLink = '/dashboard/student?section=courses';
const fitnessLink = '/dashboard/fitness/rider';
const fitnessEnabled = import.meta.env.VITE_FITNESS_DATABASE_ENABLED === 'true';

export function StudentHome() {
  const { profile, session } = useSession();
  const roles=useRows('hka_account_roles'), courses=useRows('hka_courses'), lessons=useRows('hka_lessons');
  const filters = { student_id: profile?.id ?? '' };
  const enrolments=useRows('hka_enrolments',filters), progress=useRows('hka_progress',filters);
  const submissions=useRows('hka_submissions',filters), appointments=useRows('hka_appointments',filters);
  const requests=useRows('hka_coaching_requests',filters);
  const assessments=useRows('hka_assessments');
  const [editing,setEditing]=useState(false);
  const [customising,setCustomising]=useState(false);
  const [savedChoice,setSavedChoice]=useState<HomeChoice>();
  const [saveError,setSaveError]=useState('');
  const [saving,setSaving]=useState(false);
  const savingChoice=useRef(false);
  const storedChoice: unknown=session?.user.user_metadata.hka_student_home;
  const first=savedChoice??choices.find(choice=>choice.id===storedChoice)?.id??'learning';
  const fitnessRequests=useFitnessRequests();
  const programmes=useRows('hka_fitness_programmes',{...filters,kind:'rider',status:'assigned'},fitnessEnabled);
  const programme=(programmes.data??[]).find(row=>row.current_version_id);
  const versions=useRows('hka_fitness_versions',{id:String(programme?.current_version_id??'')},first==='fitness'&&Boolean(programme?.current_version_id));
  const version=versions.data?.[0] as unknown as Version | undefined;
  if(!profile)return null;

  async function saveChoice(choice:HomeChoice){
    if(savingChoice.current)return;
    if(choice===first){setCustomising(false);return;}
    savingChoice.current=true;
    setSaving(true);
    setSaveError('');
    try {
      const {error}=await db().auth.updateUser({data:{hka_student_home:choice}});
      if(error)throw error;
      setSavedChoice(choice);
      setCustomising(false);
      showSuccess('Home preference saved.');
    } catch(error) {
      setSaveError(errorText(error));
    } finally {
      savingChoice.current=false;
      setSaving(false);
    }
  }

  const upcoming=(appointments.data??[]).filter(row=>row.status==='scheduled'&&Date.parse(String(row.starts_at))>Date.now()).sort((a,b)=>Date.parse(String(a.starts_at))-Date.parse(String(b.starts_at)))[0];
  const openFitnessRequest=(fitnessRequests.data??[]).find(row=>row.student_id===profile.id&&row.kind==='rider'&&!row.reply_message_id&&(!programme||row.programme_id!==programme.id));
  const sessions=(version?.sessions??[]).filter(item=>item.category!=='rest').sort((a,b)=>a.day-b.day);
  const zone=profile.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today=sessions.length?programmeDate(zone):'';
  const week=sessions.length?weekStart(zone):'';
  const nextSession=sessions.find(item=>sessionDate(week,item.day)>=today)??sessions[0];
  const nextSessionDay=nextSession?sessionDate(week,nextSession.day+(sessionDate(week,nextSession.day)<today?7:0)):undefined;
  const learningQueries=[courses,lessons,enrolments,progress];
  const learningLoading=learningQueries.some(query=>query.isLoading);
  const learningError=learningQueries.some(query=>query.error);
  const preferences=riderPreferences(roles.data??[],profile.id);
  const savedPathway=pathways.find(row=>row.id===preferences.learning_pathway);
  const enrolled=(enrolments.data??[]).filter(row=>row.status==='active');
  const enrolIds=new Set(enrolled.map(row=>row.course_id));
  const published=(courses.data??[]).filter(row=>row.published&&!row.archived_at);
  const ownLessons=(lessons.data??[]).filter(row=>row.published&&enrolIds.has(row.course_id)&&published.some(course=>course.id===row.course_id));
  const complete=new Set((progress.data??[]).filter(row=>row.completed_at).map(row=>row.lesson_id));
  const started=[...(progress.data??[])].filter(row=>!row.completed_at).sort((a,b)=>String(b.updated_at??'').localeCompare(String(a.updated_at??'')));
  const next=started.map(record=>ownLessons.find(row=>row.id===record.lesson_id)).find(Boolean)??[...ownLessons].sort((a,b)=>Number(a.position)-Number(b.position)).find(row=>!complete.has(row.id));
  const pendingWork=ownLessons.filter(row=>row.kind==='assignment'&&!(submissions.data??[]).some(item=>item.lesson_id===row.id&&!['draft','resubmission_requested'].includes(String(item.status))));
  const ownSubmissionIds=new Set((submissions.data??[]).map(row=>row.id));
  const feedback=[...(assessments.data??[])].filter(row=>ownSubmissionIds.has(String(row.submission_id))).sort((a,b)=>String(b.assessed_at??'').localeCompare(String(a.assessed_at??'')));
  const returning=Boolean(enrolled.length||progress.data?.length||submissions.data?.length);
  const done=studentJourney(profile,preferences,enrolments.data??[],requests.data??[],appointments.data??[]);
  const setupComplete=done.slice(0,3).every(Boolean) && (!published.length || done[3]);
  const gettingStarted=!returning&&!learningLoading&&!learningError&&<details className='paper-card p-4 sm:p-5' aria-labelledby='getting-started'>
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
  const nextCourse=published.find(course=>course.id===next?.course_id);
  const courseLessons=ownLessons.filter(row=>row.course_id===nextCourse?.id);
  const completed=courseLessons.filter(row=>complete.has(row.id)).length;
  const startedLesson=started.some(record=>record.lesson_id===next?.id);
  const lessonLink=next?'/academy/courses/'+next.course_id+'?lesson='+next.id:coursesLink;
  const coaching = {
    label: upcoming ? 'View lesson details' : 'Request a lesson',
    href: upcoming ? coachingLink+'&appointment='+upcoming.id : coachingLink+'&action=request',
    title: upcoming ? String(upcoming.title) : 'Plan your next lesson',
    detail: upcoming ? formatCoachingTime(upcoming.starts_at,profile.timezone)+' · Confirmed' : 'Find a time to work on your riding with Hollie.',
  };
  const fitness = {
    label: programme || openFitnessRequest ? 'Open Fitness' : 'Request my programme',
    href: programme || openFitnessRequest ? fitnessLink : fitnessLink+'?panel=profile',
    title: nextSession?.title??(programme?'Your programme is ready':openFitnessRequest?'Programme request sent':'Build strength for riding'),
    detail: nextSession && nextSessionDay ? (nextSessionDay===today?'Today':days[nextSession.day])+' · '+nextSession.minutes+' min'
      : programme ? 'Open your plan to see your sessions.'
      : openFitnessRequest ? 'Your request is with Hollie for review.'
      : 'Get a plan tailored to your goals, experience and available time.',
  };
  const learning = {
    label: next ? (startedLesson?'Resume lesson':'Start lesson') : 'Open My Learning',
    href: lessonLink,
    title: next ? String(next.title) : 'Find your next course',
    detail: nextCourse ? String(nextCourse.title) : 'Explore available courses or revisit your learning.',
  };
  const card = {learning,coaching,fitness}[first];
  const primaryLoading=first==='learning'&&learningLoading||first==='coaching'&&appointments.isLoading||first==='fitness'&&(programmes.isLoading||versions.isLoading||fitnessRequests.isLoading);
  const primaryError=first==='learning'&&learningError||first==='coaching'&&Boolean(appointments.error)||first==='fitness'&&Boolean(programmes.error||versions.error||fitnessRequests.error);
  const bookingUpdate=(requests.data??[]).find(row=>row.status==='alternative_proposed');
  const latestFeedback=feedback.find(row=>String(row.feedback??'').trim());
  const attention=[
    ...(bookingUpdate?[{label:'Review a proposed lesson time',href:coachingLink+'&request='+bookingUpdate.id}]:[]),
    ...(programme&&first!=='fitness'?[{label:'Open your fitness programme',href:fitnessLink}]:[]),
    ...pendingWork.slice(0,2).map(row=>({label:String(row.title),href:'/academy/courses/'+row.course_id+'?lesson='+row.id})),
    ...(latestFeedback?[{label:'Read coach feedback',href:'/dashboard/student?section=records'}]:[]),
  ];

  return <div className='mt-4 space-y-4'>
    <div className='flex items-center justify-between gap-2'>
      <h2 className='font-serif text-2xl'>Today</h2>
      <Button type='button' variant='ghost' className='min-h-11' onClick={()=>{setSaveError('');setCustomising(true);}}><Settings2 className='size-4' aria-hidden='true'/>Customise home</Button>
    </div>
    <div className='grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]'>
      <section aria-label={choices.find(choice=>choice.id===first)?.label} className='rounded-2xl bg-primary p-4 text-primary-foreground sm:p-5'>
        <p className='text-xs font-semibold text-[#E7D9B9]'>{first==='learning'?'Continue learning':first==='coaching'?'Coaching':'Rider fitness'}</p>
        {primaryLoading?<p role='status' className='mt-2 text-sm'>Getting your next step ready…</p>:primaryError?<p role='alert' className='mt-2 text-sm'>Your next step could not be loaded. Open this section to try again.</p>:<>
          <h3 className='mt-1 break-words font-serif text-2xl'>{card.title}</h3>
          <p className='mt-1 text-sm text-primary-foreground/90'>{card.detail}</p>
          {first==='learning'&&courseLessons.length>0&&<div className='mt-2 max-w-xs'>
            <p className='mb-1 text-xs'>{completed} of {courseLessons.length} lessons complete</p>
            <Progress aria-label='Course progress' value={completed/courseLessons.length*100} className='h-1.5 bg-white/25 [&>div]:bg-[#E7D9B9]'/>
          </div>}
        </>}
        {!primaryLoading&&<Button asChild variant='secondary' className='mt-3 min-h-11 rounded-lg'><Link to={primaryError?{learning:coursesLink,coaching:coachingLink,fitness:fitnessLink}[first]:card.href}>{primaryError?'Open '+first:card.label}<ArrowRight className='size-4' aria-hidden='true'/></Link></Button>}
      </section>
      <div className='space-y-2'>
        {choices.filter(choice=>choice.id!==first).map(({id,label,icon:Icon})=>{
          const item={learning,coaching,fitness}[id];
          const unavailable=id==='learning'&&(learningLoading||learningError)||id==='coaching'&&(appointments.isLoading||appointments.isError)||id==='fitness'&&(programmes.isLoading||programmes.isError||fitnessRequests.isLoading||fitnessRequests.isError);
          return <Link key={id} to={unavailable?{learning:coursesLink,coaching:coachingLink,fitness:fitnessLink}[id]:item.href} className='paper-card flex min-h-14 items-center gap-3 rounded-xl px-4 py-2.5 hover:bg-primary/5 focus-visible:outline focus-visible:outline-primary'>
            <Icon className='size-5 shrink-0 text-primary' aria-hidden='true'/><span className='min-w-0 flex-1'><span className='block text-xs text-muted-foreground'>{label}</span><span className='block break-words text-sm font-medium'>{unavailable?'Open '+label:item.label}</span>{id==='coaching'&&upcoming&&<span className='block text-xs text-muted-foreground'>{coaching.detail}</span>}</span><ArrowRight className='size-4 shrink-0' aria-hidden='true'/>
          </Link>;
        })}
      </div>
    </div>
    {attention.length>0&&<section className='paper-card p-4' aria-labelledby='student-attention'>
      <h2 id='student-attention' className='font-serif text-xl'>Needs your attention</h2>
      <ul className='mt-1 flex flex-wrap gap-x-5'>{attention.map(item=><li key={item.href}><Link className='inline-flex min-h-11 items-center gap-1 text-sm underline underline-offset-4' to={item.href}>{item.label}<ArrowRight className='size-3' aria-hidden='true'/></Link></li>)}</ul>
    </section>}
    {gettingStarted}
    <WorkflowDialog open={customising} onOpenChange={setCustomising} title='Customise home' description='Choose what appears first when you sign in.' busy={saving} contentClassName='sm:max-w-sm'>
      <div className='grid gap-2'>
        {choices.map(({id,label,icon:Icon})=><Button key={id} type='button' disabled={saving} variant={id===first?'default':'outline'} aria-pressed={id===first} className='min-h-11 justify-start rounded-lg' onClick={()=>void saveChoice(id)}><Icon className='size-4' aria-hidden='true'/>{label}</Button>)}
        {saving&&<p role='status' className='text-xs'>Saving your choice…</p>}
        {saveError&&<p role='alert' className='text-sm text-destructive'>{saveError}</p>}
      </div>
    </WorkflowDialog>
  </div>;
}
