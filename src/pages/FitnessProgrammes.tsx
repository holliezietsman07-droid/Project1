import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { PrivatePhoto } from '@/components/accounts/StudentDashboard';
import { Button } from '@/components/ui/button';
import { errorText } from '@/lib/academy';
import { useFitness } from '@/hooks/use-fitness';
import type { SampleRole } from '@/lib/fitness/sample';
import { Field, selectClass } from '@/components/fitness/ProgrammeEditor';
import { MemberProgrammes, type FitnessPanel } from '@/components/fitness/WeeklyProgramme';
import { ProgrammeManagement } from '@/components/fitness/ProgrammeManagement';

const previewViews = [
  {id:'rider',label:'Rider programme'},
  {id:'horse',label:'Horse programmes'},
  {id:'manage',label:'Programme Management'},
] as const;
const sampleIdentities: {id:SampleRole;label:string}[] = [
  {id:'rider',label:'Alex · test rider / horse owner'},
  {id:'founder',label:'Hollie · Founder fixture'},
  {id:'coach',label:'Approved coach'},
  {id:'guardian',label:'Verified guardian'},
  {id:'unrelated',label:'Unrelated account'},
  {id:'unapproved-coach',label:'Unapproved coach'},
  {id:'unverified-guardian',label:'Unverified guardian'},
];
type FitnessMode = typeof previewViews[number]['id'] | 'preview';

export default function FitnessProgrammes({mode='rider'}:{mode?:FitnessMode}){
  const [params,setParams]=useSearchParams();
  const route=useParams();
  const sample=mode==='preview'||params.get('sample')==='1';
  const previewView=previewViews.find(view=>view.id===params.get('view'))?.id??'rider';
  const c=useFitness(sample,previewView==='manage'?'founder':'rider');
  const [selected,setSelected]=useState('');
  const {setSampleRole}=c;
  useEffect(()=>{
    if(mode==='preview'){
      setSampleRole(previewView==='manage'?'founder':'rider');
      setSelected('');
    }
  },[mode,previewView,setSampleRole]);
  const current=mode==='preview'?previewView:mode;
  const kind=current==='horse'?'horse':'rider';
  const subjects=c.data.subjects.filter(subject=>subject.kind===kind);
  const routedSubject=route.horseId||route.studentId;
  const subject=subjects.find(subject=>subject.id===(routedSubject||selected))
    ?? subjects.find(subject=>route.horseId&&subject.archivedHorseId===route.horseId)
    ?? (!routedSubject?(subjects.find(subject=>subject.student_id===c.profile?.id)??subjects[0]):undefined);
  const chooseSubject=!routedSubject&&subjects.length>1;
  const showHorse=kind==='horse'&&!subject?.archivedHorseId;

  const requestedPanel=params.get('panel');
  const panel:FitnessPanel=current!=='manage'&&!subject?.archivedHorseId&&(requestedPanel==='profile'||requestedPanel==='progress')?requestedPanel:'today';
  const title=current==='manage'?'Programme Management':kind==='horse'?'Fitness & Conditioning':'Rider Fitness & Mobility';
  const heading=panel==='profile'?'Fitness profile':panel==='progress'?'Progress & history':title;
  useEffect(()=>{if(mode==='preview')document.title=heading+' · sample preview | HKA Equestrian';},[heading,mode]);
  const dashboard=c.profile?.role==='admin'?'/dashboard/admin':c.profile?.role==='coach'?'/dashboard/coach':c.profile?.role==='guardian'?'/dashboard/parent':'/dashboard/student';
  const headingRef=useRef<HTMLHeadingElement>(null);
  const lastPanel=useRef<FitnessPanel>('today');

  useEffect(()=>{
    if (lastPanel.current!==panel || panel!=='today') {
      window.scrollTo({top:0,left:0,behavior:'instant'});
      headingRef.current?.focus({preventScroll:true});
    }
    lastPanel.current=panel;
  },[panel]);

  function changePanel(next:FitnessPanel){
    const search=new URLSearchParams(params);
    if(next==='today')search.delete('panel');
    else search.set('panel',next);
    setParams(search);
  }

  return <section className='page-width space-y-4 pb-24 pt-5 sm:space-y-5 sm:pt-7'>
    <header className='flex flex-wrap items-end justify-between gap-3'>
      <div>
        {panel==='today'
          ? <nav aria-label='Breadcrumb' className='mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground'><Link to={dashboard} className='hover:underline'>Dashboard</Link><span aria-hidden='true'>/</span><span>{title}</span></nav>
          : <Button type='button' variant='ghost' className='mb-2 min-h-11 gap-2 px-2' onClick={()=>changePanel('today')}><ArrowLeft className='size-4' aria-hidden='true'/>Back to fitness</Button>}
        <h1 ref={headingRef} tabIndex={-1} className='font-serif text-3xl tracking-tight text-primary focus:outline-none sm:text-4xl'>{heading}</h1>
      </div>
      {!sample&&!c.writable&&<div className='flex flex-wrap items-center gap-2 text-xs'>
        <span className='rounded-full bg-primary/10 px-3 py-1.5 font-medium'>Preview mode</span>
        <Link to={'/dashboard/fitness-preview?view='+current} className='inline-flex min-h-11 items-center underline underline-offset-4'>View sample programme</Link>
      </div>}
    </header>

    {sample&&<aside aria-label='Sample preview controls' className='rounded-xl border border-[#B79B62]/35 bg-[#fffdf8] px-3 sm:px-4'>
      {panel==='today' ? <details className='group'>
        <summary className='flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-2 text-xs [&::-webkit-details-marker]:hidden'>
          <span className='rounded-full bg-primary/10 px-2.5 py-1 font-medium'>Preview mode</span>
          <span className='inline-flex items-center gap-1.5 font-medium'>Sample controls<ChevronDown className='size-4 group-open:rotate-180' aria-hidden='true'/></span>
        </summary>
        <div className='flex flex-wrap items-end justify-between gap-3 border-t border-primary/10 py-3'>
          <p className='w-full text-xs text-muted-foreground'>Fictional profiles · refresh resets changes</p>
          <label className='flex min-w-0 flex-wrap items-center gap-2 text-xs font-medium'>
            Sample identity
            <select className='min-h-10 max-w-full rounded-md border border-primary/20 bg-background px-2 text-sm' value={c.sampleRole} onChange={event=>c.setSampleRole(event.target.value as SampleRole)}>
              {sampleIdentities.map(identity=><option key={identity.id} value={identity.id}>{identity.label}</option>)}
            </select>
          </label>
          <nav aria-label='Sample programme views' className='flex flex-wrap gap-1.5'>
            {previewViews.map(view=><Button key={view.id} variant={current===view.id?'default':'outline'} size='sm' className='min-h-10 rounded-lg' aria-current={current===view.id?'page':undefined} asChild>
              <Link to={'/dashboard/fitness-preview?view='+view.id}>{view.label}</Link>
            </Button>)}
          </nav>
        </div>
      </details> : <p className='py-2.5 text-xs text-muted-foreground'>Preview mode · Fictional profile</p>}
    </aside>}

    {c.loading ? <p role='status'>Opening programme records…</p>
      : c.error ? <div role='alert' className='paper-card space-y-4 p-6'><p>{errorText(c.error)}</p><Button variant='outline' onClick={()=>void c.refresh()}>Try again</Button></div>
      : current==='manage' ? <ProgrammeManagement key={c.sampleRole} c={c}/>
      : subject ? <>
        {(showHorse||chooseSubject)&&<div className='flex flex-wrap items-center justify-between gap-4'>
          {showHorse&&<div className='flex min-w-0 items-center gap-3'>
            <PrivatePhoto path={subject.photoPath} label={subject.name} horse className='size-14 shrink-0 sm:size-16'/>
            <div className='min-w-0'><p className='eyebrow text-[#826e45]'>Horse</p><h2 className='break-words font-serif text-2xl'>{subject.name}</h2></div>
          </div>}
          {chooseSubject&&<div className='w-full min-w-0 sm:w-56'>
            <Field label={kind==='horse'?'Select horse':'Select rider'}><select className={selectClass} value={subject.id} onChange={event=>setSelected(event.target.value)}>
              {subjects.map(option=><option key={option.id} value={option.id}>{option.name}{option.archivedHorseId?' · archived':''}</option>)}
            </select></Field>
          </div>}
        </div>}
        <MemberProgrammes key={subject.id+c.sampleRole} subject={subject} c={c} panel={panel} onPanelChange={changePanel}/>
      </>
      : <p role='status' className='paper-card p-6'>No authorised {kind==='horse'?'horse':'rider'} records are available for this account.</p>}

    {panel==='today'&&(kind==='rider'||route.horseId)&&c.data.subjects.some(subject=>subject.archivedHorseId)&&<Link className='text-link' to='/dashboard/fitness/horse'>Horse programme history</Link>}
  </section>;
}
