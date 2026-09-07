"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Assignee, DeskTab } from "@pearl27/contracts";

import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/shadcn/tabs";

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
export function QueueFilters({ agents, isAdmin = false }: { agents: Assignee[]; isAdmin?: boolean }) {
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

  // Admins have no Mine tab — bounce them to All so URL, tabs, and data agree.
  useEffect(() => {
    if (!isAdmin || params.tab !== "mine") return;
    const next = readQueueParams(new URLSearchParams(window.location.search));
    next.tab = "all";
    pendingRef.current = next;
    router.replace(`/desk/queue${queueQueryString(next)}`, { scroll: false });
  }, [isAdmin, params.tab, router]);

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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={params.tab}
          onValueChange={(value) => set({ tab: value as DeskTab, assigneeId: "" })}
        >
          <TabsList aria-label="Queue tabs">
            <TabsTrigger value="unassigned">Unassigned</TabsTrigger>
            {/* No Mine tab for admins — they oversee the whole queue. */}
            {!isAdmin && <TabsTrigger value="mine">Mine</TabsTrigger>}
            <TabsTrigger value="all">All</TabsTrigger>
            {/* Admin-only oversight: agents stay focused on Unassigned / Mine / All. */}
            {isAdmin && <TabsTrigger value="by-agent">By agent</TabsTrigger>}
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          <label htmlFor="queue-search" className="sr-only">
            Search tickets
          </label>
          <Input
            id="queue-search"
            key={searchKey}
            type="search"
            placeholder="Search reference, title…"
            defaultValue={params.q}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-9 w-full lg:w-64"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            className="lg:hidden"
          >
            Filters
          </Button>
        </div>
      </div>

      <div className={`${filtersOpen ? "flex" : "hidden"} flex-col gap-2 lg:flex lg:flex-row lg:items-center`}>
        {isAdmin && params.tab === "by-agent" && (
          <Select value={params.assigneeId || "none"} onValueChange={(v) => set({ assigneeId: v === "none" ? "" : v })}>
            <SelectTrigger aria-label="Filter by agent" className="w-full lg:w-44">
              <SelectValue placeholder="Choose an agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Choose an agent</SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={params.status || "all"} onValueChange={(v) => set({ status: v === "all" ? "" : v })}>
          <SelectTrigger aria-label="Filter by status" className="w-full lg:w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>

        <Select value={params.priority || "all"} onValueChange={(v) => set({ priority: v === "all" ? "" : v })}>
          <SelectTrigger aria-label="Filter by priority" className="w-full lg:w-40">
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>

        <Select value={params.sort || "newest"} onValueChange={(v) => set({ sort: v })}>
          <SelectTrigger aria-label="Sort tickets" className="w-full lg:w-40">
            <SelectValue placeholder="Newest first" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="due">Due soonest</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
