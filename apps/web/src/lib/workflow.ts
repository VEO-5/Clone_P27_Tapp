import type { Ticket, TicketActor, TicketEventType, TicketStatus } from "./types";
import { PRIORITY_LABELS, STATUS_LABELS } from "./types";
import type { UpdateTicketInput } from "./validation";

export interface NewEvent {
  type: TicketEventType;
  message: string;
  actor: TicketActor;
}

export interface TicketPatch {
  status?: TicketStatus;
  priority?: Ticket["priority"];
  resolvedAt?: string | null;
}

export interface UpdatePlan {
  patch: TicketPatch;
  events: NewEvent[];
  /** True when this update is the transition *into* `resolved`. */
  notifyResolved: boolean;
}

/**
 * Pure translation of an admin update into the database patch and the timeline
 * events it should produce. Keeping it free of I/O means the status workflow is
 * unit-testable and behaves identically on both storage backends.
 */
export function planUpdate(ticket: Ticket, input: UpdateTicketInput): UpdatePlan {
  const patch: TicketPatch = {};
  const events: NewEvent[] = [];
  let notifyResolved = false;

  if (input.status && input.status !== ticket.status) {
    patch.status = input.status;
    events.push({
      type: "status_changed",
      message: `Status changed from ${STATUS_LABELS[ticket.status]} to ${STATUS_LABELS[input.status]}`,
      actor: "support",
    });

    if (input.status === "resolved") {
      patch.resolvedAt = new Date().toISOString();
      notifyResolved = true;
    } else if (ticket.status === "resolved" && input.status !== "closed") {
      // Reopened — the resolution timestamp no longer applies.
      patch.resolvedAt = null;
    }
  }

  if (input.priority && input.priority !== ticket.priority) {
    patch.priority = input.priority;
    events.push({
      type: "priority_changed",
      message: `Priority changed from ${PRIORITY_LABELS[ticket.priority]} to ${PRIORITY_LABELS[input.priority]}`,
      actor: "support",
    });
  }

  if (input.reply) {
    events.push({ type: "reply", message: input.reply, actor: "support" });
  }

  return { patch, events, notifyResolved };
}
