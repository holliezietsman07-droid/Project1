export function dayInTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? '';
  return part('year') + '-' + part('month') + '-' + part('day');
}
export function calendarDateKey(date: Date) {
  return [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-');
}
export function formatCoachingTime(value: unknown, timezone: string) {
  return new Intl.DateTimeFormat(undefined, { timeZone: timezone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(String(value)));
}
// datetime-local is a wall-clock value in the member's selected timezone, not the browser timezone.
export function coachingInstant(value: string, timezone: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Choose a valid date and time.');
  const [year, month, day, hour, minute] = value.split(/[-T:]/).map(Number);
  const desired = Date.UTC(year, month-1, day, hour, minute);
  const parsed = new Date(desired);
  if (year < 100 || parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month-1 || parsed.getUTCDate() !== day || parsed.getUTCHours() !== hour || parsed.getUTCMinutes() !== minute) throw new Error('Choose a valid date and time.');
  let guess = desired;
  const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const wallTime = (time: number) => {
    const parts = formatter.formatToParts(new Date(time));
    const part = (type: string) => Number(parts.find(item => item.type === type)?.value);
    return Date.UTC(part('year'), part('month')-1, part('day'), part('hour'), part('minute'));
  };
  for (let i=0;i<4;i++) { const delta = desired-wallTime(guess); if(!delta) { const offsets=[-86400000,86400000].map(shift=>wallTime(guess+shift)-(guess+shift)); if(offsets.some(offset=>desired-offset!==guess&&wallTime(desired-offset)===desired))throw new Error('This time occurs twice when clocks change. Choose a time outside the repeated hour.'); return new Date(guess).toISOString(); } guess += delta; }
  throw new Error('This local time does not exist in your timezone. Choose another time.');
}
export function validateCoachingRange(start: string, end: string, now = Date.now()) {
  const starts = Date.parse(start), ends = Date.parse(end);
  if (!Number.isFinite(starts) || !Number.isFinite(ends) || !Number.isFinite(now)) throw new Error('Choose valid start and end times.');
  if (starts <= now) throw new Error('Choose a future start time.');
  if (ends <= starts) throw new Error('End time must be after start time.');
}

import type { Row } from '@/lib/academy';

export function coachingWallTime(value: unknown, timezone: string) {
  const date = new Date(String(value));
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).formatToParts(date);
  return dayInTimezone(date,timezone)+'T'+parts.find(p=>p.type==='hour')?.value+':'+parts.find(p=>p.type==='minute')?.value;
}
export function coachingConflict(start: string, duration: number, appointments: Row[], availability: Row[], coachId?: string, studentId?: string, excludeId?: string) {
  const begins=Date.parse(start), ends=begins+duration*60000;
  if (!Number.isFinite(begins) || !Number.isInteger(duration) || duration<10 || duration>240) throw new Error('Choose a valid time and duration.');
  const overlaps=(from:unknown,to:unknown)=>Date.parse(String(from))<ends && Date.parse(String(to))>begins;
  if(appointments.some(row=>row.id!==excludeId && row.status==='scheduled' && ((!coachId&&!studentId)||row.coach_id===coachId||row.student_id===studentId) && overlaps(row.starts_at,new Date(Date.parse(String(row.starts_at))+Number(row.duration_minutes)*60000).toISOString()))) return 'This time overlaps a confirmed lesson.';
  if(availability.some(row=>row.availability_type==='unavailable' && (!coachId||row.coach_id===coachId) && overlaps(row.starts_at,row.ends_at))) return 'This time overlaps blocked teaching time.';
  return '';
}
export function publishedLessonTimes(day: string, duration: number, timezone: string, appointments: Row[], availability: Row[], now=Date.now()) {
  const slots=new Set<string>();
  if(!Number.isInteger(duration)||duration<10||duration>240)return [];
  for(const window of availability.filter(row=>row.availability_type==='available')){
    const start=Date.parse(String(window.starts_at)), end=Date.parse(String(window.ends_at));
    if(!Number.isFinite(start)||!Number.isFinite(end))continue;
    const dayUTC=Date.parse(day+'T00:00:00Z');
    const lower=Math.max(start,dayUTC-36*3600000), upper=Math.min(end,dayUTC+36*3600000);
    for(let time=start+Math.ceil((lower-start)/(15*60000))*15*60000;time+duration*60000<=upper;time+=15*60000){
      if(time<=now||dayInTimezone(new Date(time),timezone)!==day)continue;
      const instant=new Date(time).toISOString();
      if(!coachingConflict(instant,duration,appointments,availability,String(window.coach_id)))slots.add(coachingWallTime(instant,timezone));
    }
  }
  return [...slots].sort();
}
