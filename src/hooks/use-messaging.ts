import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/contexts/SessionContext';
import { useRows, useRefreshAcademy } from '@/hooks/use-academy';
import { db, listRows, saveRow, type Row } from '@/lib/academy';
import { canSendMessage, messageFailure } from '@/lib/messaging';

export function useMessaging() {
  const { session, profile } = useSession();
  const cache = useQueryClient(), refresh = useRefreshAcademy(), sending = useRef(false);
  const drafts = useQuery<Record<string,string>>({queryKey:['message-drafts',session?.user.id],queryFn:async()=>({}),initialData:{},enabled:false});
  const messages = useQuery({
    queryKey: ['academy', session?.user.id, 'hka_messages', {}],
    queryFn: () => listRows('hka_messages'), enabled: Boolean(session),
    refetchInterval: 15000, retry: 1,
  });
  const profiles = useRows('hka_profiles');
  const coachPurposes = useRows('hka_account_roles', {}, profile?.role === 'coach');
  const approvedCoach = profile?.role !== 'coach' || (coachPurposes.data ?? []).some(row => row.user_id === profile.id && row.purpose === 'coach' && row.status === 'authorized');
  const assignments = useRows('hka_coach_students');
  const guardians = useRows('hka_guardians', {}, profile?.role !== 'student');
  const people = profiles.data ?? [];
  const links = assignments.data ?? [], families = guardians.data ?? [];
  const allowed = (studentId: string, recipientId: string, coaches = links, family = families) =>
    Boolean(profile && !profile.suspended && approvedCoach && session?.user.id === profile.id && canSendMessage({
      userId: session.user.id, role: profile.role, studentId, recipientId,
      profiles: people, assignments: coaches, guardians: family,
    }));
  useEffect(() => {
    if (!session?.user.id) return;
    const channel = db().channel('academy-messages:' + session.user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hka_messages' },
        () => { void cache.invalidateQueries({ queryKey: ['academy', session.user.id, 'hka_messages'] }); })
      .subscribe();
    return () => { void db().removeChannel(channel); };
  }, [session?.user.id, cache]);

  async function send(studentId: string, recipientId: string, body: string) {
    if (sending.current) throw new Error('A message is already being sent.');
    if (!profile || !session || profile.id !== session.user.id) throw new Error('Sign in again before sending your message.');
    if (!body.trim() || body.trim().length > 4000) throw new Error('Enter a message of up to 4,000 characters.');
    sending.current = true;
    try {
      // Recheck assignments before insert, including revocation while the composer was open.
      const coaches = await listRows('hka_coach_students', { student_id: studentId });
      const family = profile.role === 'student' ? [] : await listRows('hka_guardians', { student_id: studentId });
      if (!allowed(studentId, recipientId, coaches, family)) throw new Error('No authorised recipient is available. Ask Founder to confirm the assigned coach or approved family link. Your draft is kept.');
      await saveRow('hka_messages', { student_id: studentId, sender_id: session.user.id, recipient_id: recipientId, body: body.trim() });
      // A confirmed insert must never be reported as failed because a subsequent refresh fails.
      void refresh();
    } catch (error) { throw new Error(messageFailure(error)); }
    finally { sending.current = false; }
  }
  async function markRead(ids: string[]) {
    if (!session) return;
    const ownUnread = (messages.data ?? []).filter(row => ids.includes(row.id) && row.recipient_id === session.user.id && !row.read_at).map(row => row.id);
    if (!ownUnread.length) return;
    const readAt = new Date().toISOString();
    const { data, error } = await db().from('hka_messages').update({ read_at: readAt })
      .eq('recipient_id', session.user.id).is('read_at', null).in('id', ownUnread).select('id,read_at');
    if (error) throw new Error('Messages are visible, but read status could not be saved. Please reopen this conversation to retry.');
    const saved = new Map((data ?? []).map(row => [row.id, row.read_at]));
    cache.setQueryData<Row[]>(['academy', session.user.id, 'hka_messages', {}],
      previous => previous?.map(row => saved.has(row.id) ? { ...row, read_at: saved.get(row.id)! } : row));
    void refresh();
  }
  const required = [messages, profiles, assignments, ...(profile?.role === 'student' ? [] : [guardians]), ...(profile?.role === 'coach' ? [coachPurposes] : [])];
  return { messages: messages.data ?? [], profiles: people, allowed, send, markRead, hasAssignments:links.length>0,
    drafts:drafts.data??{},setDrafts:(next:Record<string,string>)=>cache.setQueryData(['message-drafts',session?.user.id],next),
    recipientIds: links.filter(row => row.student_id === profile?.id && row.coach_id !== profile?.id).map(row => String(row.coach_id)),
    loading: required.some(query => query.isLoading),
    error: required.some(query => query.error) ? 'Conversations or authorised contacts could not be loaded. Please try again.' : !approvedCoach && !coachPurposes.isLoading ? 'Founder approval is required for this coach account before sending messages. Existing history remains available.' : '',
  };
}
