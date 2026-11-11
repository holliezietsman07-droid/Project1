import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { PrivatePhoto } from '@/components/accounts/StudentDashboard';
import { Button } from '@/components/ui/button';
import { errorText } from '@/lib/academy';
import { useFitness } from '@/hooks/use-fitness';
import type { SampleRole } from '@/lib/fitness/sample';
import { selectClass } from '@/components/fitness/ProgrammeEditor';
import { MemberProgrammes, type FitnessPanel } from '@/components/fitness/WeeklyProgramme';
import { ProgrammeManagement } from '@/components/fitness/ProgrammeManagement';

const previewViews = [
  {id:'rider',label:'Rider'},
  {id:'horse',label:'Horse'},
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
  const location=useLocation();
  const navigate=useNavigate();
  const routeState=location.state as {fitnessReturnTo?:string;fitnessPanel?:FitnessPanel}|null;
  const route=useParams();
  const sampleAvailable=import.meta.env.VITE_HKA_PUBLIC_SITE!=='true';
  const sample=sampleAvailable&&(mode==='preview'||params.get('sample')==='1');
  const previewView=previewViews.find(view=>view.id===params.get('view'))?.id??'rider';
  const c=useFitness(sample,previewView==='manage'?'founder':'rider');
  const [selected,setSelected]=useState('');
  const {setSampleRole}=c;
  useEffect(()=>{
    if(mode==='preview'){
      setSampleRole(previewView==='manage'?'founder':'rider');
      setSelected('');
      window.scrollTo(0,0);
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
  const heading=panel==='progress'?'Programme history':title;
  useEffect(()=>{if(mode==='preview')document.title=heading+' · sample preview | HKA Equestrian';},[heading,mode]);
  const showingProgress=panel==='progress';
  const samplePath='/dashboard/fitness-preview?view='+current;
  const sampleState={fitnessReturnTo:location.pathname};
  const returnTo=typeof routeState?.fitnessReturnTo==='string' &&
    /^\/dashboard\/(?:programmes|fitness\/(?:rider|horse)(?:\/[^/?#]+)?)$/.test(routeState.fitnessReturnTo)
    ? routeState.fitnessReturnTo : undefined;
  const dashboard=c.profile?.role==='admin'?'/dashboard/admin':c.profile?.role==='coach'?'/dashboard/coach':c.profile?.role==='guardian'?'/dashboard/parent':'/dashboard/student';
  const headingRef=useRef<HTMLHeadingElement>(null);
  const lastProgress=useRef(false);

  useEffect(()=>{
    if (lastProgress.current!==showingProgress || showingProgress) {
      window.scrollTo({top:0,left:0,behavior:'instant'});
      headingRef.current?.focus({preventScroll:true});
    }
    lastProgress.current=showingProgress;
  },[showingProgress]);

  function changePanel(next:FitnessPanel){
    if(next==='today'&&routeState?.fitnessPanel===panel){navigate(-1);return;}
    const search=new URLSearchParams(params);
    if(next==='today')search.delete('panel');
    else search.set('panel',next);
    setParams(search,{replace:next==='today',state:{...routeState,fitnessPanel:next==='today'?undefined:next}});
  }

  function changeRequest(id?:string){
    const search=new URLSearchParams(params);
    if(id)search.set('request',id);
    else search.delete('request');
    setParams(search,{state:routeState});
  }

  return <section className='page-width space-y-4 pb-24 pt-5 sm:space-y-5 sm:pt-7'>
    <header className='space-y-2'>
      <div className='flex flex-wrap items-center justify-between gap-x-3'>
        {showingProgress
          ? <Button type='button' variant='ghost' className='min-h-11 gap-2 px-0' onClick={()=>changePanel('today')}><ArrowLeft className='size-4' aria-hidden='true'/>Back to fitness</Button>
          : !sample||returnTo ? <Link to={returnTo??dashboard} className='inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary hover:underline'><ArrowLeft className='size-4' aria-hidden='true'/>{returnTo?'Back to my fitness':'Dashboard'}</Link> : null}
        {sampleAvailable&&!sample&&!c.writable&&<Link to={samplePath} state={sampleState} className='inline-flex min-h-11 items-center text-sm underline underline-offset-4'>View sample programme</Link>}
      </div>
      {sample&&<nav aria-label='Fitness views' className='inline-flex gap-1 rounded-xl border border-primary/10 bg-primary/5 p-1'>
        {previewViews.filter(view=>view.id!=='manage').map(view=><Button key={view.id} variant={current===view.id?'default':'ghost'} className='min-h-11 min-w-24 rounded-lg' aria-current={current===view.id?'page':undefined} asChild>
          <Link to={'/dashboard/fitness-preview?view='+view.id} state={{fitnessReturnTo:returnTo}}>{view.label}</Link>
        </Button>)}
      </nav>}
      <h1 ref={headingRef} tabIndex={-1} className='font-serif text-3xl tracking-tight text-primary focus:outline-none sm:text-4xl'>{heading}</h1>
    </header>

    {c.loading ? <p role='status'>Opening programme records…</p>
      : c.error ? <div role='alert' className='paper-card space-y-4 p-6'><p>{errorText(c.error)}</p><Button variant='outline' onClick={()=>void c.refresh()}>Try again</Button></div>
      : current==='manage' ? <ProgrammeManagement key={c.sampleRole} c={c} requestId={params.get('request')??undefined} onRequestChange={changeRequest}/>
      : subject ? <>
        {(showHorse||chooseSubject)&&<div className='flex items-center gap-3'>
          {showHorse&&<PrivatePhoto path={subject.photoPath} label={subject.name} horse className='size-10 shrink-0 sm:size-12'/>}
          {chooseSubject
            ? <select aria-label={kind==='horse'?'Select horse':'Select rider'} className={selectClass+' min-h-11 min-w-0 max-w-56'} value={subject.id} onChange={event=>setSelected(event.target.value)}>
                {subjects.map(option=><option key={option.id} value={option.id}>{option.name}{option.archivedHorseId?' · archived':''}</option>)}
              </select>
            : <h2 className='min-w-0 break-words font-serif text-xl'>{subject.name}</h2>}
        </div>}
        <MemberProgrammes key={subject.id+':'+c.sampleRole+':'+(params.get('programme')??'')} subject={subject} c={c}
          panel={panel} onPanelChange={changePanel} initialProgrammeId={params.get('programme')??''}
          sampleProfileLink={sampleAvailable&&!sample&&!c.writable?<Link to={samplePath+'&panel=profile'} state={sampleState} className='inline-flex min-h-11 items-center font-medium underline underline-offset-4'>Try sample setup</Link>:undefined}/>
      </>
      : <p role='status' className='paper-card p-6'>No authorised {kind==='horse'?'horse':'rider'} records are available for this account.</p>}


    {sample&&<aside aria-label='Sample preview controls' className='rounded-xl border border-[#B79B62]/35 bg-[#fffdf8] px-3 sm:px-4'>
      <details className='group'>
        <summary className='flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-2 text-xs [&::-webkit-details-marker]:hidden'>
          <span className='text-muted-foreground'>Sample data only</span>
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
            {previewViews.filter(view=>view.id==='manage').map(view=><Button key={view.id} variant={current===view.id?'default':'outline'} size='sm' className='min-h-10 rounded-lg' aria-current={current===view.id?'page':undefined} asChild>
              <Link to={'/dashboard/fitness-preview?view='+view.id} state={{fitnessReturnTo:returnTo}}>{view.label}</Link>
            </Button>)}
          </nav>
        </div>
      </details>
    </aside>}

    {panel==='today'&&(kind==='rider'||route.horseId)&&c.data.subjects.some(subject=>subject.archivedHorseId)&&<Link className='text-link' to='/dashboard/fitness/horse'>Horse programme history</Link>}
  </section>;
}
