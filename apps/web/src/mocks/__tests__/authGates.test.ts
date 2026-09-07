import { describe, expect, it, beforeEach } from "vitest";

import { apiFetch } from "@/lib/api";
import { resetDeskStore } from "@/mocks/desk";
import { resetAdmins, resetAgents, setMockSession } from "@/mocks/fixtures";

// API-shaped authorization: 401 signed out, 403 wrong role, 404 for
// other people's tickets (never confirm existence).

describe("mock authorization gates", () => {
  beforeEach(() => {
    resetAgents();
    resetAdmins();
    resetDeskStore();
    setMockSession(null);
  });

  it("signed-out requests get 401 on protected endpoints", async () => {
    await expect(apiFetch("/tickets/mine")).rejects.toMatchObject({ status: 401 });
    await expect(apiFetch("/desk/tickets")).rejects.toMatchObject({ status: 401 });
    await expect(apiFetch("/admin/agents")).rejects.toMatchObject({ status: 401 });
    await expect(
      apiFetch("/tickets", { method: "POST", body: JSON.stringify({ title: "x", description: "y" }) }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("employees get 403 on desk/admin endpoints", async () => {
    setMockSession("employee");
    await expect(apiFetch("/desk/tickets")).rejects.toMatchObject({ status: 403 });
    await expect(apiFetch("/admin/agents")).rejects.toMatchObject({ status: 403 });
  });

  it("agents get 403 on admin endpoints but reach the desk", async () => {
    setMockSession("agent");
    await expect(apiFetch("/admin/agents")).rejects.toMatchObject({ status: 403 });
    const dashboard = await apiFetch<{ open: number }>("/desk/dashboard");
    expect(dashboard).toBeDefined();
  });

  it("employees cannot open another employee's ticket reference", async () => {
    // PRL-9* contract reference belongs to someone else.
    setMockSession("employee");
    await expect(apiFetch("/tickets/PRL-900001")).rejects.toMatchObject({ status: 403 });
    await expect(apiFetch("/tickets/PRL-DOES-NOT-EXIST")).rejects.toMatchObject({ status: 404 });
  });

  it("desk roles can open any employee reference", async () => {
    setMockSession("agent");
    const ticket = await apiFetch<{ reference: string }>("/tickets/PRL-100001");
    expect(ticket.reference).toBe("PRL-100001");
  });

  it("email resolve accepts company addresses, rejects the rest", async () => {
    const ok = await apiFetch<{ role: string }>("/auth/resolve", {
      method: "POST",
      body: JSON.stringify({ email: "newhire@pearl27.com" }),
    });
    expect(ok.role).toBe("employee");
    await expect(
      apiFetch("/auth/resolve", { method: "POST", body: JSON.stringify({ email: "ada@gmail.com" }) }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it("agents get 403 on ticket assign (admin-only); admins can assign", async () => {
    setMockSession("agent");
    await expect(
      apiFetch("/desk/tickets/t-desk-3/assign", {
        method: "POST",
        body: JSON.stringify({ assigneeId: "u-agent-2" }),
      }),
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    setMockSession("admin");
    const ticket = await apiFetch<{ assignee: { name: string } }>("/desk/tickets/t-desk-3/assign", {
      method: "POST",
      body: JSON.stringify({ assigneeId: "u-agent-2" }),
    });
    expect(ticket.assignee.name).toBe("Ada Osei");
  });

  it("release is owner-or-admin only; resolved never releases", async () => {
    setMockSession("agent"); // Kofi (u-agent-1); t-desk-7 belongs to Ada
    await expect(
      apiFetch("/desk/tickets/t-desk-7/release", { method: "POST", body: JSON.stringify({}) }),
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    // t-desk-10 is resolved and assigned — Release must not regress it.
    await expect(
      apiFetch("/desk/tickets/t-desk-10/release", { method: "POST", body: JSON.stringify({}) }),
    ).rejects.toMatchObject({ status: 422, code: "RESOLVED" });
    setMockSession("admin");
    const released = await apiFetch<{ assignee: null; status: string }>("/desk/tickets/t-desk-7/release", {
      method: "POST",
      body: JSON.stringify({ reason: "cover" }),
    });
    expect(released.assignee).toBeNull();
    expect(released.status).toBe("pending");
  });

  it("sign-out sticks: /auth/me is 401 afterwards", async () => {
    setMockSession("employee");
    await apiFetch("/auth/logout", { method: "POST" });
    await expect(apiFetch("/auth/me")).rejects.toMatchObject({ status: 401 });
  });
});
