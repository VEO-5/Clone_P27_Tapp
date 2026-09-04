import type { Attachment, Message, Ticket, TicketEvent } from "@pearl27/contracts";

// ---------------------------------------------------------------------------
// Employee-side mock store (Phase 2). Deterministic seed; reset between tests.
// ---------------------------------------------------------------------------

export const mockCategories = [
  { id: "account_access", name: "Sphere account access" },
  { id: "sphere_app", name: "Sphere app issue" },
  { id: "hardware", name: "Hardware / device" },
  { id: "network", name: "Network / VPN" },
  { id: "email", name: "Email / calendar" },
  { id: "other", name: "Something else" },
];

export interface EmployeeTicketDetail extends Ticket {
  events: TicketEvent[];
  messages: Message[];
  attachments: Attachment[];
}

const HOURS = 3_600_000;
const NOW = Date.now();
const iso = (agoHours: number) => new Date(NOW - agoHours * HOURS).toISOString();

let refCounter = 0;
export function nextReference(): string {
  refCounter += 1;
  return `PRL-${String(200000 + refCounter).slice(1)}`;
}

const KOFI = { name: "Kofi Mensah", avatarUrl: null };
const ADA_AGENT = { name: "Ada from System Support", avatarUrl: null };

function seed(): EmployeeTicketDetail[] {
  refCounter = 0;
  const tickets: EmployeeTicketDetail[] = [
    {
      id: "t-emp-1",
      reference: "PRL-100001",
      title: "Can't sign in to my Sphere account",
      description: "Since this morning I get an 'account locked' error when signing in to Sphere on my laptop. I need access for payroll review today.",
      categoryId: "account_access",
      status: "pending",
      priority: "urgent",
      requesterId: "u-employee-1",
      assigneeId: null,
      handlingAgent: null,
      chatDmUrl: "https://chat.google.com/mock-dm-1",
      version: 1,
      createdAt: iso(3),
      updatedAt: iso(3),
      attachments: [],
      messages: [],
      events: [
        { id: "e-1", ticketId: "t-emp-1", type: "created", actor: "employee", createdAt: iso(3) },
      ],
    },
    {
      id: "t-emp-2",
      reference: "PRL-100002",
      title: "VPN drops every 20 minutes",
      description: "The VPN connection drops roughly every twenty minutes and I have to reconnect manually. This started after the client update yesterday.",
      categoryId: "network",
      status: "open",
      priority: "high",
      requesterId: "u-employee-1",
      assigneeId: "u-agent-1",
      handlingAgent: KOFI,
      chatDmUrl: "https://chat.google.com/mock-dm-2",
      version: 3,
      createdAt: iso(30),
      updatedAt: iso(5),
      attachments: [
        { id: "a-1", ticketId: "t-emp-2", fileName: "vpn-error.png", mimeType: "image/png", sizeBytes: 184_320, status: "available", createdAt: iso(30) },
      ],
      messages: [
        { id: "m-1", ticketId: "t-emp-2", authorRole: "agent", text: "Hi Ada, I'm looking into the VPN drops now.", createdAt: iso(6) },
        { id: "m-2", ticketId: "t-emp-2", authorRole: "employee", text: "Thanks! It just dropped again at 10:40.", createdAt: iso(5) },
      ],
      events: [
        { id: "e-2a", ticketId: "t-emp-2", type: "created", actor: "employee", createdAt: iso(30) },
        { id: "e-2b", ticketId: "t-emp-2", type: "assigned", actor: "system", message: "Assigned to Kofi Mensah", createdAt: iso(28) },
        { id: "e-2c", ticketId: "t-emp-2", type: "status_changed", actor: "agent", message: "Kofi opened your ticket", createdAt: iso(28) },
      ],
    },
    {
      id: "t-emp-3",
      reference: "PRL-100003",
      title: "Sphere app crashes on expense upload",
      description: "Uploading a receipt over 2MB in the Sphere app crashes it instantly on Android. Small receipts work fine every time.",
      categoryId: "sphere_app",
      status: "in_progress",
      priority: "medium",
      requesterId: "u-employee-1",
      assigneeId: "u-agent-2",
      handlingAgent: ADA_AGENT,
      chatDmUrl: "https://chat.google.com/mock-dm-3",
      version: 4,
      createdAt: iso(72),
      updatedAt: iso(8),
      attachments: [
        { id: "a-2", ticketId: "t-emp-3", fileName: "crash-log.txt", mimeType: "text/plain", sizeBytes: 4_096, status: "available", createdAt: iso(72) },
        { id: "a-3", ticketId: "t-emp-3", fileName: "receipt.jpg", mimeType: "image/jpeg", sizeBytes: 2_621_440, status: "scanning", createdAt: iso(70) },
      ],
      messages: [
        { id: "m-3", ticketId: "t-emp-3", authorRole: "agent", text: "Reproduced it — fix is in review.", createdAt: iso(8) },
      ],
      events: [
        { id: "e-3a", ticketId: "t-emp-3", type: "created", actor: "employee", createdAt: iso(72) },
        { id: "e-3b", ticketId: "t-emp-3", type: "status_changed", actor: "agent", message: "Ada set In progress · Reproduced on Android 14, fix in review", createdAt: iso(50) },
        { id: "e-3c", ticketId: "t-emp-3", type: "internal_note", actor: "agent", message: "Escalated to mobile team", createdAt: iso(49) },
      ],
    },
    {
      id: "t-emp-4",
      reference: "PRL-100004",
      title: "New laptop keyboard repeats keys",
      description: "The new laptop's keyboard repeats keys randomly, making passwords fail. External keyboard works fine as a workaround.",
      categoryId: "hardware",
      status: "resolved",
      priority: "low",
      requesterId: "u-employee-1",
      assigneeId: "u-agent-2",
      handlingAgent: ADA_AGENT,
      chatDmUrl: "https://chat.google.com/mock-dm-4",
      version: 5,
      createdAt: iso(200),
      updatedAt: iso(30),
      attachments: [],
      messages: [],
      events: [
        { id: "e-4a", ticketId: "t-emp-4", type: "created", actor: "employee", createdAt: iso(200) },
        { id: "e-4b", ticketId: "t-emp-4", type: "status_changed", actor: "agent", message: "Ada set In progress · Replacement keyboard ordered", createdAt: iso(150) },
        { id: "e-4c", ticketId: "t-emp-4", type: "resolved", actor: "agent", message: "Resolved · Replacement fitted at your desk", createdAt: iso(30) },
      ],
    },
    {
      id: "t-emp-5",
      reference: "PRL-100005",
      title: "Calendar invites arrive an hour late",
      description: "Calendar invites show up one hour late since daylight saving changed. My timezone setting looks correct in Sphere.",
      categoryId: "email",
      status: "resolved",
      priority: "medium",
      requesterId: "u-employee-1",
      assigneeId: "u-agent-3",
      handlingAgent: { name: "Agent 3", avatarUrl: null },
      chatDmUrl: null,
      version: 4,
      createdAt: iso(300),
      updatedAt: iso(200),
      attachments: [],
      messages: [],
      events: [
        { id: "e-5a", ticketId: "t-emp-5", type: "created", actor: "employee", createdAt: iso(300) },
        { id: "e-5b", ticketId: "t-emp-5", type: "reopened", actor: "system", message: "Reopened by employee", createdAt: iso(250) },
        { id: "e-5c", ticketId: "t-emp-5", type: "resolved", actor: "agent", message: "Resolved · Timezone patch applied", createdAt: iso(200) },
      ],
    },
  ];
  refCounter = 5;
  return tickets;
}

let store: EmployeeTicketDetail[] = seed();

/** Tickets the employee already rated (CSAT done) — t-emp-5 rated, t-emp-4 not. */
const ratedTickets = new Set<string>(["t-emp-5"]);

export function resetEmployeeStore() {
  store = seed();
  ratedTickets.clear();
  ratedTickets.add("t-emp-5");
  failFirstAttempts.clear();
  presigned.clear();
}

export function listEmployeeTickets(): EmployeeTicketDetail[] {
  return [...store].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getEmployeeTicketByReference(reference: string): EmployeeTicketDetail | null {
  return store.find((t) => t.reference.toLowerCase() === reference.toLowerCase()) ?? null;
}

export function getEmployeeTicketById(id: string): EmployeeTicketDetail | null {
  return store.find((t) => t.id === id) ?? null;
}

export function addEmployeeTicket(input: {
  title: string;
  description: string;
  categoryId: string;
  priority: Ticket["priority"];
}): EmployeeTicketDetail {
  const ticket: EmployeeTicketDetail = {
    id: `t-emp-${Date.now()}`,
    reference: nextReference(),
    title: input.title,
    description: input.description,
    categoryId: input.categoryId,
    status: "pending",
    priority: input.priority,
    requesterId: "u-employee-1",
    assigneeId: null,
    handlingAgent: null,
    chatDmUrl: `https://chat.google.com/mock-${Date.now()}`,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attachments: [],
    messages: [],
    events: [
      { id: `e-${Date.now()}`, ticketId: "", type: "created", actor: "employee", createdAt: new Date().toISOString() },
    ],
  };
  ticket.events[0]!.ticketId = ticket.id;
  store.unshift(ticket);
  return ticket;
}

export function employeeCounts(): { pending: number; open: number; inProgress: number; resolved: number } {
  const counts = { pending: 0, open: 0, inProgress: 0, resolved: 0 };
  for (const t of store) {
    if (t.status === "pending") counts.pending += 1;
    else if (t.status === "open") counts.open += 1;
    else if (t.status === "in_progress") counts.inProgress += 1;
    else if (t.status === "resolved") counts.resolved += 1;
  }
  return counts;
}

/** Latest status updates across my tickets (status events only, newest first). */
export function employeeUpdates(limit = 5) {
  const updates: { ticketId: string; reference: string; title: string; message: string; createdAt: string }[] = [];
  for (const t of store) {
    for (const e of t.events) {
      if (e.type === "status_changed" || e.type === "resolved" || e.type === "reopened") {
        updates.push({
          ticketId: t.id,
          reference: t.reference,
          title: t.title,
          message: e.message ?? "Status updated",
          createdAt: e.createdAt,
        });
      }
    }
  }
  return updates.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

export function unratedResolvedTickets(withinDays = 7): EmployeeTicketDetail[] {
  const cutoff = NOW - withinDays * 24 * HOURS;
  return store.filter(
    (t) =>
      t.status === "resolved" &&
      !ratedTickets.has(t.id) &&
      new Date(t.updatedAt).getTime() >= cutoff,
  );
}

export function rateTicket(id: string, score: number, comment?: string): boolean {
  const ticket = getEmployeeTicketById(id);
  if (!ticket || ticket.status !== "resolved") return false;
  if (!Number.isInteger(score) || score < 1 || score > 5) return false;
  if (comment !== undefined && comment.trim().length > 1000) return false;
  ratedTickets.add(id);
  return true;
}

// ---------------------------------------------------------------------------
// Presigned uploads
// ---------------------------------------------------------------------------

export const presigned = new Map<string, { ticketId: string; fileName: string; status: "pending" | "available" }>();
/** First-PUT-attempt tracking for `.fail-first.` files (FE-2.7 retry flow). */
const failFirstAttempts = new Set<string>();

/** Filenames containing `.fail-first.` fail their first PUT, then succeed on retry. */
export function shouldFailFirstPut(attachmentId: string): boolean {
  const entry = presigned.get(attachmentId);
  if (!entry || !entry.fileName.includes(".fail-first.")) return false;
  if (failFirstAttempts.has(entry.fileName)) return false;
  failFirstAttempts.add(entry.fileName);
  return true;
}

export function createPresigned(ticketId: string, fileName: string): { attachmentId: string; uploadUrl: string } {
  const attachmentId = `a-mock-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  presigned.set(attachmentId, { ticketId, fileName, status: "pending" });
  return { attachmentId, uploadUrl: `/mock-uploads/${attachmentId}` };
}

export function completeUpload(ticketId: string, attachmentId: string): Attachment | null {
  const entry = presigned.get(attachmentId);
  const ticket = getEmployeeTicketById(ticketId);
  if (!entry || !ticket) return null;
  const attachment: Attachment = {
    id: attachmentId,
    ticketId,
    fileName: entry.fileName,
    mimeType: "image/png",
    sizeBytes: 102_400,
    status: "available",
    createdAt: new Date().toISOString(),
  };
  ticket.attachments.push(attachment);
  presigned.delete(attachmentId);
  return attachment;
}

// ---------------------------------------------------------------------------
// Known issues
// ---------------------------------------------------------------------------

export const mockKnownIssues = [
  {
    id: "ki-1",
    title: "Sphere login delays",
    message: "Some employees see slow Sphere logins this morning. Support is investigating — no need to submit a ticket for this.",
    severity: "major" as const,
    startsAt: iso(5),
    endsAt: null as string | null,
  },
];
