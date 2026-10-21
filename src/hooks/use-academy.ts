import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/contexts/SessionContext";
import { listRows } from "@/lib/academy";

export function useRows(table: string, filters: Record<string, string> = {}) {
  const { session } = useSession();
  return useQuery({
    queryKey: ["academy", session?.user.id, table, filters],
    queryFn: () => listRows(table, filters),
    enabled: Boolean(session),
    retry: 1,
    refetchOnWindowFocus: true,
  });
}
export function useRefreshAcademy() {
  const cache = useQueryClient();
  return () => cache.invalidateQueries({ queryKey: ["academy"] });
}
