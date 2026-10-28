import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/contexts/SessionContext";
import { errorText } from "@/lib/academy";

export function MemberNavigation({ mobile = false, onSignIn }: { mobile?: boolean; onSignIn?: () => void }) {
  const { session, signOut } = useSession(); const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function logout() {
    setError(""); setBusy(true);
    try { await signOut(); navigate('/', { replace: true }); } catch (failure) { setError(errorText(failure)); } finally { setBusy(false); }
  }
  return <div className={mobile ? "mt-3 flex flex-col gap-3 border-t pt-4" : "flex flex-wrap items-center gap-4"}>
    <Link to={session ? "/dashboard" : "/sign-in"} className="py-3 text-[13px] font-medium hover:underline">{session ? "My dashboard" : "Sign in"}</Link>
    {session ? <Button variant="outline" className="rounded-sm" disabled={busy} onClick={() => void logout()}>{busy ? "Signing out…" : "Sign out"}</Button>
      : <Button asChild className="h-11 rounded-sm px-5 text-xs"><Link to="/sign-up">Join the academy <ArrowUpRight aria-hidden="true" /></Link></Button>}
    {error && <p className="w-full text-xs text-destructive" role="alert">{error}</p>}
  </div>;
}
