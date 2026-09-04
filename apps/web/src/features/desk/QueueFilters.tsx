"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Assignee, DeskTab } from "@pearl27/contracts";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";

export interface QueueParams {
  tab: DeskTab;
  assigneeId: string;
  status: string;
  priority: string;
  categoryId: string;
  q: string;
  sort: string;
}

const DEFAULTS: QueueParams = {
  tab: "mine",
  assigneeId: "",
  status: "",
  priority: "",
  categoryId: "",
  q: "",
  sort: "newest",
};

export function readQueueParams(search: URLSearchParams): QueueParams {
  const tab = search.get("tab");
  return {
    tab: tab === "unassigned" || tab === "mine" || tab === "all" || tab === "by-agent" ? tab : "mine",
    assigneeId: search.get("assigneeId") ?? "",
    status: search.get("status") ?? "",
    priority: search.get("priority") ?? "",
    categoryId: search.get("categoryId") ?? "",
    q: search.get("q") ?? "",
    sort: search.get("sort") ?? "newest",
  };
}

export function queueQueryString(params: QueueParams): string {
  const search = new URLSearchParams();
  search.set("tab", params.tab);
  if (params.tab === "by-agent" && params.assigneeId) search.set("assigneeId", params.assigneeId);
  for (const key of ["status", "priority", "categoryId", "q", "sort"] as const) {
    if (params[key] && params[key] !== DEFAULTS[key]) search.set(key, params[key]);
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

/** Tabs + filters. URL is the source of truth (FE-3.4); search debounced 300ms. */
export function QueueFilters({ agents }: { agents: Assignee[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = readQueueParams(searchParams);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Debounce timer lives in a ref — no effects, no cascading renders.
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest intent mirror: router.replace commits asynchronously, so rapid
  // successive changes (status → priority → search) must build on each
  // other, not on the last committed URL (FE-3.4).
  const pendingRef = useRef<QueueParams | null>(null);

  // Committed URL caught up — the mirror is redundant (ref write, not state).
  useEffect(() => {
    pendingRef.current = null;
  }, [searchParams]);

  function push(next: QueueParams) {
    pendingRef.current = next;
    router.replace(`/desk/queue${queueQueryString(next)}`, { scroll: false });
  }

  function currentParams(): QueueParams {
    return pendingRef.current ?? readQueueParams(new URLSearchParams(window.location.search));
  }

  function set(patch: Partial<QueueParams>) {
    push({ ...currentParams(), ...patch });
  }

  function onSearchChange(value: string) {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      push({ ...currentParams(), q: value });
    }, 300);
  }

  // Remount the search box when filters change — but never on q itself,
  // or focus would be stolen after every debounced keystroke.
  const searchKey = [params.tab, params.assigneeId, params.status, params.priority, params.categoryId, params.sort].join("|");

  const selectClass =
    "min-h-11 rounded-[2px] border border-ink-600 bg-white px-3 text-sm text-pearl";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={params.tab}
          onValueChange={(value) => set({ tab: value as DeskTab, assigneeId: "" })}
        >
          <TabsList aria-label="Queue tabs">
            <TabsTrigger value="unassigned">Unassigned</TabsTrigger>
            <TabsTrigger value="mine">Mine</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="by-agent">By agent</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          <label htmlFor="queue-search" className="sr-only">
            Search tickets
          </label>
          <input
            id="queue-search"
            key={searchKey}
            type="search"
            placeholder="Search reference, title…"
            defaultValue={params.q}
            onChange={(event) => onSearchChange(event.target.value)}
            className="min-h-11 w-full rounded-[2px] border border-ink-600 bg-white px-3 text-sm text-pearl lg:w-64"
          />
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            className="inline-flex min-h-11 items-center rounded-[2px] border border-ink-600 bg-white px-4 text-sm font-medium text-pearl lg:hidden"
          >
            Filters
          </button>
        </div>
      </div>

      <div className={`${filtersOpen ? "flex" : "hidden"} flex-col gap-2 lg:flex lg:flex-row lg:items-center`}>
        {params.tab === "by-agent" && (
          <>
            <label htmlFor="queue-agent" className="sr-only">
              Agent
            </label>
            <select
              id="queue-agent"
              value={params.assigneeId}
              onChange={(event) => set({ assigneeId: event.target.value })}
              className={selectClass}
            >
              <option value="">Choose an agent</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </>
        )}
        <label htmlFor="queue-status" className="sr-only">
          Status
        </label>
        <select
          id="queue-status"
          value={params.status}
          onChange={(event) => set({ status: event.target.value })}
          className={selectClass}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
        </select>

        <label htmlFor="queue-priority" className="sr-only">
          Priority
        </label>
        <select
          id="queue-priority"
          value={params.priority}
          onChange={(event) => set({ priority: event.target.value })}
          className={selectClass}
        >
          <option value="">All priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>

        <label htmlFor="queue-sort" className="sr-only">
          Sort
        </label>
        <select
          id="queue-sort"
          value={params.sort}
          onChange={(event) => set({ sort: event.target.value })}
          className={selectClass}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="due">Due soonest</option>
        </select>
      </div>
    </div>
  );
}
