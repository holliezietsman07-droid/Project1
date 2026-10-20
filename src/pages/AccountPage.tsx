import { Link } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AccountMode = "sign-in" | "sign-up" | "password-reset";
const screens = {
  "sign-in": { eyebrow: "Your place in the academy", title: "Welcome back.", description: "A thoughtful space for your learning journey.", action: "Sign in", notice: "Sign in will be available when member accounts open." },
  "sign-up": { eyebrow: "Every journey has a beginning", title: "Find your place.", description: "For riders, horse owners and curious minds.", action: "Create account", notice: "Account registration isn’t open yet. You can explore the academy while we prepare your member space." },
  "password-reset": { eyebrow: "A little help along the way", title: "Reset your password.", description: "Find your way back to your learning journey.", action: "Send reset link", notice: "Password reset will be available when member accounts open. No reset emails can be sent yet." },
};

export default function AccountPage({ mode }: { mode: AccountMode }) {
  const screen = screens[mode];
  const isSignup = mode === "sign-up";
  return (
    <section className="page-width grid gap-10 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:py-20">
      <div className="max-w-md lg:pt-10">
        <p className="eyebrow mb-5 text-[#76633e]">{screen.eyebrow}</p>
        <h1 className="section-heading text-[2.75rem] sm:text-[3.5rem]">{screen.title}</h1>
        <p className="mt-5 text-sm leading-7 text-muted-foreground">{screen.description}</p>
        <div className="my-8 h-px w-16 bg-[#B79B62]" />
        <p className="font-serif text-2xl leading-relaxed">Rooted in Horsemanship.<br /><span className="italic">Inspired by Learning.</span></p>
        <Link to="/learning-pathways" className="text-link mt-6">Explore while you’re here <ArrowUpRight aria-hidden="true" className="size-4" /></Link>
      </div>
      <div className="paper-card w-full max-w-[560px] p-6 sm:p-9">
        <h2 className="font-serif text-2xl">{mode === "password-reset" ? "Password reset" : isSignup ? "Join HKA Equestrian" : "Member sign in"}</h2>
        <div id="account-availability" role="note" className="my-6 flex gap-3 border border-primary/15 bg-[#e9e7dc] p-4">
          <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div><p className="text-xs font-semibold">Accounts coming soon</p><p className="mt-1 text-xs leading-6 text-muted-foreground">{screen.notice}</p></div>
        </div>
        <form aria-label={screen.action + " — unavailable"} aria-describedby="account-availability account-privacy" onSubmit={(event) => event.preventDefault()}>
          <fieldset disabled className="space-y-5">
            <legend className="sr-only">{screen.action} fields — available when accounts open</legend>
            {isSignup && <div className="space-y-2"><Label htmlFor="full-name">Full name</Label><Input id="full-name" name="name" autoComplete="name" placeholder="Your full name" className="h-12" /></div>}
            <div className="space-y-2"><Label htmlFor="email">Email address</Label><Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" className="h-12" /></div>
            {mode !== "password-reset" && <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" autoComplete={isSignup ? "new-password" : "current-password"} placeholder={isSignup ? "Create your password" : "Enter your password"} className="h-12" /></div>}
            {isSignup && <>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="min-w-0 space-y-2"><Label htmlFor="birth-date">Date of birth</Label><Input id="birth-date" name="birthDate" type="text" placeholder="DD/MM/YYYY" aria-describedby="birth-date-help" autoComplete="bday" className="h-12 min-w-0" /></div>
                <div className="min-w-0 space-y-2"><Label htmlFor="timezone">Timezone</Label><Input id="timezone" name="timezone" placeholder="Select your timezone" aria-describedby="timezone-help" className="h-12 min-w-0" /></div>
              </div>
              <p id="birth-date-help" className="text-xs leading-6 text-muted-foreground">Date of birth will be private and used to provide age-appropriate account protection.</p>
              <p id="timezone-help" className="text-xs leading-6 text-muted-foreground">Timezone selection will be available when registration opens.</p>
              <fieldset className="space-y-3">
                <legend className="mb-3 text-sm font-medium">Your interests <span className="font-normal text-muted-foreground">(choose any)</span></legend>
                {["Learner / rider", "Horse owner", "Parent / guardian"].map((interest, index) => <label key={interest} htmlFor={"interest-" + index} className="flex min-h-8 items-center gap-3 text-sm text-muted-foreground"><input id={"interest-" + index} type="checkbox" name="interests" value={interest} className="size-4 accent-primary" />{interest}</label>)}
              </fieldset>
            </>}
            <Button type="submit" disabled className="h-12 w-full rounded-sm disabled:opacity-70">{screen.action} <span className="font-normal">· Coming soon</span></Button>
          </fieldset>
          <p id="account-privacy" className="mt-4 text-xs leading-6 text-muted-foreground">This form is not accepting information. Nothing is sent or saved, and no account or session is created.</p>
        </form>
        <div className="mt-6 flex flex-col gap-3 border-t border-primary/15 pt-5 text-sm">
          {mode === "sign-in" && <><Link to="/password-reset" className="text-link w-fit text-xs">Forgot your password?</Link><p className="text-xs text-muted-foreground">New to HKA? <Link to="/sign-up" className="ml-1 inline-flex min-h-11 items-center text-primary underline underline-offset-4">Explore sign up</Link></p></>}
          {isSignup && <p className="text-xs text-muted-foreground">Already have an account? <Link to="/sign-in" className="ml-1 inline-flex min-h-11 items-center text-primary underline underline-offset-4">Sign in</Link></p>}
          {mode === "password-reset" && <Link to="/sign-in" className="text-link w-fit text-xs"><ArrowLeft className="size-4" aria-hidden="true" />Back to sign in</Link>}
        </div>
      </div>
    </section>
  );
}
