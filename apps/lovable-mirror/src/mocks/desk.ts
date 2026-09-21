import type { ActivityItem, Assignee, DeskDashboard, DeskTicket } from "@pearl27/contracts";

import { listCategories } from "./categories";
import { getMockProfile } from "./fixtures";

// ---------------------------------------------------------------------------
// Desk-side mock store (Phase 3): queue, dashboard, activity, ownership.
// ---------------------------------------------------------------------------

const HOURS = 3_600_000;
const NOW = Date.now();
const iso = (agoHours: number) => new Date(NOW - agoHours * HOURS).toISOString();

export const ME = "u-agent-1"; // Kofi — the mock agent profile

const AGENTS: Assignee[] = Array.from({ length: 8 }, (_, i) => ({
  id: `u-agent-${i + 1}`,
  name: i === 0 ? "Kofi Mensah" : i === 1 ? "Ada Osei" : `Agent ${i + 1}`,
  avatarUrl: null,
}));

export function deskAgents(): Assignee[] {
  return AGENTS;
}

interface SeedSpec {
  title: string;
  status: DeskTicket["status"];
  priority: DeskTicket["priority"];
  categoryId: string;
  assigneeIdx: number | null; // null = unassigned
  ageHours: number;
  slaHoursFromNow: number | null; // null = no SLA pressure
  unread: number;
  previousRelease?: DeskTicket["previousRelease"];
  requester: string;
}

const SEED: SeedSpec[] = [
  { title: "VPN drops every 20 minutes", status: "open", priority: "high", categoryId: "network", assigneeIdx: 0, ageHours: 30, slaHoursFromNow: 2, unread: 2, requester: "Ada Obi" },
  { title: "Sphere app crashes on expense upload", status: "in_progress", priority: "medium", categoryId: "sphere_app", assigneeIdx: 0, ageHours: 72, slaHoursFromNow: -3, unread: 0, requester: "Ada Obi" },
  { title: "New hire laptop request", status: "pending", priority: "medium", categoryId: "hardware", assigneeIdx: null, ageHours: 5, slaHoursFromNow: 40, unread: 0, requester: "Efua Adu" },
  { title: "Email archive missing folders", status: "pending", priority: "low", categoryId: "email", assigneeIdx: null, ageHours: 9, slaHoursFromNow: 60, unread: 0, requester: "Yaw Boateng" },
  { title: "SSO loop on Sphere login", status: "pending", priority: "urgent", categoryId: "account_access", assigneeIdx: null, ageHours: 2, slaHoursFromNow: 1, unread: 1, requester: "Ama Serwaa" },
  { title: "Office printer offline", status: "open", priority: "low", categoryId: "hardware", assigneeIdx: 1, ageHours: 50, slaHoursFromNow: 20, unread: 0, requester: "Kojo Antwi" },
  { title: "Shared drive permissions", status: "in_progress", priority: "high", categoryId: "account_access", assigneeIdx: 1, ageHours: 90, slaHoursFromNow: -8, unread: 3, requester: "Efua Adu" },
  { title: "Wi-Fi dead zone in east wing", status: "open", priority: "medium", categoryId: "network", assigneeIdx: 2, ageHours: 26, slaHoursFromNow: 10, unread: 0, requester: "Yaw Boateng" },
  { title: "Password reset not arriving", status: "pending", priority: "high", categoryId: "account_access", assigneeIdx: null, ageHours: 12, slaHoursFromNow: 4, unread: 0, requester: "Ama Serwaa", previousRelease: { status: "in_progress", agentName: "Ada Osei", releasedAt: iso(50), reason: "Handing over shift" } },
  { title: "Invoice PDF export broken", status: "resolved", priority: "medium", categoryId: "sphere_app", assigneeIdx: 0, ageHours: 200, slaHoursFromNow: null, unread: 0, requester: "Kojo Antwi" },
  { title: "Monitor flickers at 4K", status: "open", priority: "low", categoryId: "hardware", assigneeIdx: 3, ageHours: 60, slaHoursFromNow: 30, unread: 1, requester: "Efua Adu" },
  { title: "Calendar double-bookings", status: "pending", priority: "medium", categoryId: "email", assigneeIdx: 0, ageHours: 80, slaHoursFromNow: 6, unread: 0, requester: "Ama Serwaa" },
  { title: "VPN client won't install on Mac", status: "pending", priority: "medium", categoryId: "network", assigneeIdx: null, ageHours: 20, slaHoursFromNow: 24, unread: 0, requester: "Yaw Boateng" },
  { title: "Sphere notifications silent", status: "open", priority: "high", categoryId: "sphere_app", assigneeIdx: 4, ageHours: 34, slaHoursFromNow: -1, unread: 2, requester: "Kojo Antwi" },
  { title: "Desk phone no dial tone", status: "resolved", priority: "low", categoryId: "hardware", assigneeIdx: 0, ageHours: 300, slaHoursFromNow: null, unread: 0, requester: "Efua Adu" },
  { title: "Guest Wi-Fi credentials", status: "pending", priority: "low", categoryId: "network", assigneeIdx: null, ageHours: 4, slaHoursFromNow: 70, unread: 0, requester: "Ama Serwaa" },
];

function seedTickets(): DeskTicket[] {
  return SEED.map((spec, i) => {
    const n = i + 1;
    const assignee = spec.assigneeIdx === null ? null : AGENTS[spec.assigneeIdx]!;
    const dueAt = spec.slaHoursFromNow === null ? null : new Date(NOW + spec.slaHoursFromNow * HOURS).toISOString();
    const breached = spec.slaHoursFromNow !== null && spec.slaHoursFromNow < 0;
    const breachingSoon = spec.slaHoursFromNow !== null && spec.slaHoursFromNow >= 0 && spec.slaHoursFromNow <= 4;
    const viewer = getMockProfile()?.id ?? ME;
    return {
      id: `t-desk-${n}`,
      reference: `PRL-3${String(10000 + n).slice(1)}`,
      title: spec.title,
      description: `${spec.title} — full description with enough detail for the agent to work from. Reported with steps to reproduce.`,
      categoryId: spec.categoryId,
      status: spec.status,
      priority: spec.priority,
      requesterId: `u-emp-${n}`,
      requesterName: spec.requester,
      assigneeId: assignee?.id ?? null,
      assignee,
      handlingAgent: null,
      chatDmUrl: null,
      version: 2,
      createdAt: iso(spec.ageHours),
      updatedAt: iso(Math.max(1, spec.ageHours - 10)),
      lock: assignee
        ? { lockedByMe: assignee.id === viewer, lockedByOther: assignee.id !== viewer, ownerName: assignee.id === viewer ? null : assignee.name }
        : { lockedByMe: false, lockedByOther: false, ownerName: null },
      previousRelease: spec.previousRelease ?? null,
      unreadCount: spec.unread,
      sla: { dueAt, breached, breachingSoon },
    };
  });
}

let tickets: DeskTicket[] = seedTickets();

export function resetDeskStore() {
  tickets = seedTickets();
  ownershipAudit = [];
}

/**
 * Server-side Open transition: fetching the detail as the assignee flips a
 * Pending ticket to Open. Returns the ticket plus whether it just flipped.
 */
export function openAsAssignee(id: string, viewerId: string): { ticket: DeskTicket; justOpened: boolean } | null {
  const ticket = tickets.find((t) => t.id === id);
  if (!ticket) return null;
  let justOpened = false;
  if (ticket.assignee?.id === viewerId && ticket.status === "pending") {
    ticket.status = "open";
    ticket.version += 1;
    ticket.updatedAt = new Date().toISOString();
    justOpened = true;
  }
  return { ticket: listDeskTickets().find((t) => t.id === id)!, justOpened };
}

/** Raw mutable handle for the send flow (mock server-side only). */
export function mutableDeskTicket(id: string): DeskTicket | undefined {
  return tickets.find((t) => t.id === id);
}

// ---------------------------------------------------------------------------
// Ownership audit trail (prod parity: every claim/release/assign is logged
// with actor + before/after so admin audit + timeline stay in sync).
// ---------------------------------------------------------------------------

export interface OwnershipAuditEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: "ticket.claimed" | "ticket.released" | "ticket.assigned";
  ticketId: string;
  reference: string;
  beforeAssigneeId: string | null;
  afterAssigneeId: string | null;
  reason: string | null;
  createdAt: string;
}

let ownershipAudit: OwnershipAuditEntry[] = [];

export function listOwnershipAudit(): OwnershipAuditEntry[] {
  return [...ownershipAudit];
}

function logOwnership(entry: Omit<OwnershipAuditEntry, "id" | "createdAt">) {
  ownershipAudit.unshift({
    ...entry,
    id: `own-${Date.now()}-${ownershipAudit.length}`,
    createdAt: new Date().toISOString(),
  });
}

export function listDeskTickets(): DeskTicket[] {
  const viewer = getMockProfile()?.id ?? ME;
  return tickets.map((t) => ({
    ...t,
    lock: t.assignee
      ? { lockedByMe: t.assignee.id === viewer, lockedByOther: t.assignee.id !== viewer, ownerName: t.assignee.id === viewer ? null : t.assignee.name }
      : { lockedByMe: false, lockedByOther: false, ownerName: null },
  }));
}

export interface QueueQuery {
  tab: string;
  assigneeId?: string;
  status?: string;
  priority?: string;
  categoryId?: string;
  q?: string;
  sort?: string;
  cursor?: string;
  limit: number;
}

export function queryDeskTickets(query: QueueQuery): { items: DeskTicket[]; nextCursor: string | null } {
  const viewer = getMockProfile()?.id ?? ME;
  let items = listDeskTickets();

  if (query.tab === "unassigned") items = items.filter((t) => !t.assignee);
  else if (query.tab === "mine") items = items.filter((t) => t.assignee?.id === viewer);
  // Admin oversight: picking no agent must NOT fall through to All — the UI
  // shows an explicit "Choose an agent" empty state instead.
  else if (query.tab === "by-agent") {
    if (!query.assigneeId) return { items: [], nextCursor: null };
    items = items.filter((t) => t.assignee?.id === query.assigneeId);
  }
  // tab === "all" (or unknown) intentionally returns every incoming support
  // request: pending + open + in_progress + resolved, assigned or not.
  if (query.status) items = items.filter((t) => t.status === query.status);
  if (query.priority) items = items.filter((t) => t.priority === query.priority);
  if (query.categoryId) items = items.filter((t) => t.categoryId === query.categoryId);
  if (query.q) {
    const needle = query.q.toLowerCase();
    items = items.filter((t) => `${t.title} ${t.reference} ${t.requesterName ?? ""}`.toLowerCase().includes(needle));
  }
  if (query.sort === "oldest") items = [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  else if (query.sort === "due") items = [...items].sort((a, b) => (a.sla?.dueAt ?? "9999").localeCompare(b.sla?.dueAt ?? "9999"));
  else items = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const start = query.cursor ? Number(query.cursor) : 0;
  const slice = items.slice(start, start + query.limit);
  return { items: slice, nextCursor: start + query.limit < items.length ? String(start + query.limit) : null };
}

export type ClaimError = { code: "ALREADY_ASSIGNED"; assignee: Assignee } | { code: "RESOLVED" };

/** Claim result: 200 ticket, 409 conflict naming the winner, or 422 when resolved. */
export function claimTicket(id: string): { ok: true; ticket: DeskTicket } | { ok: false; error: ClaimError } {
  const ticket = tickets.find((t) => t.id === id);
  if (!ticket) throw new Error("not found");
  // Resolved is terminal — reopen via status change, never via claim.
  if (ticket.status === "resolved") {
    return { ok: false, error: { code: "RESOLVED" } };
  }
  const viewer = getMockProfile();
  const me: Assignee = { id: viewer?.id ?? ME, name: viewer?.name ?? "Kofi Mensah", avatarUrl: null };
  if (ticket.assignee && ticket.assignee.id !== me.id) {
    return { ok: false, error: { code: "ALREADY_ASSIGNED", assignee: ticket.assignee } };
  }
  const before = ticket.assigneeId;
  const alreadyMine = before === me.id;
  ticket.assignee = me;
  ticket.assigneeId = me.id;
  ticket.status = ticket.status === "pending" ? "open" : ticket.status;
  ticket.version += 1;
  ticket.updatedAt = new Date().toISOString();
  if (!alreadyMine) {
    logOwnership({
      actorId: me.id,
      actorName: me.name,
      action: "ticket.claimed",
      ticketId: ticket.id,
      reference: ticket.reference,
      beforeAssigneeId: before ?? null,
      afterAssigneeId: me.id,
      reason: null,
    });
  }
  return { ok: true, ticket: listDeskTickets().find((t) => t.id === id)! };
}

export type ReleaseError =
  | { code: "FORBIDDEN"; ownerName: string }
  | { code: "RESOLVED" }
  | { code: "NOT_ASSIGNED" }
  | { code: "REASON_TOO_LONG" };

const MAX_RELEASE_REASON = 500;

export function releaseTicket(
  id: string,
  reason?: string,
  actor?: { id: string; name: string; role: string },
): DeskTicket | { error: ReleaseError } | null {
  const ticket = tickets.find((t) => t.id === id);
  if (!ticket) return null;
  const cleanReason = (reason ?? "").trim() || null;
  if (cleanReason && cleanReason.length > MAX_RELEASE_REASON) {
    return { error: { code: "REASON_TOO_LONG" } };
  }
  // Resolved is terminal — Release must never regress it to pending.
  if (ticket.status === "resolved") {
    return { error: { code: "RESOLVED" } };
  }
  if (!ticket.assignee) {
    return { error: { code: "NOT_ASSIGNED" } };
  }
  // Owner-or-admin only. The UI hides the button, the server enforces it.
  const viewerId = actor?.id ?? getMockProfile()?.id ?? ME;
  const isAdmin = actor?.role === "admin" || getMockProfile()?.role === "admin";
  if (ticket.assignee.id !== viewerId && !isAdmin) {
    return { error: { code: "FORBIDDEN", ownerName: ticket.assignee.name } };
  }
  const prev = ticket.assignee;
  ticket.previousRelease = prev
    ? { status: ticket.status, agentName: prev.name, releasedAt: new Date().toISOString(), reason: cleanReason }
    : ticket.previousRelease;
  ticket.assignee = null;
  ticket.assigneeId = null;
  ticket.status = "pending";
  ticket.version += 1;
  ticket.updatedAt = new Date().toISOString();
  logOwnership({
    actorId: viewerId,
    actorName: actor?.name ?? getMockProfile()?.name ?? prev.name,
    action: "ticket.released",
    ticketId: ticket.id,
    reference: ticket.reference,
    beforeAssigneeId: prev.id,
    afterAssigneeId: null,
    reason: cleanReason,
  });
  return listDeskTickets().find((t) => t.id === id)!;
}

export type AssignError = { code: "UNKNOWN_AGENT" } | { code: "RESOLVED" };

export function assignTicket(
  id: string,
  assigneeId: string,
  actor?: { id: string; name: string },
): DeskTicket | { error: AssignError } | null {
  const ticket = tickets.find((t) => t.id === id);
  // Unknown agent ids are rejected (never silently unassign).
  const agent = AGENTS.find((a) => a.id === assigneeId);
  if (!ticket || !agent) return null;
  // Resolved is terminal — reopen via status change first.
  if (ticket.status === "resolved") {
    return { error: { code: "RESOLVED" } };
  }
  const before = ticket.assigneeId;
  ticket.assignee = agent;
  ticket.assigneeId = agent.id;
  ticket.version += 1;
  ticket.updatedAt = new Date().toISOString();
  if (before !== agent.id) {
    const viewer = getMockProfile();
    logOwnership({
      actorId: actor?.id ?? viewer?.id ?? ME,
      actorName: actor?.name ?? viewer?.name ?? "Admin",
      action: "ticket.assigned",
      ticketId: ticket.id,
      reference: ticket.reference,
      beforeAssigneeId: before ?? null,
      afterAssigneeId: agent.id,
      reason: null,
    });
  }
  return listDeskTickets().find((t) => t.id === id)!;
}

// ---------------------------------------------------------------------------
// Dashboard + activity
// ---------------------------------------------------------------------------

export function deskDashboard(rangeDays: number): DeskDashboard {
  const all = listDeskTickets();
  const viewer = getMockProfile()?.id ?? ME;
  const mine = all.filter((t) => t.assignee?.id === viewer);
  const receivedVsResolved = Array.from({ length: rangeDays }, (_, i) => {
    const day = new Date(NOW - (rangeDays - 1 - i) * 24 * HOURS);
    const seed = (i * 7 + rangeDays * 3) % 9;
    return {
      date: day.toISOString().slice(0, 10),
      received: 3 + (seed % 5),
      resolved: 2 + ((seed + 2) % 5),
    };
  });
  const byStatus = (["pending", "open", "in_progress", "resolved"] as const).map((status) => ({
    status,
    count: all.filter((t) => t.status === status).length,
  }));
  // Category names come from the live store (same source as /categories),
  // so admin renames/removes flow into the sidebar + board on refetch.
  // (Mirrors production, where the categories table backs both endpoints.)
  // Tickets filed under a since-removed category keep an orphan bucket
  // labelled by id — counts must never silently vanish.
  const liveCategories = listCategories();
  const liveById = new Map(liveCategories.map((c) => [c.id, c.name]));
  const byCategory = [
    ...liveCategories.map((c) => ({
      categoryId: c.id,
      categoryName: c.name,
      count: all.filter((t) => t.categoryId === c.id).length,
    })),
    ...[...new Set(all.map((t) => t.categoryId))]
      .filter((categoryId) => !liveById.has(categoryId))
      .map((categoryId) => ({
        categoryId,
        categoryName: categoryId,
        count: all.filter((t) => t.categoryId === categoryId).length,
      })),
  ];
  const ageBuckets = [
    { bucket: "0–1 d", count: all.filter((t) => NOW - new Date(t.createdAt).getTime() < 24 * HOURS).length },
    { bucket: "1–3 d", count: all.filter((t) => { const a = NOW - new Date(t.createdAt).getTime(); return a >= 24 * HOURS && a < 3 * 24 * HOURS; }).length },
    { bucket: "3–7 d", count: all.filter((t) => { const a = NOW - new Date(t.createdAt).getTime(); return a >= 3 * 24 * HOURS && a < 7 * 24 * HOURS; }).length },
    { bucket: "7 d+", count: all.filter((t) => NOW - new Date(t.createdAt).getTime() >= 7 * 24 * HOURS).length },
  ];
  return {
    cards: {
      unassigned: all.filter((t) => !t.assignee).length,
      pending: all.filter((t) => t.status === "pending" && t.assignee).length,
      mine: mine.filter((t) => t.status !== "resolved").length,
      breachingSoon: all.filter((t) => t.sla?.breachingSoon).length,
      receivedToday: receivedVsResolved[receivedVsResolved.length - 1]!.received,
      receivedWeek: receivedVsResolved.slice(-7).reduce((sum, d) => sum + d.received, 0),
      resolvedByMeToday: 2,
      resolvedByMeWeek: 11,
      myAvgResolutionHours: 26.5,
      trends: {
        unassigned: "+2 vs last week",
        pending: "-1 vs last week",
        mine: "+1 vs last week",
        breachingSoon: "+0 vs last week",
        receivedToday: "+3 vs yesterday",
        resolvedByMeToday: "+1 vs yesterday",
      },
    },
    series: { receivedVsResolved, byStatus, byCategory, ageBuckets },
  };
}

export function deskActivity(): ActivityItem[] {
  const all = listDeskTickets();
  return all.slice(0, 8).map((t, i) => ({
    id: `act-${i}`,
    kind: (["assigned", "released", "message", "status_changed"] as const)[i % 4]!,
    ticketId: t.id,
    ticketReference: t.reference,
    text: `${t.title} — ${["assigned to Kofi", "released to queue", "new reply from employee", "moved to " + t.status][i % 4]}`,
    actorName: ["Kofi Mensah", "Ada Osei", "System", "Kofi Mensah"][i % 4]!,
    createdAt: iso(i * 3 + 1),
  }));
}
