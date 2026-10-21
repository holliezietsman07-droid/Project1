import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/contexts/SessionContext";
import { db, errorText, isMinor } from "@/lib/academy";

type AccountMode = "sign-in" | "sign-up" | "password-reset" | "update-password";
const screens = {
  "sign-in": { eyebrow: "Your place in the academy", title: "Welcome back.", description: "A thoughtful space for your learning journey." },
  "sign-up": { eyebrow: "Every journey has a beginning", title: "Find your place.", description: "For riders, horse owners and curious minds." },
  "password-reset": { eyebrow: "A little help along the way", title: "Reset your password.", description: "We will send a secure recovery link to your email." },
  "update-password": { eyebrow: "Your account, protected", title: "Choose a new password.", description: "Use a unique password of at least 12 characters." },
};
export default function AccountPage({ mode }: { mode: AccountMode }) {
  const { session, loading, recovery } = useSession();
  const location = useLocation();
  const [details, setDetails] = useState<{ full_name: string; birth_date: string; timezone: string; account_type: string } | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const screen = screens[mode];
  if (recovery && mode !== "update-password") return <Navigate to="/update-password" replace />;
  if (!loading && session && (mode === "sign-in" || mode === "sign-up")) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from?.startsWith("/") && !from.startsWith("//") ? from : "/dashboard"} replace />;
  }
  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const birth = String(data.get("birth_date"));
    const role = String(data.get("account_type"));
    if (role === "guardian" && isMinor(birth)) { setMessage("A parent or guardian account requires an adult aged 18 or over."); return; }
    setMessage("");
    setDetails({ full_name: String(data.get("full_name")).trim(), birth_date: birth, timezone: String(data.get("timezone")).trim(), account_type: role });
  }
  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const email = String(new FormData(event.currentTarget).get("verification_email"));
    try {
      const { error } = await db().auth.resend({ type: "signup", email, options: { emailRedirectTo: window.location.origin + "/dashboard" } });
      if (error) throw error;
      setMessage("If verification is available for this address, check your inbox.");
    } catch (error) { setMessage(errorText(error)); } finally { setBusy(false); }
  }
  return <section className="page-width grid gap-10 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:py-20">
    <div className="max-w-md lg:pt-10">
      <p className="eyebrow mb-5 text-[#76633e]">{screen.eyebrow}</p>
      <h1 className="section-heading text-[2.75rem] sm:text-[3.5rem]">{screen.title}</h1>
      <p className="mt-5 text-sm leading-7 text-muted-foreground">{screen.description}</p>
      <div className="my-8 h-px w-16 bg-[#B79B62]" />
      <p className="font-serif text-2xl leading-relaxed">Rooted in Horsemanship.<br /><span className="italic">Inspired by Learning.</span></p>
      <Link to="/learning-pathways" className="text-link mt-6">Explore while you’re here <ArrowUpRight aria-hidden="true" className="size-4" /></Link>
    </div>
    <div className="paper-card w-full max-w-[560px] p-6 sm:p-9">
      <h2 className="mb-6 font-serif text-2xl">{mode === "sign-up" ? "Join HKA Equestrian" : mode === "sign-in" ? "Member sign in" : "Password management"}</h2>
      {message && <p role="status" className="mb-5 border-l-2 border-primary p-3 text-sm">{message}</p>}
      {mode === "sign-up" && !details ? <form onSubmit={prepare} className="space-y-5">
        <div className="space-y-2"><Label htmlFor="full_name">Full name</Label><Input id="full_name" name="full_name" autoComplete="name" required maxLength={100} /></div>
        <div className="space-y-2"><Label htmlFor="birth_date">Date of birth</Label><Input id="birth_date" name="birth_date" type="date" autoComplete="bday" required min="1900-01-02" max={new Date().toISOString().slice(0, 10)} /></div>
        <div className="space-y-2"><Label htmlFor="timezone">Timezone</Label><Input id="timezone" name="timezone" defaultValue={Intl.DateTimeFormat().resolvedOptions().timeZone} required maxLength={100} /></div>
        <div className="space-y-2"><Label htmlFor="account_type">Account type</Label><select id="account_type" name="account_type" className="h-11 w-full rounded-sm border bg-background px-3"><option value="student">Student / horse owner</option><option value="guardian">Parent / guardian (18+)</option></select></div>
        <p className="text-xs leading-6 text-muted-foreground">Your profile stays private. Students under 18 need a guardian relationship verified by the academy and accepted by their guardian before accessing lessons or uploading files. Coach and administrator roles are assigned by authorised administrators.</p>
        <Button className="h-12 w-full rounded-sm">Continue to account details</Button>
      </form> : mode === "update-password" && !session ? <p className="text-sm leading-7">Open the recovery link from your email, or <Link to="/password-reset" className="underline">request a new link</Link>.</p> : <>
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
