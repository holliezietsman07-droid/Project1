import { showSuccess } from '@/utils/toast';
import { useRef, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/contexts/SessionContext";
import { db, errorText, isEmailRateLimitError, isMinor, registrationErrorText } from "@/lib/academy";

import { PurposeSelector, RelevantOnboardingFields, type AccountPurpose } from '@/components/accounts/AccountRoles';

import { SignInForm } from '@/components/accounts/SignInForm';
import { setSessionPersistence } from '@/integrations/supabase/client';
import { SESSION_PREFERENCE } from '@/lib/auth-storage';

type AccountMode = "sign-in" | "sign-up" | "password-reset" | "update-password";
const screens = {
  "sign-in": { eyebrow: "Your place in the academy", title: "Welcome back.", description: "A thoughtful space for your learning journey." },
  "sign-up": { eyebrow: "Every journey has a beginning", title: "Find your place.", description: "For riders, horse owners and curious minds." },
  "password-reset": { eyebrow: "A little help along the way", title: "Reset your password.", description: "We will send a secure recovery link to your email." },
  "update-password": { eyebrow: "Your account, protected", title: "Choose a new password.", description: "Use a unique password of at least 12 characters." },
};
export default function AccountPage({ mode, embedded = false }: { mode: AccountMode; embedded?: boolean }) {
  const { session, profile, loading, recovery } = useSession();
 
  const [details, setDetails] = useState<{ full_name: string; birth_date: string; timezone: string; account_type: string; account_purposes: AccountPurpose[]; onboarding: Record<string, unknown> } | null>(null);
  const [purposes, setPurposes] = useState<AccountPurpose[]>(['student']);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registrationCooldown, setRegistrationCooldown] = useState(false);
  const [staySignedIn, setStaySignedIn] = useState(() => localStorage.getItem(SESSION_PREFERENCE) !== 'session');
  const registrationLock = useRef(false);
  const screen = screens[mode];
  if (recovery && mode !== "update-password") return <Navigate to="/update-password" replace />;
  if (!loading && session && (mode === "sign-in" || mode === "sign-up")) {
    // Always resolve the current account's dashboard after profile loading.
    if (profile?.id === session.user.id) return <Navigate to="/dashboard" replace state={null} />;
  }
  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const birth = String(data.get("birth_date"));
    if (!purposes.length) { setMessage('Choose at least one account purpose.'); return; }
    if (purposes.includes('guardian') && isMinor(birth)) { setMessage('A parent or guardian account requires an adult aged 18 or over.'); return; }
    const onboarding={primary_discipline:data.get('primary_discipline'),additional_disciplines:data.get('additional_disciplines'),experience_level:data.get('experience_level'),riding_goals:data.get('riding_goals'),horse_information:data.get('student_horse')||data.get('owner_horse'),intro_horse_care:data.get('intro_horse_care')==='on',guardian_code:data.get('guardian_code'),coaching_disciplines:data.get('coaching_disciplines'),qualifications:data.get('qualifications'),coach_code:data.get('coach_code'),owner_type:data.get('owner_type')};
    try { new Intl.DateTimeFormat('en', { timeZone: String(data.get('timezone')).trim() }).format(); }
    catch { setMessage('Choose a valid timezone, such as Africa/Lusaka.'); return; }
    const role = String(data.get("account_type"));
    if (role === "guardian" && isMinor(birth)) { setMessage("A parent or guardian account requires an adult aged 18 or over."); return; }
    setMessage("");
    setDetails({ full_name: String(data.get("full_name")).trim(), birth_date: birth, timezone: String(data.get("timezone")).trim(), account_type: role, account_purposes: purposes, onboarding });
  }
  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!details || registrationLock.current || registrationCooldown || registrationComplete) return;
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email')).trim();
    const password = String(data.get('password'));
    const confirmation = String(data.get('password_confirmation'));
    if (password.length < 12) { setMessage('Use a password of at least 12 characters.'); return; }
    if (password !== confirmation) { setMessage('Passwords do not match.'); return; }
    registrationLock.current = true;
    setBusy(true);
    setMessage('');
    try {
      setSessionPersistence(staySignedIn);
      const { error } = await db().auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + '/dashboard', data: details } });
      if (error) throw error;
      setRegistrationComplete(true);
      setMessage(showSuccess('Registration received. Check your inbox for the verification email before signing in.'));
    } catch (error) {
      if (isEmailRateLimitError(error)) {
        setRegistrationCooldown(true);
        window.setTimeout(() => setRegistrationCooldown(false), 60_000);
      }
      setMessage(registrationErrorText(error));
    } finally {
      registrationLock.current = false;
      setBusy(false);
    }
  }
  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const email = String(new FormData(event.currentTarget).get("verification_email"));
    try {
      const { error } = await db().auth.resend({ type: "signup", email, options: { emailRedirectTo: window.location.origin + "/dashboard" } });
      if (error) throw error;
      setMessage(showSuccess("If verification is available for this address, check your inbox."));
    } catch (error) { setMessage(errorText(error)); } finally { setBusy(false); }
  }
  return <section className={embedded ? "min-w-0" : "page-width grid gap-10 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:py-20"}>
    <div className={embedded ? "hidden" : "max-w-md lg:pt-10"}>
      <p className="eyebrow mb-5 text-[#76633e]">{screen.eyebrow}</p>
      <h1 className="section-heading text-[2.75rem] sm:text-[3.5rem]">{screen.title}</h1>
      <p className="mt-5 text-sm leading-7 text-muted-foreground">{screen.description}</p>
      <div className="my-8 h-px w-16 bg-[#B79B62]" />
      <p className="font-serif text-2xl leading-relaxed">Rooted in Horsemanship.<br /><span className="italic">Inspired by Learning.</span></p>
      <Link to="/learning-pathways" className="text-link mt-6">Explore while you’re here <ArrowUpRight aria-hidden="true" className="size-4" /></Link>
    </div>
    <div className={embedded ? "min-w-0 w-full" : "paper-card w-full max-w-[560px] p-6 sm:p-9"}>
      <h2 className={embedded ? "sr-only" : "mb-6 font-serif text-2xl"}>{mode === "sign-up" ? "Join HKA Equestrian" : mode === "sign-in" ? "Member sign in" : "Password management"}</h2>
      {message && <p role="status" className="mb-5 border-l-2 border-primary p-3 text-sm">{message}</p>}
      {mode === "sign-up" && !details ? <form onSubmit={prepare} className="space-y-5">
        <div className="space-y-2"><Label htmlFor="full_name">Full name</Label><Input id="full_name" name="full_name" autoComplete="name" required maxLength={100} /></div>
        <div className="space-y-2"><Label htmlFor="birth_date">Date of birth</Label><Input id="birth_date" name="birth_date" type="date" autoComplete="bday" required min="1900-01-02" max={new Date().toISOString().slice(0, 10)} /></div>
        <div className="space-y-2"><Label htmlFor="timezone">Timezone</Label><Input id="timezone" name="timezone" defaultValue='Africa/Lusaka' required maxLength={100} /></div>
        <div className="space-y-2"><Label htmlFor="account_type">Account purposes</Label><PurposeSelector selected={purposes} onChange={setPurposes}/><RelevantOnboardingFields selected={purposes}/><div className='hidden'><Label>Legacy account type</Label><select id="account_type" name="account_type" className="h-11 w-full rounded-sm border bg-background px-3"><option value="student">Student / horse owner</option><option value="guardian">Parent / guardian (18+)</option></select></div></div>
        <p className="text-xs leading-6 text-muted-foreground">Your profile stays private. Invitation codes create approval requests only. Coach access requires Founder approval, and minors require verified guardian consent.</p>
        <Button className="h-12 w-full rounded-sm">Continue to account details</Button>
      </form> : mode === 'sign-up' && details ? <form onSubmit={register} className='space-y-5'>
        {!registrationComplete && <div className='text-sm'><p>Registering {details.full_name} for {details.account_purposes.map(value=>value.replace(/_/g,' ')).join(', ')}.</p><Button type='button' variant='link' className='px-0' onClick={() => setDetails(null)}>Change details</Button></div>}
        <div className='space-y-2'><Label htmlFor='registration_email'>Email address</Label><Input id='registration_email' name='email' type='email' autoComplete='email' required disabled={busy || registrationComplete} /></div>
        <div className='space-y-2'><Label htmlFor='registration_password'>Password</Label><Input id='registration_password' name='password' type='password' autoComplete='new-password' required minLength={12} disabled={busy || registrationComplete} /></div>
        <div className='space-y-2'><Label htmlFor='registration_password_confirmation'>Confirm password</Label><Input id='registration_password_confirmation' name='password_confirmation' type='password' autoComplete='new-password' required minLength={12} disabled={busy || registrationComplete} /></div>
        <label className='flex min-h-11 cursor-pointer items-start gap-3 text-sm'><input type='checkbox' checked={staySignedIn} onChange={event=>setStaySignedIn(event.target.checked)} className='mt-0.5 size-4 accent-[#2F4A3C]' disabled={busy || registrationComplete}/><span>Stay signed in on this device<span className='mt-1 block text-xs leading-5 text-muted-foreground'>If email verification is required, your session begins only after successful verification.</span></span></label>
        <Button className='h-12 w-full rounded-sm' disabled={busy || registrationCooldown || registrationComplete}>{registrationComplete ? 'Registration received' : registrationCooldown ? 'Please try again later' : busy ? 'Creating account…' : 'Create account'}</Button>
      </form> : mode === "sign-in" ? <SignInForm/> : mode === "update-password" && !session ? <p className="text-sm leading-7">Open the recovery link from your email, or <Link to="/password-reset" className="underline">request a new link</Link>.</p> : <>
        {details && <div className="mb-5 text-sm"><p>Registering {details.full_name} as a {details.account_type}.</p><Button variant="link" className="px-0" onClick={() => setDetails(null)}>Change details</Button></div>}
        <div onSubmitCapture={(event) => {
          if (mode !== "sign-up" && mode !== "update-password") return;
          const password = new FormData(event.target as HTMLFormElement).get("password");
          if (typeof password === "string" && password.length < 12) {
            event.preventDefault(); event.stopPropagation(); setMessage("Use a password of at least 12 characters.");
          }
        }}>
          <Auth supabaseClient={db()} providers={[]} theme="light" showLinks={false}
            view={mode === "sign-up" ? "sign_up" : mode === "password-reset" ? "forgotten_password" : mode === "update-password" ? "update_password" : "sign_in"}
            redirectTo={window.location.origin + (mode === "password-reset" ? "/update-password" : "/dashboard")}
            additionalData={details ?? undefined}
            appearance={{ theme: ThemeSupa, variables: { default: { colors: { brand: "#304b3f", brandAccent: "#243c31", inputBackground: "#f7f3e9", inputText: "#304b3f", inputLabelText: "#304b3f" }, radii: { borderRadiusButton: "2px", buttonBorderRadius: "2px", inputBorderRadius: "2px" } } } }}
          />
        </div>
        {mode === "sign-up" && <p className="mt-4 text-xs leading-6 text-muted-foreground">After registration, check your inbox for an email verification link when confirmation is required.</p>}
      </>}
      <div className="mt-6 space-y-3 border-t border-primary/15 pt-5 text-sm">
        {mode === "sign-in" && <><Link to="/password-reset" className="text-link block w-fit text-xs">Forgot your password?</Link><Link to="/sign-up" className="text-link block w-fit text-xs">Create an account</Link>
          <details className="text-xs"><summary className="cursor-pointer py-3">Resend verification email</summary><form className="space-y-3" onSubmit={resend}><Label htmlFor="verification_email">Email address</Label><Input id="verification_email" name="verification_email" type="email" required /><Button disabled={busy} variant="outline">{busy ? "Sending…" : "Resend verification"}</Button></form></details></>}
        {mode !== "sign-in" && <Link to={session ? "/dashboard" : "/sign-in"} className="text-link">{session ? "Return to dashboard" : "Back to sign in"}</Link>}
      </div>
    </div>
  </section>;
}
