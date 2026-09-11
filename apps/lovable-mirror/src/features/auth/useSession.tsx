import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import type { Profile } from "@/lib/contracts.vendored";

import { ApiError, apiFetch } from "@/lib/api";
import { config } from "@/lib/config";
import { queryKeys } from "@/lib/query";

/** Session profile: the API contract plus mock-only flags. */
export interface SessionProfile extends Profile {
  /** True when a deactivated desk/admin account fell back to employee. */
  demoted?: boolean;
}

/** Session query on GET /auth/me, cached for the session. 401 = signed out. */
export function useSession() {
  return useQuery<SessionProfile, ApiError>({
    queryKey: queryKeys.me,
    queryFn: () => apiFetch<Profile>("/auth/me"),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

/**
 * POST /auth/logout, clear the query cache, go to /sign-in.
 * MIRROR note: the mock-session branch (mockSignOut awaiting the MSW worker)
 * is not ported — the mirror has no MSW worker. The real scaffold + backend
 * own the mock story; prod behavior (clear + navigate) is identical.
 */
export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useCallback(async () => {
    try {
      await apiFetch<void>("/auth/logout", { method: "POST" });
    } catch {
      // Clearing local state matters more than the server round-trip.
    } finally {
      if (config.apiMock) {
        // No MSW worker in the mirror — nothing to confirm against.
      }
      queryClient.clear();
      await navigate({ to: "/sign-in", search: { next: "/" } });
      // No router.refresh() equivalent: the SPA has no server components to
      // revalidate; cache clear + navigation is the full reset.
    }
  }, [queryClient, navigate]);
}
