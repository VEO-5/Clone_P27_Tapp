"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import type { Profile } from "@pearl27/contracts";

import { ApiError, apiFetch } from "@/lib/api";
import { config } from "@/lib/config";
import { queryKeys } from "@/lib/query";

import { mockSignOut } from "./mockSession";

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

/** POST /auth/logout, clear the query cache, go to /sign-in. */
export function useSignOut() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useCallback(async () => {
    try {
      await apiFetch<void>("/auth/logout", { method: "POST" });
    } catch {
      // Clearing local state matters more than the server round-trip.
    } finally {
      if (config.apiMock) {
        // Confirm the worker forgot the session BEFORE touching local
        // state — navigating on a live session is how sign-out "unsticks".
        await mockSignOut();
      }
      queryClient.clear();
      router.push("/sign-in");
      router.refresh();
    }
  }, [queryClient, router]);
}
