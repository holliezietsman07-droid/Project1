import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { calendarDateKey, dayInTimezone, formatCoachingTime } from '@/lib/coaching';
import type { Row } from '@/lib/academy';

type Props = { appointments: Row[]; availability: Row[]; timezone: string; loading?: boolean; error?: boolean; onRequest?: (day: string) => void };
export function CoachingCalendar({ appointments, availability, timezone, loading, error, onRequest }: Props) {
  const [date, setDate] = useState<Date>(() => new Date(dayInTimezone(new Date(), timezone) + 'T12:00:00'));
  const key = calendarDateKey(date);
  const scheduled = appointments.filter(row => row.status === 'scheduled');
  const startsOnDay = (row: Row) => dayInTimezone(new Date(String(row.starts_at)), timezone) === key;
  const lessons = scheduled.filter(startsOnDay).sort((a,b) => String(a.starts_at).localeCompare(String(b.starts_at)));
  const windows = availability.filter(row => dayInTimezone(new Date(String(row.starts_at)), timezone) <= key && dayInTimezone(new Date(String(row.ends_at)), timezone) >= key);
  const lessonDays = scheduled.map(row => new Date(dayInTimezone(new Date(String(row.starts_at)), timezone) + 'T12:00:00'));
  return <section className='paper-card min-w-0 p-4 sm:p-6' aria-label='Coaching calendar'>
    <div className='flex flex-wrap items-start justify-between gap-3'><div><p className='eyebrow text-[#826e45]'>Coaching calendar</p><h2 className='mt-2 font-serif text-3xl'>Plan your next lesson</h2><p className='mt-2 text-xs text-muted-foreground'>Dates and times in {timezone}. A request needs Founder approval.</p></div><Button type='button' variant='outline' onClick={() => setDate(new Date(dayInTimezone(new Date(), timezone) + 'T12:00:00'))}>Today</Button></div>
    {loading ? <p className='mt-5 text-sm' role='status'>Loading saved schedule…</p> : error ? <p className='mt-5 text-sm text-destructive' role='alert'>Schedule could not be loaded. Availability cannot be confirmed.</p> : <div className='mt-5 grid min-w-0 gap-5 md:grid-cols-[auto_1fr]'>
      <Calendar mode='single' required selected={date} onSelect={value => { if(value) setDate(value); }} modifiers={{ booked: lessonDays }} modifiersClassNames={{ booked: 'font-bold underline decoration-[#B79B62] underline-offset-4' }} className='mx-auto max-w-full p-0' />
      <div className='min-w-0'><h3 className='font-serif text-xl'>{date.toLocaleDateString(undefined, { dateStyle: 'full' })}</h3><h4 className='mt-4 text-sm font-semibold'>Confirmed lessons</h4><div className='mt-2 space-y-2'>{lessons.length ? lessons.map(row => <article key={row.id} className='rounded-md border border-primary/15 p-3 text-sm'><strong className='break-words'>{String(row.title)}</strong><p className='mt-1 text-xs text-muted-foreground'>{formatCoachingTime(row.starts_at, timezone)} · {String(row.duration_minutes)} minutes</p></article>) : <p className='text-sm text-muted-foreground'>No confirmed lessons on this day.</p>}</div>
      <h4 className='mt-5 text-sm font-semibold'>Published teaching windows</h4><div className='mt-2 space-y-2'>{windows.length ? windows.map(row => <p key={row.id} className='rounded-md bg-primary/5 p-3 text-sm'><strong>{row.availability_type === 'available' ? 'Teaching window' : 'Blocked time'}</strong><span className='mt-1 block text-xs'>{formatCoachingTime(row.starts_at, timezone)} – {formatCoachingTime(row.ends_at, timezone)}</span></p>) : <p className='text-sm text-muted-foreground'>No teaching windows published for this day. You may suggest a time; availability is unconfirmed.</p>}</div>
      {onRequest && <Button type='button' className='mt-5' onClick={() => onRequest(key)}>Suggest a time on this day</Button>}</div>
    </div>}
  </section>;
}
