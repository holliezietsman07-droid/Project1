import { useSearchParams } from 'react-router-dom';
import { ConversationWorkspace } from '@/components/accounts/ConversationWorkspace';
import { useMessaging } from '@/hooks/use-messaging';
import { useFitnessRequests } from '@/hooks/use-fitness-requests';
import { ProgrammeRequestCard } from '@/components/fitness/ProgrammeRequestCard';
import { founderContact } from '@/lib/messaging';
import { Button } from '@/components/ui/button';
import { useSession } from '@/contexts/SessionContext';
import { useUnsavedWork } from '@/hooks/use-unsaved-work';

export function AcademyMessages({ compact = false, studentId, contactId, hollieOnly = false }: { compact?: boolean; studentId?: string; contactId?: string; hollieOnly?: boolean }) {
  const { profile } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const messaging = useMessaging();
  const requests = useFitnessRequests();
  const founderDirectory = messaging.contacts.some(row => row.directory_entry === true);
  useUnsavedWork(Object.values(messaging.drafts).some(body => Boolean(body.trim())));
  if (!profile) return null;
  const hollie = founderContact(messaging.contacts);
  const requestMessages = new Map((requests.data??[]).flatMap(request=>[
    [request.message_id,request] as const,
    ...(request.reply_message_id?[[request.reply_message_id,request] as const]:[])
  ]));
  const peerId = hollieOnly ? hollie?.id : contactId ?? studentId ?? searchParams.get('contact') ?? searchParams.get('student') ?? undefined;
  if (hollieOnly && !hollie) return <p role={messaging.loading ? 'status' : 'alert'} className='rounded-lg border border-[#B79B62]/40 bg-[#F6F1E7] p-4 text-sm leading-6'>
    {messaging.loading ? 'Opening your conversation with Hollie…' : messaging.error || 'Hollie is currently unavailable. Please try again shortly.'}
  </p>;
  return <div className='space-y-3'>
    {!compact && hollie && <Button type='button' variant='outline' disabled={messaging.loading || hollie.can_message !== true} onClick={() => setSearchParams({ section: 'messages', contact: hollie.id })}>Message Hollie</Button>}
    <p className='text-sm text-muted-foreground'>{founderDirectory ? 'Founder inbox · Message any active HKA member, regardless of plan or coaching assignment.' : profile.role === 'admin' ? 'Admin inbox · Available contacts follow current academy messaging permissions.' :
      profile.role === 'coach' ? 'Coach inbox · Founder and your assigned, authorised students and guardians.' :
        'Contact Founder directly, or choose an assigned Coach or authorised family contact.'}</p>
    {messaging.error && <p role='alert' className='rounded-lg border border-[#B79B62]/40 bg-[#F6F1E7] p-4 text-sm leading-6'>{messaging.error}</p>}
    {!messaging.loading && !messaging.error && !messaging.contacts.some(row => row.can_message === true) &&
      <p className='text-sm text-muted-foreground'>No authorised contacts are available. Ask the academy to review account access; Founder contact does not require a coach assignment.</p>}
    <ConversationWorkspace key={peerId ?? profile.id} compact={compact} messages={messaging.messages} profiles={messaging.profiles}
      currentUserId={profile.id} peerId={peerId} contacts={messaging.contacts} founderDirectory={founderDirectory} loading={messaging.loading}
      drafts={messaging.drafts} onDraftsChange={messaging.setDrafts} canSend={(scope, recipientId) => !messaging.loading && !messaging.error && messaging.allowed(scope, recipientId)}
      renderMessage={row=>{
        const request=requestMessages.get(row.id);
        return request?<ProgrammeRequestCard request={request} viewerId={profile.id} reply={request.reply_message_id===row.id}/>:undefined;
      }}
      onSend={messaging.send} onRead={messaging.markRead}/>
  </div>;
}
