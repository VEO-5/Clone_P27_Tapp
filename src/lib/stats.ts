import type { Ticket, TicketStats } from "./types";

export function computeStats(tickets: Ticket[]): TicketStats {
  let open = 0;
  let inProgress = 0;
  let resolved = 0;
  let closed = 0;
  for (const ticket of tickets) {
    if (ticket.status === "open") open += 1;
    else if (ticket.status === "in_progress") inProgress += 1;
    else if (ticket.status === "resolved") resolved += 1;
    else if (ticket.status === "closed") closed += 1;
  }
  return { open, inProgress, resolved, closed, total: tickets.length };
}
