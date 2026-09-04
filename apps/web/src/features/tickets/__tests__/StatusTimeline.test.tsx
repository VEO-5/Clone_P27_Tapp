import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TicketEvent } from "@pearl27/contracts";

import { StatusTimeline } from "@/features/tickets/StatusTimeline";

const base = { ticketId: "t-1" };

describe("StatusTimeline (FE-2.18)", () => {
  it("renders status events chronologically with You/Support/System labels", () => {
    const events: TicketEvent[] = [
      { ...base, id: "e3", type: "resolved", actor: "agent", message: "Resolved · Fixed", createdAt: "2026-09-03T12:00:00Z" },
      { ...base, id: "e1", type: "created", actor: "employee", createdAt: "2026-09-01T12:00:00Z" },
      { ...base, id: "e2", type: "status_changed", actor: "agent", message: "In progress", createdAt: "2026-09-02T12:00:00Z" },
    ];
    render(<StatusTimeline events={events} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]?.textContent).toMatch(/You/);
    expect(items[1]?.textContent).toMatch(/Support/);
    expect(items[2]?.textContent).toMatch(/System|Support/);
  });

  it("hides messages, internal notes, and assignment events", () => {
    const events: TicketEvent[] = [
      { ...base, id: "e1", type: "created", actor: "employee", createdAt: "2026-09-01T12:00:00Z" },
      { ...base, id: "m1", type: "message", actor: "agent", message: "Secret chat", createdAt: "2026-09-02T12:00:00Z" },
      { ...base, id: "n1", type: "internal_note", actor: "agent", message: "Internal only", createdAt: "2026-09-02T13:00:00Z" },
      { ...base, id: "a1", type: "assigned", actor: "system", message: "Assigned to Kofi", createdAt: "2026-09-02T14:00:00Z" },
    ];
    render(<StatusTimeline events={events} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.queryByText(/secret chat/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/internal only/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/assigned to kofi/i)).not.toBeInTheDocument();
  });
});
