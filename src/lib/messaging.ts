import type { Role, Row } from '@/lib/academy';

export type MessageAccess = {
  userId: string; role: Role; studentId: string; recipientId: string;
  profiles: Row[]; assignments: Row[]; guardians: Row[];
};

// UI preflight only. Supabase RLS remains the authority for every read and write.
export function canSendMessage(access: MessageAccess): boolean {
  const { userId, role, studentId, recipientId, profiles, assignments, guardians } = access;
  if (!userId || !studentId || !recipientId || userId === recipientId) return false;
  const student = profiles.find(row => row.id === studentId);
  if (student?.suspended) return false;
  const assigned = (coachId: string) => assignments.some(row => row.student_id === studentId && row.coach_id === coachId);
  const linked = (guardianId: string) => guardians.some(row => row.student_id === studentId && row.guardian_id === guardianId && row.status === 'approved' && Boolean(row.consent_at));
  if (role === 'admin') return student?.role === 'student' && profiles.some(row => row.id === recipientId && !row.suspended);
  if (role === 'student') return studentId === userId && assigned(recipientId);
  if (role === 'coach') return assigned(userId) && (recipientId === studentId || linked(recipientId));
  if (role === 'guardian') return linked(userId) && (recipientId === studentId || assigned(recipientId));
  return false;
}

export function messageFailure(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
  if (code === '42501' || /row.level security|permission denied/i.test(message)) {
    return 'Your message was not sent. Ask Founder to check the assigned coach or approved family link for this conversation. Your draft is kept.';
  }
  if (/fetch|network|offline/i.test(message)) return 'Connection interrupted. Your draft is kept; check your connection before sending again.';
  return message || 'Message could not be sent. Your draft is kept; please try again.';
}
