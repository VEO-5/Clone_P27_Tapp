import type { TicketEvent } from "@pearl27/contracts";

import { Timeline } from "@/components/ui/Timeline";
import type { TicketEvent as LegacyEvent } from "@/lib/types";

const STATUS_TYPES = new Set(["created", "status_changed", "reopened", "resolved"]);

function actorLabel(actor?: string): "You" | "Support" | "System" {
  if (actor === "employee") return "You";
  if (actor === "agent" || actor === "support") return "Support";
  return "System";
}

/**
 * Employee status timeline: status events only, chronological (FE-2.18).
 * Messages, internal notes, assignments, and releases never render here.
 */
export function StatusTimeline({ events }: { events?: TicketEvent[] | null }) {
  const visible = (events ?? [])
    .filter((event) => STATUS_TYPES.has(event.type))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(
      (event): LegacyEvent => ({
        id: event.id,
        ticketId: event.ticketId,
        type: event.type === "created" ? "created" : "status_changed",
        message: event.message
          ? `${actorLabel(event.actor)} · ${event.message}`
          : event.type === "created"
            ? "You submitted this ticket"
            : `${actorLabel(event.actor)} · status updated`,
        actor: event.actor === "employee" ? "employee" : event.actor === "agent" ? "support" : "system",
        createdAt: event.createdAt,
      }),
    );
  return <Timeline events={visible} />;
}
