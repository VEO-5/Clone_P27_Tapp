"use client";

import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { DeskTicket } from "@pearl27/contracts";

export type DeskRole = "agent" | "admin";

/**
 * Single source of truth for assignment UI (senior-dev uniform rules):
 * - Resolved is terminal: no claim / release / assign for anyone. Reopen via
 *   status change first — Release must never regress resolved → pending.
 * - Unassigned → claim (agents) / assign (admin). Nothing to release.
 * - Owned + active (pending/open/in_progress) → release for owner; admins
 *   keep override (release + assign) on anyone's ticket.
 * - Agents never see the admin picker; admins never "claim".
 */
export function ownershipRules(ticket: DeskTicket, role: DeskRole) {
  const lockedByOther = ticket.lock?.lockedByOther ?? false;
  const unassigned = !ticket.assignee;
  const isTerminal = ticket.status === "resolved";
  const mine = !unassigned && !lockedByOther;

  const canClaim = !isTerminal && role !== "admin" && unassigned && !lockedByOther;
  // Admin override: admins work any non-terminal ticket (assign + release),
  // even when locked to another agent. Agents are owner-only.
  const canRelease = !isTerminal && !unassigned && (role === "admin" || mine);
  const canAssign = !isTerminal && role === "admin";

  return { lockedByOther, unassigned, isTerminal, mine, canClaim, canRelease, canAssign };
}

export function useOwnership(ticket: DeskTicket, role: DeskRole) {
  return ownershipRules(ticket, role);
}

/** One invalidation for every ownership mutation — queue, detail, dashboard, activity. */
export function invalidateDesk(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["desk", "tickets"] }),
    queryClient.invalidateQueries({ queryKey: ["desk", "ticket"] }),
    queryClient.invalidateQueries({ queryKey: ["desk", "dashboard"] }),
    queryClient.invalidateQueries({ queryKey: ["desk", "activity"] }),
  ]);
}

export function useInvalidateDesk() {
  const queryClient = useQueryClient();
  return () => invalidateDesk(queryClient);
}

/**
 * Paired status · ownership label so Pending/Open stop looking identical:
 * "Unassigned · Pending — Needs pickup" vs "Assigned to me · Open — Ready".
 */
export function ownershipLabel(ticket: DeskTicket): string {
  if (!ticket.assignee) return "Unassigned";
  if (ticket.lock?.lockedByOther) return `Assigned to ${ticket.assignee.name}`;
  return "Assigned to me";
}

export function ownershipHint(ticket: DeskTicket): string | null {
  if (ticket.status === "resolved") return "Resolved — read only";
  if (!ticket.assignee && ticket.status === "pending") return "Needs pickup";
  if (ticket.assignee && ticket.status === "pending" && !ticket.lock?.lockedByOther)
    return "Not opened yet — open it to start";
  if (ticket.status === "open") return "Ready to work";
  if (ticket.status === "in_progress") return "Actively being worked";
  return null;
}
