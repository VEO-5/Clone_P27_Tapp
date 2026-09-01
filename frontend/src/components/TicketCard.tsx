import Link from "next/link";

import { PriorityBadge, StatusBadge } from "@/components/ui/Badge";
import { CATEGORY_LABELS, type Ticket } from "@/lib/types";
import { formatRelative } from "@/lib/utils";

export function TicketCard({ ticket, href }: { ticket: Ticket; href: string }) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-ink-700 bg-ink-850/60 p-4 transition-colors hover:border-ink-500 hover:bg-ink-800/70"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="mono-ref text-[12.5px] font-semibold text-iris-300">{ticket.reference}</p>
        <time dateTime={ticket.createdAt} className="text-[11.5px] text-fog">
          {formatRelative(ticket.createdAt)}
        </time>
      </div>
      <p className="mt-2 text-[15px] font-semibold tracking-tight text-pearl">{ticket.title}</p>
      <p className="mt-1 text-[12.5px] text-mist">
        {ticket.employeeName} · {CATEGORY_LABELS[ticket.category]}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={ticket.status} size="sm" />
        <PriorityBadge priority={ticket.priority} size="sm" />
      </div>
    </Link>
  );
}
