import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Wordmark } from "@/components/Wordmark";
import { MemberNavigation } from "@/components/accounts/MemberNavigation";
import { academy } from "@/lib/hka-content";
import { cn } from "@/lib/utils";

const navigation = [
  { to: "/", label: "Home" },
  { to: "/learning-pathways", label: "Learning Pathways" },
  { to: "/memberships", label: "Memberships" },
  { to: "/about", label: "About" },
];
const titles: Record<string, string> = {
  "/": "Online Academy",
  "/learning-pathways": "Learning Pathways",
  "/memberships": "Memberships",
  "/about": "About Hollie",
  "/sign-in": "Sign in",
  "/sign-up": "Sign up",
  "/password-reset": "Password reset",
  "/update-password": "Update password",
  "/dashboard": "Dashboard",
  "/dashboard/student": "Student dashboard",
  "/dashboard/parent": "Parent dashboard",
  "/dashboard/coach": "Coach dashboard",
  "/dashboard/admin": "Administrator dashboard",
};

export default function SiteLayout() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const lastPath = useRef(location.pathname);

  useEffect(() => {
    document.title = (titles[location.pathname] ?? "Page not found") + " | HKA Equestrian";
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

  return (
    <div className="flex min-h-screen flex-col">
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
  );
}
