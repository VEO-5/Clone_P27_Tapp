import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums — single source of truth. The web app never hard-codes these.
// ---------------------------------------------------------------------------

export const TicketStatus = z.enum(["pending", "open", "in_progress", "resolved"]);
export type TicketStatus = z.infer<typeof TicketStatus>;

export const TicketPriority = z.enum(["low", "medium", "high", "urgent"]);
export type TicketPriority = z.infer<typeof TicketPriority>;

export const Role = z.enum(["employee", "agent", "admin"]);
export type Role = z.infer<typeof Role>;

export const EventType = z.enum([
  "created",
  "status_changed",
  "reopened",
  "resolved",
  "message",
  "internal_note",
  "assigned",
  "released",
]);
export type EventType = z.infer<typeof EventType>;

export const STATUS_LABELS: Record<TicketStatus, string> = {
  pending: "Pending",
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const ALLOWED_DOMAIN = "pearl27.com";

// Categories (Phase 6 adds formSchema for dynamic fields)
export const Category = z.object({
  id: z.string(),
  name: z.string(),
  formSchema: z.unknown().optional(),
});
export type Category = z.infer<typeof Category>;

// ---------------------------------------------------------------------------
// Domain shapes
// ---------------------------------------------------------------------------

export const Profile = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  avatarUrl: z.string().url().nullable().optional(),
  role: Role,
  teamId: z.string().nullable().optional(),
});
export type Profile = z.infer<typeof Profile>;

export const Ticket = z.object({
  id: z.string(),
  reference: z.string(),
  title: z.string(),
  description: z.string(),
  categoryId: z.string(),
  status: TicketStatus,
  priority: TicketPriority,
  requesterId: z.string(),
  assigneeId: z.string().nullable().optional(),
  handlingAgent: z
    .object({ name: z.string(), avatarUrl: z.string().url().nullable().optional() })
    .nullable()
    .optional(),
  chatDmUrl: z.string().url().nullable().optional(),
  version: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Ticket = z.infer<typeof Ticket>;

export const Message = z.object({
  id: z.string(),
  ticketId: z.string(),
  authorRole: z.enum(["employee", "agent", "system"]),
  text: z.string(),
  createdAt: z.string(),
});
export type Message = z.infer<typeof Message>;

export const TicketEvent = z.object({
  id: z.string(),
  ticketId: z.string(),
  type: EventType,
  message: z.string().optional(),
  actor: z.string().optional(),
  createdAt: z.string(),
});
export type TicketEvent = z.infer<typeof TicketEvent>;

export const Attachment = z.object({
  id: z.string(),
  ticketId: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  status: z.enum(["scanning", "available", "failed"]).optional(),
  createdAt: z.string(),
});
export type Attachment = z.infer<typeof Attachment>;

export const ApiError = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    fieldErrors: z.record(z.string(), z.string()).optional(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;

// ---------------------------------------------------------------------------
// Request schemas (client + API validate with the same schemas)
// ---------------------------------------------------------------------------

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_FILES = 5;
export const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
] as const;

export const createTicketSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Give your issue a short title (at least 5 characters)")
    .max(140, "Title must be 140 characters or fewer"),
  description: z
    .string()
    .trim()
    .min(20, "Describe the issue in at least 20 characters so support can help")
    .max(5000, "Description must be 5000 characters or fewer"),
  categoryId: z.string().min(1, "Choose a category"),
  priority: TicketPriority.default("medium"),
  customFields: z.record(z.string(), z.unknown()).optional(),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const sendSchema = z
  .object({
    text: z.string().trim().min(1).max(5000).optional(),
    status: z.enum(["open", "in_progress", "resolved"]).optional(),
    internal: z.boolean().optional(),
    priority: TicketPriority.optional(),
    version: z.number().int().nonnegative(),
  })
  .refine((v) => Boolean(v.text || v.status || v.priority), {
    message: "Provide a message, status, or priority",
  });
export type SendInput = z.infer<typeof sendSchema>;

export const agentEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address")
    .refine((v) => v.endsWith(`@${ALLOWED_DOMAIN}`), {
      message: `Use your ${ALLOWED_DOMAIN} address`,
    }),
});

// ---------------------------------------------------------------------------
// Desk shapes (Phase 3) — queue rows, dashboard, activity, live events
// ---------------------------------------------------------------------------

export const Assignee = z.object({
  id: z.string(),
  name: z.string(),
  avatarUrl: z.string().url().nullable().optional(),
});
export type Assignee = z.infer<typeof Assignee>;

export const LockInfo = z.object({
  lockedByMe: z.boolean(),
  lockedByOther: z.boolean(),
  ownerName: z.string().nullable().optional(),
});
export type LockInfo = z.infer<typeof LockInfo>;

export const PreviousRelease = z.object({
  status: TicketStatus,
  agentName: z.string(),
  releasedAt: z.string(),
  reason: z.string().nullable().optional(),
});
export type PreviousRelease = z.infer<typeof PreviousRelease>;

export const SlaInfo = z.object({
  dueAt: z.string().nullable().optional(),
  breached: z.boolean(),
  breachingSoon: z.boolean(),
});
export type SlaInfo = z.infer<typeof SlaInfo>;

export const DeskTicket = Ticket.extend({
  requesterName: z.string().optional(),
  assignee: Assignee.nullable().optional(),
  lock: LockInfo.optional(),
  previousRelease: PreviousRelease.nullable().optional(),
  unreadCount: z.number().int().nonnegative().optional(),
  sla: SlaInfo.optional(),
});
export type DeskTicket = z.infer<typeof DeskTicket>;

export const DeskTab = z.enum(["unassigned", "mine", "all", "by-agent"]);
export type DeskTab = z.infer<typeof DeskTab>;

export const DeskDashboardCards = z.object({
  unassigned: z.number(),
  pending: z.number(),
  mine: z.number(),
  breachingSoon: z.number(),
  receivedToday: z.number(),
  receivedWeek: z.number(),
  resolvedByMeToday: z.number(),
  resolvedByMeWeek: z.number(),
  myAvgResolutionHours: z.number().nullable().optional(),
});
export type DeskDashboardCards = z.infer<typeof DeskDashboardCards>;

export const DashboardSeries = z.object({
  receivedVsResolved: z.array(z.object({ date: z.string(), received: z.number(), resolved: z.number() })),
  byStatus: z.array(z.object({ status: TicketStatus, count: z.number() })),
  byCategory: z.array(z.object({ categoryId: z.string(), categoryName: z.string(), count: z.number() })),
  ageBuckets: z.array(z.object({ bucket: z.string(), count: z.number() })),
});
export type DashboardSeries = z.infer<typeof DashboardSeries>;

export const DeskDashboard = z.object({
  cards: DeskDashboardCards,
  series: DashboardSeries,
});
export type DeskDashboard = z.infer<typeof DeskDashboard>;

export const ActivityItem = z.object({
  id: z.string(),
  kind: z.enum(["assigned", "released", "message", "status_changed"]),
  ticketId: z.string(),
  ticketReference: z.string(),
  text: z.string(),
  actorName: z.string(),
  createdAt: z.string(),
});
export type ActivityItem = z.infer<typeof ActivityItem>;

// SSE event payloads (§3.4)
export const SseTicketUpdated = z.object({
  id: z.string(),
  version: z.number(),
  status: TicketStatus,
  assignee: Assignee.nullable(),
});
export type SseTicketUpdated = z.infer<typeof SseTicketUpdated>;

export const SseMessageCreated = z.object({ ticketId: z.string() });
export type SseMessageCreated = z.infer<typeof SseMessageCreated>;

export const SsePresence = z.object({ ticketId: z.string(), viewers: z.array(z.string()) });
export type SsePresence = z.infer<typeof SsePresence>;

export function validateFile(file: { name: string; size: number; type: string }): string | null {
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return `${file.name}: only PNG, JPEG, WebP, GIF, PDF, or TXT files are allowed`;
  }
  if (file.size > MAX_FILE_BYTES) {
    return `${file.name} is too large — the limit is 5 MB`;
  }
  if (file.size === 0) return `${file.name} is empty`;
  return null;
}

export function validateFiles(files: readonly { name: string; size: number; type: string }[]): string[] {
  const errors: string[] = [];
  if (files.length > MAX_FILES) errors.push(`Attach at most ${MAX_FILES} files`);
  for (const file of files.slice(0, MAX_FILES)) {
    const error = validateFile(file);
    if (error) errors.push(error);
  }
  return errors;
}
