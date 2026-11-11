import { useRef, useState, type ReactNode, type RefObject } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

export function WorkflowDialog({ open, onOpenChange, title, description, dirty = false, busy = false, children, contentClassName, initialFocus }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string;
  dirty?: boolean; busy?: boolean; children: ReactNode;
  contentClassName?: string; initialFocus?: RefObject<HTMLElement | null>;
}) {
  const [discard, setDiscard] = useState(false);
  const returnTarget = useRef<HTMLElement | null>(null);
  return <><Dialog open={open} onOpenChange={next => {
    if (busy) return;
    if (!next && dirty) { setDiscard(true); return; }
    onOpenChange(next);
  }}>
    <DialogContent onOpenAutoFocus={event => {
        returnTarget.current = document.activeElement as HTMLElement;
        if (initialFocus?.current) {
          event.preventDefault();
          initialFocus.current.focus({preventScroll:true});
        }
      }}
      onCloseAutoFocus={event => { if (returnTarget.current?.isConnected) { event.preventDefault(); returnTarget.current.focus(); } }}
      onPointerDownOutside={event => event.preventDefault()}
      className={cn('flex w-full max-w-none flex-col gap-3 overflow-y-auto overscroll-contain border-[#B79B62]/40 bg-[#F6F1E7] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:max-h-[96dvh] max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-t-2xl sm:max-h-[90dvh] sm:max-w-xl sm:rounded-2xl sm:p-6', contentClassName)}>
      <DialogHeader className='shrink-0 border-b border-primary/10 pb-3 pr-7 text-left'><DialogTitle className='font-serif text-2xl font-normal sm:text-3xl'>{title}</DialogTitle><DialogDescription className='text-sm leading-5'>{description}</DialogDescription></DialogHeader>
      {children}
    </DialogContent>
  </Dialog><AlertDialog open={discard} onOpenChange={setDiscard}><AlertDialogContent className='w-[calc(100%-2rem)]'>
    <AlertDialogHeader><AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle><AlertDialogDescription>Your saved records stay unchanged. This draft will be discarded.</AlertDialogDescription></AlertDialogHeader>
    <AlertDialogFooter><AlertDialogCancel>Keep editing</AlertDialogCancel><AlertDialogAction onClick={() => { setDiscard(false); onOpenChange(false); }}>Discard draft</AlertDialogAction></AlertDialogFooter>
  </AlertDialogContent></AlertDialog></>;
}
