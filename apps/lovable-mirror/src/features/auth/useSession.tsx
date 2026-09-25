import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { Profile } from "@/lib/contracts.vendored";

import { ApiError, apiFetch } from "@/lib/api";
import { config } from "@/lib/config";
import { insforge } from "@/lib/insforge";
import { queryKeys } from "@/lib/query";
import { waitForAuthHydration } from "@/lib/session-persist";

import { mockSignOut } from "./mockSession";
import { liveSignOut } from "./liveSession";

/** Session profile: the API contract plus mock-only flags. */
export interface SessionProfile extends Profile {
  /** True when a deactivated desk/admin account fell back to employee. */
  demoted?: boolean;
}

/**
 * Session query on GET /auth/me, cached for the session. 401 = signed out.
 *
 * Live mode waits for auth hydration first: on a cold load the SDK session
 * starts empty and may need a silent refresh round-trip. Firing /auth/me
 * before that settles produces a false 401 and RoleGate bounces to
 * /sign-in — the reload-signout bug. While hydrating, the query stays
 * pending (RoleGate renders its skeleton, never a redirect).
 *
 * A single 401 still doesn't mean signed out: the persisted token may have
 * expired while a silent refresh was in flight (the refresh-race bounce —
 * sign-in flashing on reload). So on a first-attempt 401 in live mode, the
 * query forces one silent-refresh attempt and retries /auth/me exactly
 * once. Only a second 401 (or a non-401 error) settles as an error and
 * lets RoleGate redirect. Genuine sign-outs bounce one beat later;
 * refresh races heal with no page flash.
 */
async function fetchSessionProfile(): Promise<Profile> {
  try {
    return await apiFetch<Profile>("/auth/me");
  } catch (error) {
    if (!config.insforgeLive || !(error instanceof ApiError) || error.status !== 401) {
      throw error;
    }
    // One silent-refresh attempt: resolves a fresh token when the refresh
    // completed just after the first call went out.
    try {
      await insforge.getHttpClient().getValidAccessToken();
    } catch {
      throw error;
    }
    return apiFetch<Profile>("/auth/me");
  }
}
export function useSession() {
  const [hydrated, setHydrated] = useState(!config.insforgeLive);
  useEffect(() => {
    if (!config.insforgeLive) return;
    let cancelled = false;
    void waitForAuthHydration().then(() => {
      if (!cancelled) setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return useQuery<SessionProfile, ApiError>({
    queryKey: queryKeys.me,
    queryFn: fetchSessionProfile,
    enabled: hydrated,
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
