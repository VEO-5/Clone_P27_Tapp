"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { Assignee, DeskTicket } from "@pearl27/contracts";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
  const [cursor, setCursor] = useState<string | null>(null);
  const [pages, setPages] = useState<DeskTicket[][]>([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [helpOpen, setHelpOpen] = useState(false);
  const focusedIndexRef = useRef(-1);
  const router = useRouter();
  const session = useSession();
  const { status } = useDeskEvents(true);

  const queue = useQuery({
    queryKey: ["desk", "tickets", query, cursor ?? "first"],
    queryFn: async () => {
      const page = await apiFetch<QueuePage>(`/desk/tickets${query}${query.includes("?") ? "&" : "?"}limit=8${cursor ? `&cursor=${cursor}` : ""}`);
      setPages((prev) => [...prev, page.items]);
      return page;
    },
  });
  const agentsQuery = useQuery({
    queryKey: ["desk", "agents"],
    queryFn: () => apiFetch<Assignee[]>("/desk/agents"),
    staleTime: 300_000,
  });

  const seen = new Set<string>();
  const rows = pages.flat().filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
  const role = session.data?.role === "admin" ? "admin" : "agent";
  const agents = agentsQuery.data ?? [];

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
    router.push(`/desk/tickets/${ticket.id}`);
  }, [rows, router]);

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
    <div className="flex h-[calc(100dvh-6.5rem)] flex-col overflow-hidden pb-2">
      <div className="mb-4 flex shrink-0 flex-wrap items-end justify-between gap-3">
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
        {queue.data && rows.length === 0 && (
          <Panel tone="night">
            <EmptyState
              tone="night"
              title={params.tab === "mine" ? "Your queue is clear" : "Nothing here"}
              description={
                params.tab === "unassigned"
                  ? "No unassigned tickets. Nice — grab a coffee."
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
        {/* Desktop: one data table (Load more lives inside the scroll frame). Mobile: cards. */}
        <div className="hidden lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
          <TicketTable
            tickets={rows}
            role={role}
            agents={agents}
            focusedIndex={focusedIndex}
            onFocusIndex={setFocusedIndex}
            frameClassName="no-scrollbar"
            footer={
              queue.data?.nextCursor ? (
                <Button
                  variant="outline"
                  onClick={() => setCursor(queue.data!.nextCursor)}
                  disabled={queue.isFetching}
                >
                  {queue.isFetching ? "Loading…" : "Load more"}
                </Button>
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
        </div>
        {queue.data?.nextCursor && (
          <div className="mt-3 flex shrink-0 justify-center lg:hidden">
            <Button
              variant="outline"
              onClick={() => setCursor(queue.data!.nextCursor)}
              disabled={queue.isFetching}
            >
              {queue.isFetching ? "Loading…" : "Load more"}
            </Button>
          </div>
        )}
      </div>
      <KeyboardShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
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
  const searchParams = useSearchParams();
  const params = readQueueParams(searchParams);
  const query = queueQueryString(params);
  return <QueueContent key={query} params={params} query={query} />;
}
