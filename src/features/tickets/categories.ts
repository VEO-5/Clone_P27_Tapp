import { useQuery } from "@tanstack/react-query";
import type { Category } from "@pearl27/contracts";

import { apiFetch } from "@/lib/api";

/**
 * Single source of truth for category id -> display name on the client.
 *
 * Before: three disconnected copies — this static map (used by every ticket
 * label), a second static map inside the mock dashboard aggregate (sidebar +
 * board filters), and the live store behind /categories. Admin renames and
 * removes updated only the store, so nothing else in the app ever synced.
 *
 * Now: `useCategories()` caches GET /categories under ["categories"];
 * `CategoryManager` invalidates that key (plus the desk dashboard) on every
 * create/rename/remove, and every label resolves through `useCategoryName()`.
 * The static map below survives only as instant first paint + offline
 * fallback (placeholderData) and as a graceful label for tickets orphaned
 * by a category removal.
 */

export interface CategoryOption {
  id: string;
  name: string;
}

/** Seed names: instant first paint + offline fallback. Live data wins. */
export const FALLBACK_CATEGORIES: CategoryOption[] = [
  { id: "account_access", name: "Sphere account access" },
  { id: "sphere_app", name: "Sphere app issue" },
  { id: "hardware", name: "Hardware / device" },
  { id: "network", name: "Network / VPN" },
  { id: "email", name: "Email / calendar" },
  { id: "other", name: "Something else" },
];

export const CATEGORY_NAMES: Record<string, string> = Object.fromEntries(
  FALLBACK_CATEGORIES.map((c) => [c.id, c.name]),
);

/** Sync fallback for non-component contexts. Prefer `useCategoryName`. */
export function categoryName(id?: string): string {
  if (!id) return "—";
  return CATEGORY_NAMES[id] ?? id;
}

export const categoriesQueryKey = ["categories"] as const;

export function useCategories() {
  return useQuery({
    queryKey: categoriesQueryKey,
    queryFn: () => apiFetch<Category[]>("/categories"),
    staleTime: 60_000,
    placeholderData: FALLBACK_CATEGORIES as Category[],
  });
}

/**
 * Resolve a category id to its current display name.
 * Live store -> seed fallback (covers removed ids + offline) -> raw id.
 */
export function useCategoryName(categoryId?: string): string {
  const { data } = useCategories();
  if (!categoryId) return "—";
  return data?.find((c) => c.id === categoryId)?.name ?? CATEGORY_NAMES[categoryId] ?? categoryId;
}
