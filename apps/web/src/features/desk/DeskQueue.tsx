"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { Assignee, DeskTicket } from "@pearl27/contracts";
import { Suspense, useState } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState, Panel } from "@/components/ui/Panel";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSession } from "@/features/auth/useSession";
import { apiFetch } from "@/lib/api";
import { useDeskEvents } from "@/lib/sse";

import { QueueFilters, queueQueryString, readQueueParams } from "./QueueFilters";
import { QueueRow } from "./QueueRow";

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
      className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${live ? "text-jade-400" : "text-gold-400"}`}
    >
      <span className={`size-1.5 rounded-full ${live ? "bg-jade-400" : "bg-gold-400 animate-pulse"}`} aria-hidden />
      {live ? "Live" : "Reconnecting…"}
    </span>
  );
}

function QueueContent({ params, query }: { params: ReturnType<typeof readQueueParams>; query: string }) {
  const [cursor, setCursor] = useState<string | null>(null);
  const [pages, setPages] = useState<DeskTicket[][]>([]);
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

  return (
    <div className="mx-auto max-w-6xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Support queue</p>
          <h1 className="mt-3 font-display text-4xl tracking-tight text-pearl">Queue</h1>
        </div>
        <LiveIndicator status={status} />
      </div>

      <QueueFilters agents={agents} />

      <div className="mt-6" aria-live="polite">
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
                  <Button variant="secondary" size="sm" onClick={() => window.history.back()}>
                    Back
                  </Button>
                ) : undefined
              }
            />
          </Panel>
        )}
        <div className="flex flex-col gap-3">
          {rows.map((ticket) => (
            <QueueRow key={ticket.id} ticket={ticket} role={role} agents={agents} />
          ))}
        </div>
        {queue.data?.nextCursor && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="secondary"
              onClick={() => setCursor(queue.data!.nextCursor)}
              disabled={queue.isFetching}
            >
              {queue.isFetching ? "Loading…" : "Load more"}
            </Button>
          </div>
        )}
      </div>
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
