"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronsLeft,
  CircleCheck,
  Download,
  Inbox,
  LayoutGrid,
  Loader,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Rows3,
  Search,
  SlidersHorizontal,
  Ticket as TicketIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";

import { AdminQueueActions } from "@/components/AdminQueueActions";
import { DeskSidebar, isOverdue } from "@/components/DeskSidebar";
import { DeskAvatar, DeskAvatarFallback } from "@/components/desk/avatar";
import { DeskBadge } from "@/components/desk/badge";
import { DeskButton } from "@/components/desk/button";
import { DeskCard } from "@/components/desk/card";
import { DeskInput } from "@/components/desk/input";
import {
  DeskSelect,
  DeskSelectContent,
  DeskSelectItem,
  DeskSelectTrigger,
  DeskSelectValue,
} from "@/components/desk/select";
import {
  DeskTable,
  DeskTableBody,
  DeskTableCell,
  DeskTableHead,
  DeskTableHeader,
  DeskTableRow,
} from "@/components/desk/table";
import { EmptyState } from "@/components/ui/Panel";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type Ticket,
  type TicketCategory,
  type TicketPriority,
  type TicketStats,
  type TicketStatus,
} from "@/lib/types";
import { cn, formatRelative, initials } from "@/lib/utils";
import { computeStats } from "@/lib/stats";

type StatKey = keyof TicketStats;

const CARDS: { key: StatKey; label: string; status?: TicketStatus; icon: typeof Inbox }[] = [
  { key: "total", label: "Total tickets", icon: TicketIcon },
  { key: "open", label: "Open", status: "open", icon: Inbox },
  { key: "inProgress", label: "Pending", status: "in_progress", icon: Loader },
  { key: "resolved", label: "Resolved", status: "resolved", icon: CircleCheck },
];

const STATUS_BADGE: Record<TicketStatus, "open" | "inProgress" | "resolved" | "closed"> = {
  open: "open",
  in_progress: "inProgress",
  resolved: "resolved",
  closed: "closed",
};

const PRIORITY_BADGE: Record<TicketPriority, "neutral" | "copper" | "inProgress" | "urgent"> = {
  low: "neutral",
  medium: "copper",
  high: "inProgress",
  urgent: "urgent",
};

const WEEK = 7 * 24 * 60 * 60 * 1000;

function weekDelta(tickets: Ticket[], status?: TicketStatus): { diff: number; pct: number } {
  const now = Date.now();
  const scoped = status ? tickets.filter((t) => t.status === status) : tickets;
  const thisWeek = scoped.filter((t) => now - new Date(t.createdAt).getTime() < WEEK).length;
  const lastWeek = scoped.filter((t) => {
    const age = now - new Date(t.createdAt).getTime();
    return age >= WEEK && age < 2 * WEEK;
  }).length;
  const diff = thisWeek - lastWeek;
  const pct = lastWeek > 0 ? (diff / lastWeek) * 100 : thisWeek > 0 ? 100 : 0;
  return { diff, pct };
}

function exportCsv(tickets: Ticket[]) {
  const header = ["reference", "title", "requester", "email", "status", "priority", "created"];
  const rows = tickets.map((t) =>
    [t.reference, t.title, t.employeeName, t.employeeEmail, t.status, t.priority, t.createdAt]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(","),
  );
  const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tickets-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function AdminDashboard({
  tickets,
  employeeEmail,
  employeeAvatarUrl,
}: {
  tickets: Ticket[];
  employeeEmail?: string | null;
  employeeAvatarUrl?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [view, setView] = useState<"table" | "cards">("table");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [railReady, setRailReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const showEmployeePhoto = Boolean(employeeEmail && employeeAvatarUrl && !avatarFailed);

  useEffect(() => {
    // Read inside the frame callback (not the effect body) so the persisted
    // width lands before first paint without a cascading render.
    const frame = requestAnimationFrame(() => {
      try {
        setRailCollapsed(window.localStorage.getItem("desk-rail-collapsed") === "1");
      } catch {
        /* private mode — default to expanded */
      }
      // Enable the width animation only after the persisted state is applied,
      // so returning to the queue never flashes the rail open then shut.
      setRailReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const toggleRail = () => {
    setRailCollapsed((collapsed) => {
      try {
        window.localStorage.setItem("desk-rail-collapsed", collapsed ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !collapsed;
    });
  };
  const status = (searchParams.get("status") as TicketStatus | "all") || "all";
  const priority = (searchParams.get("priority") as TicketPriority | "all") || "all";
  const category = (searchParams.get("category") as TicketCategory | "all") || "all";
  const overdue = searchParams.get("overdue") === "1";

  // Live queue: server props seed it, created tickets prepend instantly, and a
  // server refresh replaces it — no manual tab reload ever needed.
  const [liveTickets, setLiveTickets] = useState(tickets);
  const [seenTickets, setSeenTickets] = useState(tickets);
  if (seenTickets !== tickets) {
    setSeenTickets(tickets);
    setLiveTickets(tickets);
  }
  const liveStats = useMemo(() => computeStats(liveTickets), [liveTickets]);

  const replaceFilters = (next: {
    q?: string;
    status?: string;
    priority?: string;
    category?: string;
    overdue?: boolean;
  }) => {
    const params = new URLSearchParams(searchParams.toString());
    const q = next.q ?? query;
    const nextStatus = next.status ?? status;
    const nextPriority = next.priority ?? priority;
    const nextCategory = next.category ?? category;
    const nextOverdue = next.overdue ?? overdue;

    if (q.trim()) params.set("q", q.trim());
    else params.delete("q");
    if (nextStatus && nextStatus !== "all") params.set("status", nextStatus);
    else params.delete("status");
    if (nextPriority && nextPriority !== "all") params.set("priority", nextPriority);
    else params.delete("priority");
    if (nextCategory && nextCategory !== "all") params.set("category", nextCategory);
    else params.delete("category");
    if (nextOverdue) params.set("overdue", "1");
    else params.delete("overdue");

    startTransition(() => {
      router.replace(params.size ? `/admin?${params}` : "/admin");
    });
  };

  const clearAllFilters = () => {
    setQuery("");
    startTransition(() => router.replace("/admin"));
  };

  const hasActiveFilters =
    status !== "all" || priority !== "all" || category !== "all" || overdue || query.trim() !== "";

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return liveTickets.filter((ticket) => {
      if (status !== "all" && ticket.status !== status) return false;
      if (priority !== "all" && ticket.priority !== priority) return false;
      if (category !== "all" && ticket.category !== category) return false;
      if (overdue && !isOverdue(ticket)) return false;
      if (!needle) return true;
      return [ticket.reference, ticket.employeeName, ticket.employeeEmail, ticket.title]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [liveTickets, query, status, priority, category, overdue]);

  const deltas = useMemo(() => {
    const result = {} as Record<StatKey, { diff: number; pct: number }>;
    for (const card of CARDS) result[card.key] = weekDelta(liveTickets, card.status);
    return result;
  }, [liveTickets]);

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch("/api/admin/login", { method: "DELETE" });
      router.replace("/admin/login");
      router.refresh();
    } finally {
      setSigningOut(false);
      setMenuOpen(false);
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      <aside
        className={cn(
          "hidden shrink-0 flex-col overflow-x-hidden border-r border-ink-700 bg-white ease-in-out lg:flex",
          railReady && "transition-all duration-300",
          railCollapsed ? "w-16" : "w-60 xl:w-64",
        )}
        aria-label="Ticket filters"
      >
        <div className={cn("flex shrink-0 items-center p-4", railCollapsed ? "justify-center" : "justify-between gap-2")}>
          {!railCollapsed && (
            <span className="pl-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-fog">
              Views
            </span>
          )}
          <button
            type="button"
            onClick={toggleRail}
            title={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!railCollapsed}
            className="rounded-lg p-2 text-pearl transition-colors hover:bg-ink-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500/40"
          >
            {railCollapsed ? (
              <PanelLeftOpen className="size-4" aria-hidden />
            ) : (
              <PanelLeftClose className="size-4" aria-hidden />
            )}
          </button>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 pb-4" aria-label="Ticket views">
          <DeskSidebar
            tickets={liveTickets}
            selection={{ status, priority, category, overdue }}
            collapsed={railCollapsed}
            viewsTitleAtTop
            onSelect={(next) =>
              replaceFilters({
                status: next.status,
                priority: next.priority,
                category: next.category,
                overdue: next.overdue,
              })
            }
          />
        </nav>
        {!railCollapsed && hasActiveFilters && (
          <div className="shrink-0 border-t border-ink-700/70 p-3">
            <button
              type="button"
              onClick={clearAllFilters}
              className="w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium text-iris-600 transition-colors hover:bg-ink-900/60 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500/40"
            >
              Clear all filters
            </button>
          </div>
        )}
        <div className="shrink-0 border-t border-ink-700/70 p-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              title="Support account"
              aria-label="Support account menu"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500/40",
                railCollapsed ? "justify-center p-1" : "px-2 py-1.5 hover:bg-ink-900/60",
              )}
            >
              <DeskAvatar className="size-8">
                {showEmployeePhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={employeeAvatarUrl as string}
                    alt=""
                    width={32}
                    height={32}
                    onError={() => setAvatarFailed(true)}
                    className="size-full object-cover"
                  />
                ) : (
                  <DeskAvatarFallback className="bg-pearl text-[11px] text-cream">
                    {employeeEmail ? initials(employeeEmail) : "S"}
                  </DeskAvatarFallback>
                )}
              </DeskAvatar>
              {!railCollapsed && (
                <>
                  <span className="min-w-0 flex-1 truncate text-left text-[13px] font-semibold text-pearl">
                    {employeeEmail ?? "Support"}
                  </span>
                  <ChevronsLeft className="size-4 rotate-90 text-fog" aria-hidden />
                </>
              )}
            </button>
            {menuOpen && (
              <>
                <button
                  type="button"
                  aria-hidden
                  tabIndex={-1}
                  onClick={() => setMenuOpen(false)}
                  className="fixed inset-0 z-40 cursor-default"
                />
                <div
                  role="menu"
                  className={cn(
                    "z-50 w-48 rounded-xl border border-ink-700 bg-white p-1.5 shadow-lg",
                    railCollapsed
                      ? "fixed bottom-4 left-[4.5rem]"
                      : "absolute bottom-full mb-2 left-0 right-0",
                  )}
                >
                  <p className="px-3 py-2 text-xs text-fog">Signed in as support</p>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={signOut}
                    disabled={signingOut}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-pearl transition-colors hover:bg-ink-900 focus-visible:outline-none disabled:opacity-50"
                  >
                    <LogOut className="size-4 text-fog" aria-hidden />
                    {signingOut ? "Signing out…" : "Sign out"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-1 flex-col gap-5 px-4 py-5 sm:px-6">
          {filtersOpen && (
            <DeskCard className="p-5 lg:hidden">
              <DeskSidebar
                tickets={liveTickets}
                selection={{ status, priority, category, overdue }}
                onSelect={(next) =>
                  replaceFilters({
                    status: next.status,
                    priority: next.priority,
                    category: next.category,
                    overdue: next.overdue,
                  })
                }
              />
            </DeskCard>
          )}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="font-display text-3xl font-bold tracking-tight text-pearl">Tickets</h1>
            <div className="flex items-center gap-2">
              <DeskButton variant="secondary" size="md" onClick={() => exportCsv(filtered)}>
                <Download aria-hidden /> Export
              </DeskButton>
              <DeskButton
                variant="secondary"
                size="md"
                className="lg:hidden"
                aria-expanded={filtersOpen}
                onClick={() => setFiltersOpen((open) => !open)}
              >
                <SlidersHorizontal aria-hidden /> Filters
              </DeskButton>
              <div className="hidden items-center rounded-lg border border-ink-600 bg-white p-0.5 lg:flex" role="group" aria-label="Change layout">
                <button
                  type="button"
                  aria-label="Table view"
                  aria-pressed={view === "table"}
                  onClick={() => setView("table")}
                  className={cn(
                    "rounded-md p-2 transition-colors",
                    view === "table" ? "bg-ink-900 text-pearl" : "text-fog hover:text-pearl",
                  )}
                >
                  <Rows3 className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label="Card view"
                  aria-pressed={view === "cards"}
                  onClick={() => setView("cards")}
                  className={cn(
                    "rounded-md p-2 transition-colors",
                    view === "cards" ? "bg-ink-900 text-pearl" : "text-fog hover:text-pearl",
                  )}
                >
                  <LayoutGrid className="size-4" aria-hidden />
                </button>
              </div>
            </div>
          </div>

      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CARDS.map((card) => {
          const Icon = card.icon;
          const { diff, pct } = deltas[card.key];
          const up = diff >= 0;
          return (
            <div
              key={card.key}
              className="rounded-xl border border-ink-700 bg-white px-4 pb-3 pt-3 shadow-[0_1px_2px_rgba(27,42,74,0.06),0_8px_24px_-12px_rgba(27,42,74,0.12)]"
            >
              <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-fog">
                <Icon className="size-3.5" aria-hidden />
                {card.label}
              </dt>
              <dd className="mt-1.5 rounded-lg border border-ink-700/70 px-3.5 py-3 font-display text-3xl font-bold tabular-nums text-pearl">
                {liveStats[card.key]}
              </dd>
              <dd className="mt-2 flex items-center gap-1 text-xs text-mist">
                {up ? (
                  <ArrowUpRight className="size-3.5 text-rose-400" aria-hidden />
                ) : (
                  <ArrowDownRight className="size-3.5 text-jade-400" aria-hidden />
                )}
                <span className={cn("font-semibold", up ? "text-rose-400" : "text-jade-400")}>
                  {up ? "+" : ""}
                  {diff} ({pct.toFixed(1)}%)
                </span>
                <span>vs last week</span>
              </dd>
            </div>
          );
        })}
      </dl>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fog"
            aria-hidden
          />
          <label htmlFor="admin-search" className="sr-only">
            Search tickets
          </label>
          <DeskInput
            id="admin-search"
            value={query}
            placeholder="Search tickets by subject, customer, or ID…"
            className="h-10 rounded-full pl-10"
            onChange={(event) => {
              setQuery(event.target.value);
              replaceFilters({ q: event.target.value });
            }}
          />
        </div>
        <div className="flex gap-3">
          <DeskSelect value={status} onValueChange={(value) => replaceFilters({ status: value })}>
            <DeskSelectTrigger aria-label="Filter by status" className="h-10 rounded-full lg:w-48">
              <DeskSelectValue placeholder="All statuses" />
            </DeskSelectTrigger>
            <DeskSelectContent>
              <DeskSelectItem value="all">All statuses</DeskSelectItem>
              {TICKET_STATUSES.map((value) => (
                <DeskSelectItem key={value} value={value}>
                  {STATUS_LABELS[value]}
                </DeskSelectItem>
              ))}
            </DeskSelectContent>
          </DeskSelect>
          <DeskSelect value={priority} onValueChange={(value) => replaceFilters({ priority: value })}>
            <DeskSelectTrigger aria-label="Filter by priority" className="h-10 rounded-full lg:w-48">
              <DeskSelectValue placeholder="All priorities" />
            </DeskSelectTrigger>
            <DeskSelectContent>
              <DeskSelectItem value="all">All priorities</DeskSelectItem>
              {TICKET_PRIORITIES.map((value) => (
                <DeskSelectItem key={value} value={value}>
                  {PRIORITY_LABELS[value]}
                </DeskSelectItem>
              ))}
            </DeskSelectContent>
          </DeskSelect>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-5" aria-hidden />}
          title={liveTickets.length === 0 ? "No tickets yet" : "No tickets match those filters"}
          description={
            liveTickets.length === 0
              ? "New Sphere issues will land here the moment an employee submits one."
              : "Clear search or change the status filter to see more of the queue."
          }
        />
      ) : view === "cards" ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((ticket) => (
            <li key={ticket.id}>
              <DeskCard className="p-5">
                <Link href={`/admin/tickets/${ticket.id}`} className="block">
                  <span className="mono-ref text-xs font-medium text-iris-600">
                    {ticket.reference}
                  </span>
                  <p className="mt-1.5 font-semibold text-pearl">{ticket.title}</p>
                  <p className="mt-1 text-[13px] text-mist">
                    {ticket.employeeName} · {formatRelative(ticket.createdAt)}
                  </p>
                </Link>
                <div className="mt-3 flex items-center gap-2">
                  <DeskBadge variant={STATUS_BADGE[ticket.status]}>
                    {STATUS_LABELS[ticket.status]}
                  </DeskBadge>
                  <DeskBadge variant={PRIORITY_BADGE[ticket.priority]}>
                    {PRIORITY_LABELS[ticket.priority]}
                  </DeskBadge>
                </div>
                <div className="mt-4 border-t border-ink-700/70 pt-4">
                  <AdminQueueActions key={`${ticket.id}-${ticket.updatedAt}`} ticket={ticket} />
                </div>
              </DeskCard>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 lg:hidden xl:grid-cols-3">
            {filtered.map((ticket) => (
              <li key={ticket.id}>
                <DeskCard className="p-5">
                  <Link href={`/admin/tickets/${ticket.id}`} className="block">
                    <span className="mono-ref text-xs font-medium text-iris-600">
                      {ticket.reference}
                    </span>
                    <p className="mt-1.5 font-semibold text-pearl">{ticket.title}</p>
                    <p className="mt-1 text-[13px] text-mist">
                      {ticket.employeeName} · {formatRelative(ticket.createdAt)}
                    </p>
                  </Link>
                  <div className="mt-3 flex items-center gap-2">
                    <DeskBadge variant={STATUS_BADGE[ticket.status]}>
                      {STATUS_LABELS[ticket.status]}
                    </DeskBadge>
                    <DeskBadge variant={PRIORITY_BADGE[ticket.priority]}>
                      {PRIORITY_LABELS[ticket.priority]}
                    </DeskBadge>
                  </div>
                  <div className="mt-4 border-t border-ink-700/70 pt-4">
                    <AdminQueueActions key={`${ticket.id}-${ticket.updatedAt}`} ticket={ticket} />
                  </div>
                </DeskCard>
              </li>
            ))}
          </ul>

          <DeskTable>
            <DeskTableHeader>
              <DeskTableRow>
                <DeskTableHead>Ticket</DeskTableHead>
                <DeskTableHead>Requester</DeskTableHead>
                <DeskTableHead>Status</DeskTableHead>
                <DeskTableHead>Priority</DeskTableHead>
                <DeskTableHead>Update</DeskTableHead>
                <DeskTableHead className="text-right">Submitted</DeskTableHead>
              </DeskTableRow>
            </DeskTableHeader>
            <DeskTableBody>
              {filtered.map((ticket) => (
                <DeskTableRow key={ticket.id}>
                  <DeskTableCell className="max-w-xs">
                    <Link
                      href={`/admin/tickets/${ticket.id}`}
                      className="mono-ref block text-xs font-medium text-iris-600 hover:underline"
                    >
                      {ticket.reference}
                    </Link>
                    <Link
                      href={`/admin/tickets/${ticket.id}`}
                      className="mt-0.5 block truncate font-medium text-pearl hover:underline"
                    >
                      {ticket.title}
                    </Link>
                  </DeskTableCell>
                  <DeskTableCell>
                    <span className="flex items-center gap-2.5">
                      <DeskAvatar className="size-8">
                        <DeskAvatarFallback className="text-[10px]">{initials(ticket.employeeName)}</DeskAvatarFallback>
                      </DeskAvatar>
                      <span>
                        <span className="block text-[13.5px] font-medium text-pearl">
                          {ticket.employeeName}
                        </span>
                        <span className="block text-xs text-fog">{ticket.employeeEmail}</span>
                      </span>
                    </span>
                  </DeskTableCell>
                  <DeskTableCell>
                    <DeskBadge variant={STATUS_BADGE[ticket.status]}>
                      {STATUS_LABELS[ticket.status]}
                    </DeskBadge>
                  </DeskTableCell>
                  <DeskTableCell>
                    <DeskBadge variant={PRIORITY_BADGE[ticket.priority]}>
                      {PRIORITY_LABELS[ticket.priority]}
                    </DeskBadge>
                  </DeskTableCell>
                  <DeskTableCell>
                    <AdminQueueActions key={`${ticket.id}-${ticket.updatedAt}`} ticket={ticket} />
                  </DeskTableCell>
                  <DeskTableCell className="text-right text-[13px] text-fog">
                    <time dateTime={ticket.createdAt}>{formatRelative(ticket.createdAt)}</time>
                  </DeskTableCell>
                </DeskTableRow>
              ))}
            </DeskTableBody>
          </DeskTable>
        </>
      )}
        </div>
      </div>
    </div>
  );
}
