import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Toaster } from "sonner";

import { ClaimButton } from "@/features/desk/ClaimButton";
import { AssignDialog, ReleaseDialog } from "@/features/desk/OwnershipDialogs";
import { TicketActions } from "@/features/desk/TicketTable";
import { ownershipRules } from "@/features/desk/ownership";
import {
  assignTicket,
  claimTicket,
  listDeskTickets,
  listOwnershipAudit,
  queryDeskTickets,
  releaseTicket,
} from "@/mocks/desk";
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
    const target = listDeskTickets().find((t) => !t.assignee && t.status !== "resolved")!;
    tree(<AssignDialog ticket={target} agents={agents} />);
    await user.click(screen.getByRole("button", { name: /assign/i }));
    await user.selectOptions(screen.getByLabelText("Agent"), "u-agent-2");
    await user.click(screen.getByRole("button", { name: /^assign$/i }));
    expect(await screen.findByText("Ticket reassigned")).toBeInTheDocument();
    expect(listDeskTickets().find((t) => t.id === target.id)?.assignee?.name).toBe("Ada Osei");
  });

  it("uniform rules: resolved is terminal — no claim/release/assign actions", async () => {
    setMockSession("agent");
    const resolved = listDeskTickets().find((t) => t.status === "resolved" && t.assignee)!;
    const agentRules = ownershipRules(resolved, "agent");
    expect(agentRules.canClaim).toBe(false);
    expect(agentRules.canRelease).toBe(false);
    expect(agentRules.canAssign).toBe(false);
    const adminRules = ownershipRules(resolved, "admin");
    expect(adminRules.canAssign).toBe(false);
    // Server also refuses: claim/resolve/assign on resolved.
    expect(claimTicket(resolved.id)).toEqual({ ok: false, error: { code: "RESOLVED" } });
    expect(releaseTicket(resolved.id)).toEqual({ error: { code: "RESOLVED" } });
    expect(assignTicket(resolved.id, "u-agent-2")).toEqual({ error: { code: "RESOLVED" } });
    // UI renders the owner with no buttons.
    tree(<TicketActions ticket={resolved} role="agent" agents={[]} />);
    expect(screen.getByText(new RegExp(`→ ${resolved.assignee!.name}`))).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /release/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /assign/i })).not.toBeInTheDocument();
  });

  it("security: release is owner-or-admin only and reason is capped", () => {
    setMockSession("agent"); // Kofi (u-agent-1)
    const others = listDeskTickets().find((t) => t.lock?.lockedByOther && t.status !== "resolved")!;
    const forbidden = releaseTicket(others.id, undefined, { id: "u-agent-1", name: "Kofi Mensah", role: "agent" });
    expect(forbidden).toEqual({ error: { code: "FORBIDDEN", ownerName: others.assignee!.name } });
    const adminOk = releaseTicket(others.id, "cover", { id: "u-admin-1", name: "Admin", role: "admin" });
    expect(adminOk).not.toHaveProperty("error");
    const mine = listDeskTickets().find((t) => t.assignee?.id === "u-agent-1" && t.status !== "resolved")!;
    expect(releaseTicket(mine.id, "x".repeat(501), { id: "u-agent-1", name: "Kofi", role: "agent" })).toEqual({
      error: { code: "REASON_TOO_LONG" },
    });
  });

  it("tabs: by-agent without a pick is empty (never leaks All) + All holds every status", () => {
    setMockSession("agent");
    expect(queryDeskTickets({ tab: "by-agent", limit: 50 }).items).toEqual([]);
    const all = queryDeskTickets({ tab: "all", limit: 50 }).items;
    expect(new Set(all.map((t) => t.status))).toEqual(new Set(["pending", "open", "in_progress", "resolved"]));
  });

  it("audit: claim writes an ownership trail entry", () => {
    setMockSession("agent");
    const before = listOwnershipAudit().length;
    const target = listDeskTickets().find((t) => !t.assignee && t.status !== "resolved")!;
    const result = claimTicket(target.id);
    expect(result.ok).toBe(true);
    const after = listOwnershipAudit();
    expect(after.length).toBeGreaterThan(before);
    expect(after[0]).toMatchObject({ ticketId: target.id, action: "ticket.claimed" });
  });
});
