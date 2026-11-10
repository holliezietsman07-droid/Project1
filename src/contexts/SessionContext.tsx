import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { db, errorText, type Profile } from "@/lib/academy";

type SessionState = {
  session: Session | null; profile: Profile | null; loading: boolean; error: string;
  recovery: boolean; signingOut: boolean; welcomeUserId: string | null; beginSignIn: () => void; refreshProfile: () => Promise<void>; signOut: () => Promise<void>;
};
const SessionContext = createContext<SessionState | null>(null);

export function SessionContextProvider({ children }: { children: ReactNode }) {
  const cache = useQueryClient();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [welcomeUserId, setWelcomeUserId] = useState<string | null>(null);
  const generation = useRef(0);
  const userId = useRef<string | null>(null);
  const welcomeRequested = useRef(false);

  const fetchProfile = useCallback(async (id: string) => {
    if (id !== userId.current) return;
    const version = ++generation.current;
    const { data, error: failure } = await db().from("hka_profiles").select("*").eq("id", id).single();
    if (version !== generation.current || id !== userId.current) return;
    setProfile(failure ? null : data as Profile);
    setError(failure ? errorText(failure) : "");
    setLoading(false);
  }, []);

  useEffect(() => {
    let live = true;
    const { data: { subscription } } = db().auth.onAuthStateChange((event, current) => {
      if (!live) return;
      const accountChanged = (current?.user.id ?? null) !== userId.current;
      if (accountChanged) {
        generation.current++;
        cache.clear();
        setProfile(null);
        userId.current = current?.user.id ?? null;
      }
      setSession(current);
      if (!current) { setWelcomeUserId(null); welcomeRequested.current = false; }
      else if (event === "SIGNED_IN" && accountChanged && welcomeRequested.current) {
        setWelcomeUserId(current.user.id);
        welcomeRequested.current = false;
      }
      if (event === "SIGNED_OUT") setSigningOut(true);
      else if (current) setSigningOut(false);
      setError("");
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (!current) {
        setProfile(null); setLoading(false); setRecovery(false);
        if (event === "SIGNED_OUT") navigateRef.current("/", { replace: true, state: null });
      } else {
        if (accountChanged || event === "INITIAL_SESSION") setLoading(true);
        // Keep Supabase calls outside the auth callback's internal lock.
        window.setTimeout(() => { if (live) void fetchProfile(current.user.id); }, 0);
      }
    });
    return () => { live = false; generation.current++; subscription.unsubscribe(); };
  }, [cache, fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (session) await fetchProfile(session.user.id);
  }, [session, fetchProfile]);

  const beginSignIn = useCallback(() => { welcomeRequested.current = true; }, []);

  const signOut = useCallback(async () => {
    setSigningOut(true);
    const { error: failure } = await db().auth.signOut();
    if (failure) { setSigningOut(false); throw failure; }
    generation.current++; userId.current = null;
    cache.clear(); setSession(null); setProfile(null); setLoading(false); setError(""); setRecovery(false);
    navigateRef.current("/", { replace: true, state: null });
  }, [cache]);

  return <SessionContext.Provider value={{ session, profile, loading, error, recovery, signingOut, welcomeUserId, beginSignIn, refreshProfile, signOut }}>{children}</SessionContext.Provider>;
}
export function FitnessPreviewSessionProvider({ children }: { children: ReactNode }) {
  // No hosted auth subscription or account is created for fictional fitness data.
  const value: SessionState = {
    session: null, profile: null, loading: false, error: '', recovery: false,
    signingOut: false, welcomeUserId: null, beginSignIn: () => {},
    refreshProfile: async () => {}, signOut: async () => {},
  };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("SessionContextProvider is required.");
  return context;
}
