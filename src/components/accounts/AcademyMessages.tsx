import { useSearchParams } from 'react-router-dom';
import { ConversationWorkspace } from '@/components/accounts/ConversationWorkspace';
import { useMessaging } from '@/hooks/use-messaging';
import { useSession } from '@/contexts/SessionContext';
import { useUnsavedWork } from '@/hooks/use-unsaved-work';

export function AcademyMessages({ compact = false, studentId, contactId, hollieOnly = false }: { compact?: boolean; studentId?: string; contactId?: string; hollieOnly?: boolean }) {
  const { profile } = useSession();
  const [searchParams] = useSearchParams();
  const messaging = useMessaging();
  const founderDirectory = messaging.contacts.some(row => row.directory_entry === true);
  useUnsavedWork(Object.values(messaging.drafts).some(body => Boolean(body.trim())));
  if (!profile) return null;
  const hollie = messaging.contacts.find(row => row.role === 'admin' && row.relationship === 'Founder direct message');
  const peerId = hollieOnly ? hollie?.id : contactId ?? studentId ?? searchParams.get('contact') ?? searchParams.get('student') ?? undefined;
  if (hollieOnly && !hollie) return <p role={messaging.loading ? 'status' : 'alert'} className='rounded-lg border border-[#B79B62]/40 bg-[#F6F1E7] p-4 text-sm leading-6'>
    {messaging.loading ? 'Opening your conversation with Hollie…' : messaging.error || 'Hollie is currently unavailable. Please try again shortly.'}
  </p>;
  return <div className='space-y-3'>
    <p className='text-sm text-muted-foreground'>{founderDirectory ? 'Founder inbox · Message any active HKA member, regardless of plan or coaching assignment.' : profile.role === 'admin' ? 'Founder inbox · Available contacts follow current academy messaging permissions.' :
      profile.role === 'coach' ? 'Coach inbox · Founder and your assigned, authorised students and guardians.' :
        'Contact Founder directly, or choose an assigned Coach or authorised family contact.'}</p>
    {messaging.error && <p role='alert' className='rounded-lg border border-[#B79B62]/40 bg-[#F6F1E7] p-4 text-sm leading-6'>{messaging.error}</p>}
    {!messaging.loading && !messaging.error && !messaging.contacts.some(row => row.can_message === true) &&
      <p className='text-sm text-muted-foreground'>No authorised contacts are available. Ask the academy to review account access; Founder contact does not require a coach assignment.</p>}
    <ConversationWorkspace key={peerId ?? profile.id} compact={compact} messages={messaging.messages} profiles={messaging.profiles}
      currentUserId={profile.id} peerId={peerId} contacts={messaging.contacts} founderDirectory={founderDirectory} loading={messaging.loading}
      drafts={messaging.drafts} onDraftsChange={messaging.setDrafts} canSend={(scope, recipientId) => !messaging.loading && !messaging.error && messaging.allowed(scope, recipientId)}
      onSend={messaging.send} onRead={messaging.markRead}/>
  </div>;
}
