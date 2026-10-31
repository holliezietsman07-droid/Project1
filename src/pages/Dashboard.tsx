import { Link, Navigate, useLocation } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useSession } from "@/contexts/SessionContext";
import { DashboardHero } from '@/components/accounts/StudentDashboard';
import { useRows } from "@/hooks/use-academy";
import type { Role, Row } from "@/lib/academy";

import { StudentDashboard } from '@/components/accounts/StudentDashboard';
import { OwnerDashboard } from '@/components/accounts/OwnerDashboard';
import { CoachingWorkspace } from '@/components/accounts/CoachingWorkspace';
import { AcademyMessages } from '@/components/accounts/AcademyMessages';

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

function RoleOverview({role}:{role:'guardian'|'coach'}){
  const links=useRows(role==='guardian'?'hka_guardians':'hka_coach_students');const profiles=useRows('hka_profiles');const progress=useRows('hka_progress');const appointments=useRows('hka_appointments');const submissions=useRows('hka_submissions');const assessments=useRows('hka_assessments');const notifications=useRows('hka_notifications');
  const approved=role==='guardian'?(links.data??[]).filter(row=>row.status==='approved'):(links.data??[]);const studentIds=new Set(approved.map(row=>String(row.student_id)));const students=(profiles.data??[]).filter(row=>studentIds.has(String(row.id)));const upcoming=(appointments.data??[]).filter(row=>studentIds.has(String(row.student_id))&&row.status==='scheduled'&&new Date(String(row.starts_at))>new Date()).sort((a,b)=>new Date(String(a.starts_at)).getTime()-new Date(String(b.starts_at)).getTime());const pending=(submissions.data??[]).filter(row=>studentIds.has(String(row.student_id))&&['submitted','under_review'].includes(String(row.status)));const recentProgress=[...(progress.data??[])].filter(row=>studentIds.has(String(row.student_id))).sort((a,b)=>new Date(String(b.updated_at??b.completed_at)).getTime()-new Date(String(a.updated_at??a.completed_at)).getTime());const recentFeedback=[...(assessments.data??[])].sort((a,b)=>new Date(String(b.assessed_at)).getTime()-new Date(String(a.assessed_at)).getTime());const loading=[links,profiles,progress,appointments,submissions,assessments,notifications].some(query=>query.isLoading);
  if(loading)return <p className='mt-8 text-sm text-muted-foreground' role='status'>Preparing your overview…</p>;
  if(role==='guardian')return <div className='mt-8 grid gap-5 md:grid-cols-2'><section className='paper-card p-6'><p className='eyebrow text-[#826e45]'>Family learning</p><h2 className='mt-2 font-serif text-3xl'>Linked Children</h2>{students.length?<ul className='mt-4 space-y-3'>{students.map(row=><li key={row.id} className='border-b border-primary/10 pb-3 text-sm'><strong>{String(row.full_name)}</strong><span className='block text-xs text-muted-foreground'>{(progress.data??[]).filter(item=>item.student_id===row.id&&item.completed_at).length} completed lessons</span></li>)}</ul>:<p className='mt-4 text-sm text-muted-foreground'>No verified student links are available. Academy staff can help with an authorised family link.</p>}</section><section className='paper-card p-6'><p className='eyebrow text-[#826e45]'>Schedule</p><h2 className='mt-2 font-serif text-3xl'>Upcoming Activities</h2>{upcoming.length?<ul className='mt-4 space-y-3'>{upcoming.slice(0,4).map(row=><li key={row.id} className='text-sm'><strong>{String(row.title)}</strong><span className='block text-xs text-muted-foreground'>{new Date(String(row.starts_at)).toLocaleString()}</span></li>)}</ul>:<p className='mt-4 text-sm text-muted-foreground'>No upcoming activities are recorded for linked children.</p>}</section><section className='paper-card p-6'><p className='eyebrow text-[#826e45]'>Coach insight</p><h2 className='mt-2 font-serif text-3xl'>Recent Feedback</h2>{recentFeedback.length?<ul className='mt-4 space-y-3'>{recentFeedback.slice(0,3).map(row=><li key={row.id} className='text-sm'>{String(row.feedback)}<span className='block text-xs text-muted-foreground'>{new Date(String(row.assessed_at)).toLocaleDateString()}</span></li>)}</ul>:<p className='mt-4 text-sm text-muted-foreground'>No recent coach feedback is available.</p>}</section><section className='paper-card p-6'><p className='eyebrow text-[#826e45]'>Academy notices</p><h2 className='mt-2 font-serif text-3xl'>Notifications</h2>{notifications.data?.length?<ul className='mt-4 space-y-3'>{notifications.data.slice(0,4).map(row=><li key={row.id} className='text-sm'>{String(row.message)}</li>)}</ul>:<p className='mt-4 text-sm text-muted-foreground'>No new notifications.</p>}</section></div>;
  return <div className='mt-8 grid gap-5 md:grid-cols-2'><section className='paper-card p-6'><p className='eyebrow text-[#826e45]'>Teaching roster</p><h2 className='mt-2 font-serif text-3xl'>Assigned Students</h2>{students.length?<ul className='mt-4 space-y-3'>{students.slice(0,6).map(row=><li key={row.id}><Link className='text-sm font-medium hover:underline' to={'/dashboard/students/'+row.id}>{String(row.full_name)}</Link></li>)}</ul>:<p className='mt-4 text-sm text-muted-foreground'>No students are currently assigned.</p>}</section><section className='paper-card p-6'><p className='eyebrow text-[#826e45]'>Review queue</p><h2 className='mt-2 font-serif text-3xl'>Pending Reviews</h2>{pending.length?<><p className='mt-4 font-serif text-4xl'>{pending.length}</p><p className='text-sm text-muted-foreground'>student submissions await authorised review</p><Link to='/dashboard/academy' className='mt-5 inline-flex text-sm font-medium underline'>Open review queue</Link></>:<p className='mt-4 text-sm text-muted-foreground'>No assigned submissions await review.</p>}</section><section className='paper-card p-6'><p className='eyebrow text-[#826e45]'>Schedule</p><h2 className='mt-2 font-serif text-3xl'>Upcoming Lessons</h2>{upcoming.length?<ul className='mt-4 space-y-3'>{upcoming.slice(0,4).map(row=><li key={row.id} className='text-sm'><strong>{String(row.title)}</strong><span className='block text-xs text-muted-foreground'>{new Date(String(row.starts_at)).toLocaleString()}</span></li>)}</ul>:<p className='mt-4 text-sm text-muted-foreground'>No upcoming lessons are scheduled.</p>}</section><section className='paper-card p-6'><p className='eyebrow text-[#826e45]'>Learning pulse</p><h2 className='mt-2 font-serif text-3xl'>Recent Student Activity</h2>{recentProgress.length?<ul className='mt-4 space-y-3'>{recentProgress.slice(0,4).map(row=><li key={row.id} className='text-sm'>{row.completed_at?'Lesson completed':'Lesson in progress'}<span className='block text-xs text-muted-foreground'>{new Date(String(row.updated_at??row.completed_at)).toLocaleString()}</span></li>)}</ul>:<p className='mt-4 text-sm text-muted-foreground'>No recent learning activity is recorded.</p>}</section></div>;
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
    { id: 'messages', title: 'Messages', table: 'hka_messages', empty: 'No academy messages yet.' },
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
// Dashboard role access remains defined by route guards and Supabase policies.

export function DashboardIndex() {
  const { profile } = useSession();
  return profile ? <Navigate to={dashboardPath[profile.role]} replace /> : null;
}
export function DashboardPage({ role }: { role: Role }) {
  const { profile } = useSession();
  const location = useLocation();
  if (!profile) return null;
  if (profile.role !== role) return <Navigate to={dashboardPath[profile.role]} replace />;
  if (role === 'student') return <StudentDashboard />;
  if (role === 'admin') return <OwnerDashboard />;
  const section=location.hash.replace('#','');const selected=panels[role].find(panel=>panel.id===section);
  return <section className='dashboard-shell page-width py-8 lg:py-10'><DashboardHero label={roleName[role]+' dashboard'} defaultSubtitle={role==='coach'?'Assigned students, reviews and lessons — securely organised for your coaching work.':'Linked student progress, activities and academy updates — visible with verified permission.'} actions={role==='coach'?<Link to='/dashboard/academy' className='inline-flex min-h-10 items-center rounded-sm bg-primary px-4 text-xs font-medium text-primary-foreground'>Academy workspace</Link>:undefined}/>{selected?<div className='mt-8'><nav aria-label='Breadcrumb' className='mb-4 text-xs text-muted-foreground'><Link to={dashboardPath[role]} className='hover:underline'>Dashboard Home</Link><span aria-hidden='true'> / </span><span>{selected.title}</span></nav>{selected.id==='coaching'?<CoachingWorkspace/>:selected.id==='messages'?<AcademyMessages/>:<DataPanel {...selected}/>}</div>:<RoleOverview role={role}/>} {role==='guardian'&&selected?.id!=='messages'&&<Link to='/dashboard/parent#messages' className='floating-message' aria-label='Open messages'><MessageCircle className='size-6'/></Link>}</section>;
  /* const Icon = roleIcon[role];
  return <section className="dashboard-shell page-width py-8 lg:py-10">
    <div className="dashboard-hero flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="eyebrow mb-4 text-[#76633e]">{roleName[role]} dashboard</p><h1 className="section-heading">Welcome, {profile.full_name}.</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">Your private academy space brings current learning, coaching and account updates together.</p>{role === 'coach' && <Link to={'/dashboard/academy'} className={'mt-5 inline-flex min-h-11 items-center rounded-sm bg-primary px-5 text-xs font-medium text-primary-foreground'}>Open academy workspace</Link>}</div><Icon aria-hidden="true" strokeWidth={1.25} className="size-12 text-[#826e45]" /></div>
     <nav aria-label={`${roleName[role]} dashboard navigation`} className="my-8 flex flex-wrap gap-3">{panels[role].map((panel) => <a key={panel.id} href={`#${panel.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-primary/20 px-4 text-sm hover:bg-primary/5">{panel.id.includes("coaching") ? <CalendarDays className="size-4" /> : panel.id.includes("student") || panel.id.includes("member") ? <Users className="size-4" /> : <BookOpen className="size-4" />}{panel.title}</a>)}</nav>
    <div className="grid gap-5 md:grid-cols-2">{panels[role].map((panel) => <DataPanel key={panel.id} {...panel} />)}</div>{role === 'guardian' && <a href='#messages' className='floating-message' aria-label='Open messages'><MessageCircle className='size-6' /></a>}
  </section>; */
}
