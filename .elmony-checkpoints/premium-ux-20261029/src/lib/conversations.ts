import type { Row } from '@/lib/academy';

export type Conversation = {
  id: string; studentId: string; recipientId: string; name: string;
  thread: Row[]; last?: Row; unread: number; canReply: boolean;
};

export function buildConversations(messages: Row[], profiles: Row[], currentUserId: string, scopeStudentId?: string, recipientIds: string[] = []): Conversation[] {
  const names = new Map(profiles.map(row => [String(row.id), String(row.full_name || 'Academy member')]));
  const name = (id: string) => names.get(id) ?? ('Academy member · ' + id.slice(0, 8));
  const conversations = new Map<string, Conversation>();
  function threadFor(studentId: string, sender: string, recipient: string) {
    const participants = [sender, recipient].sort();
    const id = [studentId, ...participants].join(':');
    if (!conversations.has(id)) {
      const canReply = participants.includes(currentUserId);
      const peer = participants.find(person => person !== currentUserId) ?? '';
      conversations.set(id, {
        id, studentId, recipientId: canReply ? peer : '',
        name: canReply ? name(peer) + (peer !== studentId && currentUserId !== studentId ? ' · ' + name(studentId) : '') : participants.map(name).join(' & ') + ' · ' + name(studentId),
        thread: [], unread: 0, canReply,
      });
    }
    return conversations.get(id)!;
  }
  for (const row of messages) {
    const studentId = String(row.student_id ?? '');
    const sender = String(row.sender_id ?? '');
    const recipient = String(row.recipient_id ?? '');
    if (!studentId || !sender || !recipient || sender === recipient || (scopeStudentId && studentId !== scopeStudentId)) continue;
    threadFor(studentId, sender, recipient).thread.push(row);
  }
  if (currentUserId) {
    if (scopeStudentId === currentUserId) {
      for (const id of recipientIds) if (id && id !== currentUserId) threadFor(currentUserId, currentUserId, id);
    } else {
      for (const row of profiles) {
        const id = String(row.id);
        if (row.role === 'student' && id !== currentUserId && (!scopeStudentId || id === scopeStudentId)) threadFor(id, currentUserId, id);
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
