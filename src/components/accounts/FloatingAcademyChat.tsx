import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { AcademyMessages } from '@/components/accounts/AcademyMessages';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function FloatingAcademyChat() {
  const { profile } = useSession();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  if (!profile || !['student', 'admin'].includes(profile.role)) return null;
  const root = profile.role === 'admin' ? '/dashboard/admin' : '/dashboard/student';
  const section = new URLSearchParams(location.search).get('section') || location.hash.slice(1);
  if (location.pathname === root && section === 'messages') return null;
  return <>
    {!open && <button type='button' className='floating-message' aria-label='Open messages' aria-haspopup='dialog' onClick={() => setOpen(true)}><MessageCircle className='size-6' /></button>}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className='max-h-[88dvh] max-w-3xl overflow-y-auto'>
        <DialogHeader><DialogTitle>Academy messages</DialogTitle><DialogDescription>Continue your authorised academy conversation without leaving this page.</DialogDescription></DialogHeader>
        <AcademyMessages compact />
        <DialogFooter><Button asChild variant='outline'><Link to={root + '?section=messages'} onClick={() => setOpen(false)}>Expand messages</Link></Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}

