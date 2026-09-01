import Link from "next/link";

import { PriorityBadge, StatusBadge } from "@/components/ui/Badge";
import { CATEGORY_LABELS, type Ticket } from "@/lib/types";
import { formatRelative } from "@/lib/utils";

export function TicketCard({ ticket, href }: { ticket: Ticket; href: string }) {
  return (
    <Link
      href={href}
      className="glass-night block rounded-[4px] p-4 transition-colors duration-200 hover:border-cream/20"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="mono-ref text-[12.5px] font-semibold text-iris-300">{ticket.reference}</p>
        <time dateTime={ticket.updatedAt} className="text-[11.5px] text-haze">
          Updated {formatRelative(ticket.updatedAt)}
        </time>
      </div>
      <p className="mt-2 text-[15px] font-semibold tracking-tight text-cream">{ticket.title}</p>
      <p className="mt-1 text-[12.5px] text-haze">
        {ticket.employeeName} · {CATEGORY_LABELS[ticket.category]}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={ticket.status} size="sm" surface="night" />
        <PriorityBadge priority={ticket.priority} size="sm" surface="night" />
      </div>
    </Link>
  );
}
