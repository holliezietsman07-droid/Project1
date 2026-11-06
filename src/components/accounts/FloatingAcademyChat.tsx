import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { useRows } from '@/hooks/use-academy';
import { useMessageContacts } from '@/hooks/use-messaging';
import { founderContact } from '@/lib/messaging';
import { AcademyMessages } from '@/components/accounts/AcademyMessages';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function FloatingAcademyChat() {
  const { profile, session, loading } = useSession();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const roles = useRows('hka_account_roles', { user_id: session?.user.id ?? '' });
  const contacts = useMessageContacts();
  const messages = useRows('hka_messages');
  const ownRoles = (roles.data ?? []).filter(row => row.user_id === session?.user.id && row.status === 'authorized');
  if (loading || !profile || profile.id !== session?.user.id || profile.suspended || !session.user.email_confirmed_at || !ownRoles.length) return null;
  const isFounder = (contacts.data ?? []).some(row => row.founder_id === profile.id);
  const hollie = founderContact(contacts.data ?? []);
  const roots = { admin: '/dashboard/admin', student: '/dashboard/student', guardian: '/dashboard/parent', coach: '/dashboard/coach' };
  const root = roots[profile.role];
  const unread = (messages.data ?? []).filter(row => row.recipient_id === profile.id && !row.read_at && (isFounder || row.sender_id === hollie?.id)).length;
  const section = new URLSearchParams(location.search).get('section') || location.hash.slice(1);
  if (isFounder && location.pathname === root && section === 'messages') return null;
  const label = isFounder ? 'Messages' : 'Message Hollie';
  const inboxLink = root + '?section=messages' + (!isFounder && hollie ? '&contact=' + encodeURIComponent(hollie.id) : '');
  return <>
    {!open && <button type='button' className='floating-message !h-12 !w-auto gap-2 !rounded-full px-4' aria-label={label} aria-haspopup='dialog' onClick={() => setOpen(true)}>
      <MessageCircle className='size-5 shrink-0' /><span className='text-sm font-medium'>{label}</span>
      {unread > 0 && <span className='rounded-full bg-[#B79B62] px-1.5 text-xs text-white' aria-label={unread + ' unread messages'}>{unread > 99 ? '99+' : unread}</span>}
    </button>}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className='max-h-[88dvh] max-w-3xl overflow-y-auto'>
        <DialogHeader><DialogTitle>{isFounder ? 'Academy messages' : 'Message Hollie'}</DialogTitle>
          <DialogDescription>{isFounder ? 'Start or continue a private conversation with any active HKA member.' : 'Your direct conversation with Hollie follows you across dashboards. Authorised guardians can oversee linked minors under HKA safeguarding rules.'}</DialogDescription></DialogHeader>
        <AcademyMessages compact hollieOnly={!isFounder} />
        <DialogFooter><Button asChild variant='outline'><Link to={inboxLink} onClick={() => setOpen(false)}>Expand messages</Link></Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}

