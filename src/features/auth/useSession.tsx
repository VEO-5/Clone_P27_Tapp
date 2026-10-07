import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { Profile } from "@/lib/contracts.vendored";

import { ApiError, apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query";
import { supabase } from "@/lib/supabase";

import { signOutEverywhere } from "./supabase-auth";

/** Session profile: the API contract plus client-side flags. */
export interface SessionProfile extends Profile {
  /** True when a deactivated desk/admin account fell back to employee. */
  demoted?: boolean;
}

/**
 * Session query on GET /auth/me, cached for the session. 401 = signed out.
 *
 * Supabase holds the session (persisted + auto-refreshed by the SDK). The
 * query waits for the SDK to settle first: on a cold load the stored session
 * may need a silent refresh round-trip, and firing /auth/me before that
 * settles produces a false 401 that bounces to /sign-in. While hydrating,
 * the query stays pending (RoleGate renders its skeleton, never a redirect).
 */
async function fetchSessionProfile(): Promise<Profile> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    throw new ApiError(401, "UNAUTHENTICATED", "Sign in again to continue.");
  }
  return apiFetch<Profile>("/auth/me");
}

export function useSession() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const settle = () => {
      if (!cancelled) setHydrated(true);
    };
    void supabase.auth.getSession().finally(settle);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(settle);
    return () => {
      cancelled = true;
      subscription.unsubscribe();
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

/** Sign out everywhere (Supabase + server), clear cache, go to /sign-in. */
export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useCallback(async () => {
    try {
      await signOutEverywhere();
    } catch {
      // Clearing local state matters more than the server round-trip.
    } finally {
      queryClient.clear();
      await navigate({ to: "/sign-in", search: { next: "/" } });
      // No router.refresh() equivalent: the SPA has no server components to
      // revalidate; cache clear + navigation is the full reset.
    }
  }, [queryClient, navigate]);
}
