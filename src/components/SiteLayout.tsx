import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Menu, Mail, ArrowLeft, BookOpen, ChevronLeft, ChevronRight, Home, LayoutDashboard, Settings, Users, CalendarDays, MessageCircle, Fence, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Wordmark } from "@/components/Wordmark";
import { useSession } from '@/contexts/SessionContext';
import { HorseshoeIcon, SelfAvatarEditor } from '@/components/accounts/StudentDashboard';
import { MemberNavigation } from "@/components/accounts/MemberNavigation";
import { db } from '@/lib/academy';
import { academy, brandLogo } from "@/lib/hka-content";
import { SignInForm } from '@/components/accounts/SignInForm';
import AccountPage from '@/pages/AccountPage';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from "@/lib/utils";
import { FloatingAcademyChat } from '@/components/accounts/FloatingAcademyChat';

const navigation = [
  { to: "/", label: "Home" },
  { to: "/learning-pathways", label: "Learning Pathways" },
  { to: "/memberships", label: "Memberships" },
  { to: "/about", label: "About" },
];
const titles: Record<string, string> = {
  '/dashboard/programmes': 'Programme Management',
  '/dashboard/fitness/rider': 'Rider Fitness & Mobility',
  '/dashboard/fitness-preview': 'Programme preview',
  "/": "Online Academy",
  "/learning-pathways": "Learning Pathways",
  "/memberships": "Memberships",
  "/about": "About Hollie",
  "/sign-in": "Sign in",
  "/sign-up": "Sign up",
  "/password-reset": "Password reset",
  "/update-password": "Update password",
  "/dashboard": "Dashboard",  "/dashboard/account": "Account settings",
  "/dashboard/student": "Student dashboard",
  "/dashboard/parent": "Parent dashboard",
  "/dashboard/coach": "Coach dashboard",
  "/dashboard/admin": "Administrator dashboard",  "/dashboard/student-preview": "Student preview",  "/dashboard/academy": "Academy workspace",
};

export default function SiteLayout() {
  const location = useLocation();
  const { profile, session, loading } = useSession();
  const [signInOpen, setSignInOpen] = useState(false); const [authMode,setAuthMode]=useState<'sign-in'|'sign-up'>('sign-in');
const authReturnRef=useRef<HTMLElement|null>(null);
const authDialogRef=useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false); const [sidebarCollapsed, setSidebarCollapsed] = useState(false); const navigate = useNavigate();
  const lastPath = useRef(location.pathname); const memberMode = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/academy'); const section = new URLSearchParams(location.search).get('section') || location.hash.replace('#',''); const dashboardRoot = profile?.role === 'admin' ? '/dashboard/admin' : profile?.role === 'student' ? '/dashboard/student' : profile?.role === 'guardian' ? '/dashboard/parent' : profile?.role === 'coach' ? '/dashboard/coach' : '/dashboard'; const sectionLabels = dashboardRoot === '/dashboard/admin' ? [['students','Students'],['coaching','Coaching'],['messages','Messages'],['programmes','Programme Management'],['memberships','Memberships & horses'],['settings','Settings']] : dashboardRoot === '/dashboard/student' ? [['courses','My learning'],['coaching','Coaching'],['fitness','Rider Fitness & Mobility'],['horses','Horses'],['records','Achievements'],['messages','Messages'],['profile','Account settings']] : dashboardRoot === '/dashboard/coach' ? [['courses','My courses'],['students','Assigned students'],['submissions','Submissions'],['coaching','Coaching schedule'],['messages','Messages']] : dashboardRoot === '/dashboard/parent' ? [['students','Linked students'],['coaching','Appointments'],['progress','Progress'],['messages','Messages'],['notices','Updates']] : [];

  useEffect(() => {
    if (!loading && session && profile?.id === session.user.id) setSignInOpen(false);
  }, [session, profile, loading]);

  useEffect(() => {
    if (!signInOpen) return;
    const frame = requestAnimationFrame(() => {
      authDialogRef.current?.scrollTo({ top: 0 });
      authDialogRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [signInOpen, authMode]);

  useEffect(() => {
    document.title = (titles[location.pathname] ?? (location.pathname.startsWith('/dashboard/fitness/horse') ? 'Fitness & Conditioning' : location.pathname.startsWith('/dashboard/fitness/rider') ? 'Rider Fitness & Mobility' : null) ?? (/^\/learning-pathways\/[^/]+$/.test(location.pathname) ? "Learning pathway" : /^\/academy\/courses\/[^/]+$/.test(location.pathname) ? "Course" : /^\/dashboard\/students\/[^/]+$/.test(location.pathname) ? "Student management profile" : "Page not found")) + " | HKA Equestrian";
    setMenuOpen(false);
    const frame = requestAnimationFrame(() => {
      if (location.hash) {
        const target = document.getElementById(location.hash.slice(1));
        target?.scrollIntoView({ block: "start" });
        target?.focus({ preventScroll: true });
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        if (lastPath.current !== location.pathname) document.getElementById("main-content")?.focus({ preventScroll: true });
      }
      lastPath.current = location.pathname;
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, location.hash]);

  if (memberMode) return (<div className='min-h-screen bg-background lg:flex'><a href='#main-content' className='skip-link'>Skip to content</a><aside className={cn('hka-sidebar hidden shrink-0 border-r border-[#B79B62]/35 bg-[#2F4A3C] text-[#F6F1E7] transition-[width] lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:self-start lg:overflow-y-auto',sidebarCollapsed?'w-20':'w-72')}><div className='m-3 flex min-h-20 items-center justify-between rounded-xl border border-[#F6F1E7]/10 bg-[#36594A] px-3 shadow-inner'>{!sidebarCollapsed&&<Wordmark/>}<Button variant='ghost' size='icon' onClick={()=>setSidebarCollapsed(value=>!value)} aria-label={sidebarCollapsed?'Expand sidebar':'Collapse sidebar'}>{sidebarCollapsed?<ChevronRight/>:<ChevronLeft/>}</Button></div><nav aria-label='Dashboard navigation' className='flex-1 space-y-1 p-3'><Link to={dashboardRoot} className={cn('flex min-h-11 items-center gap-3 rounded-sm px-3 text-sm hover:bg-primary/10',!section&&location.pathname===dashboardRoot&&'bg-primary/10 font-semibold')} aria-label={'Dashboard home'} title={'Dashboard home'}><LayoutDashboard className='size-5 shrink-0'/>{!sidebarCollapsed&&'Dashboard home'}</Link>{sectionLabels.map(([key,label])=><Link key={key} to={key==='programmes'?'/dashboard/programmes':key==='fitness'?'/dashboard/fitness/rider':key==='profile'?'/dashboard/account':(profile?.role==='coach'||profile?.role==='guardian')?dashboardRoot+'#'+key:dashboardRoot+'?section='+key} className={cn('flex min-h-11 items-center gap-3 rounded-sm px-3 text-sm hover:bg-primary/10',section===key&&'bg-primary/10 font-semibold')} aria-label={label} title={label}><span className='size-5 shrink-0' aria-hidden='true'>{key==='courses'?<BookOpen className='size-5'/>:key==='coaching'?<CalendarDays className='size-5'/>:key==='messages'?<MessageCircle className='size-5'/>:key==='horses'?<HorseshoeIcon className='size-5'/>:key==='memberships'?<Fence className='size-5'/>:key==='settings'||key==='profile'?<Settings className='size-5'/>:key==='records'||key==='progress'?<Award className='size-5'/>:<Users className='size-5'/>}</span>{!sidebarCollapsed&&label}</Link>)}{(profile?.role === 'admin' || profile?.role === 'coach') && <Link to='/dashboard/academy' className={cn('flex min-h-11 items-center gap-3 rounded-sm px-3 text-sm hover:bg-primary/10',location.pathname==='/dashboard/academy'&&'bg-primary/10 font-semibold')} aria-label={'Academy workspace'} title={'Academy workspace'}><BookOpen className='size-5 shrink-0'/>{!sidebarCollapsed&&'Academy workspace'}</Link>}<Link to='/' className='flex min-h-11 items-center gap-3 rounded-sm px-3 text-sm hover:bg-primary/10' aria-label={'Public website'} title={'Public website'}><Home className='size-5 shrink-0'/>{!sidebarCollapsed&&'Public website'}</Link></nav>{!sidebarCollapsed&&<div className='border-t border-primary/10 p-4'><MemberNavigation sidebar/></div>}</aside><div className='min-w-0 flex-1'><header className='dashboard-topbar sticky top-0 z-30 hidden min-h-16 items-center justify-between gap-6 border-b border-primary/15 px-7 lg:flex'><div><p className='text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A7448]'>HKA Equestrian</p><p className='font-serif text-lg'>{sectionLabels.find(([key])=>key===section)?.[1]??titles[location.pathname]??'Dashboard'}</p></div><div className='flex items-center gap-2'><SelfAvatarEditor className='size-10'/><details key={location.key} className='relative'><summary className='cursor-pointer list-none rounded-lg px-2 py-1 text-left text-sm hover:bg-primary/5'><strong className='block font-medium'>{profile?.full_name}</strong><span className='block text-[10px] capitalize text-muted-foreground'>{profile?.role}</span></summary><div className='absolute right-0 top-12 z-50 w-60 rounded-xl border border-primary/15 bg-[#fffdf8] p-4 shadow-xl'><MemberNavigation mobile/></div></details></div></header><header className='sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-primary/15 bg-background/95 px-4 backdrop-blur lg:hidden'><Button variant='ghost' size='icon' onClick={()=>navigate(-1)} aria-label='Go back'><ArrowLeft/></Button><p className='truncate font-serif text-lg'>{titles[location.pathname]??'HKA Academy'}</p><Sheet open={menuOpen} onOpenChange={setMenuOpen}><SheetTrigger asChild><Button variant='ghost' size='icon' aria-label='Open dashboard menu'><Menu/></Button></SheetTrigger><SheetContent className='w-[min(88vw,360px)] overflow-y-auto'><SheetHeader className='mb-6 text-left'><SheetTitle>Dashboard menu</SheetTitle><SheetDescription>Open your authorised academy pages.</SheetDescription></SheetHeader><nav className='flex flex-col gap-2'><Link to={dashboardRoot} onClick={()=>setMenuOpen(false)} className='rounded-sm px-3 py-3 hover:bg-primary/5'>Dashboard home</Link>{sectionLabels.map(([key,label])=><Link key={key} to={key==='programmes'?'/dashboard/programmes':key==='fitness'?'/dashboard/fitness/rider':key==='profile'?'/dashboard/account':(profile?.role==='coach'||profile?.role==='guardian')?dashboardRoot+'#'+key:dashboardRoot+'?section='+key} onClick={()=>setMenuOpen(false)} className='rounded-sm px-3 py-3 hover:bg-primary/5'>{label}</Link>)}{(profile?.role === 'admin' || profile?.role === 'coach') && <Link to='/dashboard/academy' onClick={()=>setMenuOpen(false)} className='rounded-sm px-3 py-3 hover:bg-primary/5'>Academy workspace</Link>}<Link to='/' onClick={()=>setMenuOpen(false)} className='rounded-sm px-3 py-3 hover:bg-primary/5'>Public website</Link><MemberNavigation mobile/></nav></SheetContent></Sheet></header><main id='main-content' tabIndex={-1} className='min-w-0 focus:outline-none'><Outlet/></main><FloatingAcademyChat key={profile?.id}/></div></div>); return (
    <>
    <div onClickCapture={(event) => { const anchor=(event.target as HTMLElement).closest('a'); if(anchor?.getAttribute('href')==='/sign-in'||anchor?.getAttribute('href')==='/sign-up'){ event.preventDefault(); authReturnRef.current=anchor; setAuthMode(anchor.getAttribute('href')==='/sign-up'?'sign-up':'sign-in'); setMenuOpen(false); setSignInOpen(true); } }} className="flex min-h-screen flex-col">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="relative z-30 border-b border-primary/10 bg-background">
        <div className="page-width flex min-h-24 items-center justify-between gap-6 py-2">
          <Wordmark />
          <nav aria-label="Main navigation" className="hidden items-center gap-7 lg:flex">
            {navigation.map((item) => (
              <NavLink key={item.to} to={item.to} end className={({ isActive }) => cn("relative flex min-h-11 items-center text-[13px] transition-colors hover:text-primary", isActive ? "font-semibold text-primary after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-primary" : "text-muted-foreground")}>{item.label}</NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-6 lg:flex">
            <MemberNavigation />
          </div>
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="size-11 lg:hidden" aria-label="Open navigation"><Menu /></Button>
            </SheetTrigger>
            <SheetContent className="w-[min(88vw,360px)] overflow-y-auto [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center">
              <SheetHeader className="mb-8 text-left">
                <Wordmark /><SheetTitle className="sr-only">HKA Equestrian</SheetTitle>
                <SheetDescription hidden>Online Academy</SheetDescription>
              </SheetHeader>
              <nav aria-label="Mobile navigation" className="flex flex-col gap-2">
                {navigation.map((item) => <NavLink key={item.to} to={item.to} end onClick={() => setMenuOpen(false)} className={({ isActive }) => cn("rounded-sm px-3 py-3 text-base", isActive ? "bg-primary/10 font-semibold" : "hover:bg-primary/5")}>{item.label}</NavLink>)}
                <MemberNavigation mobile />
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none"><Outlet /></main>
      <footer className="border-t border-primary/15 bg-[#edeade]">
        <div className="page-width grid gap-10 py-14 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Wordmark footer />
            <p className="mt-6 max-w-xs font-serif text-xl leading-relaxed">Rooted in Horsemanship.<br />Inspired by Learning.</p>
            <p className="mt-3 text-xs text-muted-foreground">Thoughtful learning. Wherever you are.</p>
          </div>
          <nav aria-label="Footer navigation">
            <p className="eyebrow mb-4">Explore the academy</p>
            <ul className="space-y-1">{navigation.map((item) => <li key={item.to}><Link className="inline-flex min-h-10 items-center text-sm text-muted-foreground hover:text-primary hover:underline" to={item.to}>{item.label}</Link></li>)}</ul>
          </nav>
          <div>
            <p className="eyebrow mb-4">Let’s connect</p>
            <p className="text-sm text-muted-foreground">Questions about the academy?</p>
            <a href={"mailto:" + academy.email} className="mt-3 inline-flex min-h-11 items-center gap-2 break-all text-sm underline decoration-primary/30 underline-offset-4"><Mail className="size-4 shrink-0" aria-hidden="true" />{academy.email}</a>
            <Link to="/sign-in" className="mt-3 block w-fit py-2 text-sm hover:underline">Member sign in</Link>
          </div>
        </div>
        <div className="page-width flex flex-col justify-between gap-3 border-t border-primary/15 py-6 text-[11px] text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} HKA Equestrian. All rights reserved.</p>
          <p>Founded by Hollie Zietsman · Made for a life with horses.</p>
        </div>
      </footer>
    </div>
    <FloatingAcademyChat key={profile?.id}/>
    <Dialog open={signInOpen} onOpenChange={setSignInOpen}>
      <DialogContent ref={authDialogRef} onOpenAutoFocus={event=>{event.preventDefault();authDialogRef.current?.focus({preventScroll:true});}} onCloseAutoFocus={event=>{event.preventDefault();const target=authReturnRef.current?.isConnected?authReturnRef.current:document.querySelector<HTMLElement>('button[aria-label="Open navigation"]')??document.getElementById('main-content');requestAnimationFrame(()=>target?.focus());}} onClickCapture={event=>{const anchor=(event.target as HTMLElement).closest('a');const href=anchor?.getAttribute('href');if(href==='/sign-in'||href==='/sign-up'){event.preventDefault();setAuthMode(href==='/sign-up'?'sign-up':'sign-in');}}} className='max-h-[92dvh] max-w-4xl overflow-y-auto border-[#B79B62]/40 bg-[#F6F1E7] p-6 sm:p-8 md:min-h-[590px] md:pl-[min(48vw,430px)]'>
        <div className='absolute inset-y-0 left-0 hidden w-[44%] overflow-hidden md:block'><img src='/images/PATHWAY_01_Riding_Rider_Development.webp' alt='HKA rider preparing a horse for learning' className='h-full w-full object-cover object-center' /><div className='absolute inset-0 bg-gradient-to-t from-[#12382e]/85 via-transparent to-transparent'/><p className='absolute inset-x-6 bottom-8 text-center font-serif text-lg leading-7 text-[#fff8e8]'>A life with horses.<br/>A journey of learning.</p></div><img src={brandLogo.src} alt={brandLogo.alt} width={brandLogo.width} height={brandLogo.height} className='mb-3 h-auto w-44' /><DialogHeader className='text-left'>
          <p className='eyebrow text-[#76633e]'>Your place in the academy</p>
          <DialogTitle className='font-serif text-3xl text-[#2F4A3C]'>{authMode==='sign-in'?'Welcome back.':'Join HKA Equestrian'}</DialogTitle>
          <DialogDescription>{authMode==='sign-in'?'Sign in securely without leaving the HKA homepage.':'Create your account securely. Coach access requires Founder approval.'}</DialogDescription>
        </DialogHeader>
        {authMode==='sign-in'?<SignInForm/>:<AccountPage key='sign-up' mode='sign-up' embedded/>}
        {authMode==='sign-in'&&<div className='flex flex-wrap justify-between gap-3 border-t border-primary/15 pt-4 text-xs'>
          <Link to='/password-reset' onClick={() => setSignInOpen(false)} className='underline underline-offset-4'>Forgot password?</Link>
          <Link to='/sign-up' onClick={event => { event.preventDefault(); setAuthMode('sign-up'); }} className='underline underline-offset-4'>Create account</Link>
        </div>}
      </DialogContent>
    </Dialog>
    </>
  );
}
