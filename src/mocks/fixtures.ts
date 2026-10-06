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

const adminStore: MockAgent[] = Array.from({ length: 2 }, (_, i) => ({
  id: `u-admin-${i + 1}`,
  email: i === 0 ? "admin@pearl27.com" : `admin${i + 1}@pearl27.com`,
  name: i === 0 ? "Admin" : `Admin ${i + 1}`,
  avatarUrl: null,
  role: "admin",
  teamId: "support",
  status: "active",
  openTickets: 0,
  lastSeen: new Date(Date.now() - i * 86_400_000).toISOString(),
}));

export const mockAdmins: MockAgent[] = adminStore;

export function resetAdmins() {
  adminStore.length = 0;
  adminStore.push(
    ...Array.from({ length: 2 }, (_, i) => ({
      id: `u-admin-${i + 1}`,
      email: i === 0 ? "admin@pearl27.com" : `admin${i + 1}@pearl27.com`,
      name: i === 0 ? "Admin" : `Admin ${i + 1}`,
      avatarUrl: null,
      role: "admin",
      teamId: "support",
      status: "active" as MockAgent["status"],
      openTickets: 0,
      lastSeen: new Date(Date.now() - i * 86_400_000).toISOString(),
    })),
  );
}

export function addAdmin(email: string): MockAgent {
  const normalized = email.trim().toLowerCase();
  const existing = adminStore.find((admin) => admin.email === normalized);
  if (existing) return existing;
  const admin: MockAgent = {
    id: `u-admin-${Date.now()}`,
    email: normalized,
    name: normalized.split("@")[0] ?? normalized,
    avatarUrl: null,
    role: "admin",
    teamId: "support",
    status: "invited",
    openTickets: 0,
    lastSeen: null,
  };
  adminStore.push(admin);
  return admin;
}

export function deactivateAdmin(id: string): MockAgent | null {
  const admin = adminStore.find((item) => item.id === id);
  if (!admin) return null;
  admin.status = "deactivated";
  admin.openTickets = 0;
  return admin;
}

// ---------------------------------------------------------------------------
// Mock session control (tests + stories switch roles without the real API)
//
// Identity model: one signed-in user identified by work email. The session
// cookie carries `mock-<role>[:<email>]` so every role — not just employee —
// survives reloads. No cookie (or a non-browser realm) means signed OUT.
// Elevation is invite-only: unknown addresses resolve to employee, never to
// desk roles. Deactivation demotes to employee instead of locking out.
// ---------------------------------------------------------------------------

export type MockRole = "employee" | "agent" | "admin" | null;

export interface MockIdentity {
  role: Exclude<MockRole, null>;
  email: string;
  name: string;
}

export interface MockProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: null;
  role: string;
  teamId: string | null;
  /** True when a deactivated desk/admin account fell back to employee. */
  demoted?: boolean;
}

const SESSION_RE = /(?:^|; )p27_session=mock-(employee|agent|admin)(?::([^;\s]*))?(?:;|$)/;

const SEED_IDENTITY: Record<Exclude<MockRole, null>, MockIdentity> = {
  employee: { role: "employee", email: "ada@pearl27.com", name: "Ada Obi" },
  agent: { role: "agent", email: "kofi@pearl27.com", name: "Kofi Mensah" },
  admin: { role: "admin", email: "admin@pearl27.com", name: "Admin" },
};

const SEED_ID: Record<Exclude<MockRole, null>, string> = {
  employee: "u-employee-1",
  agent: "u-agent-1",
  admin: "u-admin-1",
};

export function deriveMockName(email: string): string {
  const local = email.split("@")[0] ?? "";
  const titled = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return titled || email;
}

function slugMockId(email: string): string {
  const local = (email.split("@")[0] ?? "unknown")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `u-emp-${local || "unknown"}`;
}

export interface MockLookup {
  email: string;
  name: string;
  role: Exclude<MockRole, null>;
  demoted: boolean;
}

/**
 * Resolve a work email to an identity. Pure lookup over the live stores, so
 * invites and deactivations take effect immediately:
 * - malformed or non-@pearl27.com addresses → null (rejected)
 * - deactivated desk/admin record → employee + demoted
 * - active/invited desk/admin record or named seed → that role
 * - any other company address → employee (no account needed, per PRD 4.2)
 */
export function lookupMockIdentity(rawEmail: string): MockLookup | null {
  const email = rawEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  if (!email.endsWith("@pearl27.com")) return null;
  const adminRecord = adminStore.find((item) => item.email === email);
  const agentRecord = agentStore.find((item) => item.email === email);
  const record = adminRecord ?? agentRecord;
  if (record) {
    if (record.status === "deactivated") {
      return { email, name: record.name, role: "employee", demoted: true };
    }
    return {
      email,
      name: record.name,
      role: (adminRecord ? "admin" : "agent") as MockLookup["role"],
      demoted: false,
    };
  }
  for (const seed of Object.values(SEED_IDENTITY)) {
    if (seed.email === email) return { ...seed, demoted: false };
  }
  return { email, name: deriveMockName(email), role: "employee", demoted: false };
}

/** Signed out by default: a fresh realm with no session cookie has no user. */
function initialMockIdentity(): MockIdentity | null {
  try {
    if (typeof document === "undefined") return null;
    const match = SESSION_RE.exec(document.cookie);
    const role = match?.[1] as MockIdentity["role"] | undefined;
    if (!role) return null;
    const email = (match?.[2] ? decodeURIComponent(match[2]) : SEED_IDENTITY[role].email).toLowerCase();
    const lookup = lookupMockIdentity(email);
    return { role, email, name: lookup?.name ?? deriveMockName(email) };
  } catch {
    return null;
  }
}

let mockIdentity: MockIdentity | null = initialMockIdentity();

/** Role quick-pick (sign-in buttons) and test setup. */
export function setMockSession(role: MockRole) {
  mockIdentity = role ? { ...SEED_IDENTITY[role] } : null;
}

/** Email sign-in: store an identity previously resolved via lookupMockIdentity. */
export function setMockSessionIdentity(identity: MockIdentity | null) {
  mockIdentity = identity ? { ...identity } : null;
}

/** Cookie value for the current identity (null = clear the cookie). */
export function mockCookieValue(): string | null {  if (!mockIdentity) return null;
  const seedEmail = SEED_IDENTITY[mockIdentity.role].email;
  return mockIdentity.email === seedEmail
    ? `mock-${mockIdentity.role}`
    : `mock-${mockIdentity.role}:${encodeURIComponent(mockIdentity.email)}`;
}

/** Page-realm boot: re-read the cookie (used to re-seed the worker after reload). */
export function readMockCookieIdentity(): MockIdentity | null {
  return initialMockIdentity();
}

export function getMockProfile(): MockProfile | null {
  if (!mockIdentity) return null;
  // Live demotion: a desk/admin account deactivated after sign-in falls back
  // to employee on the next profile read — powers removed, identity kept.
  const adminRecord = mockIdentity.role !== "employee"
    ? adminStore.find((item) => item.email === mockIdentity!.email)
    : undefined;
  const agentRecord = mockIdentity.role === "agent"
    ? agentStore.find((item) => item.email === mockIdentity!.email)
    : undefined;
  const record = adminRecord ?? agentRecord;
  if (record?.status === "deactivated") {
    return {
      id: record.id,
      email: mockIdentity.email,
      name: record.name,
      avatarUrl: null,
      role: "employee",
      teamId: null,
      demoted: true,
    };
  }
  const seedEntry = (Object.entries(SEED_IDENTITY) as [MockIdentity["role"], MockIdentity][]).find(
    ([, seed]) => seed.email === mockIdentity!.email,
  );
  return {
    id: record?.id ?? (seedEntry ? SEED_ID[seedEntry[0]] : slugMockId(mockIdentity.email)),
    email: mockIdentity.email,
    name: record?.name ?? seedEntry?.[1].name ?? mockIdentity.name,
    avatarUrl: null,
    role: mockIdentity.role,
    teamId: mockIdentity.role === "employee" ? null : "support",
  };
}

// ---------------------------------------------------------------------------
// Directory journal (mock-only invite persistence).
//
// The page realm and the MSW worker realm each hold their own copy of the
// agent/admin stores, and the worker's copy resets when it restarts (e.g. a
// page reload) — so an invite created moments ago vanishes and the invitee
// drops to employee on refresh. The journal fixes this: UI write-sites
// (invite / deactivate) append here (localStorage survives reloads) and
// MockProvider replays it into the worker on every boot, BEFORE the session
// reseed, so role lookup finds the invite again.
//
// NEVER copy this pattern to prod: the real backend persists invites in its
// database. This exists only because the mock has no database.
// ---------------------------------------------------------------------------

export interface MockJournalEntry {
  role: "agent" | "admin";
  email: string;
  name?: string;
  status: "active" | "invited" | "deactivated";
}

const JOURNAL_KEY = "p27_mock_directory_v1";

function journalStorage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

function isJournalEntry(value: unknown): value is MockJournalEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    (entry.role === "agent" || entry.role === "admin") &&
    typeof entry.email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.email) &&
    (entry.status === "active" || entry.status === "invited" || entry.status === "deactivated") &&
    (entry.name === undefined || typeof entry.name === "string")
  );
}

/** All journaled directory changes, oldest first. Empty outside the browser or when cleared. */
export function readMockJournal(): MockJournalEntry[] {
  try {
    const raw = journalStorage()?.getItem(JOURNAL_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isJournalEntry).map((entry) => ({
      role: entry.role,
      email: entry.email.trim().toLowerCase(),
      ...(entry.name ? { name: entry.name } : {}),
      status: entry.status,
    }));
  } catch {
    return [];
  }
}

/** Append a directory change (invite / deactivate). Last write wins per role+email on replay. */
export function recordMockDirectory(entry: MockJournalEntry): void {
  const store = journalStorage();
  if (!store) return;
  const email = entry.email.trim().toLowerCase();
  if (!email.endsWith("@pearl27.com")) return;
  try {
    const next = [...readMockJournal(), { ...entry, email }];
    store.setItem(JOURNAL_KEY, JSON.stringify(next.slice(-200)));
  } catch {
    // Storage full or unavailable — the invite still works until reload.
  }
}

/** Wipe the journal (demo reset). Does not touch live stores — use /mock-reset for that. */
export function clearMockJournal(): void {
  try {
    journalStorage()?.removeItem(JOURNAL_KEY);
  } catch {
    // ignore
  }
}

function slugDirectoryId(email: string, role: "agent" | "admin"): string {
  const local = (email.split("@")[0] ?? "unknown")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${role === "admin" ? "u-adm" : "u-agt"}-${local || "unknown"}`;
}

/**
 * Apply journaled entries to the live stores (worker realm on boot).
 * Upserts by email with last-wins ordering; malformed entries are skipped.
 * Returns how many records were (re)created per store.
 */
export function restoreMockDirectory(entries: MockJournalEntry[]): { agents: number; admins: number } {
  let agents = 0;
  let admins = 0;
  for (const raw of entries) {
    if (!isJournalEntry(raw)) continue;
    const email = raw.email.trim().toLowerCase();
    if (!email.endsWith("@pearl27.com")) continue;
    const name = raw.name?.trim() || deriveMockName(email);
    if (raw.role === "admin") {
      const existing = adminStore.find((item) => item.email === email);
      if (existing) {
        existing.status = raw.status;
        existing.name = name;
      } else {
        adminStore.push({
          id: slugDirectoryId(email, "admin"),
          email,
          name,
          avatarUrl: null,
          role: "admin",
          teamId: "support",
          status: raw.status,
          openTickets: 0,
          lastSeen: null,
        });
      }
      admins += 1;
    } else {
      const existing = agentStore.find((item) => item.email === email);
      if (existing) {
        existing.status = raw.status;
        existing.name = name;
      } else {
        agentStore.push({
          id: slugDirectoryId(email, "agent"),
          email,
          name,
          avatarUrl: null,
          role: "agent",
          teamId: "support",
          status: raw.status,
          openTickets: 0,
          lastSeen: null,
        });
      }
      agents += 1;
    }
  }
  return { agents, admins };
}
