import Link from "next/link";
import type { Ticket } from "@pearl27/contracts";

import { PriorityBadge, StatusBadge } from "@/components/ui/Badge";
import { categoryName } from "@/features/tickets/categories";
import { formatRelative } from "@/lib/utils";

export function TicketCard({ ticket }: { ticket: Ticket }) {
  return (
    <Link
      href={`/tickets/${ticket.reference}`}
      className="glass-night group block rounded-xl p-5 transition-all duration-200 hover:-translate-y-px hover:border-cream/25 hover:shadow-xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="mono-ref text-[12.5px] font-semibold text-iris-300">{ticket.reference}</p>
        <time dateTime={ticket.updatedAt} className="text-[11.5px] text-haze">
          Updated {formatRelative(ticket.updatedAt)}
        </time>
      </div>
      <p className="mt-2 text-[15px] font-semibold tracking-tight text-cream">{ticket.title}</p>
      <p className="mt-1 text-[12.5px] text-haze">
        {ticket.handlingAgent ? `${ticket.handlingAgent.name} · ` : "Waiting for an agent · "}
        {categoryName(ticket.categoryId)}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={ticket.status} size="sm" surface="night" />
        <PriorityBadge priority={ticket.priority} size="sm" surface="night" />
      </div>
    </Link>
  );
}
