import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { WorkflowDialog } from '@/components/accounts/WorkflowDialog';
import { calendarDateKey, dayInTimezone, formatCoachingTime } from '@/lib/coaching';
import type { Row } from '@/lib/academy';

type Props = {
  appointments: Row[]; availability: Row[]; requests?: Row[]; variant?:'lesson'|'care'; timezone: string; loading?: boolean; error?: boolean;
  onRequest?: (day: string) => void; heading?: string; actionLabel?: string;
  renderActions?: (row: Row, kind: 'appointment' | 'request', close:()=>void) => ReactNode;
  onAppointment?: (row: Row) => void; selectedAppointmentId?: string;
};
export function CoachingCalendar({ appointments, availability, requests = [], timezone, loading, error, onRequest, heading = 'Your academy calendar', variant='lesson', actionLabel = 'Request a Lesson', renderActions, onAppointment, selectedAppointmentId }: Props) {
  const today = dayInTimezone(new Date(), timezone);
  const [date, setDate] = useState<Date>(() => new Date(today + 'T12:00:00'));
  const [month, setMonth] = useState(date);
  const [detail, setDetail] = useState<{row: Row; kind: 'appointment' | 'request'} | null>(null);
  const key = calendarDateKey(date);
  const opened = useRef('');
  useEffect(() => {
    if (!selectedAppointmentId || loading || error || opened.current === selectedAppointmentId) return;
    const row = appointments.find(item => item.id === selectedAppointmentId);
    if (!row) return;
    opened.current = selectedAppointmentId;
    const day = row.calendar_day ? String(row.calendar_day) : dayInTimezone(new Date(String(row.starts_at)), timezone);
    const nextDate = new Date(day + 'T12:00:00'); setDate(nextDate); setMonth(nextDate);
    setDetail({row, kind:'appointment'});
  }, [selectedAppointmentId, appointments, loading, error, timezone]);
  const detailRow=detail?((detail.kind==='request'?requests:appointments).find(row=>row.id===detail.row.id)??detail.row):null;
  const rowDay = (row: Row, field = 'starts_at') => row.calendar_day ? String(row.calendar_day) : dayInTimezone(new Date(String(row[field])), timezone);
  const scheduled = appointments.filter(row => !['cancelled', 'declined'].includes(String(row.status)));
  const pending = requests.filter(row => ['pending', 'alternative_proposed', 'reschedule_requested', 'cancellation_requested'].includes(String(row.status)));
  const lessons = scheduled.filter(row => rowDay(row) === key).sort((a,b) => String(a.starts_at).localeCompare(String(b.starts_at)));
  const dailyRequests = pending.filter(row => rowDay(row, 'preferred_starts_at') === key);
  const windows = availability.filter(row => rowDay(row) <= key && dayInTimezone(new Date(Date.parse(String(row.ends_at)) - 1), timezone) >= key);
  const openAppointment = (row: Row) => onAppointment ? onAppointment(row) : setDetail({row, kind:'appointment'});
  const shortTime = (row: Row) => row.calendar_day ? String(row.appointment_time || 'Date only') : new Intl.DateTimeFormat(undefined, {timeZone:timezone, hour:'2-digit', minute:'2-digit'}).format(new Date(String(row.starts_at)));
  return <section className='paper-card min-w-0 overflow-hidden p-3 sm:p-6' aria-label={heading}>
    <div className='flex flex-wrap items-start justify-between gap-3'><div><p className='eyebrow text-[#826e45]'>Plan with confidence</p><h2 className='mt-2 font-serif text-3xl'>{heading}</h2><p className='mt-2 text-xs leading-5 text-muted-foreground'>Dates and times in {timezone}.{onRequest && ' Select a day to get started.'}</p></div><Button type='button' variant='outline' onClick={() => { const next = new Date(today + 'T12:00:00'); setDate(next); setMonth(next); }}>Today</Button></div>
    {loading ? <p className='mt-5 text-sm' role='status'>Loading saved schedule…</p> : error ? <p className='mt-5 text-sm text-destructive' role='alert'>Schedule could not be loaded. Actions are unavailable until it loads successfully.</p> : <>
    <Calendar mode='single' required selected={date} month={month} onMonthChange={setMonth} today={new Date(today+'T12:00:00')} weekStartsOn={1}
      onDayClick={day => { setDate(day); setMonth(day); if (calendarDateKey(day) >= today) onRequest?.(calendarDateKey(day)); }}
      modifiers={{
        booked: scheduled.map(row => new Date(rowDay(row)+'T12:00:00')),
        pending: pending.map(row => new Date(rowDay(row,'preferred_starts_at')+'T12:00:00')),
        available: day => availability.some(row => row.availability_type==='available' && rowDay(row)<=calendarDateKey(day) && dayInTimezone(new Date(Date.parse(String(row.ends_at))-1),timezone)>=calendarDateKey(day)),
        blocked: day => availability.some(row => row.availability_type==='unavailable' && rowDay(row)<=calendarDateKey(day) && dayInTimezone(new Date(Date.parse(String(row.ends_at))-1),timezone)>=calendarDateKey(day)),
      }}
      modifiersClassNames={{booked:'underline decoration-2 decoration-primary underline-offset-4',pending:'after:absolute after:bottom-1 after:h-1 after:w-1 after:rounded-full after:bg-[#826e45]',available:'bg-emerald-100/60',blocked:'border-dashed border-[#826e45] bg-[#e9e4d7]'}}
      className='mt-5 w-full p-0'
      classNames={{ months:'w-full', month:'w-full space-y-3', caption:'relative flex h-12 items-center justify-center', caption_label:'font-serif text-xl',nav_button:'absolute top-1 flex size-10 items-center justify-center rounded-md border border-primary/20 hover:bg-primary/10', nav_button_previous:'left-0',nav_button_next:'right-0', table:'w-full table-fixed border-separate border-spacing-1', head_row:'',head_cell:'pb-2 text-center text-[10px] font-medium text-muted-foreground sm:text-xs',row:'',cell:'relative p-0 text-center',day:'relative flex min-h-11 w-full items-center justify-center rounded-md border border-primary/10 p-0 text-sm transition hover:border-[#B79B62] hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-16',day_selected:'!bg-primary !text-primary-foreground ring-2 ring-[#B79B62] ring-offset-1',day_today:'font-bold ring-1 ring-[#B79B62]',day_outside:'text-muted-foreground opacity-40' }} />
    <div className='mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-muted-foreground' aria-label='Calendar legend'>{variant==='care'?<><span className='underline decoration-2 underline-offset-4'>Scheduled care</span><span>Completed care appears in history</span></>:<><span className='underline decoration-2 underline-offset-4'>Confirmed</span><span>● Pending request</span><span className='rounded bg-emerald-100 px-2'>Teaching window</span><span className='rounded border border-dashed border-[#826e45] bg-[#e9e4d7] px-2'>Blocked time</span></>}</div>
    <div className='mt-5 border-t border-primary/15 pt-5'><div className='flex flex-wrap items-center justify-between gap-3'><h3 className='font-serif text-xl'>{date.toLocaleDateString(undefined,{dateStyle:'full'})}</h3>{onRequest && key>=today && <Button type='button' size='sm' onClick={()=>onRequest(key)}>{actionLabel}</Button>}</div>
      <div className='mt-4 grid gap-2 sm:grid-cols-2'>{lessons.map(row=><button type='button' key={row.id} onClick={()=>openAppointment(row)} className='rounded-lg border border-primary/20 p-4 text-left hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary'><strong className='block break-words text-sm'>{String(row.title)}</strong>{row.participant_label&&<span className='mt-1 block text-xs text-muted-foreground'>{String(row.participant_label)}</span>}<span className='mt-1 block text-xs text-muted-foreground'>{shortTime(row)} · {row.status==='completed'?'Completed':'Confirmed'}</span></button>)}{dailyRequests.map(row=><button type='button' key={row.id} onClick={()=>setDetail({row,kind:'request'})} className='rounded-lg border border-[#B79B62]/50 bg-[#B79B62]/10 p-4 text-left hover:bg-[#B79B62]/20'><strong className='text-sm'>{String(row.lesson_format).replace('_',' ')} lesson request</strong>{row.participant_label&&<span className='mt-1 block text-xs'>{String(row.participant_label)}</span>}<span className='mt-1 block text-xs'>{String(row.status).replace(/_/g,' ')} · {formatCoachingTime(row.preferred_starts_at,timezone)}</span></button>)}</div>
      {!lessons.length && !dailyRequests.length && <p className='mt-3 text-sm text-muted-foreground'>No appointments or pending requests on this day.</p>}
      <div className='mt-4 space-y-2'>{windows.map(row=><p key={row.id} className='rounded-lg border border-primary/10 p-3 text-xs'><strong>{row.availability_type==='available'?'Teaching window':'Blocked time'}</strong> · {formatCoachingTime(row.starts_at,timezone)} – {formatCoachingTime(row.ends_at,timezone)}</p>)}</div>
    </div></>}
    <WorkflowDialog open={Boolean(detail)} onOpenChange={open=>{if(!open)setDetail(null);}} title={detail?.kind==='request'?'Lesson request':String(detail?.row.title||'Appointment details')} description={'Saved schedule in '+timezone}>
      {detail && detailRow && <div className='space-y-4 text-sm'><p className='rounded-lg border border-[#B79B62]/40 p-4 capitalize'>{String(detailRow.status).replace(/_/g,' ')}</p><p>{formatCoachingTime(detail.kind==='request'?detailRow.preferred_starts_at:detailRow.starts_at,timezone)} · {String(detailRow.duration_minutes)} minutes</p>{detailRow.location && <p>Location: {String(detailRow.location)}</p>}{detailRow.learning_goals && <p className='whitespace-pre-wrap'>{String(detailRow.learning_goals)}</p>}{detailRow.owner_message && <p className='whitespace-pre-wrap'>Founder: {String(detailRow.owner_message)}</p>}{renderActions?.(detailRow,detail.kind,()=>setDetail(null))}<Button type='button' variant='outline' onClick={()=>setDetail(null)}>Close details</Button></div>}
    </WorkflowDialog>
  </section>;
}
