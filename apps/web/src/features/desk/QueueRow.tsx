"use client";

import Link from "next/link";
import type { Assignee, DeskTicket } from "@pearl27/contracts";

import { UserAvatar } from "@/components/UserAvatar";
import { PriorityBadge, StatusBadge } from "@/components/ui/Badge";
import { categoryName } from "@/features/tickets/categories";
import { formatRelative, requesterEmail } from "@/lib/utils";

import { ClaimButton } from "./ClaimButton";
import { AssignDialog, ReleaseDialog } from "./OwnershipDialogs";
import { ownershipHint, ownershipLabel, useOwnership } from "./ownership";
import { LockBadge, PreviousReleaseMarker, SlaBadge } from "./RowBadges";

/**
 * Ticket card (mobile / narrow screens).
 * Hierarchy: ref + time → user → issue → description → metadata → action.
 * Assignment behavior is unchanged (claim / release / admin assign).
 */
export function QueueRow({
  ticket,
  role,
  agents,
  focused = false,
  onFocusIndex,
  index,
}: {
  ticket: DeskTicket;
  role: "agent" | "admin";
  agents: Assignee[];
  focused?: boolean;
  onFocusIndex?: (index: number) => void;
  index?: number;
}) {
  const { canClaim, canRelease, canAssign, isTerminal } = useOwnership(ticket, role);
  const requester = ticket.requesterName ?? "Employee";
  const hint = ownershipHint(ticket);

  return (
    <article
      aria-label={`${ticket.reference} ${ticket.title}`}
      tabIndex={focused ? 0 : -1}
      data-focused={focused || undefined}
      onClick={() => onFocusIndex?.(index ?? 0)}
      className={`rounded-[4px] border border-ink-700 bg-white p-4 text-pearl shadow-[0_1px_2px_rgba(27,42,74,0.06)] ${focused ? "ring-2 ring-iris-400 ring-offset-2 ring-offset-cream" : ""}`}
    >
      {/* Top: reference + relative time */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="mono-ref text-xs font-semibold text-iris-700">{ticket.reference}</p>
        <div className="flex items-center gap-2">
          {(ticket.unreadCount ?? 0) > 0 && (
            <span
              className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-iris-500 px-1.5 text-[11px] font-semibold text-white"
              aria-label={`${ticket.unreadCount} unread replies`}
            >
              {ticket.unreadCount}
            </span>
          )}
          <time dateTime={ticket.updatedAt} className="text-xs text-fog">
            {formatRelative(ticket.updatedAt)}
          </time>
        </div>
      </div>

      {/* User: avatar + name + company email */}
      <div className="mt-3 flex items-center gap-3">
        <UserAvatar email={requesterEmail(requester)} name={requester} className="size-10" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-pearl">{requester}</p>
          <p className="truncate text-xs text-fog">{requesterEmail(requester)}</p>
        </div>
      </div>

      {/* Issue */}
      <Link
        href={`/desk/tickets/${ticket.id}`}
        className="mt-3 block text-[15px] font-semibold tracking-tight text-pearl underline-offset-4 hover:underline"
      >
        {ticket.title}
      </Link>
      <p className="mt-0.5 text-xs text-fog">{categoryName(ticket.categoryId)}</p>

      {/* Description */}
      <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-mist break-words">{ticket.description}</p>

      {/* Metadata: status + priority, then ownership / SLA. Status and owner
          always pair so Pending/Unassigned vs Pending/Mine read differently. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <StatusBadge status={ticket.status} size="sm" />
        <PriorityBadge priority={ticket.priority} size="sm" />
        <span className="text-xs text-fog" title={hint ?? undefined}>
          {ownershipLabel(ticket)}
          {hint ? ` · ${hint}` : ""}
        </span>
        <LockBadge ticket={ticket} />
        <SlaBadge ticket={ticket} />
      </div>

      {/* Action: assignment state drives the button. Resolved never acts. */}
      {!isTerminal && (canClaim || canRelease || canAssign) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {canClaim && (
            <span data-action="claim" className="contents">
              <ClaimButton ticket={ticket} className="w-full sm:w-auto" />
            </span>
          )}
          {canAssign && (
            <span data-action="assign">
              <AssignDialog ticket={ticket} agents={agents} />
            </span>
          )}
          {canRelease && (
            <span data-action="release">
              <ReleaseDialog ticket={ticket} />
            </span>
          )}
        </div>
      )}

      {ticket.previousRelease && (
        <div className="mt-2">
          <PreviousReleaseMarker ticket={ticket} />
        </div>
      )}
    </article>
  );
}
