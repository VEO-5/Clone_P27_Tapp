"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Inbox, Search } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { AdminQueueActions } from "@/components/AdminQueueActions";
import { NightStatButton } from "@/components/ui/NightStat";
import { EmptyState } from "@/components/ui/Panel";
import { Input, Select } from "@/components/ui/Form";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type Ticket,
  type TicketPriority,
  type TicketStats,
  type TicketStatus,
} from "@/lib/types";
import { formatRelative } from "@/lib/utils";

const KPI: { key: keyof TicketStats; label: string; status?: TicketStatus }[] = [
  { key: "open", label: "Open", status: "open" },
  { key: "inProgress", label: "In progress", status: "in_progress" },
  { key: "resolved", label: "Resolved", status: "resolved" },
  { key: "total", label: "Total" },
];

export function AdminDashboard({
  tickets,
  stats,
}: {
  tickets: Ticket[];
  stats: TicketStats;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const status = (searchParams.get("status") as TicketStatus | "all") || "all";
  const priority = (searchParams.get("priority") as TicketPriority | "all") || "all";

  const replaceFilters = (next: { q?: string; status?: string; priority?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    const q = next.q ?? query;
    const nextStatus = next.status ?? status;
    const nextPriority = next.priority ?? priority;

    if (q.trim()) params.set("q", q.trim());
    else params.delete("q");
    if (nextStatus && nextStatus !== "all") params.set("status", nextStatus);
    else params.delete("status");
    if (nextPriority && nextPriority !== "all") params.set("priority", nextPriority);
    else params.delete("priority");

    startTransition(() => {
      router.replace(params.size ? `/admin?${params}` : "/admin");
    });
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (status !== "all" && ticket.status !== status) return false;
      if (priority !== "all" && ticket.priority !== priority) return false;
      if (!needle) return true;
      return [ticket.reference, ticket.employeeName, ticket.employeeEmail, ticket.title]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [tickets, query, status, priority]);

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {KPI.map((card) => {
          const active = card.status ? status === card.status : status === "all" && !card.status;
          return (
            <NightStatButton
              key={card.key}
              label={card.label}
              value={stats[card.key]}
              active={Boolean(active && (card.status || status === "all"))}
              onClick={() => replaceFilters({ status: card.status ?? "all" })}
            />
          );
        })}
      </dl>

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-fog"
            aria-hidden
          />
          <label htmlFor="admin-search" className="sr-only">
            Search tickets
          </label>
          <Input
            id="admin-search"
            value={query}
            placeholder="Search name, email, title, or reference"
            className="pl-11"
            onChange={(event) => {
              setQuery(event.target.value);
              replaceFilters({ q: event.target.value });
            }}
          />
        </div>
        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(event) => replaceFilters({ status: event.target.value })}
          className="lg:w-48"
        >
          <option value="all">All statuses</option>
          {TICKET_STATUSES.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by priority"
          value={priority}
          onChange={(event) => replaceFilters({ priority: event.target.value })}
          className="lg:w-48"
        >
          <option value="all">All priorities</option>
          {TICKET_PRIORITIES.map((value) => (
            <option key={value} value={value}>
              {PRIORITY_LABELS[value]}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-5" aria-hidden />}
          title={tickets.length === 0 ? "No tickets yet" : "No tickets match those filters"}
          description={
            tickets.length === 0
              ? "New Sphere issues will land here the moment an employee submits one."
              : "Clear search or change the status filter to see more of the queue."
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-3 lg:hidden">
            {filtered.map((ticket) => (
              <li key={ticket.id} className="rounded-2xl border border-ink-700 bg-ink-850/70 p-4">
                <Link href={`/admin/tickets/${ticket.id}`} className="block">
                  <span className="mono-ref text-[12px] text-iris-300">{ticket.reference}</span>
                  <p className="mt-2 font-semibold text-pearl">{ticket.title}</p>
                  <p className="mt-1 text-[12.5px] text-mist">
                    {ticket.employeeName} · {formatRelative(ticket.createdAt)}
                  </p>
                </Link>
                <div className="mt-4 border-t border-ink-700/80 pt-4">
                  <AdminQueueActions ticket={ticket} />
                </div>
                <Link
                  href={`/admin/tickets/${ticket.id}`}
                  className="mt-1 inline-flex min-h-11 items-center text-[13px] font-medium text-iris-300 hover:underline"
                >
                  Open ticket and reply
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-2xl border border-ink-700 lg:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-850 text-[11px] uppercase tracking-[0.14em] text-fog">
                <tr>
                  <th className="px-5 py-3 font-medium">Reference</th>
                  <th className="px-5 py-3 font-medium">Issue</th>
                  <th className="px-5 py-3 font-medium">Requester</th>
                  <th className="px-5 py-3 font-medium">Update status</th>
                  <th className="px-5 py-3 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700/80">
                {filtered.map((ticket) => (
                  <tr key={ticket.id} className="bg-ink-900/40 hover:bg-ink-800/60">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/tickets/${ticket.id}`}
                        className="mono-ref font-semibold text-iris-300 hover:text-iris-300/80"
                      >
                        {ticket.reference}
                      </Link>
                    </td>
                    <td className="max-w-xs px-5 py-3.5">
                      <Link href={`/admin/tickets/${ticket.id}`} className="font-medium text-pearl hover:underline">
                        {ticket.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-mist">
                      <div>{ticket.employeeName}</div>
                      <div className="text-[12px] text-fog">{ticket.employeeEmail}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <AdminQueueActions ticket={ticket} />
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-fog">
                      <time dateTime={ticket.createdAt}>{formatRelative(ticket.createdAt)}</time>
                      <Link
                        href={`/admin/tickets/${ticket.id}`}
                        className="mt-2 block font-medium text-iris-300 hover:underline"
                      >
                        Reply
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
