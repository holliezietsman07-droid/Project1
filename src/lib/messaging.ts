import type { Row } from '@/lib/academy';

export type MessageAccess = {
  userId: string; studentId: string; recipientId: string; contacts: Row[];
};

// Contacts are minimal grants returned by the authenticated messaging RPC.
// This preflight improves feedback; table RLS independently enforces every insert.
export function canSendMessage({ userId, studentId, recipientId, contacts }: MessageAccess): boolean {
  return Boolean(userId && recipientId && recipientId !== userId && contacts.some(contact =>
    contact.id === recipientId && String(contact.student_id ?? '') === studentId && contact.can_message === true));
}

// Designation is supplied by the caller-bound RPC, never inferred from Admin role.
export function designatedFounderId(contacts: Row[]): string | undefined {
  if (!contacts.length || contacts.some(row => typeof row.founder_id !== 'string' || !row.founder_id)) return undefined;
  const ids = new Set(contacts.map(row => String(row.founder_id)));
  return ids.size === 1 ? [...ids][0] : undefined;
}

export function founderContact(contacts: Row[]): Row | undefined {
  const id = designatedFounderId(contacts);
  return id ? contacts.find(row => row.id === id && row.relationship === 'Founder direct message') : undefined;
}

export function messageRole(person?: Row): string {
  if (person?.role_label) return String(person.role_label);
  const labels: Record<string, string> = { admin: 'Admin', coach: 'Coach', guardian: 'Parent / Guardian', student: 'Student', horse_owner: 'Horse Owner' };
  return labels[String(person?.role)] ?? 'Academy member';
}

export function messagingSetupPending(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && ['PGRST202', '42883'].includes(String(error.code)));
}

export function messageFailure(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
  if (code === '42501' || /row.level security|permission denied/i.test(message)) {
    return 'Your message was not sent. Founder direct messaging does not require a coaching assignment. Ask the academy to review messaging access; external Coach contacts require an approved relationship. Your draft is kept.';
  }
  if (/fetch|network|offline/i.test(message)) return 'Connection interrupted. Your draft is kept; check your connection before sending again.';
  if (messagingSetupPending(error)) return 'Secure messaging is awaiting academy approval. Your draft is kept; no Founder coaching assignment is needed.';
  return 'Message could not be sent. Your draft is kept; please try again or contact the academy.';
}
