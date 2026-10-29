import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { db, errorText, type Profile } from "@/lib/academy";

type SessionState = {
  session: Session | null; profile: Profile | null; loading: boolean; error: string;
  recovery: boolean; refreshProfile: () => Promise<void>; signOut: () => Promise<void>;
};
const SessionContext = createContext<SessionState | null>(null);

export function SessionContextProvider({ children }: { children: ReactNode }) {
  const cache = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recovery, setRecovery] = useState(false);
  const generation = useRef(0);
  const userId = useRef<string | null>(null);

  const fetchProfile = useCallback(async (id: string) => {
    const version = ++generation.current;
    const { data, error: failure } = await db().from("hka_profiles").select("*").eq("id", id).single();
    if (version !== generation.current) return;
    setProfile(failure ? null : data as Profile);
    setError(failure ? errorText(failure) : "");
    setLoading(false);
  }, []);

  useEffect(() => {
    let live = true;
    const { data: { subscription } } = db().auth.onAuthStateChange((event, current) => {
      if (!live) return;
      if (current?.user.id !== userId.current) {
        generation.current++;
        cache.clear();
        setProfile(null);
        userId.current = current?.user.id ?? null;
      }
      setSession(current);
      setError("");
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (!current) {
        setProfile(null); setLoading(false); setRecovery(false);
      } else {
        setLoading(true);
        // Keep Supabase calls outside the auth callback's internal lock.
        window.setTimeout(() => { if (live) void fetchProfile(current.user.id); }, 0);
      }
    });
    return () => { live = false; generation.current++; subscription.unsubscribe(); };
  }, [cache, fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (session) await fetchProfile(session.user.id);
  }, [session, fetchProfile]);

  const signOut = useCallback(async () => {
    const { error: failure } = await db().auth.signOut();
    if (failure) throw failure;
    generation.current++; userId.current = null;
    cache.clear(); setSession(null); setProfile(null); setError(""); setRecovery(false);
  }, [cache]);

  return <SessionContext.Provider value={{ session, profile, loading, error, recovery, refreshProfile, signOut }}>{children}</SessionContext.Provider>;
}
export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("SessionContextProvider is required.");
  return context;
}
