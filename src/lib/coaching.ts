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
  let guess = desired;
  const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const wallTime = (time: number) => {
    const parts = formatter.formatToParts(new Date(time));
    const part = (type: string) => Number(parts.find(item => item.type === type)?.value);
    return Date.UTC(part('year'), part('month')-1, part('day'), part('hour'), part('minute'));
  };
  for (let i=0;i<4;i++) { const delta = desired-wallTime(guess); if(!delta) return new Date(guess).toISOString(); guess += delta; }
  throw new Error('This local time does not exist in your timezone. Choose another time.');
}
export function validateCoachingRange(start: string, end: string, now = Date.now()) {
  if (Date.parse(start) <= now) throw new Error('Choose a future start time.');
  if (Date.parse(end) <= Date.parse(start)) throw new Error('End time must be after start time.');
}
