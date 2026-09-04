import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AgentTable } from "@/features/admin/AgentTable";
import { resetAgents, mockAgents } from "@/mocks/fixtures";
import { renderWithProviders } from "@/test/render";

describe("AgentTable", () => {
  it("FE-1.7: deactivate names the open-ticket count and marks the row Deactivated", async () => {
    resetAgents();
    const user = userEvent.setup();
    const target = mockAgents.find((agent) => agent.openTickets > 0 && agent.status === "active")!;
    renderWithProviders(<AgentTable initialAgents={mockAgents} />);
    const rows = screen.getAllByRole("row");
    const targetRow = rows.find((row) => row.textContent?.includes(target.email))!;
    await user.click(targetRow.querySelector("button")!);
    expect(await screen.findByText(new RegExp(`Their ${target.openTickets} open tickets`))).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Deactivate$/ }));
    expect(await screen.findByText(/deactivated/)).toBeInTheDocument();
  });
});
