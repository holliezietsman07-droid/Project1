import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useMessaging } from '@/hooks/use-messaging';
import { messageRole } from '@/lib/messaging';

export default function UserManagementProfile() {
  const { userId = '' } = useParams();
  const messaging = useMessaging();
  const person = messaging.profiles.find(row => row.id === userId);
  const contact = messaging.contacts.find(row => row.id === userId && row.can_message === true);
  return <section className='page-width space-y-6 py-10 lg:py-14'>
    <nav aria-label='Breadcrumb' className='text-xs text-muted-foreground'>
      <Link to='/dashboard/admin'>Founder dashboard</Link><span aria-hidden='true'> / </span>
      <Link to='/dashboard/admin?section=messages'>Registered users and messages</Link>
    </nav>
    {messaging.loading ? <p role='status'>Loading management profile…</p> : !person ?
      <p role='alert'>This account is unavailable or outside your authorised access.</p> :
      <article className='paper-card space-y-4 p-6 sm:p-8'>
        <p className='eyebrow text-[#826e45]'>User management profile</p>
        <h1 className='section-heading'>{String(person.full_name || 'Academy member')}</h1>
        <p className='text-sm text-muted-foreground'>{messageRole(person)} · {person.suspended ? 'Suspended' : 'Registered'}</p>
        {person.created_at && <p className='text-xs text-muted-foreground'>Joined {new Date(String(person.created_at)).toLocaleDateString()}</p>}
        <p className='text-sm leading-6 text-muted-foreground'>Founder direct messaging is independent of coaching assignments. Account verification, approval and guardian consent remain required.</p>
        <div className='flex flex-wrap gap-3'>
          {contact ? <Button asChild><Link to={'/dashboard/admin?section=messages&contact=' + userId}>Open direct conversation</Link></Button> :
            <Button disabled>Messaging unavailable</Button>}
          {person.role === 'student' && <Button asChild variant='outline'><Link to={'/dashboard/students/' + userId}>Open student record</Link></Button>}
        </div>
        {!contact && !messaging.error && <p className='text-sm text-muted-foreground'>This account cannot receive new messages until required verification, approval or consent is complete.</p>}
      </article>}
    {messaging.error && <p role='alert' className='rounded-lg border border-[#B79B62]/40 bg-[#F6F1E7] p-4 text-sm'>{messaging.error}</p>}
  </section>;
}
