import type {
  AdminDashboardResponse,
  AdminSettings,
  AuditItem,
  CannedResponse,
  Category,
  KnownIssue,
} from "@pearl27/contracts";

import { deskActivity, listDeskTickets } from "./desk";

// ---------------------------------------------------------------------------
// Admin mock store (Phase 5): analytics, settings, issues, audit, export.
// Phase 6: category CRUD.
// ---------------------------------------------------------------------------

const DAYS = 86_400_000;
const NOW = Date.now();
const iso = (agoMs: number) => new Date(NOW - agoMs).toISOString();

function spark(seed: number, points = 12): number[] {
  return Array.from({ length: points }, (_, i) => 20 + ((seed * (i + 3) * 7) % 60));
}

export function adminDashboard(rangeDays: number): AdminDashboardResponse {
  const all = listDeskTickets();
  const open = all.filter((t) => t.status !== "resolved").length;
  const points = Array.from({ length: rangeDays }, (_, i) => {
    const day = new Date(NOW - (rangeDays - 1 - i) * DAYS);
    const seed = (i * 5 + rangeDays) % 9;
    return { date: day.toISOString().slice(0, 10), received: 4 + (seed % 6), resolved: 3 + ((seed + 3) % 6) };
  });
  const agentNames = ["Kofi Mensah", "Ada Osei", "Agent 3", "Agent 4", "Agent 5", "Agent 6", "Agent 7", "Agent 8"];
  const byAgent = agentNames.map((name, i) => ({
    agentId: `u-agent-${i + 1}`,
    name,
    received: 20 + ((i * 13) % 30),
    assigned: 15 + ((i * 7) % 20),
    resolved: 12 + ((i * 11) % 18),
    open: (i * 3) % 7,
    avgResolutionHours: 18 + ((i * 5) % 20),
    avgFirstResponseHours: 1 + ((i * 3) % 6),
  }));
  return {
    rangeDays,
    kpis: [
      { key: "tickets", label: "Current Tickets", value: String(open), deltaPct: 7.1, deltaLabel: "vs last period", spark: spark(3), upGood: false },
      { key: "resolution", label: "Daily Avg. Resolution", value: "486", deltaPct: 2.0, deltaLabel: "vs last period", spark: spark(5), upGood: true },
      { key: "sla", label: "SLA Compliance Rate", value: "92%", deltaPct: -1.3, deltaLabel: "vs last period", spark: spark(9), upGood: true },
    ],
    volume: points,
    byAgent,
    slaTable: all.slice(0, 8).map((t) => ({
      ticketId: t.id,
      reference: t.reference,
      subject: t.title,
      priority: t.priority,
      assigneeName: t.assignee?.name ?? "Unassigned",
      status: t.status,
      dueAt: t.sla?.dueAt ?? null,
      dueLabel: t.sla?.breached ? "Breached" : t.sla?.breachingSoon ? "Due soon" : t.sla?.dueAt ? "On track" : "No SLA",
      breached: t.sla?.breached ?? false,
    })),
    updates: deskActivity()
      .filter((a) => NOW - new Date(a.createdAt).getTime() <= rangeDays * DAYS)
      .slice(0, 6)
      .map((a) => ({ ...a })),
  };
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

const DEFAULT_SETTINGS: AdminSettings = {
  autoReleaseWorkingDays: 3,
  businessHours: [
    { day: "Monday", open: "09:00", close: "17:00", closed: false },
    { day: "Tuesday", open: "09:00", close: "17:00", closed: false },
    { day: "Wednesday", open: "09:00", close: "17:00", closed: false },
    { day: "Thursday", open: "09:00", close: "17:00", closed: false },
    { day: "Friday", open: "09:00", close: "17:00", closed: false },
    { day: "Saturday", open: "", close: "", closed: true },
    { day: "Sunday", open: "", close: "", closed: true },
  ],
  holidays: [{ date: "2026-12-25", label: "Christmas Day" }],
  cannedResponses: [
    { id: "cr-1", shortcut: "greet", title: "Greeting", body: "Hi {name}, thanks for reaching out — I'm looking into this now." },
    { id: "cr-2", shortcut: "vpn", title: "VPN fix steps", body: "Please restart the VPN client, then reconnect. If it drops again, share your client version." },
    { id: "cr-3", shortcut: "resolved", title: "Resolution close", body: "This looks resolved on our end — reply in Chat if it comes back and we'll reopen." },
  ],
};

let settings: AdminSettings = structuredClone(DEFAULT_SETTINGS);

export function resetAdminStore() {
  settings = structuredClone(DEFAULT_SETTINGS);
  issues = seedIssues();
  auditSeed = 0;
}

export function getSettings(): AdminSettings {
  return settings;
}

export function patchSettings(patch: Partial<AdminSettings>): AdminSettings {
  settings = { ...settings, ...patch };
  return settings;
}

export function cannedResponses(): CannedResponse[] {
  return settings.cannedResponses;
}

// ---------------------------------------------------------------------------
// Known issues
// ---------------------------------------------------------------------------

function seedIssues(): KnownIssue[] {
  return [
    { id: "ki-1", title: "Sphere login delays", message: "Some employees see slow Sphere logins this morning. Support is investigating — no need to submit a ticket for this.", severity: "major", startsAt: iso(5 * 3_600_000), endsAt: null, active: true },
  ];
}

let issues: KnownIssue[] = seedIssues();

export function listKnownIssues(): KnownIssue[] {
  return issues;
}

export function createKnownIssue(input: { title: string; message: string; severity: KnownIssue["severity"]; endsAt?: string }): KnownIssue {
  const issue: KnownIssue = {
    id: `ki-${Date.now()}`,
    title: input.title,
    message: input.message,
    severity: input.severity,
    startsAt: new Date().toISOString(),
    endsAt: input.endsAt ?? null,
    active: true,
  };
  issues.unshift(issue);
  return issue;
}

export function updateKnownIssue(id: string, patch: Partial<KnownIssue>): KnownIssue | null {
  const issue = issues.find((i) => i.id === id);
  if (!issue) return null;
  Object.assign(issue, patch);
  return issue;
}

export function endKnownIssue(id: string): KnownIssue | null {
  return updateKnownIssue(id, { active: false, endsAt: new Date().toISOString() });
}

// ---------------------------------------------------------------------------
// Audit + export
// ---------------------------------------------------------------------------

let auditSeed = 0;

export function auditItems(cursor?: string, limit = 15): { items: AuditItem[]; nextCursor: string | null } {
  const actions = ["ticket.assigned", "ticket.released", "ticket.resolved", "agent.created", "settings.updated"] as const;
  const start = cursor ? Number(cursor) : auditSeed;
  const items: AuditItem[] = Array.from({ length: limit }, (_, i) => {
    const n = start + i;
    return {
      id: `audit-${n}`,
      actor: ["Kofi Mensah", "Admin", "System"][n % 3]!,
      action: actions[n % actions.length]!,
      entity: `ticket:PRL-3${String(10000 + ((n * 7) % 16)).slice(1)}`,
      summary: `${actions[n % actions.length]} on ticket ${(n * 7) % 16}`,
      createdAt: iso(n * 3_600_000),
      diff: { status: { before: "open", after: "in_progress" } },
    };
  });
  return { items, nextCursor: String(start + limit) };
}

export function exportCsv(): string {
  const rows = listDeskTickets().map((t) =>
    [t.reference, `"${t.title.replace(/"/g, '""')}"`, t.status, t.priority, t.assignee?.name ?? "", t.createdAt].join(","),
  );
  return ["reference,title,status,priority,assignee,created_at", ...rows].join("\n");
}

// ---------------------------------------------------------------------------
// Categories (Phase 6.2)
// ---------------------------------------------------------------------------

const DEFAULT_CATEGORIES: Category[] = [
  { id: "account_access", name: "Sphere account access" },
  { id: "sphere_app", name: "Sphere app issue" },
  { id: "hardware", name: "Hardware / device" },
  { id: "network", name: "Network / VPN" },
  { id: "email", name: "Email / calendar" },
  { id: "other", name: "Something else" },
];

let categories: Category[] = structuredClone(DEFAULT_CATEGORIES);

export function resetCategories() {
  categories = structuredClone(DEFAULT_CATEGORIES);
}

export function listCategories(): Category[] {
  return categories;
}

export function createCategory(input: { name: string; formSchema?: unknown }): Category {
  const category: Category = {
    id: `cat-${Date.now().toString(36)}`,
    name: input.name,
    formSchema: input.formSchema ?? undefined,
  };
  categories.push(category);
  return category;
}

export function updateCategory(id: string, patch: Partial<Pick<Category, "name" | "formSchema">>): Category | null {
  const category = categories.find((c) => c.id === id);
  if (!category) return null;
  if (patch.name !== undefined) category.name = patch.name;
  if (patch.formSchema !== undefined) category.formSchema = patch.formSchema;
  return category;
}

export function deleteCategory(id: string): boolean {
  if (id === "other") return false;
  const index = categories.findIndex((c) => c.id === id);
  if (index === -1) return false;
  categories.splice(index, 1);
  return true;
}
