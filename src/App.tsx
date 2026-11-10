import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCallback, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import SiteLayout from "@/components/SiteLayout";
import Index from "@/pages/Index";
import FitnessProgrammes from "@/pages/FitnessProgrammes";
import LearningPathways from "@/pages/LearningPathways";
import PathwayDetail from '@/pages/PathwayDetail';
import CoursePlayer from '@/pages/CoursePlayer';
import AcademyWorkspace from '@/pages/AcademyWorkspace';
import Memberships from "@/pages/Memberships";
import About from "@/pages/About";
import AccountPage from "@/pages/AccountPage";
import { DashboardIndex, DashboardPage } from "@/pages/Dashboard";
import MemberAccountSettings from '@/pages/MemberAccountSettings';
import NotFound from "@/pages/NotFound";
import { AccessGate } from "@/components/accounts/AccessGate";
import { Button } from '@/components/ui/button';
import { brandLogo } from '@/lib/hka-content';
import type { Profile, Role } from '@/lib/academy';
import { FitnessPreviewSessionProvider, SessionContextProvider, useSession } from "@/contexts/SessionContext";

import { StudentManagementProfile, StudentPreview } from '@/components/accounts/OwnerDashboard';
import UserManagementProfile from '@/pages/UserManagementProfile';

const dashboardPath: Record<Role, string> = {
  student: '/dashboard/student',
  guardian: '/dashboard/parent',
  coach: '/dashboard/coach',
  admin: '/dashboard/admin',
};

const roleMessage: Record<Role, string> = {
  admin: 'Your Founder dashboard and academy overview are ready.',
  coach: 'Your coaching workspace and student updates are ready.',
  student: 'Your learning and horse-care space is ready for you.',
  guardian: 'Your family learning overview and academy updates are ready.',
};

function greetingFor(timezone: string) {
  try {
    const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: timezone }).formatToParts(new Date()).find((part) => part.type === 'hour')?.value);
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  } catch {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  }
}

function preferredFirstName(profile: Profile) {
  const namedProfile = profile as Profile & { preferred_first_name?: string; first_name?: string };
  return namedProfile.preferred_first_name?.trim() || namedProfile.first_name?.trim() || profile.full_name.trim().split(/\s+/)[0] || 'friend';
}

function WelcomeExperience() {
  const { session, profile, loading, error, recovery, welcomeUserId } = useSession();
  const navigate = useNavigate();
  const welcomedUser = useRef<string | null>(null);
  const [activeUser, setActiveUser] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  const finish = useCallback(() => {
    if (!profile) return;
    setActiveUser(null);
    setLeaving(false);
    navigate(dashboardPath[profile.role], { replace: true });
  }, [navigate, profile]);

  useEffect(() => {
    if (!session) {
      welcomedUser.current = null;
      setActiveUser(null);
      setLeaving(false);
      return;
    }
    if (loading || error || recovery || welcomeUserId !== session.user.id || !profile || profile.id !== session.user.id || profile.suspended || welcomedUser.current === session.user.id) return;
    welcomedUser.current = session.user.id;
    setLeaving(false);
    setActiveUser(session.user.id);
  }, [error, loading, profile, recovery, session, welcomeUserId]);

  useEffect(() => {
    if (!activeUser) return;
    const welcomeTimer = window.setTimeout(() => {
      if (!profile || profile.id !== activeUser || profile.suspended) return;
      navigate(dashboardPath[profile.role], { replace: true, state: null });
      setLeaving(true);
    }, 1450);
    return () => window.clearTimeout(welcomeTimer);
  }, [activeUser, navigate, profile]);

  useEffect(() => {
    if (!activeUser || !leaving) return;
    const transitionTimer = window.setTimeout(finish, 250);
    return () => window.clearTimeout(transitionTimer);
  }, [activeUser, finish, leaving]);

  if (!activeUser || !profile || activeUser !== session?.user.id) return null;

  return <div className={'fixed inset-0 z-[100] flex min-h-dvh items-center justify-center overflow-hidden bg-[#F6F1E7] px-6 py-10 text-center transition-opacity duration-300 ' + (leaving ? 'opacity-0' : 'opacity-100')} role='dialog' aria-modal='true' aria-labelledby='hka-welcome-title'>
    <div className='absolute inset-x-0 top-0 h-1 bg-[#B79B62]' />
    <div className='mx-auto flex max-w-xl flex-col items-center'>
      <img src={brandLogo.src} alt={brandLogo.alt} width={brandLogo.width} height={brandLogo.height} className='mb-10 h-auto w-56 max-w-full sm:w-72' />
      <p className='mb-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8A7448]'>Rooted in Horsemanship. Inspired by Learning.</p>
      <h1 id='hka-welcome-title' className='font-serif text-[clamp(2.5rem,7vw,4.75rem)] leading-[1.06] tracking-[-0.04em] text-[#2F4A3C]'>{greetingFor(profile.timezone)},<br /><span className='italic text-[#806D49]'>{preferredFirstName(profile)}.</span></h1>
      <p className='mt-6 max-w-md text-sm leading-7 text-[#59645C]'>{roleMessage[profile.role]}</p>
      <Button type='button' variant='ghost' className='mt-8 min-h-11 px-5 text-xs text-[#2F4A3C] underline decoration-[#B79B62] underline-offset-4 hover:bg-[#2F4A3C]/5' onClick={finish}>Skip welcome</Button>
    </div>
  </div>;
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path='/dashboard/fitness-preview' element={import.meta.env.VITE_HKA_PUBLIC_SITE==='true' ? <Navigate to='/' replace/> : <FitnessPreviewSessionProvider>
            <div className='min-h-screen bg-background'>
              <header className='border-b border-primary/15 bg-[#F6F1E7]'><div className='page-width flex items-center justify-between gap-3 py-2 sm:py-3'>
                <Link to='/' aria-label='HKA home'><img src={brandLogo.src} alt={brandLogo.alt} className='h-auto w-24 sm:w-28' /></Link>
                <div className='text-right'><p className='eyebrow text-[#826e45]'>Fitness preview</p><p className='mt-0.5 text-xs text-muted-foreground'>Sample data only</p></div>
              </div></header>
              <main id='main-content'><FitnessProgrammes mode='preview' /></main>
            </div>
          </FitnessPreviewSessionProvider>} />
          <Route path='*' element={<SessionContextProvider>
          <WelcomeExperience />
          <Routes>
            <Route element={<SiteLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/learning-pathways" element={<LearningPathways />} />
              <Route path="/memberships" element={<Memberships />} />
              <Route path="/about" element={<About />} />
              <Route path="/sign-in" element={<AccountPage key="sign-in" mode="sign-in" />} />
              <Route path="/sign-up" element={<AccountPage key="sign-up" mode="sign-up" />} />
              <Route path="/password-reset" element={<AccountPage key="password-reset" mode="password-reset" />} />
              <Route path="/update-password" element={<AccountPage key="update-password" mode="update-password" />} />
              <Route path={'/learning-pathways/:pathwayId'} element={<PathwayDetail />} />
              <Route element={<AccessGate />}><Route path="/dashboard/fitness/rider/:studentId?" element={<FitnessProgrammes mode="rider" />} /><Route path="/dashboard/fitness/horse/:horseId?" element={<FitnessProgrammes mode="horse" />} /><Route element={<AccessGate roles={["admin"]} />}><Route path="/dashboard/programmes" element={<FitnessProgrammes mode="manage" />} /></Route>
                <Route path="/dashboard" element={<DashboardIndex />} /><Route path='/dashboard/account' element={<MemberAccountSettings/>}/>
                <Route element={<AccessGate roles={["student"]} />}><Route path="/dashboard/student" element={<DashboardPage role="student" />} /></Route>
                <Route element={<AccessGate roles={["guardian"]} />}><Route path="/dashboard/parent" element={<DashboardPage role="guardian" />} /></Route>
                <Route element={<AccessGate roles={["coach"]} />}><Route path="/dashboard/coach" element={<DashboardPage role="coach" />} /></Route>
                <Route element={<AccessGate roles={["admin"]} />}><Route path="/dashboard/admin" element={<DashboardPage role="admin" />} /></Route>
                <Route element={<AccessGate roles={['student']} />}><Route path={'/academy/courses/:courseId'} element={<CoursePlayer />} /></Route>
                <Route element={<AccessGate roles={['admin']} />}><Route path={'/dashboard/student-preview'} element={<StudentPreview />} /><Route path='/dashboard/users/:userId' element={<UserManagementProfile />} /></Route>
                <Route element={<AccessGate roles={['coach', 'admin']} />}><Route path={'/dashboard/students/:studentId'} element={<StudentManagementProfile />} /></Route>
                <Route element={<AccessGate roles={['coach', 'admin']} />}><Route path={'/dashboard/academy'} element={<AcademyWorkspace />} /></Route>
              </Route>
              {/* An unverified redirect must never display a payment success claim. */}
              <Route path="/payment/success" element={<Navigate to="/memberships" replace />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </SessionContextProvider>} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
