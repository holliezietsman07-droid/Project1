export type FitnessKind = 'rider' | 'horse';
export type ProgrammeSource = 'hka' | 'owner' | 'vet';
export type Intake = {
  disciplines: string[]; goals: string; condition: string; days: string[]; minutes: number;
  equipment: string; age: number | null; recentWork: string; timeOff: string; health: string[];
  professionalInstructions: string;
};
export type SessionPlan = { key: string; day: number; title: string; category: string; minutes: number; instructions: string };
export type Programme = {
  id: string; student_id: string; horse_id: string | null; kind: FitnessKind; source: ProgrammeSource;
  title: string; status: 'draft' | 'assigned' | 'archived'; current_version_id: string | null; draft_version_id: string | null;
};
export type Version = { id: string; programme_id: string; version_number: number; title: string; intake: Intake; sessions: SessionPlan[]; approved_at: string | null; created_at: string };
export type Progress = { id: string; version_id: string; session_key: string; session_date: string; status: 'complete' | 'skipped'; minutes: number; notes: string };
export type Material = { id: string; version_id: string | null; template_id: string | null; original_name: string; path: string };
export type Template = { id: string; kind: FitnessKind; title: string; age_group: 'adult' | 'young' | 'horse'; sessions: SessionPlan[] };
export type Subject = { id: string; name: string; student_id: string; kind: FitnessKind; intake: Intake };
export type FitnessData = { subjects: Subject[]; programmes: Programme[]; versions: Version[]; progress: Progress[]; templates: Template[]; files: Material[] };
export const disciplineOptions = ['Dressage', 'Show jumping', 'Eventing', 'Endurance', 'Western', 'Leisure', 'Other'];
export const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export function emptyIntake(): Intake {
  return { disciplines: [], goals: '', condition: '', days: ['Monday','Wednesday','Friday'], minutes: 20, equipment: '', age: null, recentWork: '', timeOff: '', health: [], professionalInstructions: '' };
}
export function ageFromBirth(birth: string, now = new Date()) {
  if (!birth) return null;
  const date = new Date(birth + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return null;
  return now.getFullYear() - date.getFullYear() - (now.getMonth() < date.getMonth() || (now.getMonth() === date.getMonth() && now.getDate() < date.getDate()) ? 1 : 0);
}
export function holdReason(kind: FitnessKind, intake: Intake): string {
  if (intake.health.length) return kind === 'rider'
    ? 'Template suggestions are held. Ask an appropriate health professional for guidance before exercise.'
    : 'Standard conditioning suggestions are held. Follow your vet’s instructions and discuss this programme with Hollie.';
  if (intake.age === null || intake.age < 0) return 'Confirm age before choosing an age-appropriate template.';
  if (kind === 'horse' && (intake.age < 5 || intake.age >= 18 || intake.timeOff.trim() && intake.timeOff !== 'None')) return 'Ask Hollie for an individual review of age and time off before using standard conditioning.';
  return '';
}
export function validateSessions(sessions: SessionPlan[]) {
  if (!sessions.length || sessions.length > 35) throw new Error('Add between 1 and 35 sessions.');
  const keys = new Set<string>();
  for (const s of sessions) {
    if (!s.key || keys.has(s.key) || !Number.isInteger(s.day) || s.day < 0 || s.day > 6 || !s.title.trim() || !s.instructions.trim() || !Number.isInteger(s.minutes) || s.minutes < 0 || s.minutes > 240) throw new Error('Each session needs a unique key, day, instructions and duration between 0 and 240 minutes.');
    keys.add(s.key);
  }
  return sessions;
}
export function weekStart(timezone: string, now = new Date()) {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(now);
  const get = (key: string) => date.find(p => p.type === key)?.value;
  const monday = new Date(get('year') + '-' + get('month') + '-' + get('day') + 'T12:00:00Z');
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  return monday.toISOString().slice(0, 10);
}
export function sessionDate(monday: string, day: number) {
  const date = new Date(monday + 'T12:00:00Z'); date.setUTCDate(date.getUTCDate() + day); return date.toISOString().slice(0, 10);
}
// These are editable educational drafts for Founder review, never automatic assignments.
export function templateDraft(kind: FitnessKind, intake: Intake): SessionPlan[] {
  const reason = holdReason(kind, intake); if (reason) throw new Error(reason);
  const young = kind === 'rider' && intake.age! < 18;
  const duration = Math.min(intake.minutes, young ? 15 : kind === 'horse' ? 20 : 25);
  return days.map((day, i) => {
    const active = intake.days.includes(day);
    const category = !active ? 'rest' : kind === 'horse' ? 'conditioning' : ['strength','balance','mobility','stamina'][i % 4];
    const instruction = !active ? 'Rest day. Record any wellbeing observations; do not make up missed work by doubling the next session.'
      : kind === 'horse' ? 'Founder draft: easy walk on suitable level footing, including a quiet warm-up and cool-down. Keep effort comfortable; stop for unevenness or abnormal recovery. Review response before any increase; never increase duration and intensity together.'
      : young ? 'Founder draft for younger riders: with an appropriate adult, practise comfortable reaching, gentle marching and supported balance as a short game. No loaded training. Stop for pain or dizziness.'
      : category === 'strength' ? 'Founder draft: warm up with easy walking. Practise slow sit-to-stand and supported wall pushes at comfortable effort, resting whenever needed. Finish with easy movement. Stop for pain.'
      : category === 'balance' ? 'Founder draft: easy warm-up, then comfortable supported weight shifts beside a stable support. Keep breathing; avoid unstable equipment. Finish with gentle walking.'
      : category === 'mobility' ? 'Founder draft: gentle shoulder circles, comfortable hip movement and ankle mobility. Stay within a pain-free range and avoid forcing stretches.'
      : 'Founder draft: easy walking at a pace where conversation stays comfortable. Include a gradual warm-up and cool-down; stop if unwell.';
    return { key: 'day-' + i, day: i, title: !active ? 'Rest & recover' : kind === 'horse' ? 'Easy foundation work' : young ? 'Movement & balance play' : category[0].toUpperCase() + category.slice(1) + ' foundations', category, minutes: active ? duration : 0, instructions: instruction };
  });
}
