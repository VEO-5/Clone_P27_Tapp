import { Lock } from "lucide-react";
import type { DeskTicket } from "@pearl27/contracts";

/** Padlock + owner when another agent holds the ticket. */
export function LockBadge({ ticket }: { ticket: DeskTicket }) {
  if (!ticket.lock?.lockedByOther) return null;
  return (
    <span className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ink-600 bg-ink-800/60 px-3 text-xs text-mist sm:min-h-0 sm:py-1">
      <Lock className="size-3.5" aria-hidden />
      {ticket.lock.ownerName ?? "Locked"}
    </span>
  );
}

/** SLA indicator: red when breached, amber when due soon, quiet otherwise. */
export function SlaBadge({ ticket }: { ticket: DeskTicket }) {
  const sla = ticket.sla;
  if (!sla?.dueAt) return null;
  if (sla.breached) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-rose-400" role="status">
        <span className="size-1.5 rounded-full bg-rose-400" aria-hidden />
        Breached {relative(sla.dueAt)} ago
      </span>
    );
  }
  if (sla.breachingSoon) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-gold-400" role="status">
        <span className="size-1.5 rounded-full bg-gold-400" aria-hidden />
        Due in {relativeFuture(sla.dueAt)}
      </span>
    );
  }
  return null;
}

function relative(iso: string): string {
  const hours = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000));
  if (hours < 1) return "under an hour";
  if (hours < 24) return `${hours} h`;
  return `${Math.round(hours / 24)} d`;
}

function relativeFuture(iso: string): string {
  const hours = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000));
  if (hours < 1) return "under an hour";
  if (hours < 24) return `${hours} h`;
  return `${Math.round(hours / 24)} d`;
}

/** "Previously In progress · Ada · released 2 days ago · reason…" */
export function PreviousReleaseMarker({ ticket }: { ticket: DeskTicket }) {
  const prev = ticket.previousRelease;
  if (!prev) return null;
  return (
    <p className="text-[12px] text-fog">
      Previously {label(prev.status)} · {prev.agentName} · released {relative(prev.releasedAt)} ago
      {prev.reason ? ` · ${prev.reason}` : ""}
    </p>
  );
}

function label(status: string): string {
  return status === "in_progress" ? "In progress" : status[0]!.toUpperCase() + status.slice(1);
}
