"use client";

import Link from "next/link";
import type { Assignee, DeskTicket } from "@pearl27/contracts";

import { PriorityBadge, StatusBadge } from "@/components/ui/Badge";
import { categoryName } from "@/components/TicketCard";
import { formatRelative } from "@/lib/utils";

import { ClaimButton } from "./ClaimButton";
import { AssignDialog, ReleaseDialog } from "./OwnershipDialogs";
import { LockBadge, PreviousReleaseMarker, SlaBadge } from "./RowBadges";

/**
 * Queue row: reference, title, requester, chips, assignee, lock, SLA,
 * unread, time, previous-release marker, ownership controls.
 */
export function QueueRow({
  ticket,
  role,
  agents,
}: {
  ticket: DeskTicket;
  role: "agent" | "admin";
  agents: Assignee[];
}) {
  const lockedByOther = ticket.lock?.lockedByOther ?? false;
  const unassigned = !ticket.assignee;
  const canClaim = unassigned && !lockedByOther;
  const canRelease = !unassigned && (!lockedByOther || role === "admin");
  const canAssign = role === "admin" && !lockedByOther;

  return (
    <article
      aria-label={`${ticket.reference} ${ticket.title}`}
      className="glass rounded-[4px] p-4 transition-colors"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="mono-ref text-[12.5px] font-semibold text-iris-600">{ticket.reference}</p>
        <div className="flex items-center gap-2">
          {(ticket.unreadCount ?? 0) > 0 && (
            <span
              className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-iris-500 px-1.5 text-[11px] font-semibold text-white"
              aria-label={`${ticket.unreadCount} unread replies`}
            >
              {ticket.unreadCount}
            </span>
          )}
          <time dateTime={ticket.updatedAt} className="text-[11.5px] text-fog">
            {formatRelative(ticket.updatedAt)}
          </time>
        </div>
      </div>

      <Link
        href={`/desk/tickets/${ticket.id}`}
        className="mt-1 block text-[15px] font-semibold tracking-tight text-pearl underline-offset-4 hover:underline"
      >
        {ticket.title}
      </Link>
      <p className="mt-0.5 text-[12.5px] text-fog">
        {ticket.requesterName ?? "Employee"} · {categoryName(ticket.categoryId)}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <StatusBadge status={ticket.status} size="sm" />
        <PriorityBadge priority={ticket.priority} size="sm" />
        {ticket.assignee ? (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-mist">
            <span aria-hidden className="grid size-5 place-items-center rounded-full bg-pearl text-[9px] font-semibold text-cream">
              {ticket.assignee.name.slice(0, 1)}
            </span>
            {ticket.assignee.name}
          </span>
        ) : (
          <span className="text-[12.5px] text-fog">Unassigned</span>
        )}
        <LockBadge ticket={ticket} />
        <SlaBadge ticket={ticket} />
      </div>

      {ticket.previousRelease && (
        <div className="mt-2">
          <PreviousReleaseMarker ticket={ticket} />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {canClaim && <ClaimButton ticket={ticket} />}
        {canRelease && <ReleaseDialog ticket={ticket} />}
        {canAssign && <AssignDialog ticket={ticket} agents={agents} />}
        <Link
          href={`/desk/tickets/${ticket.id}`}
          className="inline-flex min-h-11 items-center rounded-[2px] px-3 text-[13px] font-medium text-iris-600 underline-offset-4 hover:underline sm:min-h-0 sm:py-1"
        >
          View
        </Link>
      </div>
    </article>
  );
}
