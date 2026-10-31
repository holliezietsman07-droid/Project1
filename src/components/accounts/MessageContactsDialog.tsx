import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { messageRole } from '@/lib/messaging';
import type { Row } from '@/lib/academy';

export function MessageContactsDialog({ contacts, founderDirectory, disabled, onChoose, focusComposer }: {
  contacts: Row[]; founderDirectory?: boolean; disabled?: boolean; onChoose: (contact: Row) => void; focusComposer: () => void;
}) {
  const [open, setOpen] = useState(false), [search, setSearch] = useState('');
  const selected = useRef(false);
  const entries = contacts.filter(row => row.can_message === true || (founderDirectory && row.directory_entry === true));
  const visible = entries.filter(row => (String(row.full_name) + ' ' + messageRole(row)).toLowerCase().includes(search.trim().toLowerCase()));
  return <Dialog open={open} onOpenChange={value => { setOpen(value); if (value) { setSearch(''); selected.current = false; } }}>
    <DialogTrigger asChild><Button type='button' size='sm' variant='outline' disabled={disabled}>New Message</Button></DialogTrigger>
    <DialogContent className='max-h-[85dvh] max-w-xl overflow-hidden' onCloseAutoFocus={event => { if (selected.current) { event.preventDefault(); requestAnimationFrame(focusComposer); } }}>
      <DialogHeader><DialogTitle>{founderDirectory ? 'Registered HKA users' : 'Authorised contacts'}</DialogTitle>
        <DialogDescription>{founderDirectory ? 'Founder direct messages are independent of coaching assignments. Unavailable accounts cannot receive new messages.' :
          'Contact Founder directly. External Coaches and family contacts appear only with an approved relationship and required consent.'}</DialogDescription></DialogHeader>
      <div className='relative'><Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'/>
        <Input autoComplete='off' value={search} onChange={event => setSearch(event.target.value)} aria-label='Search messaging contacts' placeholder='Search name or role' className='pl-9'/></div>
      <div className='max-h-[52dvh] space-y-2 overflow-y-auto'>
        {visible.map(row => <div key={row.id + ':' + String(row.student_id ?? '')} className='rounded-lg border border-primary/15 p-3'>
          <div className='flex items-start justify-between gap-3'><div className='min-w-0'><p className='break-words font-medium'>{String(row.full_name || 'Academy member')}</p>
            <p className='mt-1 text-xs text-muted-foreground'>{messageRole(row)} · {String(row.relationship || 'Founder direct message')}{row.student_name ? ' · ' + String(row.student_name) : ''}</p></div>
            <Button type='button' size='sm' variant='outline' disabled={row.can_message !== true} aria-label={'Message ' + String(row.full_name || 'member')} onClick={() => { selected.current = true; onChoose(row); setOpen(false); }}>
              <MessageCircle className='mr-1 size-3'/>Message</Button></div>
          {row.can_message !== true && <p className='mt-2 text-xs text-muted-foreground'>Unavailable · account approval, verification or consent required.</p>}
          {founderDirectory && <Link to={'/dashboard/users/' + row.id} className='mt-2 inline-block text-xs underline'>Open management profile</Link>}
        </div>)}
        {!visible.length && <p className='py-4 text-sm text-muted-foreground'>No authorised contacts match this search.</p>}
      </div>
    </DialogContent>
  </Dialog>;
}
