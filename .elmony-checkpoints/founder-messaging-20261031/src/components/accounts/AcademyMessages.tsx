import { Link, useSearchParams } from 'react-router-dom';
import { ConversationWorkspace } from '@/components/accounts/ConversationWorkspace';
import { useMessaging } from '@/hooks/use-messaging';
import { useSession } from '@/contexts/SessionContext';
import { useUnsavedWork } from '@/hooks/use-unsaved-work';

export function AcademyMessages({ compact = false, studentId }: { compact?: boolean; studentId?: string }) {
  const { profile } = useSession();
  const [searchParams]=useSearchParams();
  const messaging = useMessaging();
  useUnsavedWork(Object.values(messaging.drafts).some(body=>Boolean(body.trim())));
  if (!profile) return null;
  return <div className='space-y-3'>
    {profile.role==='admin'&&!messaging.loading&&!messaging.error&&!messaging.hasAssignments&&<p className='rounded-lg border border-[#B79B62]/40 bg-[#F6F1E7] p-4 text-sm leading-6'>Students can reply only to assigned coaches. <Link className='underline' to='/dashboard/admin?section=students'>Open Student Directory</Link>, choose Manage, then assign the correct coach before expecting a reply.</p>}
    {messaging.error && <p role='alert' className='text-sm text-destructive'>{messaging.error}</p>}
    {!messaging.loading && !messaging.error && profile.role === 'student' && !messaging.recipientIds.length &&
      <p className='rounded-lg border border-[#B79B62]/40 bg-[#F6F1E7] p-4 text-sm leading-6'>Founder needs to assign your academy coach before you can send messages. Existing conversations remain available to read.</p>}
    <ConversationWorkspace compact={compact} messages={messaging.messages} profiles={messaging.profiles}
      currentUserId={profile.id} scopeStudentId={profile.role === 'student' ? profile.id : studentId??searchParams.get('student')??undefined}
      recipientIds={messaging.recipientIds} loading={messaging.loading}
      drafts={messaging.drafts} onDraftsChange={messaging.setDrafts} canSend={(studentId,recipientId)=>!messaging.loading&&!messaging.error&&messaging.allowed(studentId,recipientId)} onSend={messaging.send} onRead={messaging.markRead}/>
  </div>;
}
