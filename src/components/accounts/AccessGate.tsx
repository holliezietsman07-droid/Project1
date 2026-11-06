import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/academy";

export function AccessGate({ roles }: { roles?: Role[] }) {
  const { session, profile, loading, error, refreshProfile } = useSession();
  const location = useLocation();
  if (loading) return <p className="page-width py-16" role="status">Opening your member space…</p>;
  if (!session) return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  if (error || !profile) return <div className="page-width py-16"><h1 className="section-heading">Member profile unavailable</h1><p className="my-5" role="alert">{error || "Your profile could not be loaded."}</p><Button onClick={() => void refreshProfile()}>Try again</Button></div>;
  if (profile.suspended) return <div className="page-width py-16"><h1 className="section-heading">Account access paused</h1><p className="mt-6">Contact the academy to review your account access.</p></div>;
  if (roles && !roles.includes(profile.role)) return <div className="page-width py-16"><h1 className="section-heading">Access restricted</h1><p className="mt-6">This area is available only to authorised academy staff.</p></div>;
  return <Outlet />;
}
