import { getSupabaseClient } from "@/integrations/supabase/client";
import { AuthApiError } from "@supabase/supabase-js";

export type Role = "student" | "guardian" | "coach" | "admin";
export type Profile = {
  id: string; full_name: string; birth_date: string; timezone: string; role: Role;
  suspended: boolean; avatar_path: string | null;
};
export type Row = { id: string; [key: string]: string | number | boolean | null };
export const db = getSupabaseClient;
export const value = (row: Row, key: string) => String(row[key] ?? "");
export const isMinor = (birth: string) => {
  const today = new Date();
  const cutoff = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  return new Date(birth + "T00:00:00") > cutoff;
};
export function errorText(error: unknown) {
  if (error instanceof AuthApiError) {
    if (error.code === "invalid_credentials") return "Email or password is incorrect.";
    if (error.code === "email_not_confirmed") return "Please verify your email before signing in.";
    if (error.status === 429) return "Too many attempts. Please wait before trying again.";
    return error.message;
  }
  if (error && typeof error === "object" && "message" in error) return String(error.message);
  return "We could not complete that request. Please try again.";
}
export async function listRows(table: string, filters: Record<string, string> = {}) {
  let query = db().from(table).select("*");
  for (const [key, filter] of Object.entries(filters)) query = query.eq(key, filter);
  const { data, error } = await query.order("id");
  if (error) throw error;
  return (data ?? []) as Row[];
}
export async function saveRow(table: string, changes: Record<string, unknown>, id?: string) {
  const query = id ? db().from(table).update(changes).eq("id", id) : db().from(table).insert(changes);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data as Row;
}
export async function removeRow(table: string, id: string) {
  const { error } = await db().from(table).delete().eq("id", id).select("id").single();
  if (error) throw error;
}
export async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await db().rpc(name, args);
  if (error) throw error;
  return data;
}
export function displayDate(date: string, timezone?: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: timezone || undefined }).format(new Date(date));
}
