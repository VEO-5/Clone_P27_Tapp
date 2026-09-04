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

export interface MockAgent {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  teamId: string;
  status: "active" | "invited" | "deactivated";
  openTickets: number;
  lastSeen: string | null;
}

const agentStore: MockAgent[] = Array.from({ length: 8 }, (_, i) => ({
  id: `u-agent-${i + 1}`,
  email: `agent${i + 1}@pearl27.com`,
  name: `Agent ${i + 1}`,
  avatarUrl: null,
  role: "agent",
  teamId: "support",
  status: i === 7 ? "invited" : "active",
  openTickets: (i * 3) % 7,
  lastSeen: i === 7 ? null : new Date(Date.now() - i * 86_400_000).toISOString(),
}));

export const mockAgents: MockAgent[] = agentStore;

export function resetAgents() {
  agentStore.length = 0;
  agentStore.push(
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `u-agent-${i + 1}`,
      email: `agent${i + 1}@pearl27.com`,
      name: `Agent ${i + 1}`,
      avatarUrl: null,
      role: "agent",
      teamId: "support",
      status: (i === 7 ? "invited" : "active") as MockAgent["status"],
      openTickets: (i * 3) % 7,
      lastSeen: i === 7 ? null : new Date(Date.now() - i * 86_400_000).toISOString(),
    })),
  );
}

export function addAgent(email: string): MockAgent {
  const normalized = email.trim().toLowerCase();
  const existing = agentStore.find((agent) => agent.email === normalized);
  if (existing) return existing;
  const agent: MockAgent = {
    id: `u-agent-${Date.now()}`,
    email: normalized,
    name: normalized.split("@")[0] ?? normalized,
    avatarUrl: null,
    role: "agent",
    teamId: "support",
    status: "invited",
    openTickets: 0,
    lastSeen: null,
  };
  agentStore.push(agent);
  return agent;
}

export function deactivateAgent(id: string): MockAgent | null {
  const agent = agentStore.find((item) => item.id === id);
  if (!agent) return null;
  agent.status = "deactivated";
  agent.openTickets = 0;
  return agent;
}

// ---------------------------------------------------------------------------
// Mock session control (tests + stories switch roles without the real API)
// ---------------------------------------------------------------------------

export type MockRole = "employee" | "agent" | "admin" | null;

let mockRole: MockRole = "employee";

const ROLE_PROFILE: Record<Exclude<MockRole, null>, { id: string; email: string; name: string; role: string }> = {
  employee: { id: "u-employee-1", email: "ada@pearl27.com", name: "Ada Obi", role: "employee" },
  agent: { id: "u-agent-1", email: "kofi@pearl27.com", name: "Kofi Mensah", role: "agent" },
  admin: { id: "u-admin-1", email: "admin@pearl27.com", name: "Admin", role: "admin" },
};

export function setMockSession(role: MockRole) {
  mockRole = role;
}

export function getMockProfile() {
  if (mockRole === null) return null;
  const base = ROLE_PROFILE[mockRole];
  return { ...base, avatarUrl: null, teamId: mockRole === "employee" ? null : "support" };
}
