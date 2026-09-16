"use client";

import type { DeskTicket } from "@pearl27/contracts";

import { Panel } from "@/components/ui/Panel";
import { Skeleton } from "@/components/shadcn/skeleton";

import { TicketKanbanCard } from "./TicketKanbanCard";

/**
 * Flat ticket grid — no status grouping. Status filtering lives solely in
 * the status dropdown above, so every card carries its own status pill.
 */
export function DeskKanban({
  tickets,
  isPending,
  totalLoaded,
}: {
  tickets: DeskTicket[];
  isPending: boolean;
  totalLoaded: number;
}) {
  if (isPending) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading tickets">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <Panel className="p-6">
        <p className="text-sm text-fog">No tickets match these filters. Try widening the search.</p>
      </Panel>
    );
  }

  return (
    <div aria-label="Tickets grid">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tickets.map((ticket) => (
          <TicketKanbanCard key={ticket.id} ticket={ticket} />
        ))}
      </div>
      <span className="sr-only" role="status">
        Showing {totalLoaded} tickets.
      </span>
    </div>
  );
}
