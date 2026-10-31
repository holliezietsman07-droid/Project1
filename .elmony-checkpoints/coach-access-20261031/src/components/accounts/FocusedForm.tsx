import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WorkflowDialog } from '@/components/accounts/WorkflowDialog';
import { errorText } from '@/lib/academy';

export function FocusedForm({ title, description = 'Update this record, then save when ready.', triggerLabel, children, onSubmit, feedback, disabled = false, open: controlledOpen, onOpenChange }: {
  title: string; description?: string; triggerLabel?: string; children: ReactNode; onSubmit:(event:FormEvent<HTMLFormElement>)=>Promise<boolean|void>;
  feedback?: string; disabled?: boolean; open?:boolean; onOpenChange?:(open:boolean)=>void;
}) {
  const [localOpen,setLocalOpen]=useState(false),[busy,setBusy]=useState(false),[dirty,setDirty]=useState(false),[error,setError]=useState('');
  const lock=useRef(false);
  const [submitted,setSubmitted]=useState(false);
  const open=controlledOpen??localOpen;
  const changeOpen=(next:boolean)=>{setLocalOpen(next);setSubmitted(false);onOpenChange?.(next);if(!next){setDirty(false);setError('');}};
  return <><section className='paper-card p-5 sm:p-6'><div className='flex flex-wrap items-center justify-between gap-4'><div><h3 className='font-serif text-2xl'>{title}</h3><p className='mt-2 max-w-lg text-sm leading-6 text-muted-foreground'>{description}</p></div><Button type='button' variant='outline' disabled={disabled} onClick={()=>changeOpen(true)}>{triggerLabel||title}</Button></div></section>
    <WorkflowDialog open={open} onOpenChange={changeOpen} title={title} description={description} dirty={dirty} busy={busy}>
      <form onChange={()=>setDirty(true)} className='grid min-w-0 gap-4 [&_input]:min-w-0 [&_textarea]:min-w-0' onSubmit={async event=>{
        event.preventDefault();if(lock.current)return;lock.current=true;setSubmitted(true);setBusy(true);setError('');
        try{if(await onSubmit(event)===true)changeOpen(false);}catch(failure){setError(errorText(failure));}finally{lock.current=false;setBusy(false);}
      }}><fieldset disabled={busy} className='grid min-w-0 gap-4'>{children}</fieldset>
        {(error||(submitted&&!busy&&feedback))&&<p role={error?'alert':'status'} className='break-words text-sm'>{error||feedback}</p>}
        <div className='flex items-center justify-between gap-3 border-t border-primary/15 pt-4'>{busy?<p role='status' className='text-sm'>Saving…</p>:<span className='text-xs text-muted-foreground'>Changes save only when submitted.</span>}<DialogClose asChild><Button type='button' variant='ghost' disabled={busy}>Cancel</Button></DialogClose></div>
      </form>
    </WorkflowDialog></>;
}
