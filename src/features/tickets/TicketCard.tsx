// @ts-nocheck
import { Link } from "@tanstack/react-router";
import type { Ticket } from "@pearl27/contracts";

import { PriorityBadge, StatusBadge } from "@/components/ui/Badge";
import { useCategoryName } from "@/features/tickets/categories";
import { formatRelative } from "@/lib/utils";

export function TicketCard({ ticket }: { ticket: Ticket }) {
  const resolvedCategoryName = useCategoryName(ticket.categoryId);
  return (
    <Link
      to={`/tickets/${ticket.reference}`}
      className="glass-night group block rounded-xl p-4 transition-colors duration-200 hover:border-cream/25"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mono-ref text-[12.5px] font-semibold text-iris-300">{ticket.reference}</p>
          <p className="mt-1 text-[15px] font-semibold tracking-tight text-cream">{ticket.title}</p>
          <p className="mt-1 text-[12.5px] text-haze">
            {ticket.handlingAgent ? `${ticket.handlingAgent.name} · ` : "Waiting for an agent · "}
            {resolvedCategoryName}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <time dateTime={ticket.updatedAt} className="text-[11.5px] text-haze">
            Updated {formatRelative(ticket.updatedAt)}
          </time>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <StatusBadge status={ticket.status} size="sm" surface="night" />
            <PriorityBadge priority={ticket.priority} size="sm" surface="night" />
          </div>
        </div>
      </div>
    </Link>
  );
}
