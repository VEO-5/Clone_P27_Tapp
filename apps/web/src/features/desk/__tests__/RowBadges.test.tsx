import { render, screen } from "@testing-library/react";
import axeCore from "axe-core";
import { describe, expect, it } from "vitest";

import { DashboardCharts } from "@/features/desk/DashboardCharts";
import { LockBadge, PreviousReleaseMarker, SlaBadge } from "@/features/desk/RowBadges";
import { listDeskTickets } from "@/mocks/desk";
import { setMockSession } from "@/mocks/fixtures";
import { deskDashboard } from "@/mocks/desk";

describe("queue row badges", () => {
  it("FE-3.10: SLA breaching-soon and breached copy", () => {
    setMockSession("agent");
    const soon = listDeskTickets().find((t) => t.sla?.breachingSoon)!;
    const { unmount } = render(<SlaBadge ticket={soon} />);
    expect(screen.getByRole("status")).toHaveTextContent(/due in \d+ h/i);
    unmount();
    const breached = listDeskTickets().find((t) => t.sla?.breached)!;
    render(<SlaBadge ticket={breached} />);
    expect(screen.getByRole("status")).toHaveTextContent(/breached/i);
  });

  it("FE-3.11: previous-release marker names status, agent, and time", () => {
    setMockSession("agent");
    const target = listDeskTickets().find((t) => t.previousRelease)!;
    render(<PreviousReleaseMarker ticket={target} />);
    expect(screen.getByText(/previously in progress · ada osei · released/i)).toBeInTheDocument();
  });

  it("FE-3.5 (unit): locked-by-other rows carry the padlock", () => {
    setMockSession("agent");
    const target = listDeskTickets().find((t) => t.lock?.lockedByOther)!;
    render(<LockBadge ticket={target} />);
    expect(screen.getByText(/ada osei|agent/i)).toBeInTheDocument();
  });
});

describe("dashboard charts (FE-3.16)", () => {
  it("each chart has a hidden data table and a text summary, axe clean", async () => {
    const { series } = deskDashboard(7);
    const { container } = render(<DashboardCharts series={series} />);
    const tables = container.querySelectorAll("table");
    expect(tables.length).toBe(4);
    expect(screen.getByText(/received, .* resolved in the last 7 days/i)).toBeInTheDocument();
    const results = await axeCore.run(container);
    expect(results.violations).toEqual([]);
  });
});
