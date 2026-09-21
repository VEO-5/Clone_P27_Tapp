import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import type { Profile } from "@/lib/contracts.vendored";

import { ApiError, apiFetch } from "@/lib/api";
import { config } from "@/lib/config";
import { queryKeys } from "@/lib/query";

import { mockSignOut } from "./mockSession";
import { liveSignOut } from "./liveSession";

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
 * Mock branch restored: mockSignOut awaits the MSW worker (wired via
 * MockProvider when VITE_API_MOCK=true) — same comment as the original:
 * navigating on a live session is how sign-out "unsticks".
 * Live branch: InsForge signOut clears the stored session.
 */
export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useCallback(async () => {
    try {
      if (config.insforgeLive) {
        await liveSignOut();
      } else {
        await apiFetch<void>("/auth/logout", { method: "POST" });
      }
    } catch {
      // Clearing local state matters more than the server round-trip.
    } finally {
      if (config.apiMock) {
        // Confirm the worker forgot the session BEFORE touching local
        // state — navigating on a live session is how sign-out "unsticks".
        await mockSignOut();
      }
      queryClient.clear();
      await navigate({ to: "/sign-in", search: { next: "/" } });
      // No router.refresh() equivalent: the SPA has no server components to
      // revalidate; cache clear + navigation is the full reset.
    }
  }, [queryClient, navigate]);
}
