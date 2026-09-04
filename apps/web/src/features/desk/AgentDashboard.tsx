"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { ActivityItem, Assignee, DeskDashboard, DeskTicket } from "@pearl27/contracts";

import { Panel } from "@/components/ui/Panel";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSession } from "@/features/auth/useSession";
import { apiFetch } from "@/lib/api";
import { formatRelative } from "@/lib/utils";
import { useDeskEvents } from "@/lib/sse";

import { DashboardCards } from "./DashboardCards";
import { ChartsSkeleton, DashboardCharts } from "./DashboardCharts";
import { QueueRow } from "./QueueRow";

function LiveDot({ status }: { status: string }) {
  if (status === "off") return null;
  const live = status === "live";
  return (
    <span role="status" className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${live ? "text-jade-400" : "text-gold-400"}`}>
      <span className={`size-1.5 rounded-full ${live ? "bg-jade-400" : "bg-gold-400 animate-pulse"}`} aria-hidden />
      {live ? "Live" : "Reconnecting…"}
    </span>
  );
}

/** Agent overview: cards, charts, my list (oldest first), activity — live. */
export function AgentDashboard() {
  const session = useSession();
  const { status } = useDeskEvents(true);
  const dashboard = useQuery({
    queryKey: ["desk", "dashboard"],
    queryFn: () => apiFetch<DeskDashboard>("/desk/dashboard?range=30"),
  });
  const mine = useQuery({
    queryKey: ["desk", "tickets", "?tab=mine&sort=oldest&limit=5"],
    queryFn: () => apiFetch<{ items: DeskTicket[]; nextCursor: string | null }>("/desk/tickets?tab=mine&sort=oldest&limit=5"),
  });
  const activity = useQuery({
    queryKey: ["desk", "activity"],
    queryFn: () => apiFetch<{ items: ActivityItem[] }>("/desk/activity"),
  });
  const agentsQuery = useQuery({
    queryKey: ["desk", "agents"],
    queryFn: () => apiFetch<Assignee[]>("/desk/agents"),
    staleTime: 300_000,
  });

  const role = session.data?.role === "admin" ? "admin" : "agent";
  const agents = agentsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Support desk</p>
          <h1 className="mt-3 font-display text-4xl tracking-tight text-pearl">
            {session.data ? `Welcome, ${session.data.name.split(" ")[0]}` : "Dashboard"}
          </h1>
        </div>
        <LiveDot status={status} />
      </div>

      {dashboard.isPending && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3" aria-busy="true" aria-label="Loading cards">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      )}
      {dashboard.isError && (
        <Panel className="p-6">
          <p role="alert" className="text-sm text-rose-400">
            Couldn&apos;t load the dashboard.{" "}
            <button type="button" onClick={() => dashboard.refetch()} className="font-medium underline underline-offset-4">
              Retry
            </button>
          </p>
        </Panel>
      )}
      {dashboard.data && <DashboardCards cards={dashboard.data.cards} />}

      <div className="mt-8">{dashboard.data ? <DashboardCharts series={dashboard.data.series} /> : !dashboard.isError && <ChartsSkeleton />}</div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section aria-label="My open tickets">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-pearl">My open tickets</h2>
            <Link href="/desk/queue?tab=mine" className="text-[13px] font-medium text-iris-600 underline-offset-4 hover:underline">
              Open queue →
            </Link>
          </div>
          {mine.isPending && <Skeleton className="h-32" />}
          {mine.data?.items.length === 0 && <p className="text-sm text-fog">Nothing assigned — queue is clear.</p>}
          <div className="flex flex-col gap-3">
            {mine.data?.items.map((ticket) => (
              <div key={ticket.id} className="relative">
                {(ticket.unreadCount ?? 0) > 0 && <span className="sr-only">{ticket.unreadCount} unread</span>}
                <QueueRow ticket={ticket} role={role} agents={agents} />
              </div>
            ))}
          </div>
        </section>

        <section aria-label="Desk activity">
          <h2 className="mb-3 font-display text-lg font-semibold text-pearl">Activity</h2>
          {activity.isPending && <Skeleton className="h-48" />}
          <ul className="flex flex-col gap-3">
            {activity.data?.items.map((item) => (
              <li key={item.id} className="rounded-[4px] border border-ink-700 bg-white p-3">
                <p className="text-[13px] text-pearl-dim">{item.text}</p>
                <p className="mt-1 text-[12px] text-fog">
                  {item.actorName} · {item.ticketReference} · {formatRelative(item.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
