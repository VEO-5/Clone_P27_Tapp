import { describe, expect, it } from "vitest";

import type { Ticket } from "../types";
import { planUpdate } from "../workflow";

const ticket: Ticket = {
  id: "t1",
  reference: "PRL-7K4M2X",
  employeeName: "Godstime Erubami",
  employeeEmail: "godstime@pearl27.com",
  title: "Cannot sign in",
  description: "MFA fails after the latest Sphere update on my laptop.",
  category: "account_access",
  status: "open",
  priority: "medium",
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T10:00:00.000Z",
  resolvedAt: null,
};

describe("planUpdate", () => {
  it("U15: resolved stamps resolvedAt; moving back to open clears it", () => {
    const resolved = planUpdate(ticket, { status: "resolved" });
    expect(resolved.patch.status).toBe("resolved");
    expect(resolved.patch.resolvedAt).toBeTruthy();
    expect(resolved.notifyResolved).toBe(true);

    const reopened = planUpdate(
      { ...ticket, status: "resolved", resolvedAt: "2026-09-01T12:00:00.000Z" },
      { status: "open" },
    );
    expect(reopened.patch.status).toBe("open");
    expect(reopened.patch.resolvedAt).toBeNull();
    expect(reopened.notifyResolved).toBe(false);
  });

  it("U16: a status change produces a status_changed event with actor support", () => {
    const plan = planUpdate(ticket, { status: "in_progress" });
    expect(plan.events).toEqual([
      expect.objectContaining({
        type: "status_changed",
        actor: "support",
        message: expect.stringMatching(/Open.*In progress/),
      }),
    ]);
  });
});
