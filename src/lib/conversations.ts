import type { Row } from '@/lib/academy';
import { messageRole } from '@/lib/messaging';

export type Conversation = {
  id: string; studentId: string; recipientId: string; name: string;
  roleLabel: string; relationship: string; thread: Row[]; last?: Row; unread: number; canReply: boolean;
};
type ContactOptions = { contacts: Row[]; peerId?: string; startContact?: Row };

export function conversationKey(studentId: string, sender: string, recipient: string) {
  return [studentId, ...[sender, recipient].sort()].join(':');
}

export function buildConversations(messages: Row[], profiles: Row[], currentUserId: string, scopeStudentId?: string, recipientIds: string[] = [], authorize?: (studentId: string, recipientId: string) => boolean, options?: ContactOptions): Conversation[] {
  const people = new Map(profiles.map(row => [String(row.id), row]));
  const name = (id: string) => String(people.get(id)?.full_name || 'Academy member');
  const conversations = new Map<string, Conversation>();
  function threadFor(originalStudentId: string, sender: string, recipient: string) {
    const participants = [sender, recipient].sort();
    // Founder direct history and new messages share one pair, without rewriting saved rows.
    const isParticipant = participants.includes(currentUserId);
    const directContact = isParticipant ? options?.contacts.find(row => participants.includes(row.id) && row.id !== currentUserId && row.relationship === 'Founder direct message')
      ?? options?.contacts.find(row => participants.includes(row.id) && row.id !== currentUserId) : undefined;
    const direct = options && (directContact?.relationship === 'Founder direct message' || participants.some(id => people.get(id)?.role === 'admin'));
    const studentId = direct && isParticipant ? String(directContact ? directContact.student_id ?? '' : participants.find(id => people.get(id)?.role === 'student') ?? '') : originalStudentId;
    // Direct identity survives purpose changes and dashboard switches; scope still
    // comes from the current server grant for every send.
    const id = conversationKey(direct ? 'direct' : studentId, sender, recipient);
    if (!conversations.has(id)) {
      const participant = participants.includes(currentUserId);
      const peer = participants.find(person => person !== currentUserId) ?? '';
      const contact = options?.contacts.find(row => row.id === peer && String(row.student_id ?? '') === studentId && row.can_message === true);
      const canReply = participant && (!options || Boolean(contact)) && (!authorize || authorize(studentId, peer));
      const context = studentId && peer !== studentId && currentUserId !== studentId ? ' · ' + String(contact?.student_name || name(studentId)) : '';
      conversations.set(id, {
        id, studentId, recipientId: participant ? peer : '',
        name: participant ? name(peer) + context : participants.map(name).join(' & ') + (studentId ? ' · ' + name(studentId) : ''),
        roleLabel: participant ? messageRole(people.get(peer)) : 'Authorised oversight',
        relationship: String(contact?.relationship || (participant ? 'Previous conversation' : 'History only')),
        thread: [], unread: 0, canReply,
      });
    }
    return conversations.get(id)!;
  }
  for (const row of messages) {
    const studentId = String(row.student_id ?? '');
    const sender = String(row.sender_id ?? '');
    const recipient = String(row.recipient_id ?? '');
    if (!sender || !recipient || sender === recipient || (!studentId && !options) || (scopeStudentId && studentId !== scopeStudentId)) continue;
    if (options?.peerId && ![sender, recipient].includes(options.peerId)) continue;
    threadFor(studentId, sender, recipient).thread.push(row);
  }
  if (currentUserId && options) {
    const contact = options.startContact ?? options.contacts.find(row => row.id === options.peerId && row.can_message === true);
    if (contact && contact.id !== currentUserId && contact.can_message === true && (!options.peerId || contact.id === options.peerId) &&
      (!authorize || authorize(String(contact.student_id ?? ''), contact.id))) threadFor(String(contact.student_id ?? ''), currentUserId, contact.id);
  } else if (currentUserId) {
    if (scopeStudentId === currentUserId) {
      for (const id of recipientIds) if (id && id !== currentUserId && (!authorize || authorize(currentUserId, id))) threadFor(currentUserId, currentUserId, id);
    } else {
      for (const row of profiles) {
        const id = String(row.id);
        if (row.role === 'student' && id !== currentUserId && (!scopeStudentId || id === scopeStudentId) && (!authorize || authorize(id, id))) threadFor(id, currentUserId, id);
      }
    }
  }
  for (const conversation of conversations.values()) {
    conversation.thread.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    conversation.last = conversation.thread.at(-1);
    conversation.unread = conversation.thread.filter(row => String(row.recipient_id) === currentUserId && !row.read_at).length;
  }
  return [...conversations.values()].sort((a, b) => String(b.last?.created_at ?? '').localeCompare(String(a.last?.created_at ?? '')) || a.name.localeCompare(b.name));
}
