import { useRef, useState, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export function WorkflowDialog({ open, onOpenChange, title, description, dirty = false, busy = false, children }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string;
  dirty?: boolean; busy?: boolean; children: ReactNode;
}) {
  const [discard, setDiscard] = useState(false);
  const returnTarget = useRef<HTMLElement | null>(null);
  return <><Dialog open={open} onOpenChange={next => {
    if (busy) return;
    if (!next && dirty) { setDiscard(true); return; }
    onOpenChange(next);
  }}>
    <DialogContent onOpenAutoFocus={() => { returnTarget.current = document.activeElement as HTMLElement; }}
      onCloseAutoFocus={event => { if (returnTarget.current?.isConnected) { event.preventDefault(); returnTarget.current.focus(); } }}
      onPointerDownOutside={event => event.preventDefault()}
      className='flex max-h-[100dvh] min-h-[100dvh] w-full max-w-none flex-col gap-5 overflow-y-auto border-[#B79B62]/40 bg-[#F6F1E7] p-5 max-sm:rounded-none sm:min-h-0 sm:max-h-[90dvh] sm:max-w-2xl sm:p-7'>
      <DialogHeader className='shrink-0 pr-7 text-left'><p className='eyebrow text-[#826e45]'>HKA Equestrian</p><DialogTitle className='font-serif text-3xl font-normal'>{title}</DialogTitle><DialogDescription className='leading-6'>{description}</DialogDescription></DialogHeader>
      {children}
    </DialogContent>
  </Dialog><AlertDialog open={discard} onOpenChange={setDiscard}><AlertDialogContent className='w-[calc(100%-2rem)]'>
    <AlertDialogHeader><AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle><AlertDialogDescription>Your saved records stay unchanged. This draft will be discarded.</AlertDialogDescription></AlertDialogHeader>
    <AlertDialogFooter><AlertDialogCancel>Keep editing</AlertDialogCancel><AlertDialogAction onClick={() => { setDiscard(false); onOpenChange(false); }}>Discard draft</AlertDialogAction></AlertDialogFooter>
  </AlertDialogContent></AlertDialog></>;
}
