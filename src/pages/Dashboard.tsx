import { Link, Navigate } from "react-router-dom";
import { BookOpen, CalendarDays, GraduationCap, HeartHandshake, MessageCircle, ShieldCheck, Users } from "lucide-react";
import { useSession } from "@/contexts/SessionContext";
import { Progress } from '@/components/ui/progress';
import { useRows } from "@/hooks/use-academy";
import type { Role, Row } from "@/lib/academy";

import { StudentDashboard } from '@/components/accounts/StudentDashboard';
import { OwnerDashboard } from '@/components/accounts/OwnerDashboard';

const dashboardPath: Record<Role, string> = {
  student: "/dashboard/student", guardian: "/dashboard/parent", coach: "/dashboard/coach", admin: "/dashboard/admin",
};
const roleName: Record<Role, string> = { student: "Student", guardian: "Parent or guardian", coach: "Coach", admin: "Administrator" };

function displayValue(row: Row) {
  return String(row.title ?? row.name ?? row.full_name ?? row.message ?? row.child_label ?? "Academy record");
}
function DataPanel({ id, title, table, empty }: { id: string; title: string; table: string; empty: string }) {
  const query = useRows(table);
  const rows = query.data ?? [];
  return <section id={id} className="paper-card scroll-mt-28 p-6">
    <div className="flex items-baseline justify-between gap-4"><h2 className="font-serif text-2xl">{title}</h2>{!query.isLoading && !query.error && <span className="text-xs text-muted-foreground">{rows.length} total</span>}</div>
    {query.isLoading ? <p className="mt-4 text-sm text-muted-foreground" role="status">Loading…</p> : query.error ? <p className="mt-4 text-sm text-destructive" role="alert">This section could not be loaded.</p> : rows.length ? <ul className="mt-4 divide-y divide-primary/10">{rows.slice(0, 5).map((row) => <li key={row.id} className="py-3 text-sm">{displayValue(row)}</li>)}</ul> : <p className="mt-4 text-sm leading-6 text-muted-foreground">{empty}</p>}
  </section>;
}

function StudentLearning() {
  const enrolments=useRows('hka_enrolments'); const courses=useRows('hka_courses'); const lessons=useRows('hka_lessons'); const progress=useRows('hka_progress');
  if(enrolments.isLoading||courses.isLoading||lessons.isLoading||progress.isLoading)return <p className={'mb-6 text-sm text-muted-foreground'}>Loading learning progress…</p>;
  return <section className={'paper-card mb-6 p-6'}><div className={'flex items-baseline justify-between gap-4'}><h2 className={'font-serif text-2xl'}>Learning progress</h2><Link to={'/learning-pathways'} className={'text-xs underline'}>Browse courses</Link></div><div className={'mt-5 grid gap-4 md:grid-cols-2'}>{(enrolments.data??[]).map(enrol=>{const course=(courses.data??[]).find(c=>c.id===enrol.course_id);const courseLessons=(lessons.data??[]).filter(l=>l.course_id===enrol.course_id&&l.published);const done=new Set((progress.data??[]).filter(p=>p.completed_at).map(p=>p.lesson_id));const complete=courseLessons.filter(l=>done.has(l.id)).length;const percent=courseLessons.length?Math.round(complete/courseLessons.length*100):0;return <article key={enrol.id} className={'rounded-sm border border-primary/15 p-4'}><h3 className={'font-medium'}>{String(course?.title??'Enrolled course')}</h3><div className={'mt-3 flex items-center gap-3'}><Progress value={percent}/><span className={'text-xs'}>{percent}%</span></div><p className={'mt-2 text-xs text-muted-foreground'}>{complete} of {courseLessons.length} lessons complete</p>{course&&<Link to={'/academy/courses/'+course.id} className={'mt-3 inline-flex text-xs font-medium underline'}>Resume learning</Link>}</article>})}{!enrolments.data?.length&&<p className={'text-sm text-muted-foreground'}>No course enrolments yet.</p>}</div></section>;
}

type Panel = { id: string; title: string; table: string; empty: string };
const panels: Record<Role, Panel[]> = {
  student: [
    { id: "learning", title: "My courses", table: "hka_enrolments", empty: "No course enrolments yet." },
    { id: "coaching", title: "Coaching schedule", table: "hka_appointments", empty: "No coaching appointments scheduled." },
    { id: "horses", title: "My horses", table: "hka_horses", empty: "No horses have been added yet." },
    { id: "achievements", title: "Achievements", table: "hka_achievements", empty: "Achievements will appear here." },
  ],
  guardian: [
    { id: "students", title: "Linked students", table: "hka_guardians", empty: "No student accounts are linked yet." },
    { id: "coaching", title: "Student appointments", table: "hka_appointments", empty: "No coaching appointments scheduled." },
    { id: "progress", title: "Student achievements", table: "hka_achievements", empty: "Achievements will appear here." },
    { id: "notices", title: "Updates", table: "hka_notifications", empty: "No new updates." },
    { id: 'messages', title: 'Messages', table: 'hka_messages', empty: 'No academy messages yet.' },
  ],
  coach: [
    { id: "courses", title: "My courses", table: "hka_courses", empty: "No courses have been assigned." },
    { id: "students", title: "Assigned students", table: "hka_coach_students", empty: "No students have been assigned." },
    { id: "submissions", title: "Student submissions", table: "hka_submissions", empty: "No submissions await review." },
    { id: "coaching", title: "Coaching schedule", table: "hka_appointments", empty: "No coaching appointments scheduled." },
  ],
  admin: [
    { id: "members", title: "Academy members", table: "hka_profiles", empty: "No member profiles found." },
    { id: "enrolment", title: "Enrolment requests", table: "hka_enrolment_requests", empty: "No enrolment requests." },
    { id: "courses", title: "Courses", table: "hka_courses", empty: "No courses have been created." },
    { id: "guardian-links", title: "Guardian links", table: "hka_guardians", empty: "No guardian links found." },
  ],
};
const roleIcon = { student: GraduationCap, guardian: HeartHandshake, coach: BookOpen, admin: ShieldCheck };

export function DashboardIndex() {
  const { profile } = useSession();
  return profile ? <Navigate to={dashboardPath[profile.role]} replace /> : null;
}
export function DashboardPage({ role }: { role: Role }) {
  const { profile } = useSession();
  if (!profile) return null;
  if (profile.role !== role) return <Navigate to={dashboardPath[profile.role]} replace />;
  if (role === 'student') return <StudentDashboard />;
  if (role === 'admin') return <OwnerDashboard />;
  const Icon = roleIcon[role];
  return <section className="dashboard-shell page-width py-8 lg:py-10">
    <div className="dashboard-hero flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="eyebrow mb-4 text-[#76633e]">{roleName[role]} dashboard</p><h1 className="section-heading">Welcome, {profile.full_name}.</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">Your private academy space brings current learning, coaching and account updates together.</p>{role === 'coach' && <Link to={'/dashboard/academy'} className={'mt-5 inline-flex min-h-11 items-center rounded-sm bg-primary px-5 text-xs font-medium text-primary-foreground'}>Open academy workspace</Link>}</div><Icon aria-hidden="true" strokeWidth={1.25} className="size-12 text-[#826e45]" /></div>
     <nav aria-label={`${roleName[role]} dashboard navigation`} className="my-8 flex flex-wrap gap-3">{panels[role].map((panel) => <a key={panel.id} href={`#${panel.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-primary/20 px-4 text-sm hover:bg-primary/5">{panel.id.includes("coaching") ? <CalendarDays className="size-4" /> : panel.id.includes("student") || panel.id.includes("member") ? <Users className="size-4" /> : <BookOpen className="size-4" />}{panel.title}</a>)}</nav>
    <div className="grid gap-5 md:grid-cols-2">{panels[role].map((panel) => <DataPanel key={panel.id} {...panel} />)}</div>{role === 'guardian' && <a href='#messages' className='floating-message' aria-label='Open messages'><MessageCircle className='size-6' /></a>}
  </section>;
}
