// @ts-nocheck
"use client";

import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Assignee, DeskTicket } from "@pearl27/contracts";
import { PRIORITY_LABELS, STATUS_LABELS } from "@pearl27/contracts";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/shadcn/button";
import { UserAvatar } from "@/components/UserAvatar";
import { PriorityIcon, StatusIcon } from "@/components/ui/Badge";
import { categoryName } from "@/features/tickets/categories";
import { ApiError, apiFetch } from "@/lib/api";
import { formatDateTime, formatRelative, requesterEmail } from "@/lib/utils";

import { AssignDialog, ReleaseDialog } from "./OwnershipDialogs";
import { invalidateDesk, ownershipLabel, useOwnership } from "./ownership";

/**
 * Support-ticket data table (Image-2 structure):
 * one container, header row, one <tr> per ticket.
 * Labels come from @pearl27/contracts — never hard-coded.
 * Column widths: S/N 4 / User 20 / Issue 34 / Status 11 / Priority 10 / Submitted 10 / Actions 11.
 */

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Status + Priority chips (light pastel chips with a Lucide icon, per design)
// Icons come from the shared badge config — same icon language as the cards.
// ---------------------------------------------------------------------------

const STATUS_DOT_STYLES: Record<DeskTicket["status"], string> = {
  pending: "bg-orange-100 text-orange-700",
  open: "bg-green-100 text-green-700",
  in_progress: "bg-blue-100 text-blue-700",
  resolved: "bg-emerald-100 text-emerald-700",
};

const STATUS_ICON: Record<DeskTicket["status"], string> = {
  pending: "text-orange-600",
  open: "text-green-600",
  in_progress: "text-blue-600",
  resolved: "text-emerald-600",
};

export function TicketStatusDot({ status }: { status: DeskTicket["status"] }) {
  return (
    <span
      className={`inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-[4px] px-2 text-[12px] font-medium sm:min-h-7 ${STATUS_DOT_STYLES[status]}`}
    >
      <StatusIcon status={status} className={`size-3 ${STATUS_ICON[status]}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}

const PRIORITY_DOT_STYLES: Record<DeskTicket["priority"], string> = {
  low: "bg-blue-50 text-blue-700",
  medium: "bg-orange-100 text-orange-700",
  high: "bg-rose-100 text-rose-700",
  urgent: "bg-rose-100 text-rose-700",
};

const PRIORITY_ICON: Record<DeskTicket["priority"], string> = {
  low: "text-blue-600",
  medium: "text-orange-600",
  high: "text-rose-500",
  urgent: "text-rose-600",
};

export function TicketPriorityDot({ priority }: { priority: DeskTicket["priority"] }) {
  return (
    <span
      className={`inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-[4px] px-2 text-[12px] font-medium sm:min-h-7 ${PRIORITY_DOT_STYLES[priority]}`}
    >
      <span className={priority === "urgent" ? "animate-pulse" : undefined}>
        <PriorityIcon priority={priority} className={`size-3 ${PRIORITY_ICON[priority]}`} />
      </span>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// UserCell: 32px avatar, 14px/600 name, gray email — compact so 6+ rows fit
// the queue frame at a glance.
// ---------------------------------------------------------------------------

export function UserCell({ ticket }: { ticket: DeskTicket }) {
  const name = ticket.requesterName ?? "Employee";
  const email = requesterEmail(name);
  return (
    <div className="flex items-center gap-2">
      <UserAvatar email={email} name={name} className="size-8" />
      <div className="min-w-0">
        <p className="truncate text-[14px] font-semibold text-pearl">{name}</p>
        <p className="truncate text-[12px] text-fog">{email}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// IssueCell: ref (blue) → bold title → gray category → 2-line description
// ---------------------------------------------------------------------------

export function IssueCell({ ticket }: { ticket: DeskTicket }) {
  return (
    <div className="min-w-0">
      <p className="mono-ref text-[11.5px] font-semibold text-iris-700">{ticket.reference}</p>
      <Link
        to={`/desk/tickets/${ticket.id}`}
        className="mt-px block truncate text-[14px] font-semibold text-pearl underline-offset-4 hover:underline"
      >
        {ticket.title}
      </Link>
      <p className="mt-px truncate text-[12px] text-fog">{categoryName(ticket.categoryId)}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SubmittedTime: relative + absolute on hover
// ---------------------------------------------------------------------------

export function SubmittedTime({ ticket }: { ticket: DeskTicket }) {
  return (
    <time dateTime={ticket.createdAt} title={formatDateTime(ticket.createdAt)} className="whitespace-nowrap text-[12.5px] text-mist">
      {formatRelative(ticket.createdAt)}
    </time>
  );
}

// ---------------------------------------------------------------------------
// AssignmentButton: stateful — Assign to me → Release → Assigned to X
// ---------------------------------------------------------------------------

function AssignmentButton({ ticket }: { ticket: DeskTicket }) {
  const queryClient = useQueryClient();
  const [claiming, setClaiming] = useState(false);

  if (ticket.assignee) return null;

  async function claim() {
    if (claiming) return;
    setClaiming(true);
    try {
      await apiFetch(`/desk/tickets/${ticket.id}/claim`, { method: "POST" });
      await invalidateDesk(queryClient);
      toast.success("Assigned to you");
    } catch (error) {
      if (error instanceof ApiError && error.code === "ALREADY_ASSIGNED") {
        const assignee = error.details?.assignee as { name?: string } | undefined;
        toast.error(`Already taken by ${assignee?.name ?? "another agent"}`);
        await invalidateDesk(queryClient);
      } else {
        toast.error(error instanceof Error ? error.message : "Couldn't assign this ticket.");
      }
    } finally {
      setClaiming(false);
    }
  }

  return (
    <span data-action="claim">
      <Button
        size="sm"
        onClick={() => void claim()}
        disabled={claiming}
        aria-label={`Assign ${ticket.reference} to me`}
        aria-busy={claiming || undefined}
        className="min-h-10 whitespace-nowrap rounded-[4px] bg-gold-400 px-2.5 text-[13px] font-semibold text-pearl hover:bg-iris-600 hover:text-white"
      >
        {claiming && <Loader2 className="animate-spin" aria-hidden />}
        Assign to me
      </Button>
    </span>
  );
}

// ---------------------------------------------------------------------------
// TicketActions: assignment state only (Assign to me / Release / Assign…).
// NOTE: no Delete/trash — the API (§3) has no delete-ticket endpoint.
// ---------------------------------------------------------------------------

export function TicketActions({
  ticket,
  role,
  agents,
}: {
  ticket: DeskTicket;
  role: "agent" | "admin";
  agents: Assignee[];
}) {
  const { mine, canClaim, canRelease, canAssign, isTerminal } = useOwnership(ticket, role);

  // Resolved is terminal: history stays visible in All, but no ownership
  // actions for anyone (reopen via status change first).
  if (isTerminal) {
    return (
      <span className="whitespace-nowrap text-[12.5px] text-fog" title="Resolved — read only">
        → {ticket.assignee?.name ?? "Unassigned"}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      {canClaim ? (
        <AssignmentButton ticket={ticket} />
      ) : mine && canRelease ? (
        <span data-action="release">
          <ReleaseDialog ticket={ticket} />
        </span>
      ) : ticket.assignee ? (
        <span className="whitespace-nowrap text-[12.5px] text-fog" title={ownershipLabel(ticket)}>
          → {ticket.assignee.name}
        </span>
      ) : null}
      {canAssign && (
        <span data-action="assign">
          <AssignDialog ticket={ticket} agents={agents} />
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// TicketRow + TicketTable
// ---------------------------------------------------------------------------

export function TicketRow({
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
  return (
    <tr
      aria-label={`${ticket.reference} ${ticket.title}`}
      data-ticket-row={ticket.id}
      tabIndex={focused ? 0 : -1}
      data-focused={focused || undefined}
      onClick={() => onFocusIndex?.(index ?? 0)}
      className={`bg-white transition-colors last:[&_td]:border-b-0 hover:bg-ink-900/60 ${focused ? "bg-ink-900/60 outline outline-2 outline-iris-400" : ""}`}
    >
      <td className="w-[4%] border-b border-ink-700 px-2 py-1.5 align-top">
        <span className="text-[12.5px] tabular-nums text-fog">{(index ?? 0) + 1}</span>
      </td>
      <td className="w-[20%] min-w-48 border-b border-ink-700 px-4 py-1.5 align-top">
        <UserCell ticket={ticket} />
      </td>
      <td className="w-[34%] min-w-64 border-b border-ink-700 px-4 py-1.5 align-top">
        <IssueCell ticket={ticket} />
      </td>
      <td className="w-[11%] border-b border-ink-700 px-2.5 py-1.5 align-middle">
        <TicketStatusDot status={ticket.status} />
      </td>
      <td className="w-[10%] border-b border-ink-700 px-2.5 py-1.5 align-middle">
        <TicketPriorityDot priority={ticket.priority} />
      </td>
      <td className="w-[10%] border-b border-ink-700 px-2.5 py-1.5 align-middle">
        <SubmittedTime ticket={ticket} />
      </td>
      <td className="w-[11%] border-b border-ink-700 px-2.5 py-1.5 align-middle">
        <TicketActions ticket={ticket} role={role} agents={agents} />
      </td>
    </tr>
  );
}

const HEADER_CELL = "sticky top-0 z-10 border-b border-ink-700 bg-white px-4 py-2.5 text-left text-[14px] font-medium text-fog";

/** One large table container — header + one row per ticket. */
export function TicketTable({
  tickets,
  role,
  agents,
  focusedIndex = -1,
  onFocusIndex,
  footer,
  frameClassName,
}: {
  tickets: DeskTicket[];
  role: "agent" | "admin";
  agents: Assignee[];
  focusedIndex?: number;
  onFocusIndex?: (index: number) => void;
  /** Rendered inside the scroll frame, after the last row (e.g. Load more). */
  footer?: React.ReactNode;
  /** Extra classes on the scroll frame (e.g. `slim-scrollbar` on the queue page). */
  frameClassName?: string;
}) {
  return (
    <div className={`overflow-x-auto rounded-[4px] border border-ink-700 bg-white shadow-[0_1px_2px_rgba(27,42,74,0.06)] lg:min-h-0 lg:flex-1 lg:overflow-y-auto${frameClassName ? ` ${frameClassName}` : ""}`}>
      <table aria-label="Support tickets" className="w-full min-w-240 border-separate border-spacing-0">
        <colgroup>
          <col style={{ width: "4%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "34%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "11%" }} />
        </colgroup>
        <thead>
          <tr className="bg-white">
            <th scope="col" className={`${HEADER_CELL} px-2`}>
              S/N
            </th>
            <th scope="col" className={HEADER_CELL}>
              User
            </th>
            <th scope="col" className={HEADER_CELL}>
              Issue / Description
            </th>
            <th scope="col" className={`${HEADER_CELL} px-3`}>
              Status
            </th>
            <th scope="col" className={`${HEADER_CELL} px-3`}>
              Priority
            </th>
            <th scope="col" className={`${HEADER_CELL} px-3`}>
              Submitted
            </th>
            <th scope="col" className={`${HEADER_CELL} px-3`}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket, i) => (
            <TicketRow
              key={ticket.id}
              ticket={ticket}
              role={role}
              agents={agents}
              index={i}
              focused={i === focusedIndex}
              onFocusIndex={onFocusIndex}
            />
          ))}
        </tbody>
      </table>
      {footer && <div className="flex justify-center border-t border-ink-700 bg-white px-4 py-3">{footer}</div>}
    </div>
  );
}
