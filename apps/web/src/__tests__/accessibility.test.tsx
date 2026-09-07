import { render, renderWithProviders, screen } from "@/test/render";
import axeCore from "axe-core";
import { describe, expect, it } from "vitest";

import { PriorityBadge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/shadcn/button";
import { QueueRow } from "@/features/desk/QueueRow";
import { listDeskTickets } from "@/mocks/desk";
import { setMockSession } from "@/mocks/fixtures";

/** FE-6.4: WCAG 2.2 AA regression — structural, labels, and roles. */
describe("WCAG 2.2 AA audit (FE-6.4)", () => {
  it("paper + night badges are axe clean", async () => {
    setMockSession("agent");
    const ticket = listDeskTickets()[0]!;
    const { container } = render(
      <>
        <StatusBadge status={ticket.status} />
        <PriorityBadge priority={ticket.priority} />
        <StatusBadge status={ticket.status} surface="night" />
        <PriorityBadge priority={ticket.priority} surface="night" />
      </>,
    );
    const results = await axeCore.run(container);
    expect(results.violations).toEqual([]);
  });

  it("button variants keep labels and aa structure", async () => {
    const { container } = render(
      <>
        <Button>Save</Button>
        <Button variant="secondary">Cancel</Button>
        <Button variant="ghost" aria-label="Clear all filters" />
      </>,
    );
    expect(screen.getByRole("button", { name: "Clear all filters" })).toBeInTheDocument();
    const results = await axeCore.run(container);
    expect(results.violations).toEqual([]);
  });

  it("queue row with sla + ownership controls is axe clean", async () => {
    setMockSession("agent");
    const breaching = listDeskTickets().find((t) => t.sla?.breachingSoon) ?? listDeskTickets()[0]!;
    const { container } = renderWithProviders(<QueueRow ticket={breaching} role="agent" agents={[]} />);
    expect(screen.getByRole("article")).toHaveAccessibleName();
    const results = await axeCore.run(container);
    expect(results.violations).toEqual([]);
  });
});