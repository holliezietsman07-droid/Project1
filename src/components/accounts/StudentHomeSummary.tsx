import { Link } from 'react-router-dom';
import { BookOpen, Bell } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { useRows } from '@/hooks/use-academy';
import { Progress } from '@/components/ui/progress';

export function StudentHomeSummary() {
  const { profile } = useSession();
  const filters = { student_id: profile?.id ?? '' };
  const enrolments = useRows('hka_enrolments', filters);
  const progress = useRows('hka_progress', filters);
  const courses = useRows('hka_courses');
  const lessons = useRows('hka_lessons');
  const reminders = useRows('hka_care_reminders', filters);
  if (!profile) return null;
  const active = new Set((enrolments.data ?? []).filter(row => row.status === 'active').map(row => row.course_id));
  const completed = new Set((progress.data ?? []).filter(row => row.completed_at).map(row => row.lesson_id));
  const savedCourse = (courses.data ?? []).find(row => active.has(row.id) && row.published && !row.archived_at);
  const courseLessons = (lessons.data ?? []).filter(row => row.course_id === savedCourse?.id && row.published);
  const count = courseLessons.filter(row => completed.has(row.id)).length;
  const reminder = (reminders.data ?? []).filter(row => row.status !== 'dismissed').sort((a,b) => String(a.due_date).localeCompare(String(b.due_date)))[0];
  if (!savedCourse && !reminder) return null;
  return <section aria-label='Your next academy activities' className='mt-5 grid gap-3 md:grid-cols-2'>
    {savedCourse && <Link to={'/academy/courses/'+savedCourse.id} className='paper-card min-w-0 p-4 hover:border-[#B79B62]'><p className='flex items-center gap-2 text-xs text-[#826e45]'><BookOpen className='size-4'/>Course progress</p><p className='mt-2 break-words text-sm font-medium'>{String(savedCourse.title)}</p>{!lessons.error && !progress.error && !lessons.isLoading && !progress.isLoading && <><Progress className='mt-3' value={courseLessons.length ? Math.round(count/courseLessons.length*100) : 0}/><p className='mt-2 text-xs text-muted-foreground'>{count} of {courseLessons.length} lessons complete</p></>}</Link>}
    {reminder && <Link to='/dashboard/student?section=horses' className='paper-card min-w-0 p-4 hover:border-[#B79B62]'><p className='flex items-center gap-2 text-xs text-[#826e45]'><Bell className='size-4'/>Horse-care reminder</p><p className='mt-2 break-words text-sm font-medium'>{String(reminder.title)}</p><p className='mt-1 text-xs text-muted-foreground'>Due {String(reminder.due_date)}</p></Link>}
  </section>;
}

