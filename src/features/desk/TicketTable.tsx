// @ts-nocheck
"use client";

import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Assignee, DeskTicket } from "@pearl27/contracts";
import { PRIORITY_LABELS, STATUS_LABELS } from "@pearl27/contracts";
import { GripVertical, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/shadcn/button";
import { UserAvatar } from "@/components/UserAvatar";
import { PriorityIcon, StatusIcon } from "@/components/ui/Badge";
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

// Image 1 density + Image 2 pill language: pill is white with thin ink border,
// icon carries the semantic color. Keeps brand pearl for text, not tinted
// chip fills — matches the  `Done` / `In Process` pills you shared.
const STATUS_ICON: Record<DeskTicket["status"], string> = {
  pending: "text-amber-600",
  open: "text-pearl-dim",
  in_progress: "text-mist",
  resolved: "text-emerald-600",
};

export function TicketStatusDot({ status }: { status: DeskTicket["status"] }) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full border border-ink-600 bg-white px-2.5 text-[12px] font-medium text-black">
      <StatusIcon status={status} className={`size-3.5 ${STATUS_ICON[status]}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}

// Priority pill mirrors Section Type chip in Image 1: neutral outline pill.
const PRIORITY_ICON: Record<DeskTicket["priority"], string> = {
  low: "text-black/40",
  medium: "text-amber-600",
  high: "text-orange-600",
  urgent: "text-rose-600",
};

export function TicketPriorityDot({ priority }: { priority: DeskTicket["priority"] }) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full border border-ink-600 bg-white px-2.5 text-[12px] font-medium text-black">
      <span className={priority === "urgent" ? "animate-pulse" : undefined}>
        <PriorityIcon priority={priority} className={`size-3.5 ${PRIORITY_ICON[priority]}`} />
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
  // Prefer the real requester email from the API; the derived address is a
  // last-resort fallback for mock/legacy rows without one.
  const email = ticket.requesterEmail ?? requesterEmail(name);
  return (
    <div className="flex items-center gap-2">
      <UserAvatar email={email} name={name} avatarUrl={ticket.requesterAvatarUrl ?? null} className="size-8" />
      <div className="min-w-0">
        <p className="truncate text-[14px] font-semibold text-black">{name}</p>
        <p className="truncate text-[12px] text-black/60">{email}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// IssueCell: ref (tertiary black) → bold title (primary black). Category
// removed per design — keeps 2-line density like Image 1.
// ---------------------------------------------------------------------------

export function IssueCell({ ticket }: { ticket: DeskTicket }) {
  return (
    <div className="min-w-0">
      <p className="mono-ref text-[11px] font-medium tracking-wide text-black/50">{ticket.reference}</p>
      <Link
        to={`/desk/tickets/${ticket.id}`}
        className="mt-px block truncate text-[14px] font-semibold text-black underline-offset-4 hover:underline"
      >
        {ticket.title}
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SubmittedTime: relative + absolute on hover
// ---------------------------------------------------------------------------

export function SubmittedTime({ ticket }: { ticket: DeskTicket }) {
  return (
    <time dateTime={ticket.createdAt} title={formatDateTime(ticket.createdAt)} className="whitespace-nowrap text-[12.5px] text-black/60">
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
        className="min-h-10 whitespace-nowrap rounded-[4px] bg-gold-400 px-2.5 text-[13px] font-semibold text-black hover:bg-iris-600 hover:text-white"
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
      className={`group bg-white outline-none transition-colors last:[&_td]:border-b-0 hover:bg-ink-900/40 focus:outline-none focus-visible:outline-none ${focused ? "bg-ink-900/40" : ""}`}
    >
      <td className="w-[3%] border-b border-ink-700 px-1 py-3 align-middle">
        <span
          className="flex size-6 items-center justify-center rounded text-fog/60 group-hover:text-fog"
          aria-hidden
          title="Drag to reorder"
        >
          <GripVertical className="size-3.5" />
        </span>
      </td>
      <td className="w-[3%] border-b border-ink-700 px-1 py-3 align-middle">
        <span className="text-[12.5px] tabular-nums text-black/50">{(index ?? 0) + 1}</span>
      </td>
      <td className="w-[19%] min-w-44 border-b border-ink-700 px-3 py-3 align-middle">
        <UserCell ticket={ticket} />
      </td>
      <td className="w-[32%] min-w-56 border-b border-ink-700 px-3 py-3 align-middle">
        <IssueCell ticket={ticket} />
      </td>
      <td className="w-[11%] border-b border-ink-700 px-2.5 py-3 align-middle">
        <TicketStatusDot status={ticket.status} />
      </td>
      <td className="w-[10%] border-b border-ink-700 px-2.5 py-3 align-middle">
        <TicketPriorityDot priority={ticket.priority} />
      </td>
      <td className="w-[10%] border-b border-ink-700 px-2.5 py-3 align-middle">
        <SubmittedTime ticket={ticket} />
      </td>
      <td className="w-[12%] border-b border-ink-700 px-2.5 py-3 align-middle">
        <TicketActions ticket={ticket} role={role} agents={agents} />
      </td>
    </tr>
  );
}

const HEADER_CELL = "sticky top-0 z-10 border-b border-ink-700 bg-ink-900 px-3 py-2.5 text-left text-[13px] font-semibold text-black";

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
    <div className={`overflow-x-auto rounded-lg border border-ink-700 bg-white shadow-[0_1px_2px_rgba(27,42,74,0.06)] lg:min-h-0 lg:flex-1 lg:overflow-y-auto${frameClassName ? ` ${frameClassName}` : ""}`}>
      <table aria-label="Support tickets" className="w-full min-w-240 border-separate border-spacing-0">
        <colgroup>
          <col style={{ width: "3%" }} />
          <col style={{ width: "3%" }} />
          <col style={{ width: "19%" }} />
          <col style={{ width: "32%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "12%" }} />
        </colgroup>
        <thead>
          <tr className="bg-ink-900">
            <th scope="col" className={`${HEADER_CELL} px-1`} aria-label="Drag">
              <span className="sr-only">Drag</span>
            </th>
            <th scope="col" className={`${HEADER_CELL} px-1`}>
              #
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
