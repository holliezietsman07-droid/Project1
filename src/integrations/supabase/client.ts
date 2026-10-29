import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createAuthStorage, setAuthPersistence } from "@/lib/auth-storage";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";

let supabaseClient: SupabaseClient | null = null;

function authStorageKey() {
  return 'sb-' + new URL(supabaseUrl).hostname.split('.')[0] + '-auth-token';
}

export function setSessionPersistence(staySignedIn: boolean) {
  setAuthPersistence(staySignedIn, authStorageKey(), window.localStorage, window.sessionStorage);
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getSupabaseConfigError() {
  if (isSupabaseConfigured()) {
    return null;
  }

  return "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your app environment.";
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(getSupabaseConfigError() ?? "Supabase is not configured.");
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { storageKey: authStorageKey(), storage: createAuthStorage(window.localStorage, window.sessionStorage) },
    });
  }

  return supabaseClient;
}
