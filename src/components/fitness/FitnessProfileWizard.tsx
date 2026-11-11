import { showSuccess } from '@/utils/toast';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { WorkflowDialog } from '@/components/accounts/WorkflowDialog';
import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import type { FitnessController } from '@/hooks/use-fitness';
import { errorText } from '@/lib/academy';
import { holdReason, type Subject } from '@/lib/fitness/model';
import { IntakeFields, type IntakeStep } from './ProgrammeEditor';

const goals = {id:'goals',title:'Your goals',prompt:'Tell Hollie what you’d like to work on.'} as const;
const schedule = {id:'schedule',title:'Training schedule',prompt:'Choose the days and time you can comfortably set aside.'} as const;
const workload = {id:'workload',title:'Recent work',prompt:'Check the recent workload and add any time off.'} as const;
const wellbeing = {id:'wellbeing',title:'Wellbeing',prompt:'Select any concerns Hollie should take into account.'} as const;
const riderSteps = [goals,schedule,wellbeing];
const horseSteps = [goals,schedule,workload,wellbeing];

export function FitnessProfileWizard({c,subject,sampleLink,onClose}:{
  c:FitnessController;
  subject:Subject;
  sampleLink?:ReactNode;
  onClose:(message?:string)=>void;
}){
  const steps:readonly {id:IntakeStep;title:string;prompt:string}[]=subject.kind==='horse'?horseSteps:riderSteps;
  const [index,setIndex]=useState(0);
  const initial=useRef(subject.intake);
  const [intake,setIntake]=useState(initial.current);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const saveLock=useRef(false);
  const requestId=useRef<string>();
  const stepTitle=useRef<HTMLHeadingElement>(null);
  const stepContent=useRef<HTMLDivElement>(null);
  const previousIndex=useRef(index);
  const editable=c.writable&&c.canRecord(subject);
  const sendRequest=editable&&c.requestsEnabled;
  const step=steps[index];
  const last=index===steps.length-1;
  const hold=last?holdReason(subject.kind,intake):'';

  useEffect(()=>{
    if(previousIndex.current===index)return;
    previousIndex.current=index;
    stepContent.current?.scrollTo(0,0);
    stepTitle.current?.focus({preventScroll:true});
  },[index]);

  async function advance(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(saveLock.current)return;
    if(!last){setIndex(index+1);return;}
    if(!editable){onClose();return;}
    saveLock.current=true;
    setBusy(true);
    setError('');
    try{
      if(sendRequest){
        requestId.current??=crypto.randomUUID();
        await c.sendRequest(requestId.current,subject,intake);
        onClose(showSuccess(c.sample?'Sample programme request sent.':'Programme request sent to Hollie.'));
      }else{
        await c.saveIntake(subject,intake);
        onClose(showSuccess('Fitness profile saved.'));
      }
    }catch(failure){
      setError(errorText(failure));
    }finally{
      saveLock.current=false;
      setBusy(false);
    }
  }

  return <WorkflowDialog open onOpenChange={open=>{if(!open)onClose();}} title={sendRequest?'Request a programme':subject.kind==='horse'?subject.name+' · fitness profile':'Fitness profile'}
    description={sendRequest && subject.kind==='horse'?'Tell Hollie about your goals for '+subject.name+'.':'A few details to help tailor the programme.'} dirty={intake!==initial.current} busy={busy} initialFocus={stepTitle}
    contentClassName='gap-3 overflow-hidden sm:max-w-xl sm:rounded-2xl'>
    <form className='flex min-h-0 flex-1 flex-col' onSubmit={advance}>
      <div className='shrink-0 space-y-2 pb-3'>
        {!c.writable&&<div role='status' className='rounded-lg border border-[#B79B62]/45 bg-[#fffdf8] p-3 text-sm leading-5'>
          <p className='font-medium'>Preview mode</p>
          <p className='text-muted-foreground'>Saving opens when fitness is activated.</p>
          {sampleLink}
        </div>}
        {c.writable&&!editable&&<p role='status' className='rounded-lg bg-primary/5 p-3 text-sm'>This profile is view-only for your role.</p>}
        <p className='eyebrow text-[#76633e]'>Step {index+1} of {steps.length}</p>
        <Progress aria-label='Fitness profile setup progress' value={(index+1)/steps.length*100} className='h-1.5 [&>div]:bg-[#B79B62]'/>
      </div>
      <div ref={stepContent} className='min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-1 pb-4'>
        <div>
          <h3 ref={stepTitle} tabIndex={-1} className='font-serif text-2xl focus:outline-none'>{step.title}</h3>
          <p className='mt-1 text-sm leading-6 text-muted-foreground'>{step.prompt}</p>
        </div>
        <fieldset disabled={!editable||busy} className='min-w-0'>
          <IntakeFields key={step.id} value={intake} onChange={setIntake} kind={subject.kind} step={step.id}/>
        </fieldset>
        {hold&&<p role='status' className='rounded-lg border border-amber-600/30 bg-amber-50 p-3 text-sm text-amber-900'>{hold}</p>}
        {last&&sendRequest&&<p className='rounded-lg bg-primary/5 p-3 text-sm leading-6'>
          {c.sample?'This sends a fictional request to the sample Founder chat.':'Hollie will receive a private request with these details in your chat.'}
        </p>}
        {error&&<p role='alert' className='rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive'>{error}</p>}
      </div>
      <footer className='flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-primary/15 pt-3 pb-[env(safe-area-inset-bottom)] sm:pb-0'>
        {index>0
          ? <Button type='button' variant='ghost' className='min-h-11 gap-2' disabled={busy} onClick={()=>setIndex(index-1)}><ArrowLeft className='size-4' aria-hidden='true'/>Back</Button>
          : <DialogClose asChild><Button type='button' variant='ghost' className='min-h-11' disabled={busy}>Cancel</Button></DialogClose>}
        <Button type='submit' className='min-h-11 gap-2 rounded-lg' disabled={busy}>
          {!last?'Next':busy?'Sending…':sendRequest?'Send programme request':editable?'Save & return':'Done'}
          {!last&&<ArrowRight className='size-4' aria-hidden='true'/>}
        </Button>
      </footer>
    </form>
  </WorkflowDialog>;
}
