"use client";

import { Download, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Assignee, DeskDashboard, DeskTicket } from "@pearl27/contracts";

import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select";
import { Skeleton } from "@/components/shadcn/skeleton";
import { Panel } from "@/components/ui/Panel";
import { useSession } from "@/features/auth/useSession";
import { apiFetch } from "@/lib/api";
import { useDeskEvents } from "@/lib/sse";

import { DeskKanban } from "./DeskKanban";
import { DeskStatCards } from "./DeskStatCards";
import { QueueRow } from "./QueueRow";
import { TicketTable } from "./TicketTable";

function LiveDot({ status }: { status: string }) {
  if (status === "off") return null;
  const live = status === "live";
  return (
    <span role="status" className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${live ? "text-jade-400" : "text-iris-700"}`}>
      <span className={`size-1.5 rounded-full ${live ? "bg-jade-400" : "bg-gold-400 animate-pulse"}`} aria-hidden />
      {live ? "Live" : "Reconnecting…"}
    </span>
  );
}

function exportCsv(tickets: DeskTicket[]) {
  const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const rows = [
    ["reference", "title", "status", "priority", "category", "assignee", "updated"],
    ...tickets.map((t) => [
      quote(t.reference),
      quote(t.title),
      quote(t.status),
      quote(t.priority),
      quote(t.categoryId),
      quote(t.assignee?.name ?? ""),
      quote(t.updatedAt),
    ]),
  ];
  const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tickets.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Tickets board: title actions, stat cards, filters, kanban columns, activity. */
function Board() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSession();
  const { status: liveStatus } = useDeskEvents(true);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  const q = searchParams.get("q") ?? "";
  const statusFilter = searchParams.get("status") ?? "";
  const priorityFilter = searchParams.get("priority") ?? "";
  const categoryFilter = searchParams.get("categoryId") ?? "";

  const dashboard = useQuery({
    queryKey: ["desk", "dashboard"],
    queryFn: () => apiFetch<DeskDashboard>("/desk/dashboard?range=30"),
  });
  const board = useQuery({
    queryKey: ["desk", "tickets", "board"],
    queryFn: () =>
      apiFetch<{ items: DeskTicket[]; nextCursor: string | null }>(
        "/desk/tickets?tab=all&sort=newest&limit=50",
      ),
  });
  const agentsQuery = useQuery({
    queryKey: ["desk", "agents"],
    queryFn: () => apiFetch<Assignee[]>("/desk/agents"),
    staleTime: 300_000,
  });

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const query = next.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }

  function onSearchChange(value: string) {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setParam("q", value), 300);
  }

  const all = board.data?.items ?? [];
  const needle = q.trim().toLowerCase();
  const visible = all.filter((t) => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    if (categoryFilter && t.categoryId !== categoryFilter) return false;
    if (needle && !`${t.title} ${t.reference} ${t.requesterName ?? ""}`.toLowerCase().includes(needle)) return false;
    return true;
  });
  const categories = dashboard.data?.series.byCategory ?? [];
  const searchKey = `${statusFilter}|${priorityFilter}|${categoryFilter}`;
  const role = session.data?.role === "admin" ? "admin" : "agent";
  const agents = agentsQuery.data ?? [];

  return (
    <div className="pb-2 lg:flex lg:h-[calc(100dvh_-_12px)] lg:flex-col lg:overflow-hidden lg:pb-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-[32px] font-bold tracking-tight text-black">Tickets</h1>
            <LiveDot status={liveStatus} />
          </div>
          <p className="mt-1 text-[13px] text-fog">Queue now — what needs work</p>
        </div>
        {role !== "admin" && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCsv(visible)} aria-label="Export visible tickets as CSV">
            <Download aria-hidden /> Export
          </Button>
        </div>
        )}
      </div>

      {dashboard.isPending ? (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Loading stats">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : dashboard.isError ? (
        <Panel className="p-6">
          <p role="alert" className="text-sm text-rose-400">
            Couldn&apos;t load the dashboard.{" "}
            <button type="button" onClick={() => dashboard.refetch()} className="font-medium underline underline-offset-4">
              Retry
            </button>
          </p>
        </Panel>
      ) : (
        dashboard.data && <DeskStatCards cards={dashboard.data.cards} series={dashboard.data.series} />
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fog" aria-hidden />
          <label htmlFor="board-search" className="sr-only">Search tickets by subject, customer, or ID</label>
          <Input
            id="board-search"
            key={searchKey}
            type="search"
            defaultValue={q}
            placeholder="Search tickets by subject, customer, or ID…"
            onChange={(e) => onSearchChange(e.target.value)}
            className="rounded-full bg-ink-950 pl-8"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter || "all"} onValueChange={(v) => setParam("status", v === "all" ? "" : v)}>
            <SelectTrigger aria-label="Filter by status" className="bg-ink-950">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter || "all"} onValueChange={(v) => setParam("priority", v === "all" ? "" : v)}>
            <SelectTrigger aria-label="Filter by priority" className="bg-ink-950">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          {/* Always mounted (disabled while loading) so the row never changes height. */}
          <Select
            value={categoryFilter || "all"}
            onValueChange={(v) => setParam("categoryId", v === "all" ? "" : v)}
            disabled={categories.length === 0}
          >
            <SelectTrigger aria-label="Filter by category" className="bg-ink-950">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.categoryId} value={c.categoryId}>{c.categoryName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden" aria-live="polite">
        {board.isError ? (
          <Panel className="p-6">
            <p role="alert" className="text-sm text-rose-400">
              Couldn&apos;t load tickets.{" "}
              <button type="button" onClick={() => board.refetch()} className="font-medium underline underline-offset-4">
                Retry
              </button>
            </p>
          </Panel>
        ) : board.isPending ? (
          <DeskKanban tickets={[]} isPending totalLoaded={0} />
        ) : visible.length === 0 ? (
          <Panel className="p-6">
            <p className="text-sm text-fog">No tickets match these filters. Try widening the search.</p>
          </Panel>
        ) : (
          <>
            {/* Desktop: data table. Mobile: cards. */}
            <div className="hidden lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
              <TicketTable tickets={visible} role={role} agents={agents} />
            </div>
            <div className="flex flex-col gap-3 lg:hidden">
              {visible.map((ticket) => (
                <QueueRow key={ticket.id} ticket={ticket} role={role} agents={agents} />
              ))}
            </div>
          </>
        )}
      </div>

    </div>
  );
}

/** Desk board route (wrapped in DeskShell by the desk layout). Shared by agents and admins. */
export function DeskBoard() {
  return (
    <Suspense fallback={<Skeleton className="m-6 h-64 rounded-xl" />}>
      <Board />
    </Suspense>
  );
}

/** @deprecated Use DeskBoard — kept so old imports keep working. */
export const AgentDashboard = DeskBoard;
