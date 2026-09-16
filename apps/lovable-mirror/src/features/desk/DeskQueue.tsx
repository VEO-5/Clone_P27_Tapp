// @ts-nocheck
"use client";

import { useLocation, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { Assignee, DeskTicket } from "@pearl27/contracts";
import { Loader2 } from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/shadcn/button";
import { EmptyState, Panel } from "@/components/ui/Panel";
import { Skeleton } from "@/components/shadcn/skeleton";
import { useSession } from "@/features/auth/useSession";
import { apiFetch } from "@/lib/api";
import { useHotkeys } from "@/lib/hooks";
import { useDeskEvents } from "@/lib/sse";

import { KeyboardShortcutsHelp } from "./KeyboardShortcutsHelp";
import { QueueFilters, queueQueryString, readQueueParams } from "./QueueFilters";
import { QueueRow } from "./QueueRow";
import { TicketTable } from "./TicketTable";

interface QueuePage {
  items: DeskTicket[];
  nextCursor: string | null;
}

function LiveIndicator({ status }: { status: "live" | "reconnecting" | "off" }) {
  if (status === "off") return null;
  const live = status === "live";
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${live ? "text-jade-400" : "text-iris-700"}`}
    >
      <span className={`size-1.5 rounded-full ${live ? "bg-jade-400" : "bg-gold-400 animate-pulse"}`} aria-hidden />
      {live ? "Live" : "Reconnecting…"}
    </span>
  );
}

function QueueContent({ params, query }: { params: ReturnType<typeof readQueueParams>; query: string }) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [helpOpen, setHelpOpen] = useState(false);
  const focusedIndexRef = useRef(-1);
  const navigate = useNavigate();
  const session = useSession();
  const { status } = useDeskEvents(true);

  // Infinite list: each cursor is its own page. Refetch replaces pages in
  // place (no append-on-refetch), so a claimed ticket leaves Unassigned and a
  // released ticket leaves Mine immediately instead of ghosting.
  const queue = useInfiniteQuery({
    queryKey: ["desk", "tickets", query],
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      const page = await apiFetch<QueuePage>(
        `/desk/tickets${query}${query.includes("?") ? "&" : "?"}limit=12${pageParam ? `&cursor=${pageParam}` : ""}`,
      );
      return page;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
  const agentsQuery = useQuery({
    queryKey: ["desk", "agents"],
    queryFn: () => apiFetch<Assignee[]>("/desk/agents"),
    staleTime: 300_000,
  });

  // Latest copy wins: a refetch that changes assignee/status replaces the row
  // instead of keeping the stale first-seen copy.
  const rows = useMemo(() => {
    const seen = new Map<string, DeskTicket>();
    for (const page of queue.data?.pages ?? []) {
      for (const t of page.items) seen.set(t.id, t);
    }
    return [...seen.values()];
  }, [queue.data]);
  const role = session.data?.role === "admin" ? "admin" : "agent";
  const agents = agentsQuery.data ?? [];
  const desktopSentinelRef = useRef<HTMLDivElement | null>(null);
  const mobileSentinelRef = useRef<HTMLDivElement | null>(null);

  // Infinite scroll: when the end-of-list sentinel scrolls into view, pull
  // the next page automatically — no Load more button to hunt for below the
  // fold. One sentinel per layout (desktop table frame via the footer prop,
  // mobile cards list below); the hidden layout never intersects, so only
  // the visible one drives loading.
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = queue;
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void fetchNextPage();
        }
      },
      { rootMargin: "400px" },
    );
    for (const sentinel of [desktopSentinelRef.current, mobileSentinelRef.current]) {
      if (sentinel) observer.observe(sentinel);
    }
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, query]);

  useEffect(() => {
    focusedIndexRef.current = focusedIndex;
  }, [focusedIndex]);

  const triggerAction = useCallback(
    (action: "claim" | "release" | "assign") => {
      const idx = focusedIndexRef.current;
      if (idx < 0 || idx >= rows.length) return;
      const rows_ = document.querySelectorAll<HTMLElement>("article[aria-label], tr[data-ticket-row]");
      const target = rows_[idx];
      if (!target) return;
      const btn = target.querySelector<HTMLButtonElement>(`[data-action="${action}"] button`);
      if (btn) btn.click();
    },
    [rows.length],
  );

  const openFocusedTicket = useCallback(() => {
    const idx = focusedIndexRef.current;
    if (idx < 0 || idx >= rows.length) return;
    const ticket = rows[idx];
    navigate({ to: `/desk/tickets/${ticket.id}` });
  }, [rows, navigate]);

  useHotkeys([
    ["j", () => setFocusedIndex((i) => Math.min(i + 1, rows.length - 1))],
    ["k", () => setFocusedIndex((i) => Math.max(i - 1, 0))],
    ["enter", openFocusedTicket],
    ["a", () => triggerAction("claim")],
    ["r", () => triggerAction("release")],
    ["?", () => setHelpOpen((o) => !o)],
    ["escape", () => setFocusedIndex(-1)],
  ]);

  return (
    // Full-height frame: the 2.25rem subtraction matches the DeskShell
    // content column (pt-3 + pb-6), same formula as the board — the table
    // frame below is the ONLY scroller and the page column never moves.
    <div className="flex h-[calc(100dvh-2.25rem)] flex-col overflow-hidden pb-2">
      <div className="mb-3 flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[32px] font-bold tracking-tight text-black">Support queue</h1>
        </div>
        <div className="flex items-center gap-3">
          <LiveIndicator status={status} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setHelpOpen(true)}
            aria-label="Keyboard shortcuts"
            className="hidden sm:inline-flex"
          >
            <kbd className="font-mono text-[11px]">?</kbd> Shortcuts
          </Button>
        </div>
      </div>

      <div className="shrink-0">
        <QueueFilters agents={agents} isAdmin={role === "admin"} />
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden" aria-live="polite">
        {queue.isPending && (
          <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading queue">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}
        {queue.isError && (
          <Panel className="p-6">
            <p role="alert" className="text-sm text-rose-400">
              Couldn&apos;t load the queue.{" "}
              <button type="button" onClick={() => queue.refetch()} className="font-medium underline underline-offset-4">
                Retry
              </button>
            </p>
          </Panel>
        )}
        {queue.data && rows.length === 0 && !queue.isFetching && (
          <Panel tone="night">
            <EmptyState
              tone="night"
              title={
                params.tab === "mine"
                  ? "Your queue is clear"
                  : params.tab === "by-agent"
                    ? "Pick an agent to inspect their queue"
                    : "Nothing here"
              }
              description={
                params.tab === "unassigned"
                  ? "No unassigned tickets. Nice — grab a coffee."
                  : params.tab === "by-agent"
                    ? "Choose an agent above — an empty pick never shows All."
                    : params.tab === "all"
                      ? "Every incoming request lives here — try widening the filters or search."
                      : "Try widening the filters or search."
              }
              action={
                params.tab !== "all" ? (
                  <Button variant="outline" size="sm" onClick={() => window.history.back()}>
                    Back
                  </Button>
                ) : undefined
              }
            />
          </Panel>
        )}
        {/* Desktop: one data table (infinite scroll lives inside the scroll frame). Mobile: cards. */}
        <div className="hidden lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
          <TicketTable
            tickets={rows}
            role={role}
            agents={agents}
            focusedIndex={focusedIndex}
            onFocusIndex={setFocusedIndex}
            frameClassName="slim-scrollbar"
            footer={
              rows.length > 0 ? (
                <ListEndStatus
                  sentinelRef={desktopSentinelRef}
                  hasNextPage={queue.hasNextPage}
                  isFetchingNextPage={queue.isFetchingNextPage}
                  total={rows.length}
                />
              ) : undefined
            }
          />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-2 no-scrollbar lg:hidden">
          {rows.map((ticket, index) => (
            <QueueRow
              key={ticket.id}
              ticket={ticket}
              role={role}
              agents={agents}
              index={index}
              focused={index === focusedIndex}
              onFocusIndex={setFocusedIndex}
            />
          ))}
          {rows.length > 0 && (
            <div className="flex shrink-0 justify-center pb-1">
              <ListEndStatus
                sentinelRef={mobileSentinelRef}
                hasNextPage={queue.hasNextPage}
                isFetchingNextPage={queue.isFetchingNextPage}
                total={rows.length}
              />
            </div>
          )}
        </div>
      </div>
      <KeyboardShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}

/**
 * End-of-list status: the sentinel div triggers the next page load, the
 * text tells you where you are — "Scroll for more" mid-list, a spinner
 * while fetching, and an explicit "all caught up" marker at the end so the
 * finish line is never hidden below the fold.
 */
function ListEndStatus({
  sentinelRef,
  hasNextPage,
  isFetchingNextPage,
  total,
}: {
  sentinelRef: React.Ref<HTMLDivElement>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  total: number;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-[12.5px] text-fog">
      <span ref={sentinelRef} aria-hidden className="inline-block h-px w-px" />
      <span role="status">
        {isFetchingNextPage ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Loading more…
          </span>
        ) : hasNextPage ? (
          "Scroll for more"
        ) : (
          `You're all caught up · Showing all ${total} request${total === 1 ? "" : "s"}`
        )}
      </span>
    </span>
  );
}

export function DeskQueue() {
  return (
    <Suspense fallback={<Skeleton className="m-8 h-32" />}>
      <QueueParamsReader />
    </Suspense>
  );
}

/** Reads the URL inside Suspense; key resets pages when filters change. */
function QueueParamsReader() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const session = useSession();
  const params = readQueueParams(searchParams);
  // Admins have no Mine tab: a bare /desk/queue opens All for them (no
  // mine→all flicker + wrong first query). Agents keep Mine.
  const effective =
    !searchParams.get("tab") && session.data?.role === "admin" ? { ...params, tab: "all" as const } : params;
  const query = queueQueryString(effective);
  return <QueueContent key={query} params={effective} query={query} />;
}
