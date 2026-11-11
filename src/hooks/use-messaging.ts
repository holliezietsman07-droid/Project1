import { showSuccess } from '@/utils/toast';
import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/contexts/SessionContext';
import { useRows, useRefreshAcademy } from '@/hooks/use-academy';
import { db, listRows, rpc, saveRow, type Row } from '@/lib/academy';
import { canSendMessage, messageFailure, messagingSetupPending } from '@/lib/messaging';

export function useMessageContacts() {
  const { session, profile } = useSession();
  return useQuery<Row[]>({
    queryKey: ['academy', session?.user.id, 'message-contacts'],
    queryFn: async () => (await rpc('hka_message_contacts', {})) ?? [],
    enabled: Boolean(session && profile?.id === session.user.id && !profile.suspended),
    retry: false, refetchInterval: 15000,
  });
}

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
  const contacts = useMessageContacts();
  const grants = contacts.data ?? [];
  // The RPC exposes names/roles only, including identities from authorised history.
  const people = [...new Map([...(profiles.data ?? []), ...grants].map(person => [person.id, person])).values()];
  const allowed = (studentId: string, recipientId: string, currentContacts = grants) =>
    Boolean(profile && !profile.suspended && session?.user.id === profile.id &&
      canSendMessage({userId: session.user.id, studentId, recipientId, contacts: currentContacts}));
  useEffect(() => {
    if (!session?.user.id) return;
    const channel = db().channel('academy-messages:' + session.user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hka_messages' },
        () => {
          void cache.invalidateQueries({ queryKey: ['academy', session.user.id, 'hka_messages'] });
          void cache.invalidateQueries({ queryKey: ['academy', session.user.id, 'fitness-requests'] });
        })
      .subscribe();
    return () => { void db().removeChannel(channel); };
  }, [session?.user.id, cache]);

  async function send(studentId: string, recipientId: string, body: string) {
    if (sending.current) throw new Error('A message is already being sent.');
    if (!profile || !session || profile.id !== session.user.id) throw new Error('Sign in again before sending your message.');
    if (!body.trim() || body.trim().length > 4000) throw new Error('Enter a message of up to 4,000 characters.');
    sending.current = true;
    try {
      // Recheck server grants after role/consent/relationship changes while composing.
      const currentContacts: Row[] = (await rpc('hka_message_contacts', {})) ?? [];
      cache.setQueryData(['academy', session.user.id, 'message-contacts'], currentContacts);
      if (!allowed(studentId, recipientId, currentContacts)) throw new Error('This contact is no longer available for messaging. Founder contact requires no coaching assignment; external Coaches need an approved relationship. Your draft is kept.');
      await saveRow('hka_messages', { student_id: studentId || null, sender_id: session.user.id, recipient_id: recipientId, body: body.trim() });
      showSuccess('Message sent.');
      // A confirmed insert must never be reported as failed because refresh fails.
      void refresh();
    } catch (error) { throw new Error(messageFailure(error)); }
    finally { sending.current = false; }
  }
  async function markRead(ids: string[]) {
    if (!session) return;
    const ownUnread = (messages.data ?? []).filter(row => ids.includes(row.id) && row.recipient_id === session.user.id && !row.read_at).map(row => row.id);
    if (!ownUnread.length) return;
    const { data, error } = await db().from('hka_messages').update({ read_at: new Date().toISOString() })
      .eq('recipient_id', session.user.id).is('read_at', null).in('id', ownUnread).select('id,read_at');
    if (error) throw new Error('Messages are visible, but read status could not be saved. Please reopen this conversation to retry.');
    const saved = new Map((data ?? []).map(row => [row.id, row.read_at]));
    cache.setQueryData<Row[]>(['academy', session.user.id, 'hka_messages', {}],
      previous => previous?.map(row => saved.has(row.id) ? { ...row, read_at: saved.get(row.id)! } : row));
    void refresh();
  }
  const setupPending = messagingSetupPending(contacts.error);
  return { messages: messages.data ?? [], profiles: people, contacts: grants, allowed, send, markRead, setupPending,
    drafts:drafts.data??{},setDrafts:(next:Record<string,string>)=>cache.setQueryData(['message-drafts',session?.user.id],next),
    loading: messages.isLoading || profiles.isLoading || contacts.isLoading,
    error: setupPending ? 'Founder direct messaging is awaiting approval of the secure messaging update. No coach assignment is needed to contact Founder. Existing history remains available.' :
      contacts.error || messages.error ? 'Conversations or authorised contacts could not be loaded. Please try again.' : '',
  };
}
