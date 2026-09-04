/**
 * LEGACY domain types — do not import in new code. Use `@pearl27/contracts`.
 * Remaining consumers (removed in their rebuild phases):
 * - AdminDashboard, DeskSidebar, AdminQueueActions, AdminTicketActions (Phase 5)
 * - Timeline + StatusTimeline adapter, Badge compat (Phase 4)
 * - lib/validation, lib/workflow, lib/reference (pure helpers + their tests)
 */

export const TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_CATEGORIES = [
  "account_access",
  "sphere_app",
  "hardware",
  "network",
  "email",
  "other",
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_EVENT_TYPES = [
  "created",
  "status_changed",
  "priority_changed",
  "reply",
] as const;
export type TicketEventType = (typeof TICKET_EVENT_TYPES)[number];

export const TICKET_ACTORS = ["employee", "support", "system"] as const;
export type TicketActor = (typeof TICKET_ACTORS)[number];

export interface Ticket {
  id: string;
  reference: string;
  employeeName: string;
  employeeEmail: string;
  title: string;
  description: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface TicketAttachment {
  id: string;
  ticketId: string;
  fileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface TicketEvent {
  id: string;
  ticketId: string;
  type: TicketEventType;
  message: string;
  actor: TicketActor;
  createdAt: string;
}

/** A ticket plus everything needed to render its detail page. */
export interface TicketDetail extends Ticket {
  attachments: TicketAttachment[];
  events: TicketEvent[];
}

export interface TicketStats {
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  total: number;
}

// ---------------------------------------------------------------------------
// Display metadata — kept beside the types so labels never drift from values
// ---------------------------------------------------------------------------

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  account_access: "Sphere account access",
  sphere_app: "Sphere app issue",
  hardware: "Hardware / device",
  network: "Network / VPN",
  email: "Email / calendar",
  other: "Something else",
};

/**
 * The status a ticket moves to next, used to render the primary action on the
 * admin detail view. `closed` is terminal.
 */
export const NEXT_STATUS: Record<TicketStatus, TicketStatus | null> = {
  open: "in_progress",
  in_progress: "resolved",
  resolved: "closed",
  closed: null,
};

export function isTicketStatus(value: unknown): value is TicketStatus {
  return typeof value === "string" && (TICKET_STATUSES as readonly string[]).includes(value);
}

export function isTicketPriority(value: unknown): value is TicketPriority {
  return typeof value === "string" && (TICKET_PRIORITIES as readonly string[]).includes(value);
}
