import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/contexts/SessionContext";
import { useRows } from '@/hooks/use-academy';
import { errorText, rpc } from "@/lib/academy";

export function MemberNavigation({ mobile = false, sidebar = false, onSignIn }: { mobile?: boolean; sidebar?: boolean; onSignIn?: () => void }) {
  const { session, profile, refreshProfile, signOut } = useSession(); const navigate = useNavigate(); const roles=useRows('hka_account_roles',{},Boolean(session)); const authorised=(roles.data??[]).filter(row=>row.status==='authorized');
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function logout() {
    setError(""); setBusy(true);
    try { await signOut(); navigate('/', { replace: true }); } catch (failure) { setError(errorText(failure)); } finally { setBusy(false); }
  }
  async function switchDashboard(purpose:string){setError('');setBusy(true);try{const path=await rpc('hka_switch_dashboard',{requested_purpose:purpose});await refreshProfile();navigate(String(path),{replace:true});}catch(failure){setError(errorText(failure));}finally{setBusy(false);}}
  return <div className={sidebar ? "grid gap-3" : mobile ? "mt-3 flex flex-col gap-3 border-t pt-4" : "flex flex-wrap items-center gap-4"}>
    {sidebar && session ? <div className="min-w-0"><p className="truncate text-sm font-medium text-[#F6F1E7]">{profile?.full_name}</p><p className="text-[10px] capitalize text-[#F6F1E7]/65">{profile?.role}</p></div> : <Link to={session ? "/dashboard" : "/sign-in"} className="py-3 text-[13px] font-medium hover:underline">{session ? "My dashboard" : "Sign in"}</Link>}
    {session&&<Link to='/dashboard/account' className={sidebar?'text-xs text-[#F6F1E7] underline underline-offset-4':'text-xs underline underline-offset-4'}>Account settings</Link>}
    {session&&authorised.length>1&&<details className='relative'><summary className={'cursor-pointer list-none rounded-sm border px-3 py-2 text-sm '+(sidebar?'border-[#F6F1E7]/30 text-[#F6F1E7]':'border-primary/20')}>Switch Dashboard</summary><div className={'z-50 mt-2 grid min-w-52 gap-1 rounded-sm border p-2 shadow-lg '+(sidebar?'bg-[#2F4A3C]':'bg-background')}>{authorised.map(row=><button key={row.id} type='button' className='rounded-sm px-3 py-2 text-left text-sm hover:bg-primary/10' onClick={()=>void switchDashboard(String(row.purpose))}>{String(row.purpose).replace(/_/g,' ')}</button>)}</div></details>}
    {session ? <Button variant={sidebar ? "secondary" : "outline"} className={sidebar ? "w-full justify-center rounded-sm" : "rounded-sm"} disabled={busy} onClick={() => void logout()}>{busy ? "Signing out…" : "Sign out"}</Button>
      : <Button asChild className="h-11 rounded-sm px-5 text-xs"><Link to="/sign-up">Join the academy <ArrowUpRight aria-hidden="true" /></Link></Button>}
    {error && <p className="w-full text-xs text-destructive" role="alert">{error}</p>}
  </div>;
}
