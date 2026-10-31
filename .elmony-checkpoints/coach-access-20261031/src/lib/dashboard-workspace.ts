import type { Profile, Row } from '@/lib/academy';
import { dayInTimezone } from '@/lib/coaching';

export type RiderPreferences = Record<string, unknown>;
export function riderPreferences(roles: Row[], userId: string): RiderPreferences {
  const saved = roles.find(row => row.user_id === userId && row.purpose === 'student')?.onboarding as unknown;
  return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved as RiderPreferences : {};
}
export function studentJourney(profile: Profile, preferences: RiderPreferences, enrolments: Row[], requests: Row[], appointments: Row[]) {
  return [
    Boolean(profile.full_name.trim() && profile.birth_date && profile.timezone),
    Boolean(preferences.primary_discipline && preferences.experience_level && String(preferences.riding_goals ?? '').trim()),
    Boolean(preferences.learning_pathway),
    enrolments.some(row => row.student_id === profile.id && row.status === 'active'),
    requests.some(row => row.student_id === profile.id && row.status !== 'cancelled' && row.status !== 'declined') ||
      appointments.some(row => row.student_id === profile.id && row.status === 'scheduled'),
  ];
}
export function founderDay(appointments: Row[], requests: Row[], submissions: Row[], courses: Row[], timezone: string, now = new Date()) {
  const pending = requests.filter(row => ['pending','reschedule_requested','cancellation_requested'].includes(String(row.status)));
  const marking = submissions.filter(row => ['submitted','under_review'].includes(String(row.status)));
  const upcoming = appointments.filter(row => row.status === 'scheduled' && Date.parse(String(row.starts_at)) > now.getTime())
    .sort((a,b) => Date.parse(String(a.starts_at)) - Date.parse(String(b.starts_at)));
  const today = appointments.filter(row => row.status === 'scheduled' &&
    dayInTimezone(new Date(String(row.starts_at)), timezone) === dayInTimezone(now, timezone))
    .sort((a,b) => Date.parse(String(a.starts_at)) - Date.parse(String(b.starts_at)));
  return { pending, marking, upcoming, today, drafts: courses.filter(row => !row.published && !row.archived_at),
    attentionIds: [...new Set([...pending, ...marking].map(row => String(row.student_id)))] };
}
