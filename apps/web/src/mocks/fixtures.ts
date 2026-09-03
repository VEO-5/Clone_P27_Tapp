import type { Ticket } from "@pearl27/contracts";

// Deterministic fixtures for MSW (Phase 0). Full 1,200-ticket factory lands
// with the queue in Phase 3; this seed covers every status × priority.

const STATUSES = ["pending", "open", "in_progress", "resolved"] as const;
const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

let counter = 0;

export function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  counter += 1;
  const n = counter;
  return {
    id: `t-${n}`,
    reference: `PRL-${String(100000 + n)}`,
    title: `Sphere issue ${n}`,
    description: "A detailed description of the Sphere issue, at least twenty characters long.",
    categoryId: "sphere_app",
    status: STATUSES[n % STATUSES.length]!,
    priority: PRIORITIES[n % PRIORITIES.length]!,
    requesterId: "u-employee-1",
    assigneeId: null,
    version: 1,
    createdAt: new Date(Date.now() - n * 3_600_000).toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function makeTicketList(count: number): Ticket[] {
  return Array.from({ length: count }, () => makeTicket());
}

export const mockProfile = {
  id: "u-employee-1",
  email: "ada@pearl27.com",
  name: "Ada Obi",
  avatarUrl: null,
  role: "employee",
  teamId: null,
};

export const mockAgents = Array.from({ length: 8 }, (_, i) => ({
  id: `u-agent-${i + 1}`,
  email: `agent${i + 1}@pearl27.com`,
  name: `Agent ${i + 1}`,
  avatarUrl: null,
  role: "agent",
  teamId: "support",
}));
