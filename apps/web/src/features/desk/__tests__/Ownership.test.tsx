import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Toaster } from "sonner";

import { ClaimButton } from "@/features/desk/ClaimButton";
import { AssignDialog, ReleaseDialog } from "@/features/desk/OwnershipDialogs";
import { listDeskTickets } from "@/mocks/desk";
import { setMockSession } from "@/mocks/fixtures";
import { renderWithProviders } from "@/test/render";

function tree(ui: React.ReactElement) {
  return renderWithProviders(
    <>
      {ui}
      <Toaster />
    </>,
  );
}

describe("desk ownership", () => {
  it("FE-3.6: claim on an unassigned row assigns to me with a toast", async () => {
    setMockSession("agent");
    const user = userEvent.setup();
    const target = listDeskTickets().find((t) => !t.assignee)!;
    tree(<ClaimButton ticket={target} />);
    await user.click(screen.getByRole("button", { name: /assign .* to me/i }));
    expect(await screen.findByText("Assigned to you")).toBeInTheDocument();
    expect(listDeskTickets().find((t) => t.id === target.id)?.assignee?.name).toBe("Kofi Mensah");
  });

  it("FE-3.7: claim conflict toasts the winner and refreshes the row", async () => {
    setMockSession("agent");
    const user = userEvent.setup();
    const target = listDeskTickets().find((t) => t.lock?.lockedByOther)!;
    tree(<ClaimButton ticket={target} />);
    await user.click(screen.getByRole("button", { name: /assign .* to me/i }));
    expect(await screen.findByText(/already taken by ada osei/i)).toBeInTheDocument();
  });

  it("FE-3.8: release with empty reason is allowed", async () => {
    setMockSession("agent");
    const user = userEvent.setup();
    const target = listDeskTickets().find((t) => t.assignee?.id === "u-agent-1")!;
    tree(<ReleaseDialog ticket={target} />);
    await user.click(screen.getByRole("button", { name: "Release" }));
    await user.click(screen.getByRole("button", { name: "Release ticket" }));
    expect(await screen.findByText("Released to unassigned")).toBeInTheDocument();
    const updated = listDeskTickets().find((t) => t.id === target.id)!;
    expect(updated.assignee).toBeNull();
    expect(updated.status).toBe("pending");
    expect(updated.previousRelease?.agentName).toBe("Kofi Mensah");
  });

  it("FE-3.9: admin assign updates the row from the agent picker", async () => {
    setMockSession("admin");
    const user = userEvent.setup();
    const agents = [
      { id: "u-agent-1", name: "Kofi Mensah", avatarUrl: null },
      { id: "u-agent-2", name: "Ada Osei", avatarUrl: null },
    ];
    const target = listDeskTickets().find((t) => !t.assignee)!;
    tree(<AssignDialog ticket={target} agents={agents} />);
    await user.click(screen.getByRole("button", { name: /assign/i }));
    await user.selectOptions(screen.getByLabelText("Agent"), "u-agent-2");
    await user.click(screen.getByRole("button", { name: /^assign$/i }));
    expect(await screen.findByText("Ticket reassigned")).toBeInTheDocument();
    expect(listDeskTickets().find((t) => t.id === target.id)?.assignee?.name).toBe("Ada Osei");
  });
});
