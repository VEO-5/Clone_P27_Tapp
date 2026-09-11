import { z } from "zod";

// Framework-agnostic port of apps/web QueueFilters param logic
// (readQueueParams / queueQueryString / DEFAULTS). No router imports —
// pure functions, unit-tested for parity in queue-params.test.ts.
//
// TanStack wiring: desk.queue route declares `validateSearch` from
// queueSearchSchema below; components read typed values via useSearch and
// write via navigate({ search }). The Next `pendingRef` mirror machinery is
// deliberately NOT ported: TanStack search updates are synchronous, so rapid
// successive changes build on committed state, not on a stale URL.

export const queueTabSchema = z.enum(["unassigned", "mine", "all", "by-agent"]);
export type QueueTab = z.infer<typeof queueTabSchema>;

export interface QueueParams {
  tab: QueueTab;
  assigneeId: string;
  status: string;
  priority: string;
  categoryId: string;
  q: string;
  sort: string;
}

export const QUEUE_DEFAULTS: QueueParams = {
  tab: "mine",
  assigneeId: "",
  status: "",
  priority: "",
  categoryId: "",
  q: "",
  sort: "newest",
};

/** Permissive raw-input schema for validateSearch. Invalid `tab` falls back
 *  to "mine" (same as the Next reader); unknown extra keys are stripped. */
export const queueSearchSchema = z.object({
  tab: queueTabSchema.catch(QUEUE_DEFAULTS.tab),
  assigneeId: z.string().catch(""),
  status: z.string().catch(""),
  priority: z.string().catch(""),
  categoryId: z.string().catch(""),
  q: z.string().catch(""),
  sort: z.string().catch(QUEUE_DEFAULTS.sort),
});

function isQueueTab(value: string): value is QueueTab {
  return value === "unassigned" || value === "mine" || value === "all" || value === "by-agent";
}

/** Exact port of readQueueParams(search: URLSearchParams). */
export function readQueueParams(search: URLSearchParams): QueueParams {
  const tab = search.get("tab");
  return {
    tab: tab !== null && isQueueTab(tab) ? tab : QUEUE_DEFAULTS.tab,
    assigneeId: search.get("assigneeId") ?? "",
    status: search.get("status") ?? "",
    priority: search.get("priority") ?? "",
    categoryId: search.get("categoryId") ?? "",
    q: search.get("q") ?? "",
    sort: search.get("sort") ?? QUEUE_DEFAULTS.sort,
  };
}

/** Normalize already-parsed search (e.g. TanStack validateSearch output) to
 *  QueueParams with identical semantics to readQueueParams. */
export function normalizeQueueParams(input: Partial<Record<keyof QueueParams, unknown>>): QueueParams {
  const rawTab = typeof input.tab === "string" ? input.tab : "";
  const str = (value: unknown, fallback: string): string =>
    typeof value === "string" ? value : fallback;
  return {
    tab: isQueueTab(rawTab) ? rawTab : QUEUE_DEFAULTS.tab,
    assigneeId: str(input.assigneeId, ""),
    status: str(input.status, ""),
    priority: str(input.priority, ""),
    categoryId: str(input.categoryId, ""),
    q: str(input.q, ""),
    sort: str(input.sort, QUEUE_DEFAULTS.sort),
  };
}

/** Exact port of queueQueryString(params). Tab always present; assigneeId
 *  only when tab is by-agent; other keys only when non-default. */
export function queueQueryString(params: QueueParams): string {
  const search = new URLSearchParams();
  search.set("tab", params.tab);
  if (params.tab === "by-agent" && params.assigneeId) search.set("assigneeId", params.assigneeId);
  for (const key of ["status", "priority", "categoryId", "q", "sort"] as const) {
    if (params[key] && params[key] !== QUEUE_DEFAULTS[key]) search.set(key, params[key]);
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

/** Admins have no Mine tab — bounce to All (port of the QueueFilters effect). */
export function coerceTabForRole(params: QueueParams, isAdmin: boolean): QueueParams {
  if (isAdmin && params.tab === "mine") return { ...params, tab: "all" };
  return params;
}
