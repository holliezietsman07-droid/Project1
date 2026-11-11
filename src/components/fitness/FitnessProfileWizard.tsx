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

const goals = {id:'goals',title:'Your goals',prompt:'What would you like your programme to help with?'} as const;
const profile = {id:'profile',title:'Your starting point',prompt:'Check the age and current experience.'} as const;
const disciplines = {id:'disciplines',title:'Disciplines',prompt:'Choose what you ride or train for.'} as const;
const schedule = {id:'schedule',title:'Training days',prompt:'Choose the days you can set aside.'} as const;
const duration = {id:'duration',title:'Time and equipment',prompt:'Pick a realistic session length.'} as const;
const workload = {id:'workload',title:'Recent work',prompt:'Check workload and note any recent time off.'} as const;
const wellbeing = {id:'wellbeing',title:'Wellbeing',prompt:'Select any concerns Hollie should consider.'} as const;
const guidance = {id:'guidance',title:'Professional guidance',prompt:'Add any instructions you have, or continue.'} as const;
const review = {id:'review',title:'Ready to send?',prompt:'Check the essentials before sending.'} as const;
const riderSteps = [goals,profile,disciplines,schedule,duration,wellbeing,guidance,review];
const horseSteps = [goals,profile,disciplines,schedule,duration,workload,wellbeing,guidance,review];

export function FitnessProfileWizard({c,subject,sampleLink,onClose}:{
  c:FitnessController;
  subject:Subject;
  sampleLink?:ReactNode;
  onClose:(message?:string)=>void;
}){
  const steps:readonly {id:IntakeStep|'review';title:string;prompt:string}[]=subject.kind==='horse'?horseSteps:riderSteps;
  const [index,setIndex]=useState(0);
  const initial=useRef(subject.intake);
  const [intake,setIntake]=useState(initial.current);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const saveLock=useRef(false);
  const requestId=useRef<string>();
  const stepTitle=useRef<HTMLHeadingElement>(null);
  const previousIndex=useRef(index);
  const editable=c.writable&&c.canRecord(subject);
  const sendRequest=editable&&c.requestsEnabled;
  const step=steps[index];
  const last=step.id==='review';
  const hold=last?holdReason(subject.kind,intake):'';

  useEffect(()=>{
    if(previousIndex.current===index)return;
    previousIndex.current=index;
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
    description={sendRequest&&subject.kind==='horse'?subject.name+' · Step '+(index+1)+' of '+steps.length:'Step '+(index+1)+' of '+steps.length+' · '+step.title} dirty={intake!==initial.current} busy={busy} initialFocus={stepTitle}
    contentClassName='sm:max-w-md'>
    <form className='flex flex-col gap-3' onSubmit={advance}>
      <div className='space-y-2'>
        {!c.writable&&<div role='status' className='rounded-lg border border-[#B79B62]/45 bg-[#fffdf8] p-3 text-sm leading-5'>
          <p className='font-medium'>Preview mode</p>
          <p className='text-muted-foreground'>Saving opens when fitness is activated.</p>
          {sampleLink}
        </div>}
        {c.writable&&!editable&&<p role='status' className='rounded-lg bg-primary/5 p-3 text-sm'>This profile is view-only for your role.</p>}
        <Progress aria-label='Fitness profile setup progress' value={(index+1)/steps.length*100} className='h-1.5 [&>div]:bg-[#B79B62]'/>
      </div>
      <div className='space-y-3'>
        <div>
          <h3 ref={stepTitle} tabIndex={-1} className='font-serif text-2xl focus:outline-none'>{step.title}</h3>
          <p className='mt-1 text-sm leading-6 text-muted-foreground'>{step.prompt}</p>
        </div>
        {step.id==='review'?<dl className='grid gap-1 rounded-lg bg-background p-3 text-sm'>
          <div className='flex justify-between gap-2'><dt>Training days</dt><dd>{intake.days.length||'Flexible'}</dd></div>
          <div className='flex justify-between gap-2'><dt>Session length</dt><dd>{intake.minutes} minutes</dd></div>
          <div className='flex justify-between gap-2'><dt>Wellbeing notes</dt><dd>{intake.health.length||'None selected'}</dd></div>
        </dl>:<fieldset disabled={!editable||busy} className='min-w-0'>
          <IntakeFields key={step.id} value={intake} onChange={setIntake} kind={subject.kind} step={step.id}/>
        </fieldset>}
        {hold&&<p role='status' className='rounded-lg border border-amber-600/30 bg-amber-50 p-3 text-sm text-amber-900'>{hold}</p>}
        {last&&sendRequest&&<p className='rounded-lg bg-primary/5 p-3 text-sm leading-6'>
          {c.sample?'This sends a fictional request to the sample Founder chat.':'Hollie will receive a private request with these details in your chat.'}
        </p>}
        {error&&<p role='alert' className='rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive'>{error}</p>}
      </div>
      <footer className='flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-primary/15 pt-2'>
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
