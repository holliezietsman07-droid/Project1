import { useSearchParams } from 'react-router-dom';
import { ConversationWorkspace } from '@/components/accounts/ConversationWorkspace';
import { useMessaging } from '@/hooks/use-messaging';
import { useSession } from '@/contexts/SessionContext';
import { useUnsavedWork } from '@/hooks/use-unsaved-work';

export function AcademyMessages({ compact = false, studentId, contactId }: { compact?: boolean; studentId?: string; contactId?: string }) {
  const { profile } = useSession();
  const [searchParams] = useSearchParams();
  const messaging = useMessaging();
  useUnsavedWork(Object.values(messaging.drafts).some(body => Boolean(body.trim())));
  if (!profile) return null;
  const peerId = contactId ?? studentId ?? searchParams.get('contact') ?? searchParams.get('student') ?? undefined;
  return <div className='space-y-3'>
    <p className='text-sm text-muted-foreground'>{profile.role === 'admin' ? 'Founder inbox · Message any registered member without a coaching assignment.' :
      profile.role === 'coach' ? 'Coach inbox · Founder and your assigned, authorised students and guardians.' :
        'Contact Founder directly, or choose an assigned Coach or authorised family contact.'}</p>
    {messaging.error && <p role='alert' className='rounded-lg border border-[#B79B62]/40 bg-[#F6F1E7] p-4 text-sm leading-6'>{messaging.error}</p>}
    {!messaging.loading && !messaging.error && !messaging.contacts.some(row => row.can_message === true) &&
      <p className='text-sm text-muted-foreground'>No authorised contacts are available. Ask the academy to review account access; Founder contact does not require a coach assignment.</p>}
    <ConversationWorkspace key={peerId ?? profile.id} compact={compact} messages={messaging.messages} profiles={messaging.profiles}
      currentUserId={profile.id} peerId={peerId} contacts={messaging.contacts} founderDirectory={profile.role === 'admin'} loading={messaging.loading}
      drafts={messaging.drafts} onDraftsChange={messaging.setDrafts} canSend={(scope, recipientId) => !messaging.loading && !messaging.error && messaging.allowed(scope, recipientId)}
      onSend={messaging.send} onRead={messaging.markRead}/>
  </div>;
}
