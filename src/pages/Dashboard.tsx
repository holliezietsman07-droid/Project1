import { Navigate } from "react-router-dom";
import { BookOpen, CalendarDays, GraduationCap, HeartHandshake, ShieldCheck, Users } from "lucide-react";
import { useSession } from "@/contexts/SessionContext";
import { useRows } from "@/hooks/use-academy";
import type { Role, Row } from "@/lib/academy";

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
  const Icon = roleIcon[role];
  return <section className="page-width py-12 lg:py-16">
    <div className="flex flex-col justify-between gap-6 border-b border-primary/15 pb-8 md:flex-row md:items-end"><div><p className="eyebrow mb-4 text-[#76633e]">{roleName[role]} dashboard</p><h1 className="section-heading">Welcome, {profile.full_name}.</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">Your private academy space brings current learning, coaching and account updates together.</p></div><Icon aria-hidden="true" strokeWidth={1.25} className="size-12 text-[#826e45]" /></div>
    <nav aria-label={`${roleName[role]} dashboard navigation`} className="my-8 flex flex-wrap gap-3">{panels[role].map((panel) => <a key={panel.id} href={`#${panel.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-primary/20 px-4 text-sm hover:bg-primary/5">{panel.id.includes("coaching") ? <CalendarDays className="size-4" /> : panel.id.includes("student") || panel.id.includes("member") ? <Users className="size-4" /> : <BookOpen className="size-4" />}{panel.title}</a>)}</nav>
    <div className="grid gap-5 md:grid-cols-2">{panels[role].map((panel) => <DataPanel key={panel.id} {...panel} />)}</div>
  </section>;
}
